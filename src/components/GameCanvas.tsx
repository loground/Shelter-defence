import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useState } from 'react'
import { MathUtils } from 'three'
import { RainOnGlass } from '../effects/RainOnGlass'
import { HazardAssetsPreload, Hazards } from '../scenes/Hazards'
import { SharedGltfLoaderProvider } from '../loaders/useSharedGltfLoader'
import { ShelterScene } from '../scenes/ShelterScene'
import type { GamePhase, GameStats } from '../types/game'
import { HAND_INPUT_SCALE, type HandPoint, type InputMode } from '../types/input'
import { getWavedash } from '../wavedash'

type GameCanvasProps = {
  phase: GamePhase
  runId: number
  blastId: number
  inputMode: InputMode
  handPoints: HandPoint[]
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

function HandMarker({ active, handPoints }: { active: boolean; handPoints: HandPoint[] }) {
  const { viewport } = useThree()
  if (!active || handPoints.length === 0) return null

  const points = handPoints.map((point) => ({
    x: (point.x - 0.5) * viewport.width * HAND_INPUT_SCALE,
    y: (0.5 - point.y) * viewport.height * HAND_INPUT_SCALE,
  }))
  const center = points.reduce(
    (sum, point) => ({
      x: sum.x + point.x / points.length,
      y: sum.y + point.y / points.length,
    }),
    { x: 0, y: 0 },
  )
  const radius = Math.max(
    0.18,
    Math.min(0.56, Math.max(...points.map((point) => Math.hypot(point.x - center.x, point.y - center.y))) + 0.12),
  )

  return (
    <group renderOrder={40}>
      <mesh position={[center.x, center.y, 1.06]} scale={radius} renderOrder={40}>
        <circleGeometry args={[1, 64]} />
        <meshBasicMaterial color="#5ee7ff" transparent opacity={0.1} depthTest={false} depthWrite={false} />
      </mesh>
      <mesh position={[center.x, center.y, 1.08]} scale={radius} renderOrder={41}>
        <ringGeometry args={[0.92, 1, 64]} />
        <meshBasicMaterial color="#bdf7ff" transparent opacity={0.78} depthTest={false} depthWrite={false} />
      </mesh>
      <mesh position={[center.x, center.y, 1.09]} renderOrder={42}>
        <sphereGeometry args={[0.055, 16, 10]} />
        <meshBasicMaterial color="#fff1bd" transparent opacity={0.95} depthTest={false} depthWrite={false} />
      </mesh>
    </group>
  )
}

export function GameCanvas({ phase, runId, blastId, inputMode, handPoints, onLose, onStatsChange }: GameCanvasProps) {
  const [assetsReady, setAssetsReady] = useState(false)
  const hasStarted = phase !== 'launch'
  const handleSceneReady = useCallback(() => {
    setAssetsReady(true)
  }, [])

  return (
    <Canvas camera={{ position: [0, 1.25, 5], fov: 42 }}>
      <SharedGltfLoaderProvider>
        <WavedashBoot ready={assetsReady} />
        <CameraRig phase={phase} />
        <Suspense fallback={null}>
          <HazardAssetsPreload />
        </Suspense>
        <ShelterScene phase={phase} onReady={handleSceneReady} />
        <HandMarker active={phase === 'playing' && inputMode === 'hands'} handPoints={handPoints} />
        {hasStarted && (
          <Hazards
            key={runId}
            active={phase === 'playing'}
            blastId={blastId}
            inputMode={inputMode}
            handPoints={handPoints}
            onLose={onLose}
            onStatsChange={onStatsChange}
          />
        )}
        <RainOnGlass phase={phase} />
      </SharedGltfLoaderProvider>
    </Canvas>
  )
}
