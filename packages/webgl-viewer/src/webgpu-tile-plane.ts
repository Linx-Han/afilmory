import type { BitmapPlane, Rect } from './webgpu-tiles'
import { TILE_GUTTER } from './webgpu-tiles'

export function getTilePlaneLayout(
  imageWidth: number,
  imageHeight: number,
  rect: Rect,
  level: number,
  ratioX = 1,
  ratioY = 1,
) {
  const downsample = 2 ** level
  const x = rect[0] * ratioX
  const y = rect[1] * ratioY
  const width = rect[2] * ratioX
  const height = rect[3] * ratioY
  const pad = TILE_GUTTER * downsample
  const sx = Math.max(0, Math.floor(x - pad))
  const sy = Math.max(0, Math.floor(y - pad))
  const sw = Math.min(imageWidth, Math.ceil(x + width + pad)) - sx
  const sh = Math.min(imageHeight, Math.ceil(y + height + pad)) - sy
  return {
    source: [sx, sy, sw, sh] as Rect,
    width: Math.max(1, Math.ceil(sw / downsample)),
    height: Math.max(1, Math.ceil(sh / downsample)),
    uv: [(x - sx) / sw, (y - sy) / sh, width / sw, height / sh] as Rect,
  }
}

export function createTilePlane(
  bitmap: ImageBitmap,
  rect: Rect,
  level: number,
  colorSpace: PredefinedColorSpace,
  ratioX = 1,
  ratioY = 1,
): BitmapPlane {
  const layout = getTilePlaneLayout(bitmap.width, bitmap.height, rect, level, ratioX, ratioY)
  const canvas = new OffscreenCanvas(layout.width, layout.height)
  try {
    const context = canvas.getContext('2d', { colorSpace, alpha: true })
    if (!context) {
      throw new Error('Cannot create tile canvas')
    }
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    // Rasterize from the already-oriented bitmap using display-space coordinates.
    // Re-cropping an EXIF-backed ImageBitmap can apply orientation to each crop.
    context.drawImage(bitmap, ...layout.source, 0, 0, layout.width, layout.height)
    return { bitmap: canvas.transferToImageBitmap(), uv: layout.uv }
  }
  finally {
    canvas.width = 0
    canvas.height = 0
  }
}
