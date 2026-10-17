import { coreApi, coreApiBaseURL } from '~/lib/api-client'
import { camelCaseKeys } from '~/lib/case'
import { getRequestErrorMessage } from '~/lib/errors'
import { withLanguageHeaderInit } from '~/lib/request-language'

import type {
  BillingUsageOverview,
  PhotoAssetListItem,
  PhotoAssetSummary,
  PhotoSyncAction,
  PhotoSyncConflict,
  PhotoSyncProgressEvent,
  PhotoSyncResolution,
  PhotoSyncResult,
  PhotoSyncStatus,
  RunPhotoSyncPayload,
} from './types'

const STABLE_NEWLINE = /\r?\n/

function normalizeServerMessage(payload: unknown): string | null {
  const message = getRequestErrorMessage(payload, '')
  if (!message) {
    return null
  }
  const trimmed = message.trim()
  return trimmed.length > 0 ? trimmed : null
}

function parseRawPayload(raw: string | null | undefined): unknown | null {
  if (!raw) {
    return null
  }
  const trimmed = raw.trim()
  if (!trimmed) {
    return null
  }
  try {
    return JSON.parse(trimmed)
  } catch {
    return trimmed
  }
}

type ServerErrorInfo = {
  message: string | null
  code: number | null
  raw: unknown
}

const extractErrorInfoFromPayload = (payload: unknown): ServerErrorInfo => {
  const message = normalizeServerMessage(payload)
  const codeValue = typeof payload === 'object' && payload ? (payload as { code?: unknown }).code : null
  const code =
    typeof codeValue === 'number' && Number.isFinite(codeValue)
      ? codeValue
      : typeof codeValue === 'string'
        ? Number.parseInt(codeValue, 10)
        : null
  return {
    message,
    code: Number.isFinite(code ?? Number.NaN) ? (code as number) : null,
    raw: payload,
  }
}

function extractErrorInfoFromRaw(raw: string | null | undefined): ServerErrorInfo {
  const payload = parseRawPayload(raw)
  return extractErrorInfoFromPayload(payload ?? raw ?? null)
}

async function readResponseErrorInfo(response: Response): Promise<ServerErrorInfo> {
  try {
    const text = await response.text()
    return extractErrorInfoFromRaw(text)
  } catch {
    return { message: null, code: null, raw: null }
  }
}

function extractErrorInfoFromXhr(xhr: XMLHttpRequest): ServerErrorInfo {
  const raw = typeof xhr.response === 'string' && xhr.response.length > 0 ? xhr.response : (xhr.responseText ?? '')
  return extractErrorInfoFromRaw(raw)
}

const createApiError = (
  info: ServerErrorInfo,
  fallback: string,
  status?: number,
): Error & {
  statusCode?: number
  code?: number
  data?: unknown
  response?: { status?: number; _data?: unknown }
} => {
  const error = new Error(info.message ?? fallback) as Error & {
    statusCode?: number
    code?: number
    data?: unknown
    response?: { status?: number; _data?: unknown }
  }
  if (typeof status === 'number' && Number.isFinite(status)) {
    error.statusCode = status
    error.response = { status }
  }
  if (typeof info.code === 'number') {
    error.code = info.code
  }
  error.data = info.raw
  return error
}

type RunPhotoSyncOptions = {
  signal?: AbortSignal
  onEvent?: (event: PhotoSyncProgressEvent) => void
}

export type PhotoUploadFileProgress = {
  index: number
  name: string
  size: number
  uploadedBytes: number
  progress: number
}

export type PhotoUploadProgressSnapshot = {
  totalBytes: number
  uploadedBytes: number
  files: PhotoUploadFileProgress[]
}

export type UploadPhotoAssetsOptions = {
  directory?: string
  signal?: AbortSignal
  onProgress?: (snapshot: PhotoUploadProgressSnapshot) => void
  timeoutMs?: number
  onServerEvent?: (event: PhotoSyncProgressEvent) => void
}

