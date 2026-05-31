import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Material, Object3D } from 'three'
import { Box3, Group, MathUtils, Vector3 } from 'three'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { GAME_SHELTER } from '../config/shelter'
import type { GameStats } from '../types/game'

type HazardKind = 'bottle' | 'can' | 'rock' | 'stick'

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

const SHELTER_CENTER = { x: GAME_SHELTER.position.x, y: GAME_SHELTER.position.y + 0.7 * GAME_SHELTER.scale }
const MAX_SPEED = 1.8
const REPEL_RADIUS = 0.78
const REPEL_FORCE = 4.4
const HAZARD_RENDER_ORDER = 12
const DRACO_DECODER_PATH = '/draco/'
const BASIS_TRANSCODER_PATH = '/basis/'
const HAZARD_MODELS: Record<HazardKind, string> = {
  bottle: '/3d/bottle1.glb',
  can: '/3d/can1.glb',
  rock: '/3d/rock1.glb',
  stick: '/3d/stick1.glb',
}
const HAZARD_MODEL_ROTATIONS: Record<HazardKind, readonly [number, number, number]> = {
  bottle: [0.35, -0.25, -0.7],
  can: [0.45, 0.15, 0.45],
  rock: [0.1, 0.2, 0.25],
  stick: [0.15, 0.25, 1.1],
}
const modelBox = new Box3()
const modelCenter = new Vector3()
const modelSize = new Vector3()

type ExtendGltfLoader = NonNullable<Parameters<typeof useGLTF>[3]>
type Ktx2CapableLoader = { setKTX2Loader: (loader: unknown) => void }
type MaterialObject = Object3D & {
  material: Material | Material[]
}

type Point = {
  x: number
  y: number
}

function randomBetween(min: number, max: number) {
  return MathUtils.lerp(min, max, Math.random())
}

function toWorldPoint(point: readonly [number, number]): Point {
  return {
    x: GAME_SHELTER.position.x + point[0] * GAME_SHELTER.scale,
    y: GAME_SHELTER.position.y + point[1] * GAME_SHELTER.scale,
  }
}

function distanceToSegment(point: Point, start: Point, end: Point) {
  const segmentX = end.x - start.x
  const segmentY = end.y - start.y
  const lengthSquared = segmentX * segmentX + segmentY * segmentY

  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y)

  const t = MathUtils.clamp(((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) / lengthSquared, 0, 1)
  const closestX = start.x + segmentX * t
  const closestY = start.y + segmentY * t
  return Math.hypot(point.x - closestX, point.y - closestY)
}

function pointInTriangle(point: Point, a: Point, b: Point, c: Point) {
  const d1 = (point.x - b.x) * (a.y - b.y) - (a.x - b.x) * (point.y - b.y)
  const d2 = (point.x - c.x) * (b.y - c.y) - (b.x - c.x) * (point.y - c.y)
  const d3 = (point.x - a.x) * (c.y - a.y) - (c.x - a.x) * (point.y - a.y)
  const hasNegative = d1 < 0 || d2 < 0 || d3 < 0
  const hasPositive = d1 > 0 || d2 > 0 || d3 > 0
  return !(hasNegative && hasPositive)
}

function circleTouchesShelter(point: Point, radius: number) {
  const padding = radius * GAME_SHELTER.hazardCollisionScale + GAME_SHELTER.collisionPadding

  const roofLeft = toWorldPoint(GAME_SHELTER.roof.left)
  const roofRight = toWorldPoint(GAME_SHELTER.roof.right)
  const roofPeak = toWorldPoint(GAME_SHELTER.roof.peak)
  const roofPadding = padding + GAME_SHELTER.roofThickness * GAME_SHELTER.scale

  if (distanceToSegment(point, roofLeft, roofPeak) <= roofPadding) return true
  if (distanceToSegment(point, roofRight, roofPeak) <= roofPadding) return true

  const postHalfWidth = (GAME_SHELTER.body.width * GAME_SHELTER.scale) / 2 + padding
  const postBottom = GAME_SHELTER.position.y
  const postTop = GAME_SHELTER.position.y + GAME_SHELTER.body.height * GAME_SHELTER.scale
  if (
    Math.abs(point.x - GAME_SHELTER.position.x) <= postHalfWidth &&
    point.y >= postBottom - padding &&
    point.y <= postTop + padding
  ) {
    return true
  }

  const entranceLeft = {
    x: GAME_SHELTER.position.x - GAME_SHELTER.body.width * GAME_SHELTER.scale,
    y: postBottom,
  }
  const entranceRight = {
    x: GAME_SHELTER.position.x + GAME_SHELTER.body.width * GAME_SHELTER.scale,
    y: postBottom,
  }
  const entranceTop = {
    x: GAME_SHELTER.position.x,
    y: postTop,
  }

  return (
    pointInTriangle(point, entranceLeft, entranceRight, entranceTop) ||
    distanceToSegment(point, entranceLeft, entranceTop) <= padding ||
    distanceToSegment(point, entranceRight, entranceTop) <= padding
  )
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
    if (shelterDistance > GAME_SHELTER.spawnClearance + radius) break
  }

  if (Math.hypot(x - SHELTER_CENTER.x, y - SHELTER_CENTER.y) <= GAME_SHELTER.spawnClearance + radius) {
    x = x < 0 ? -bounds.x * 0.86 : bounds.x * 0.86
    y = Math.max(y, -bounds.y * 0.05)
  }

  const towardShelter = Math.atan2(SHELTER_CENTER.y - y, SHELTER_CENTER.x - x)
  const speed = randomBetween(0.34, 0.62)
  const kinds: HazardKind[] = ['bottle', 'can', 'rock', 'stick']

  return {
    id,
    kind: kinds[id % kinds.length],
    color: '#fff3b0',
    radius,
    spin: randomBetween(-2.4, 2.4),
    x,
    y,
    vx: Math.cos(towardShelter) * speed + randomBetween(-0.16, 0.16),
    vy: Math.sin(towardShelter) * speed + randomBetween(-0.1, 0.1),
  }
}

