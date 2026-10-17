import assert from 'node:assert/strict'

import { afterEach, it, vi } from 'vitest'

import { createTilePlane, getTilePlaneLayout } from './webgpu-tile-plane'
import type { Rect } from './webgpu-tiles'

afterEach(() => vi.unstubAllGlobals())

function contentRect(layout: ReturnType<typeof getTilePlaneLayout>): Rect {
  const [x, y, width, height] = layout.source
  return [x + layout.uv[0] * width, y + layout.uv[1] * height, layout.uv[2] * width, layout.uv[3] * height]
}

it('keeps every portrait tile in oriented coordinates with no missing or overlapping content', () => {
  const width = 4284
  const height = 5712
  for (const level of [0, 1, 2]) {
    const span = 1024 * 2 ** level
    let area = 0
    for (let y = 0; y < height; y += span) {
      for (let x = 0; x < width; x += span) {
        const rect: Rect = [x, y, Math.min(span, width - x), Math.min(span, height - y)]
        const layout = getTilePlaneLayout(width, height, rect, level)
        contentRect(layout).forEach((value, index) => assert.ok(Math.abs(value - rect[index]) < 1e-8))
        assert.ok(layout.source[0] >= 0 && layout.source[1] >= 0)
        assert.ok(layout.source[0] + layout.source[2] <= width)
        assert.ok(layout.source[1] + layout.source[3] <= height)
        assert.ok(layout.width <= 1028 && layout.height <= 1028)
        area += rect[2] * rect[3]
      }
    }
    assert.equal(area, width * height)
  }
})

it('keeps fractional-resolution gain maps registered to the base image', () => {
  const rect: Rect = [4096, 5120, 188, 592]
  const ratioX = 1071 / 4284
  const ratioY = 1428 / 5712
  const layout = getTilePlaneLayout(1071, 1428, rect, 0, ratioX, ratioY)
  assert.deepEqual(contentRect(layout), [1024, 1280, 47, 148])
  assert.ok(layout.uv.every(value => value >= 0 && value <= 1))
})

it('rasterizes tiles through Canvas and preserves the color space of each plane', () => {
  const drawImage = vi.fn()
  const getContext = vi.fn(() => ({ drawImage, imageSmoothingEnabled: false, imageSmoothingQuality: 'low' }))
  const output = {} as ImageBitmap
  const canvases: { width: number, height: number }[] = []
  vi.stubGlobal(
    'OffscreenCanvas',
    class {
      constructor(
        public width: number,
        public height: number,
      ) {
        canvases.push(this)
      }

      getContext = getContext
      transferToImageBitmap = () => output
    },
  )
  const recrop = vi.fn(() => {
    throw new Error('Must not re-crop an EXIF-backed bitmap')
  })
  vi.stubGlobal('createImageBitmap', recrop)
  const bitmap = { width: 4284, height: 5712 } as ImageBitmap
  const result = createTilePlane(bitmap, [1024, 2048, 1024, 1024], 0, 'display-p3')
  assert.equal(result.bitmap, output)
  assert.deepEqual(drawImage.mock.calls[0], [bitmap, 1022, 2046, 1028, 1028, 0, 0, 1028, 1028])
  assert.deepEqual(getContext.mock.calls[0], ['2d', { colorSpace: 'display-p3', alpha: true }])
  createTilePlane(bitmap, [0, 0, 1024, 1024], 0, 'srgb')
  assert.deepEqual(getContext.mock.calls[1], ['2d', { colorSpace: 'srgb', alpha: true }])
  assert.equal(recrop.mock.calls.length, 0)
  assert.ok(canvases.every(canvas => canvas.width === 0 && canvas.height === 0))
})

it('fails cleanly and releases the canvas when drawing is unavailable', () => {
  const canvases: { width: number, height: number }[] = []
  vi.stubGlobal(
    'OffscreenCanvas',
    class {
      constructor(
        public width: number,
        public height: number,
      ) {
        canvases.push(this)
      }

      getContext = () => null
    },
  )
  assert.throws(() => createTilePlane({ width: 100, height: 100 } as ImageBitmap, [0, 0, 100, 100], 0, 'srgb'))
  assert.equal(canvases[0].width, 0)
  assert.equal(canvases[0].height, 0)
})