export async function runPhotoSync(
  payload: RunPhotoSyncPayload,
  options?: RunPhotoSyncOptions,
): Promise<PhotoSyncResult> {
  const response = await fetch(
    `${coreApiBaseURL}/data-sync/run`,
    withLanguageHeaderInit({
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'text/event-stream',
      },
      credentials: 'include',
      body: JSON.stringify({ dryRun: payload.dryRun ?? false }),
      signal: options?.signal,
    }),
  )

  if (!response.ok || !response.body) {
    const fallback = `Sync request failed: ${response.status} ${response.statusText}`
    const errorInfo = await readResponseErrorInfo(response)
    throw createApiError(errorInfo, fallback, response.status)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let finalResult: PhotoSyncResult | null = null
  let lastErrorMessage: string | null = null
  let lastErrorCode: number | null = null

  const stageEvent = (rawEvent: string) => {
    const lines = rawEvent.split(STABLE_NEWLINE)
    let eventName: string | null = null
    const dataLines: string[] = []

    for (const line of lines) {
      if (!line) {
        continue
      }

      if (line.startsWith(':')) {
        continue
      }

      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim()
        continue
      }

      if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim())
      }
    }

    if (!eventName || dataLines.length === 0) {
      return
    }

    if (eventName !== 'progress') {
      return
    }

    const data = dataLines.join('\n')

    try {
      const parsed = JSON.parse(data)
      const event = camelCaseKeys<PhotoSyncProgressEvent>(parsed)

      options?.onEvent?.(event)

      if (event.type === 'complete') {
        finalResult = event.payload
      }

      if (event.type === 'error') {
        lastErrorMessage = event.payload.message
        const payloadCode = (event.payload as { code?: unknown }).code
        if (typeof payloadCode === 'number' && Number.isFinite(payloadCode)) {
          lastErrorCode = payloadCode
        } else if (typeof payloadCode === 'string') {
          const parsed = Number.parseInt(payloadCode, 10)
          if (!Number.isNaN(parsed)) {
            lastErrorCode = parsed
          }
        }
      }
    } catch (error) {
      console.error('Failed to parse sync progress event', error)
    }
  }

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })

      let boundary = buffer.indexOf('\n\n')
      while (boundary !== -1) {
        const rawEvent = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)
        stageEvent(rawEvent)
        boundary = buffer.indexOf('\n\n')
      }
    }

    if (buffer.trim().length > 0) {
      stageEvent(buffer)
      buffer = ''
    }
  } finally {
    reader.releaseLock()
  }

  if (lastErrorMessage) {
    throw createApiError({ message: lastErrorMessage, code: lastErrorCode, raw: null }, lastErrorMessage)
  }

  if (!finalResult) {
    throw new Error('Sync completed without a final result. Connection terminated.')
  }

  return camelCaseKeys<PhotoSyncResult>(finalResult)
}

export async function listPhotoSyncConflicts(): Promise<PhotoSyncConflict[]> {
  const conflicts = await coreApi<PhotoSyncConflict[]>('/data-sync/conflicts')
  return camelCaseKeys<PhotoSyncConflict[]>(conflicts)
}

export async function resolvePhotoSyncConflict(
  id: string,
  payload: { strategy: PhotoSyncResolution; dryRun?: boolean },
): Promise<PhotoSyncAction> {
  const result = await coreApi<PhotoSyncAction>(`/data-sync/conflicts/${id}/resolve`, {
    method: 'POST',
    body: payload,
  })

  return camelCaseKeys<PhotoSyncAction>(result)
}

export async function listPhotoAssets(): Promise<PhotoAssetListItem[]> {
  const assets = await coreApi<PhotoAssetListItem[]>('/photos/assets')

  return assets
}

export async function getPhotoAssetSummary(): Promise<PhotoAssetSummary> {
  const summary = await coreApi<PhotoAssetSummary>('/photos/assets/summary')

  return camelCaseKeys<PhotoAssetSummary>(summary)
}

export async function deletePhotoAssets(ids: string[], options?: { deleteFromStorage?: boolean }): Promise<void> {
  await coreApi('/photos/assets', {
    method: 'DELETE',
    body: {
      ids,
      deleteFromStorage: options?.deleteFromStorage === true,
    },
  })
}

export async function updatePhotoAssetTags(id: string, tags: string[]): Promise<PhotoAssetListItem> {
  const asset = await coreApi<PhotoAssetListItem>(`/photos/assets/${id}/tags`, {
    method: 'PATCH',
    body: { tags },
  })

  return camelCaseKeys<PhotoAssetListItem>(asset)
}

