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
  return { canvas, image, calls }
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
