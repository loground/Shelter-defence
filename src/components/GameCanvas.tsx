import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useState } from 'react'
import { MathUtils } from 'three'
import { RainOnGlass } from '../effects/RainOnGlass'
import { HazardAssetsPreload, Hazards } from '../scenes/Hazards'
import { ShelterScene } from '../scenes/ShelterScene'
import type { GamePhase, GameStats } from '../types/game'
import { getWavedash } from '../wavedash'

type GameCanvasProps = {
  phase: GamePhase
  runId: number
  blastId: number
  onLose: () => void
  onStatsChange: (stats: GameStats) => void
}

let didStartWavedashInit = false
let didReportInitialWavedashProgress = false

function CameraRig({ phase }: { phase: GamePhase }) {
  const { camera } = useThree()
  const hasStarted = phase !== 'launch'

  useFrame((_, delta) => {
    const targetY = hasStarted ? 1.05 : 1.25
    const targetZ = hasStarted ? 5.35 : 5
    const targetFov = hasStarted ? 44 : 42
    const smoothness = hasStarted ? 1.25 : 1.8

    camera.position.y = MathUtils.damp(camera.position.y, targetY, smoothness, delta)
    camera.position.z = MathUtils.damp(camera.position.z, targetZ, smoothness, delta)
    if ('fov' in camera) {
      camera.fov = MathUtils.damp(camera.fov, targetFov, smoothness, delta)
    }
    camera.lookAt(0, hasStarted ? -0.22 : -0.05, 0)
    camera.updateProjectionMatrix()
  })

  return null
}

function WavedashBoot({ ready }: { ready: boolean }) {
  useEffect(() => {
    if (didReportInitialWavedashProgress) return

    void getWavedash().then((Wavedash) => {
      Wavedash.updateLoadProgressZeroToOne(0.3)
      didReportInitialWavedashProgress = true
    })
  }, [])

  useEffect(() => {
    if (didStartWavedashInit || !ready) return

    didStartWavedashInit = true
    void getWavedash().then((Wavedash) => {
      Wavedash.updateLoadProgressZeroToOne(1)
      Wavedash.init({ debug: true })
    })
  }, [ready])

  return null
}

export function GameCanvas({ phase, runId, blastId, onLose, onStatsChange }: GameCanvasProps) {
  const [assetsReady, setAssetsReady] = useState(false)
  const hasStarted = phase !== 'launch'
  const handleSceneReady = useCallback(() => {
    setAssetsReady(true)
  }, [])

  return (
    <Canvas camera={{ position: [0, 1.25, 5], fov: 42 }}>
      <WavedashBoot ready={assetsReady} />
      <CameraRig phase={phase} />
      <Suspense fallback={null}>
        <HazardAssetsPreload />
      </Suspense>
      <ShelterScene phase={phase} onReady={handleSceneReady} />
      {hasStarted && (
        <Hazards
          key={runId}
          active={phase === 'playing'}
          blastId={blastId}
          onLose={onLose}
          onStatsChange={onStatsChange}
        />
      )}
      <RainOnGlass phase={phase} />
    </Canvas>
  )
}
