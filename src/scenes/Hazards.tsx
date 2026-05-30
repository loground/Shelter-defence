import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import type { Group } from 'three'
import { MathUtils } from 'three'
import type { GameStats } from '../types/game'

type HazardKind = 'box' | 'octahedron' | 'tetrahedron'

type Hazard = {
  id: number
  kind: HazardKind
  color: string
  radius: number
  spin: number
  x: number
  y: number
  vx: number
  vy: number
}

type HazardsProps = {
  active: boolean
  onLose: () => void
  onStatsChange: (stats: GameStats) => void
}

const SHELTER_CENTER = { x: 0, y: -1.42 }
const SHELTER_COLLISION_RADIUS = 0.43
const SPAWN_SHELTER_CLEARANCE = 1.45
const MAX_SPEED = 1.8
const REPEL_RADIUS = 0.78
const REPEL_FORCE = 4.4

function randomBetween(min: number, max: number) {
  return MathUtils.lerp(min, max, Math.random())
}

function createHazard(id: number, bounds: { x: number; y: number }): Hazard {
  const radius = randomBetween(0.16, 0.27)
  let x = 0
  let y = 0

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const side = Math.floor(Math.random() * 4)
    x = side < 2 ? randomBetween(-bounds.x, bounds.x) : (side === 2 ? -bounds.x : bounds.x) * 0.92
    y = side < 2 ? (side === 0 ? bounds.y : -bounds.y * 0.45) : randomBetween(-bounds.y * 0.1, bounds.y)

    const shelterDistance = Math.hypot(x - SHELTER_CENTER.x, y - SHELTER_CENTER.y)
    if (shelterDistance > SPAWN_SHELTER_CLEARANCE + radius) break
  }

  if (Math.hypot(x - SHELTER_CENTER.x, y - SHELTER_CENTER.y) <= SPAWN_SHELTER_CLEARANCE + radius) {
    x = x < 0 ? -bounds.x * 0.86 : bounds.x * 0.86
    y = Math.max(y, -bounds.y * 0.05)
  }

  const towardShelter = Math.atan2(SHELTER_CENTER.y - y, SHELTER_CENTER.x - x)
  const speed = randomBetween(0.34, 0.62)
  const kinds: HazardKind[] = ['box', 'octahedron', 'tetrahedron']
  const colors = ['#ff5e57', '#ffd166', '#5ee0ff', '#da77ff', '#fff3b0']

  return {
    id,
    kind: kinds[id % kinds.length],
    color: colors[id % colors.length],
    radius,
    spin: randomBetween(-2.4, 2.4),
    x,
    y,
    vx: Math.cos(towardShelter) * speed + randomBetween(-0.16, 0.16),
    vy: Math.sin(towardShelter) * speed + randomBetween(-0.1, 0.1),
  }
}

function HazardGeometry({ kind }: { kind: HazardKind }) {
  if (kind === 'octahedron') return <octahedronGeometry args={[1, 0]} />
  if (kind === 'tetrahedron') return <tetrahedronGeometry args={[1, 0]} />
  return <boxGeometry args={[1.15, 1.15, 1.15]} />
}

