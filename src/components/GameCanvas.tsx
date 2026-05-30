import { Canvas } from '@react-three/fiber'
import { RainOnGlass } from '../effects/RainOnGlass'
import { Hazards } from '../scenes/Hazards'
import { ShelterScene } from '../scenes/ShelterScene'
import type { GamePhase, GameStats } from '../types/game'

type GameCanvasProps = {
  phase: GamePhase
  runId: number
  onLose: () => void
  onStatsChange: (stats: GameStats) => void
}

export function GameCanvas({ phase, runId, onLose, onStatsChange }: GameCanvasProps) {
  const hasStarted = phase !== 'launch'

  return (
    <Canvas camera={{ position: [0, 1.25, 5], fov: 42 }}>
      <ShelterScene phase={phase} />
      {hasStarted && (
        <Hazards key={runId} active={phase === 'playing'} onLose={onLose} onStatsChange={onStatsChange} />
      )}
      <RainOnGlass phase={phase} />
    </Canvas>
  )
}
