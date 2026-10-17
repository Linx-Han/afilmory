import assert from 'node:assert/strict'

import { afterEach, it, vi } from 'vitest'

import { createMemoryRenderer } from './renderer'

afterEach(() => vi.unstubAllGlobals())

function fixture({ uploadFails = false, compileFails = false } = {}) {
  const calls: { name: string, args: unknown[] }[] = []
  const context = new Proxy(
    { NO_ERROR: 0 },
    {
      get(target, key: string) {
        if (key === 'NO_ERROR') {
          return target.NO_ERROR
        }
        if (key.toUpperCase() === key) {
          return key
        }
        return (...args: unknown[]) => {
          calls.push({ name: key, args })
          if (key === 'getShaderParameter') {
            return !compileFails
          }
          if (key === 'getProgramParameter') {
            return true
          }
          if (key === 'getError') {
            return 0
          }
          if (key === 'getUniformLocation') {
            return args[1]
          }
          if (key === 'getExtension') {
            return { loseContext: () => calls.push({ name: 'loseContext', args: [] }) }
          }
          if (key === 'texImage2D' && uploadFails) {
            throw new Error('Cross-origin texture blocked')
          }
          return {}
        }
      },
    },
  )
  const canvas = { width: 0, height: 0, getContext: () => context } as unknown as HTMLCanvasElement
  const image = { naturalWidth: 800, naturalHeight: 400 } as HTMLImageElement
  vi.stubGlobal('window', { devicePixelRatio: 3 })
  const drawImage = vi.fn()
  const frameCanvas = { width: 0, height: 0, getContext: () => ({ drawImage }) }
  vi.stubGlobal('document', { createElement: () => frameCanvas })
  return { canvas, image, calls, frameCanvas, drawImage }
}

it('caps rendering resolution, crops without distortion, and releases GPU resources', () => {
  const { canvas, image, calls } = fixture()
  const renderer = createMemoryRenderer(canvas, image, 1000, 1000)
  assert.equal(canvas.width, 1200)
  assert.equal(canvas.height, 1200)
  assert.deepEqual(calls.find(call => call.name === 'uniform2f' && call.args[0] === 'crop')?.args, ['crop', 0.5, 1])
  renderer.draw(2, 0.5)
  assert.equal(calls.filter(call => call.name === 'drawArrays').length, 1)
  renderer.dispose()
  for (const name of ['deleteTexture', 'deleteBuffer', 'deleteProgram', 'loseContext']) {
    assert.equal(calls.filter(call => call.name === name).length, 1)
  }
  assert.equal(calls.filter(call => call.name === 'deleteShader').length, 2)
})

it('cleans up when cross-origin texture upload fails', () => {
  const { canvas, image, calls } = fixture({ uploadFails: true })
  assert.throws(() => createMemoryRenderer(canvas, image, 300, 200), /Cross-origin/)
  assert.equal(calls.filter(call => call.name === 'loseContext').length, 1)
  assert.equal(calls.filter(call => call.name === 'drawArrays').length, 0)
})

it('cleans up partially compiled programs', () => {
  const { canvas, image, calls } = fixture({ compileFails: true })
  assert.throws(() => createMemoryRenderer(canvas, image, 300, 200), /compilation/)
  assert.equal(calls.filter(call => call.name === 'deleteShader').length, 1)
  assert.equal(calls.filter(call => call.name === 'loseContext').length, 1)
})

it('handles unavailable WebGL without changing the source image', () => {
  const canvas = { getContext: () => null } as unknown as HTMLCanvasElement
  assert.throws(() => createMemoryRenderer(canvas, {} as HTMLImageElement, 300, 200), /unavailable/)
})

it('uses live video frames, reuses texture storage, and restores the still on playback end', () => {
  const { canvas, image, calls, frameCanvas, drawImage } = fixture()
  const renderer = createMemoryRenderer(canvas, image, 300, 200)
  const video = { readyState: 2, videoWidth: 3840, videoHeight: 2160, currentTime: 0 } as HTMLVideoElement
  renderer.updateSource(video)
  assert.equal(frameCanvas.width, 1200)
  assert.equal(frameCanvas.height, 675)
  assert.equal(drawImage.mock.calls.length, 1)
  assert.equal(calls.filter(call => call.name === 'texImage2D').length, 2)
  video.currentTime = 0.1
  renderer.updateSource(video)
  assert.equal(calls.filter(call => call.name === 'texSubImage2D').length, 1)
  renderer.updateSource(image)
  assert.equal(
    calls
      .filter(call => call.name === 'texImage2D')
      .at(-1)
      ?.args
      .at(-1),
    image,
  )
  renderer.dispose()
  assert.equal(frameCanvas.width, 0)
  assert.equal(frameCanvas.height, 0)
})

it('skips duplicate video frames and retains the last texture during buffering', () => {
  const { canvas, image, calls, drawImage } = fixture()
  const renderer = createMemoryRenderer(canvas, image, 300, 200)
  const video = { readyState: 2, videoWidth: 1080, videoHeight: 1920, currentTime: 0.5 } as HTMLVideoElement
  renderer.updateSource(video)
  renderer.updateSource(video)
  assert.equal(drawImage.mock.calls.length, 1)
  Object.assign(video, { readyState: 1, currentTime: 0.6 })
  renderer.updateSource(video)
  assert.equal(drawImage.mock.calls.length, 1)
  const crop = calls.filter(call => call.name === 'uniform2f' && call.args[0] === 'crop').at(-1)
  assert.deepEqual(crop?.args, ['crop', 1, 0.375])
  renderer.dispose()
})
