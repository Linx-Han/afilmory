import './memory-glow.css'

import type { RefObject } from 'react'
import { useEffect } from 'react'

import { createMemoryRenderer } from './renderer'

export function MemoryGlow({
  imageRef,
  videoRef,
  disabled = false,
}: {
  imageRef: RefObject<HTMLImageElement | null>
  videoRef?: RefObject<HTMLVideoElement | null>
  disabled?: boolean
}) {
  useEffect(() => {
    const image = imageRef.current
    const surface = image?.parentElement
    if (!image || !surface || disabled) {
      return
    }
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const transparency = window.matchMedia('(prefers-reduced-transparency: reduce)')
    const pointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    let renderer: ReturnType<typeof createMemoryRenderer> | undefined
    let canvas: HTMLCanvasElement | undefined
    let contextEvents: AbortController | undefined
    let request = 0
    let timer = 0
    let generation = 0
    let hovered = false
    let amount = 0
    let previous = 0
    let elapsed = 0
    let pendingImage: HTMLImageElement | undefined
    let stillImage: HTMLImageElement | undefined

    const stop = () => {
      generation++
      window.clearTimeout(timer)
      cancelAnimationFrame(request)
      if (pendingImage) {
        pendingImage.onload = null
        pendingImage.onerror = null
        pendingImage = undefined
      }
      delete surface.dataset.memoryActive
      contextEvents?.abort()
      renderer?.dispose()
      canvas?.remove()
      canvas = undefined
      renderer = undefined
      stillImage = undefined
      amount = 0
      elapsed = 0
      previous = 0
    }
    const tick = (now: number) => {
      if (!renderer) {
        return
      }
      if (now - previous < 1000 / 24) {
        request = requestAnimationFrame(tick)
        return
      }
      const delta = previous ? Math.min(now - previous, 80) : 1000 / 24
      previous = now
      elapsed += delta / 1000
      amount = Math.max(0, Math.min(1, amount + ((hovered ? 1 : -1) * delta) / 300))
      if (!hovered && amount === 0) {
        stop()
        return
      }
      try {
        const video = videoRef?.current
        const source = video && !video.paused && !video.ended ? video : stillImage
        if (source) {
          renderer.updateSource(source)
        }
        renderer.draw(elapsed, amount * amount * (3 - 2 * amount))
      }
      catch {
        stop()
        return
      }
      surface.dataset.memoryActive = ''
      request = requestAnimationFrame(tick)
    }
    const enter = () => {
      hovered = true
      if (
        renderer
        || !pointer.matches
        || motion.matches
        || transparency.matches
        || document.hidden
        || !image.complete
        || !image.naturalWidth
      ) {
        return
      }
      window.clearTimeout(timer)
      const token = ++generation
      timer = window.setTimeout(() => {
        const source = new Image()
        pendingImage = source
        source.crossOrigin = 'anonymous'
        source.onload = () => {
          pendingImage = undefined
          if (token !== generation || !hovered) {
            return
          }
          try {
            const width = surface.clientWidth
            const height = surface.clientHeight
            if (width <= 0 || height <= 0) {
              return
            }
            canvas = document.createElement('canvas')
            canvas.className = 'memory-glow pointer-events-none absolute'
            canvas.setAttribute('aria-hidden', 'true')
            contextEvents = new AbortController()
            canvas.addEventListener('webglcontextlost', lost, { signal: contextEvents.signal })
            surface.insertBefore(canvas, image.nextSibling)
            renderer = createMemoryRenderer(canvas, source, width, height)
            stillImage = source
            request = requestAnimationFrame(tick)
          }
          catch {
            stop()
          }
        }
        source.onerror = stop
        source.src = image.currentSrc || image.src
      }, 120)
    }
    const leave = () => {
      hovered = false
      if (!renderer) {
        stop()
      }
    }
    const suspend = () => {
      hovered = false
      stop()
    }
    const lost = (event: Event) => {
      event.preventDefault()
      suspend()
    }
    surface.addEventListener('pointerenter', enter)
    surface.addEventListener('pointerleave', leave)
    surface.addEventListener('pointerdown', suspend)
    image.addEventListener('load', suspend)
    document.addEventListener('visibilitychange', suspend)
    window.addEventListener('blur', suspend)
    window.addEventListener('scroll', suspend, true)
    motion.addEventListener('change', suspend)
    transparency.addEventListener('change', suspend)
    pointer.addEventListener('change', suspend)
    const resize = new ResizeObserver(suspend)
    resize.observe(surface)
    return () => {
      surface.removeEventListener('pointerenter', enter)
      surface.removeEventListener('pointerleave', leave)
      surface.removeEventListener('pointerdown', suspend)
      image.removeEventListener('load', suspend)
      document.removeEventListener('visibilitychange', suspend)
      window.removeEventListener('blur', suspend)
      window.removeEventListener('scroll', suspend, true)
      motion.removeEventListener('change', suspend)
      transparency.removeEventListener('change', suspend)
      pointer.removeEventListener('change', suspend)
      resize.disconnect()
      stop()
    }
  }, [imageRef, videoRef, disabled])

  return null
}
