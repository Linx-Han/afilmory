import { Thumbhash } from '@afilmory/ui'
import { Spring } from '@afilmory/utils'
import { getViewerTransitionTriggerProps } from '@afilmory/viewer-motion'
import clsx from 'clsx'
import { m, useReducedMotion } from 'motion/react'
import { Fragment, memo, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useContextPhotos, usePhotoViewer } from '~/hooks/usePhotoViewer'
import { isMobileDevice } from '~/lib/device-viewport'
import { ImageLoaderManager } from '~/lib/image-loader-manager'
import type { PhotoManifest } from '~/types/photo'

import { MemoryGlow } from './memory-glow/MemoryGlow'

export const MasonryPhotoItem = memo(({ data, width }: { data: PhotoManifest, width: number }) => {
  const reduceMotion = useReducedMotion()
  const photos = useContextPhotos()
  const photoViewer = usePhotoViewer()
  const { t } = useTranslation()
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Live Photo 相关状态
  const [isPlayingLivePhoto, setIsPlayingLivePhoto] = useState(false)
  const [livePhotoVideoLoaded, setLivePhotoVideoLoaded] = useState(false)
  const [isConvertingVideo, setIsConvertingVideo] = useState(false)
  const [videoConversionError, setVideoConversionError] = useState<unknown>(null)

  const imageRef = useRef<HTMLImageElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null)
  const imageLoaderManagerRef = useRef<ImageLoaderManager | null>(null)

  const handleImageLoad = () => {
    setImageLoaded(true)
  }

  const handleImageError = () => {
    setImageError(true)
  }

  const handleClick = () => {
    const photoIndex = photos.findIndex(photo => photo.id === data.id)
    if (photoIndex !== -1) {
      const triggerEl
        = imageRef.current?.parentElement instanceof HTMLElement ? imageRef.current.parentElement : imageRef.current

      photoViewer.openViewer(photoIndex, triggerEl ?? undefined)
    }
  }

  // 计算基于宽度的高度
  const calculatedHeight = width / data.aspectRatio

  // 检查是否有视频内容（Live Photo 或 Motion Photo）
  const hasVideo = data.video !== undefined

  // Live Photo/Motion Photo 视频加载逻辑
  useEffect(() => {
    if (!data.video || !imageLoaded || livePhotoVideoLoaded || isConvertingVideo || !videoRef.current) {
      return
    }

    const { video, originalUrl } = data

    const loadVideo = async () => {
      setIsConvertingVideo(true)

      // 创建新的 image loader manager
      const imageLoaderManager = new ImageLoaderManager()
      imageLoaderManagerRef.current = imageLoaderManager

      try {
        // 构造 VideoSource（适配前端格式）- 使用 type narrowing
        let videoSource: Parameters<typeof imageLoaderManager.processVideo>[0]

        if (video.type === 'motion-photo') {
          videoSource = {
            type: 'motion-photo',
            imageUrl: originalUrl,
            offset: video.offset,
            size: video.size,
            presentationTimestamp: video.presentationTimestamp,
          }
        }
        else if (video.type === 'live-photo') {
          videoSource = {
            type: 'live-photo',
            videoUrl: video.videoUrl,
          }
        }
        else {
          videoSource = { type: 'none' }
        }

        if (videoSource.type !== 'none') {
          await imageLoaderManager.processVideo(videoSource, videoRef.current!)
          setLivePhotoVideoLoaded(true)
        }
      }
      catch (videoError) {
        console.error('Failed to process video:', videoError)
        setVideoConversionError(videoError)
      }
      finally {
        setIsConvertingVideo(false)
      }
    }

    loadVideo()

    return () => {
      if (imageLoaderManagerRef.current) {
        imageLoaderManagerRef.current.cleanup()
        imageLoaderManagerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.video, data.originalUrl, imageLoaded, livePhotoVideoLoaded])

  // Live Photo/Motion Photo hover 处理（仅在桌面端）
  const handleMouseEnter = useCallback(() => {
    if (isMobileDevice || !hasVideo || !livePhotoVideoLoaded || isPlayingLivePhoto || isConvertingVideo) {
      return
    }

    hoverTimerRef.current = setTimeout(() => {
      setIsPlayingLivePhoto(true)
      const video = videoRef.current
      if (video) {
        video.currentTime = 0
        video.play()
      }
    }, 200) // 200ms hover 延迟
  }, [hasVideo, livePhotoVideoLoaded, isPlayingLivePhoto, isConvertingVideo])

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }

    if (isPlayingLivePhoto) {
      setIsPlayingLivePhoto(false)
      const video = videoRef.current
      if (video) {
        video.pause()
        video.currentTime = 0
      }
    }
  }, [isPlayingLivePhoto])

  // 视频播放结束处理
  const handleVideoEnded = useCallback(() => {
    setIsPlayingLivePhoto(false)
  }, [])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current)
        hoverTimerRef.current = null
      }
    }
  }, [])

  return (
    <m.div
      whileHover={reduceMotion ? undefined : { scale: 1.025 }}
      transition={Spring.presets.smooth}
      className="memory-photo-surface bg-fill-quaternary group relative w-full cursor-pointer overflow-hidden"
      style={{
        width,
        height: calculatedHeight,
      }}
      {...getViewerTransitionTriggerProps(data.id)}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Blurhash 占位符 */}
      {data.thumbHash && <Thumbhash thumbHash={data.thumbHash} className="memory-photo-base absolute inset-0" />}

      {!imageError && (
        <img
          ref={imageRef}
          src={data.thumbnailUrl}
          alt={data.title}
          loading="lazy"
          className="memory-photo-base absolute inset-0 h-full w-full object-cover"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}

      <MemoryGlow imageRef={imageRef} disabled={hasVideo || !imageLoaded || imageError} />

      {/* Live Photo/Motion Photo 视频 */}
      {hasVideo && (
        <video
          ref={videoRef}
          className={clsx(
            'absolute inset-0 h-full w-full object-cover',
            isPlayingLivePhoto ? 'z-10' : 'pointer-events-none opacity-0',
          )}
          muted
          playsInline
          onEnded={handleVideoEnded}
        />
      )}

      {/* 错误状态 */}
      {imageError && (
        <div className="bg-fill-quaternary text-text-tertiary absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <i className="i-mingcute-image-line text-2xl" />
            <p className="mt-2 text-sm">{t('photo.error.loading')}</p>
          </div>
        </div>
      )}

      {/* Live Photo/Motion Photo 标识 */}
      {hasVideo && (
        <div
          className={clsx(
            'absolute z-20 flex items-center space-x-1 rounded-xl bg-black/50 px-1 py-1 text-xs text-white transition-all duration-200 hover:bg-black/70',
            'top-2 left-2',
            'flex-wrap gap-y-1',
          )}
          title={isMobileDevice ? t('photo.live.tooltip.mobile.main') : t('photo.live.tooltip.desktop.main')}
        >
          {isConvertingVideo ? (
            <div className="flex items-center gap-1 px-1">
              <i className="i-mingcute-loading-line animate-spin" />
              <span>{t('loading.converting')}</span>
            </div>
          ) : (
            <Fragment>
              <i className="i-mingcute-live-photo-line size-4 shrink-0" />
              <span className="mr-1 shrink-0">{t('photo.live.badge')}</span>
              {videoConversionError ? (
                <span className="bg-warning/20 ml-0.5 rounded px-1 text-xs">
                  <div
                    className="text-yellow w-3 text-center font-bold"
                    title={(videoConversionError as Error).message}
                  >
                    !
                  </div>
                </span>
              ) : null}
            </Fragment>
          )}
        </div>
      )}
    </m.div>
  )
})
