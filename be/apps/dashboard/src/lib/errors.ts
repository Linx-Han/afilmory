import { FetchError } from 'ofetch'

import { getI18n } from '~/i18n'

type FetchErrorWithPayload = FetchError<unknown> & {
  response?: {
    _data?: unknown
  }
}

function toMessage(value: unknown): string | null {
  if (value == null) {
    return null
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  if (value instanceof Error) {
    return toMessage(value.message)
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const message = toMessage(entry)
      if (message) {
        return message
      }
    }
    return null
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const candidates: unknown[] = [record.message, record.error, record.detail, record.description, record.reason]

    for (const candidate of candidates) {
      const message = toMessage(candidate)
      if (message) {
        return message
      }
    }
  }

  return null
}

export function getRequestErrorMessage(error: unknown, fallback?: string): string {
  if (error instanceof FetchError) {
    const payload = (error as FetchErrorWithPayload).data ?? (error as FetchErrorWithPayload).response?._data
    const payloadMessage = toMessage(payload)
    if (payloadMessage) {
      return payloadMessage
    }

    const errorMessage = toMessage(error.message)
    if (errorMessage) {
      return errorMessage
    }
  }

  const genericMessage = toMessage(error)
  if (genericMessage) {
    return genericMessage
  }

  return fallback ?? getI18n().t('errors.request.generic')
}

const parseNumberLike = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

export function getRequestStatusCode(error: unknown): number | null {
  if (error instanceof FetchError) {
    const status = error.statusCode ?? (error as FetchErrorWithPayload).response?.status
    if (typeof status === 'number' && Number.isFinite(status)) {
      return status
    }
  }

  if (typeof error === 'object' && error) {
    const candidate = (error as { statusCode?: unknown }).statusCode
    const parsedCandidate = parseNumberLike(candidate)
    if (parsedCandidate !== null) {
      return parsedCandidate
    }

    const responseStatus = (error as { response?: { status?: unknown } }).response?.status
    const parsedResponse = parseNumberLike(responseStatus)
    if (parsedResponse !== null) {
      return parsedResponse
    }
  }

  return null
}

const extractPayloadCode = (payload: unknown): number | null => {
  if (!payload || typeof payload !== 'object') {
    return null
  }
  return parseNumberLike((payload as { code?: unknown }).code)
}

export function getRequestErrorCode(error: unknown): number | null {
  if (!error || typeof error !== 'object') {
    return null
  }

  const directCode = parseNumberLike((error as { code?: unknown }).code)
  if (directCode !== null) {
    return directCode
  }

  const dataCode = extractPayloadCode((error as { data?: unknown }).data)
  if (dataCode !== null) {
    return dataCode
  }

  const {response} = (error as { response?: { _data?: unknown; data?: unknown } })
  const responseCode = extractPayloadCode(response?._data ?? response?.data)
  if (responseCode !== null) {
    return responseCode
  }

  return null
}
