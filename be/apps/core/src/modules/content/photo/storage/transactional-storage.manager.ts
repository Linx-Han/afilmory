import type {
  StorageConfig,
  StorageObject,
  StorageUploadOptions,
  StorageUploadProgress,
} from '@afilmory/builder/storage/interfaces.js'
import { StorageManager } from '@afilmory/builder/storage/manager.js'

type StagedUpload = {
  key: string
  data: Buffer
  options?: StorageUploadOptions
  placeholder: StorageObject
}

export type TransactionalUploadProgressEvent = StorageUploadProgress & {
  index: number
  total: number
}

type FlushUploadsOptions = {
  onProgress?: (event: TransactionalUploadProgressEvent) => Promise<void> | void
}

export class TransactionalStorageManager extends StorageManager {
  private readonly prefetchedBuffers = new Map<string, Buffer>()
  private pendingUploads: StagedUpload[] = []
  private readonly persistedUploads = new Map<string, StorageObject>()

  constructor(config: StorageConfig) {
    super(config)
  }

  stagePrefetchedBuffer(key: string, data: Buffer): void {
    this.prefetchedBuffers.set(key, data)
  }

  clearPrefetchedBuffer(key: string): void {
    this.prefetchedBuffers.delete(key)
  }

  hasPendingUploads(): boolean {
    return this.pendingUploads.length > 0
  }

  override async getFile(key: string): Promise<Buffer | null> {
    const staged = this.prefetchedBuffers.get(key)
    if (staged) {
      return staged
    }
    return await super.getFile(key)
  }

  stageUpload(key: string, data: Buffer, options?: StorageUploadOptions): StorageObject {
    const placeholder: StorageObject = {
      key,
      size: data.length,
      lastModified: new Date(),
    }

    this.pendingUploads.push({ key, data, options, placeholder })
    return placeholder
  }

  override async uploadFile(key: string, data: Buffer, options?: StorageUploadOptions): Promise<StorageObject> {
    return this.stageUpload(key, data, options)
  }

  async flushUploads(options?: FlushUploadsOptions): Promise<void> {
    if (this.pendingUploads.length === 0) {
      return
    }

    const uploads = this.pendingUploads
    this.pendingUploads = []

    for (let index = 0; index < uploads.length; index += 1) {
      const entry = uploads[index]
      const baseEvent = {
        key: entry.key,
        size: entry.data.byteLength,
        index: index + 1,
        total: uploads.length,
      }

      const forwardProgressHandler =
        options?.onProgress || entry.options?.onProgress
          ? async (progress: StorageUploadProgress) => {
              if (entry.options?.onProgress) {
                await entry.options.onProgress(progress)
              }
              if (options?.onProgress) {
                await options.onProgress({
                  ...progress,
                  index: baseEvent.index,
                  total: baseEvent.total,
                  size: progress.size ?? baseEvent.size,
                })
              }
            }
          : undefined

      const uploadOptions = forwardProgressHandler
        ? { ...entry.options, onProgress: forwardProgressHandler }
        : entry.options
      const uploaded: StorageObject = await super.uploadFile(entry.key, entry.data, uploadOptions)

      this.persistedUploads.set(entry.key, uploaded)

      entry.placeholder.size = uploaded.size
      entry.placeholder.etag = uploaded.etag
      entry.placeholder.lastModified = uploaded.lastModified
    }
  }

  async rollbackUploads(): Promise<void> {
    this.pendingUploads = []
    const uploadedKeys = Array.from(this.persistedUploads.keys())
    this.persistedUploads.clear()
    for (const key of uploadedKeys) {
      try {
        await super.deleteFile(key)
      } catch {
        // Best effort cleanup
      }
    }
  }
}