function prepareHazardObject(object: Object3D) {
  object.frustumCulled = false
  object.renderOrder = HAZARD_RENDER_ORDER + 1

  if ('material' in object) {
    const materialObject = object as MaterialObject
    const materials = Array.isArray(materialObject.material) ? materialObject.material : [materialObject.material]
    materials.forEach((material) => {
      material.depthTest = false
      material.depthWrite = false
      material.needsUpdate = true
    })
  }
}

function normalizeHazardTemplate(scene: Object3D) {
  const clone = scene.clone(true)
  clone.traverse(prepareHazardObject)
  modelBox.setFromObject(clone)
  modelBox.getCenter(modelCenter)
  modelBox.getSize(modelSize)
  clone.position.sub(modelCenter)

  const normalized = new Group()
  const largestSide = Math.max(modelSize.x, modelSize.y, modelSize.z, 0.001)
  normalized.scale.setScalar(1 / largestSide)
  normalized.add(clone)
  return normalized
}

function useHazardLoader() {
  const { gl } = useThree()
  const ktx2Loader = useMemo(() => {
    const loader = new KTX2Loader()
    loader.setTranscoderPath(BASIS_TRANSCODER_PATH)
    loader.detectSupport(gl)
    return loader
  }, [gl])
  const extendLoader = useCallback(
    ((loader: Ktx2CapableLoader) => {
      loader.setKTX2Loader(ktx2Loader)
    }) as ExtendGltfLoader,
    [ktx2Loader],
  )

  useEffect(() => {
    return () => {
      ktx2Loader.dispose()
    }
  }, [ktx2Loader])

  return extendLoader
}

function useHazardTemplates(extendLoader: ExtendGltfLoader) {
  const bottle = useGLTF(HAZARD_MODELS.bottle, DRACO_DECODER_PATH, false, extendLoader)
  const can = useGLTF(HAZARD_MODELS.can, DRACO_DECODER_PATH, false, extendLoader)
  const rock = useGLTF(HAZARD_MODELS.rock, DRACO_DECODER_PATH, false, extendLoader)
  const stick = useGLTF(HAZARD_MODELS.stick, DRACO_DECODER_PATH, false, extendLoader)

  return useMemo(
    () => ({
      bottle: normalizeHazardTemplate(bottle.scene),
      can: normalizeHazardTemplate(can.scene),
      rock: normalizeHazardTemplate(rock.scene),
      stick: normalizeHazardTemplate(stick.scene),
    }),
    [bottle.scene, can.scene, rock.scene, stick.scene],
  )
}

export function HazardAssetsPreload() {
  const extendLoader = useHazardLoader()
  useHazardTemplates(extendLoader)
  return null
}

function HazardModel({ kind, radius, templates }: { kind: HazardKind; radius: number; templates: Record<HazardKind, Group> }) {
  const model = useMemo(() => {
    const clone = templates[kind].clone(true)
    clone.traverse(prepareHazardObject)
    return clone
  }, [kind, radius, templates])

  return (
    <group scale={radius * 1.9} rotation={HAZARD_MODEL_ROTATIONS[kind]}>
      <primitive object={model} />
    </group>
  )
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
  const extendLoader = useHazardLoader()
  const hazardTemplates = useHazardTemplates(extendLoader)

  useEffect(() => {
    hazardsRef.current = hazards
  }, [hazards])

  useEffect(() => {
    hazardsRef.current = []
    setHazards([])
    nextId.current = 1
    elapsed.current = 0
    spawnTimer.current = 1.1
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

      if (circleTouchesShelter(hazard, hazard.radius)) {
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
    <group position={[0, 0, 0.38]} renderOrder={HAZARD_RENDER_ORDER}>
      {hazards.map((hazard) => (
        <group
          key={hazard.id}
          ref={(group) => {
            if (group) hazardGroups.current.set(hazard.id, group)
            else hazardGroups.current.delete(hazard.id)
          }}
          position={[hazard.x, hazard.y, 0]}
          renderOrder={HAZARD_RENDER_ORDER}
        >
          <mesh scale={hazard.radius * 2.05} renderOrder={HAZARD_RENDER_ORDER}>
            <sphereGeometry args={[1, 18, 12]} />
            <meshBasicMaterial color={hazard.color} transparent opacity={0.2} depthTest={false} depthWrite={false} />
          </mesh>
          <HazardModel kind={hazard.kind} radius={hazard.radius} templates={hazardTemplates} />
        </group>
      ))}
    </group>
  )
}
