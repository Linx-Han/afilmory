/// <reference lib="webworker" />
import type { GainMapMetadata } from './jpeg-gainmap'
import { extractJPEGGainMap } from './jpeg-gainmap'
import { createTilePlane } from './webgpu-tile-plane'
import type { ImagePixels, TextureWorkerMessage, TextureWorkerRequest, TilePixels, TileRequest } from './webgpu-tiles'
import { OVERVIEW_SIZE } from './webgpu-tiles'

declare const self: DedicatedWorkerGlobalScope
let base: ImageBitmap | undefined
let gain: ImageBitmap | undefined

function post(message: TextureWorkerMessage, transfer: Transferable[] = []) {
  self.postMessage(message, transfer)
}

async function orientGainMap(bitmap: ImageBitmap, orientation: number) {
  if (orientation === 1) {
    return bitmap
  }
  const { width: w, height: h } = bitmap
  const swapped = orientation >= 5
  const canvas = new OffscreenCanvas(swapped ? h : w, swapped ? w : h)
  const context = canvas.getContext('2d', { colorSpace: 'srgb', alpha: false })
  if (!context) {
    throw new Error('Cannot orient gain map')
  }
  const transforms: Record<number, [number, number, number, number, number, number]> = {
    2: [-1, 0, 0, 1, w, 0],
    3: [-1, 0, 0, -1, w, h],
    4: [1, 0, 0, -1, 0, h],
    5: [0, 1, 1, 0, 0, 0],
    6: [0, 1, -1, 0, h, 0],
    7: [0, -1, -1, 0, h, w],
    8: [0, -1, 1, 0, 0, w],
  }
  context.setTransform(...transforms[orientation])
  context.drawImage(bitmap, 0, 0)
  bitmap.close()
  return canvas.transferToImageBitmap()
}

async function tilePixels(tile: TileRequest): Promise<TilePixels> {
  if (!base) {
    throw new Error('Image not loaded')
  }
  const basePlane = createTilePlane(base, tile.rect, tile.level, 'display-p3')
  try {
    const gainPlane = gain
      ? createTilePlane(gain, tile.rect, tile.level, 'srgb', gain.width / base.width, gain.height / base.height)
      : undefined
    return { ...tile, base: basePlane, gain: gainPlane }
  }
  catch (error) {
    basePlane.bitmap.close()
    throw error
  }
}

self.onmessage = async ({ data: request }: MessageEvent<TextureWorkerRequest>) => {
  try {
    if (request.type === 'tile') {
      const tile = await tilePixels(request.tile)
      post({ type: 'tile', tile }, [tile.base.bitmap, ...(tile.gain ? [tile.gain.bitmap] : [])])
      return
    }
    const response = await fetch(request.url)
    if (!response.ok) {
      throw new Error(`Image fetch failed: ${response.status}`)
    }
    const blob = await response.blob()
    const header = new Uint8Array(await blob.slice(0, 2).arrayBuffer())
    let extracted: ReturnType<typeof extractJPEGGainMap> = null
    let warning: string | undefined
    if (header[0] === 0xFF && header[1] === 0xD8) {
      try {
        extracted = extractJPEGGainMap(await blob.arrayBuffer())
      }
      catch (error) {
        warning = `HDR metadata could not be decoded: ${String(error)}`
      }
    }
    base = await createImageBitmap(extracted?.base ?? blob)
    if (extracted) {
      try {
        gain = await orientGainMap(await createImageBitmap(extracted.gain), extracted.orientation)
        if (Math.abs(gain.width / gain.height - base.width / base.height) > 0.01) {
          throw new Error('Gain map aspect ratio does not match photo')
        }
      }
      catch (error) {
        gain?.close()
        gain = undefined
        extracted = null
        warning = `HDR gain map could not be decoded: ${String(error)}`
      }
    }
    let metadata: GainMapMetadata | null = extracted?.metadata ?? null
    if (request.gainMapSource) {
      try {
        const { url, headroom } = request.gainMapSource
        if (!Number.isFinite(headroom) || headroom <= 1 || headroom > 64) {
          throw new Error('Invalid Apple HDR headroom')
        }
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Gain map fetch failed: ${response.status}`)
        }
        gain?.close()
        gain = await createImageBitmap(await response.blob())
        if (Math.abs(gain.width / gain.height - base.width / base.height) > 0.01) {
          throw new Error('Gain map aspect ratio does not match photo')
        }
        metadata = {
          min: [0, 0, 0],
          max: [0, 0, 0],
          gamma: [1, 1, 1],
          offsetBase: [0, 0, 0],
          offsetAlternate: [0, 0, 0],
          capacityMin: 0,
          capacityMax: Math.log2(headroom),
          useBaseColorSpace: true,
          appleHeadroom: headroom,
        }
      }
      catch (error) {
        gain?.close()
        gain = undefined
        metadata = null
        warning = `HEIC gain map could not be decoded: ${String(error)}`
      }
    }
    const level = Math.max(0, Math.ceil(Math.log2(Math.max(base.width, base.height) / OVERVIEW_SIZE)))
    const pixels = await tilePixels({ key: 'overview', level, rect: [0, 0, base.width, base.height] })
    const image: ImagePixels = {
      ...pixels,
      width: base.width,
      height: base.height,
      metadata,
      toGainSpace: extracted?.toGainSpace,
      toDisplayP3: extracted?.toDisplayP3,
      wideGamut: Boolean(request.gainMapSource) || (extracted?.wideGamut ?? false),
      warning,
    }
    post({ type: 'ready', image }, [image.base.bitmap, ...(image.gain ? [image.gain.bitmap] : [])])
  }
  catch (error) {
    post({ type: 'error', key: request.type === 'tile' ? request.tile.key : undefined, message: String(error) })
  }
}