export function Hazards({ active, onLose, onStatsChange }: HazardsProps) {
  const { pointer, viewport } = useThree()
  const [hazards, setHazards] = useState<Hazard[]>([])
  const hazardsRef = useRef<Hazard[]>([])
  const hazardGroups = useRef(new Map<number, Group>())
  const nextId = useRef(1)
  const elapsed = useRef(0)
  const spawnTimer = useRef(0)
  const statsTimer = useRef(0)
  const hasLost = useRef(false)

  useEffect(() => {
    hazardsRef.current = hazards
  }, [hazards])

  useEffect(() => {
    hazardsRef.current = []
    setHazards([])
    nextId.current = 1
    elapsed.current = 0
    spawnTimer.current = 0
    statsTimer.current = 0
    hasLost.current = false
    onStatsChange({ elapsedSeconds: 0, hazardCount: 0 })
  }, [onStatsChange])

  useFrame((_, rawDelta) => {
    if (!active || hasLost.current) return

    const delta = Math.min(rawDelta, 0.033)
    elapsed.current += delta
    spawnTimer.current -= delta
    statsTimer.current -= delta

    const bounds = {
      x: viewport.width / 2 - 0.26,
      y: viewport.height / 2 - 0.24,
    }

    const spawnInterval = Math.max(0.32, 1.25 - elapsed.current * 0.025)
    const maxHazards = Math.min(70, 5 + Math.floor(elapsed.current / 2.6))
    if (spawnTimer.current <= 0 && hazardsRef.current.length < maxHazards) {
      const nextHazard = createHazard(nextId.current, bounds)
      nextId.current += 1
      hazardsRef.current = [...hazardsRef.current, nextHazard]
      setHazards(hazardsRef.current)
      spawnTimer.current = spawnInterval
    }

    const mouse = {
      x: pointer.x * viewport.width * 0.5,
      y: pointer.y * viewport.height * 0.5,
    }

    for (const hazard of hazardsRef.current) {
      const dx = hazard.x - mouse.x
      const dy = hazard.y - mouse.y
      const distance = Math.hypot(dx, dy)

      if (distance > 0.001 && distance < REPEL_RADIUS) {
        const force = (1 - distance / REPEL_RADIUS) * REPEL_FORCE
        hazard.vx += (dx / distance) * force * delta
        hazard.vy += (dy / distance) * force * delta
      }

      const speed = Math.hypot(hazard.vx, hazard.vy)
      if (speed > MAX_SPEED) {
        hazard.vx = (hazard.vx / speed) * MAX_SPEED
        hazard.vy = (hazard.vy / speed) * MAX_SPEED
      }

      hazard.x += hazard.vx * delta
      hazard.y += hazard.vy * delta

      const xLimit = bounds.x - hazard.radius
      const yLimit = bounds.y - hazard.radius
      if (hazard.x > xLimit || hazard.x < -xLimit) {
        hazard.x = MathUtils.clamp(hazard.x, -xLimit, xLimit)
        hazard.vx *= -1
      }
      if (hazard.y > yLimit || hazard.y < -yLimit) {
        hazard.y = MathUtils.clamp(hazard.y, -yLimit, yLimit)
        hazard.vy *= -1
      }

      const shelterDistance = Math.hypot(hazard.x - SHELTER_CENTER.x, hazard.y - SHELTER_CENTER.y)
      if (shelterDistance < SHELTER_COLLISION_RADIUS + hazard.radius) {
        hasLost.current = true
        onLose()
        return
      }

      const group = hazardGroups.current.get(hazard.id)
      if (group) {
        group.position.set(hazard.x, hazard.y, 0)
        group.rotation.x += hazard.spin * delta
        group.rotation.y += (hazard.spin * 0.73 + 0.4) * delta
      }
    }

    if (statsTimer.current <= 0) {
      onStatsChange({
        elapsedSeconds: Math.floor(elapsed.current),
        hazardCount: hazardsRef.current.length,
      })
      statsTimer.current = 0.25
    }
  })

  return (
    <group position={[0, 0, 0.38]}>
      {hazards.map((hazard) => (
        <group
          key={hazard.id}
          ref={(group) => {
            if (group) hazardGroups.current.set(hazard.id, group)
            else hazardGroups.current.delete(hazard.id)
          }}
          position={[hazard.x, hazard.y, 0]}
        >
          <mesh scale={hazard.radius * 1.85}>
            <HazardGeometry kind={hazard.kind} />
            <meshBasicMaterial color={hazard.color} transparent opacity={0.22} depthWrite={false} />
          </mesh>
          <mesh scale={hazard.radius}>
            <HazardGeometry kind={hazard.kind} />
            <meshStandardMaterial
              color={hazard.color}
              emissive={hazard.color}
              emissiveIntensity={1.65}
              roughness={0.38}
              metalness={0.12}
            />
          </mesh>
          <mesh scale={hazard.radius * 1.08}>
            <HazardGeometry kind={hazard.kind} />
            <meshBasicMaterial color="#fff7d6" wireframe transparent opacity={0.5} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