export async function uploadPhotoAssets(
  files: File[],
  options?: UploadPhotoAssetsOptions,
): Promise<PhotoAssetListItem[]> {
  if (files.length === 0) {
    return []
  }

  const formData = new FormData()

  if (options?.directory) {
    formData.append('directory', options.directory)
  }

  for (const file of files) {
    formData.append('files', file)
  }

  if (typeof XMLHttpRequest === 'undefined') {
    const fallbackResponse = await coreApi<{ assets: PhotoAssetListItem[] }>('/photos/assets/upload', {
      method: 'POST',
      body: formData,
    })
    const fallbackData = camelCaseKeys<{ assets: PhotoAssetListItem[] }>(fallbackResponse)
    return fallbackData.assets
  }

  const fileMetadata = files.map((file, index) => ({
    index,
    name: file.name,
    size: file.size,
  }))
  const totalBytes = fileMetadata.reduce((sum, file) => sum + file.size, 0)

  const snapshotFromLoaded = (loaded: number): PhotoUploadProgressSnapshot => {
    let remaining = loaded
    const filesProgress: PhotoUploadFileProgress[] = fileMetadata.map((meta) => {
      const uploadedForFile = Math.max(0, Math.min(meta.size, remaining))
      remaining -= uploadedForFile
      return {
        index: meta.index,
        name: meta.name,
        size: meta.size,
        uploadedBytes: uploadedForFile,
        progress: meta.size === 0 ? 1 : Math.min(1, uploadedForFile / meta.size),
      }
    })

    return {
      totalBytes,
      uploadedBytes: Math.min(loaded, totalBytes),
      files: filesProgress,
    }
  }

  return await new Promise<PhotoAssetListItem[]>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${coreApiBaseURL}/photos/assets/upload`, true)
    xhr.withCredentials = true
    xhr.setRequestHeader('accept', 'text/event-stream')
    if (options?.timeoutMs && Number.isFinite(options.timeoutMs)) {
      xhr.timeout = Math.max(0, options.timeoutMs)
    }

    const handleAbort = () => {
      xhr.abort()
    }

    const cleanup = () => {
      if (options?.signal) {
        options.signal.removeEventListener('abort', handleAbort)
      }
    }

    if (options?.signal) {
      if (options.signal.aborted) {
        cleanup()
        reject(new DOMException('Upload aborted', 'AbortError'))
        return
      }
      options.signal.addEventListener('abort', handleAbort)
    }

    xhr.upload.onprogress = (event: ProgressEvent<EventTarget>) => {
      if (!options?.onProgress) {
        return
      }
      const loaded = event.lengthComputable ? event.loaded : totalBytes
      options.onProgress(snapshotFromLoaded(loaded))
    }

    let buffer = ''
    let lastIndex = 0
    let settled = false
    let completed = false

    const settle = (resolver: () => void, rejecter?: (error: Error) => void, error?: Error) => {
      if (settled) return
      settled = true
      cleanup()
      if (error && rejecter) {
        rejecter(error)
        return
      }
      resolver()
    }

    const processBuffer = () => {
      const text = xhr.responseText
      if (!text || text.length === lastIndex) {
        return
      }
      const chunk = text.slice(lastIndex)
      lastIndex = text.length
      buffer += chunk

      let boundary = buffer.indexOf('\n\n')
      while (boundary !== -1) {
        const rawEvent = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)
        handleSseEvent(rawEvent)
        boundary = buffer.indexOf('\n\n')
      }
    }

    const handleSseEvent = (rawEvent: string) => {
      const lines = rawEvent.split(STABLE_NEWLINE)
      let eventName: string | null = null
      const dataLines: string[] = []

      for (const line of lines) {
        if (!line) {
          continue
        }
        if (line.startsWith(':')) {
          continue
        }
        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim()
          continue
        }
        if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trim())
        }
      }

      if (eventName !== 'progress' || dataLines.length === 0) {
        return
      }

      try {
        const parsed = JSON.parse(dataLines.join('\n'))
        const event = camelCaseKeys<PhotoSyncProgressEvent>(parsed)
        options?.onServerEvent?.(event)
        if (event.type === 'error') {
          const error = createApiError(
            extractErrorInfoFromPayload(event.payload),
            'Server processing failed',
          )
          settle(() => {}, reject, error)
          xhr.abort()
          return
        }
        if (event.type === 'complete') {
          completed = true
        }
      } catch (error) {
        console.error('Failed to parse upload progress event', error)
      }
    }

    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.LOADING || xhr.readyState === XMLHttpRequest.DONE) {
        processBuffer()
      }
    }

    xhr.onprogress = () => {
      processBuffer()
    }

    xhr.onerror = () => {
      settle(
        () => {},
        reject,
        createApiError(
          { message: 'Network error during upload. Please try again later.', code: null, raw: null },
          'Network error during upload. Please try again later.',
          xhr.status,
        ),
      )
    }

    xhr.onabort = () => {
      settle(() => {}, reject, new DOMException('Upload aborted', 'AbortError'))
    }

    xhr.ontimeout = () => {
      settle(
        () => {},
        reject,
        createApiError(
          { message: 'Upload timed out. Please try again later.', code: null, raw: null },
          'Upload timed out. Please try again later.',
          xhr.status,
        ),
      )
    }

    xhr.onload = () => {
      processBuffer()
      if (xhr.status >= 200 && xhr.status < 300 && completed) {
        settle(() => resolve([]))
        return
      }

      const fallbackMessage =
        xhr.status >= 200 && xhr.status < 300 ? 'Upload response incomplete' : `Upload failed: ${xhr.status}`
      const errorInfo = extractErrorInfoFromXhr(xhr)
      settle(() => {}, reject, createApiError(errorInfo, fallbackMessage, xhr.status || undefined))
    }

    xhr.send(formData)
  })
}

export async function getPhotoStorageUrl(storageKey: string): Promise<string> {
  const result = await coreApi<{ url: string }>('/photos/storage-url', {
    method: 'GET',
    query: { key: storageKey },
  })

  const data = camelCaseKeys<{ url: string }>(result)

  return data.url
}

export async function getPhotoUsageOverview(options?: { limit?: number }): Promise<BillingUsageOverview> {
  const limit = typeof options?.limit === 'number' ? options.limit : 100
  const response = await coreApi<BillingUsageOverview>('/billing/usage', {
    method: 'GET',
    query: { limit },
  })

  return camelCaseKeys<BillingUsageOverview>(response)
}

export async function getPhotoSyncStatus(): Promise<PhotoSyncStatus> {
  const status = await coreApi<PhotoSyncStatus>('/data-sync/status')
  return camelCaseKeys<PhotoSyncStatus>(status)
}
