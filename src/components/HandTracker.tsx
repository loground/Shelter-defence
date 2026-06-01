import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { useEffect, useRef } from 'react'
import type { HandPoint } from '../types/input'

type HandTrackerProps = {
  active: boolean
  onHandPoints: (points: HandPoint[]) => void
  onReady: () => void
  onError: () => void
}

export function HandTracker({ active, onHandPoints, onReady, onError }: HandTrackerProps) {
  const video = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    let cancelled = false
    let frameId = 0
    let stream: MediaStream | null = null
    let landmarker: HandLandmarker | null = null

    async function startTracking() {
      if (!active || !video.current) {
        onHandPoints([])
        return
      }

      try {
        const vision = await FilesetResolver.forVisionTasks('/mediapipe/wasm')
        if (cancelled) return

        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/mediapipe/hand_landmarker.task',
          },
          numHands: 1,
          runningMode: 'VIDEO',
        })
        if (cancelled) return

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        })
        if (cancelled || !video.current) return

        video.current.srcObject = stream
        await video.current.play()
        onReady()

        const detect = () => {
          if (cancelled || !video.current || !landmarker) return

          const result = landmarker.detectForVideo(video.current, performance.now())
          const landmarks = result.landmarks[0] ?? []
          onHandPoints(
            landmarks.map((point) => ({
              x: 1 - point.x,
              y: point.y,
            })),
          )
          frameId = window.requestAnimationFrame(detect)
        }

        detect()
      } catch {
        onHandPoints([])
        onError()
      }
    }

    void startTracking()

    return () => {
      cancelled = true
      if (frameId) window.cancelAnimationFrame(frameId)
      stream?.getTracks().forEach((track) => track.stop())
      landmarker?.close()
      onHandPoints([])
    }
  }, [active, onError, onHandPoints, onReady])

  return <video ref={video} className="hand-video" playsInline muted aria-hidden="true" />
}
