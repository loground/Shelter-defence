import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Material, Mesh, Object3D } from 'three'
import { AdditiveBlending, Box3, Group, MathUtils, Vector3 } from 'three'
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

type UmbrellaBonus = {
  id: number
  age: number
  radius: number
  x: number
  y: number
}

type HazardsProps = {
  active: boolean
  blastId: number
  onLose: () => void
  onStatsChange: (stats: GameStats) => void
}

const SHELTER_CENTER = { x: GAME_SHELTER.position.x, y: GAME_SHELTER.position.y + 0.7 * GAME_SHELTER.scale }
const MAX_SPEED = 1.8
const REPEL_RADIUS = 0.78
const REPEL_FORCE = 4.4
const HAZARD_RENDER_ORDER = 12
const UMBRELLA_MODEL_URL = '/3d/umbrella.glb'
const UMBRELLA_LIFETIME = 3
const SHIELD_DURATION = 7
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

function useUmbrellaTemplate(extendLoader: ExtendGltfLoader) {
  const umbrella = useGLTF(UMBRELLA_MODEL_URL, DRACO_DECODER_PATH, false, extendLoader)
  return useMemo(() => normalizeHazardTemplate(umbrella.scene), [umbrella.scene])
}

export function HazardAssetsPreload() {
  const extendLoader = useHazardLoader()
  useHazardTemplates(extendLoader)
  useUmbrellaTemplate(extendLoader)
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

function UmbrellaModel({ radius, template }: { radius: number; template: Group }) {
  const model = useMemo(() => {
    const clone = template.clone(true)
    clone.traverse(prepareHazardObject)
    return clone
  }, [template])

  return (
    <group scale={radius * 2.1} rotation={[0.35, -0.15, -0.35]}>
      <primitive object={model} />
    </group>
  )
}

function StormBurstEffect({ blastId }: { blastId: number }) {
  const ring = useRef<Mesh>(null)
  const glow = useRef<Mesh>(null)
  const age = useRef(999)

  useEffect(() => {
    if (blastId > 0) age.current = 0
  }, [blastId])

  useFrame((_, delta) => {
    age.current += delta
    const progress = MathUtils.clamp(age.current / 0.78, 0, 1)
    const opacity = Math.sin((1 - progress) * Math.PI * 0.5)

    if (ring.current) {
      ring.current.visible = progress < 1
      ring.current.scale.setScalar(0.35 + progress * 5.7)
      const material = ring.current.material as Material & { opacity: number }
      material.opacity = opacity * 0.72
    }

    if (glow.current) {
      glow.current.visible = progress < 1
      glow.current.scale.setScalar(0.5 + progress * 7.4)
      const material = glow.current.material as Material & { opacity: number }
      material.opacity = (1 - progress) * 0.22
    }
  })

  return (
    <group position={[0, 0, 0.08]} renderOrder={HAZARD_RENDER_ORDER + 6}>
      <mesh ref={glow} renderOrder={HAZARD_RENDER_ORDER + 6} visible={false}>
        <circleGeometry args={[1, 48]} />
        <meshBasicMaterial
          color="#ffe5a0"
          transparent
          opacity={0}
          depthTest={false}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      <mesh ref={ring} renderOrder={HAZARD_RENDER_ORDER + 7} visible={false}>
        <ringGeometry args={[0.92, 1, 80]} />
        <meshBasicMaterial
          color="#fff6d0"
          transparent
          opacity={0}
          depthTest={false}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

function ShelterShield({ active }: { active: boolean }) {
  const shield = useRef<Mesh>(null)
  const ring = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    const pulse = Math.sin(clock.elapsedTime * 5.6) * 0.5 + 0.5

    if (shield.current) {
      shield.current.visible = active
      shield.current.scale.set(1.0 + pulse * 0.025, 1.12 + pulse * 0.03, 1)
      const material = shield.current.material as Material & { opacity: number }
      material.opacity = active ? 0.08 + pulse * 0.025 : 0
    }

    if (ring.current) {
      ring.current.visible = active
      ring.current.scale.set(1.03 + pulse * 0.035, 1.15 + pulse * 0.04, 1)
      const material = ring.current.material as Material & { opacity: number }
      material.opacity = active ? 0.32 + pulse * 0.1 : 0
    }
  })

  return (
    <group position={[GAME_SHELTER.position.x, GAME_SHELTER.position.y + 0.38, 0.06]} renderOrder={HAZARD_RENDER_ORDER + 4}>
      <mesh ref={shield} visible={false} renderOrder={HAZARD_RENDER_ORDER + 4}>
        <circleGeometry args={[1, 64]} />
        <meshBasicMaterial
          color="#8de8ff"
          transparent
          opacity={0}
          depthTest={false}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      <mesh ref={ring} visible={false} renderOrder={HAZARD_RENDER_ORDER + 5}>
        <ringGeometry args={[0.96, 1, 96]} />
        <meshBasicMaterial
          color="#bdf7ff"
          transparent
          opacity={0}
          depthTest={false}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

export function Hazards({ active, blastId, onLose, onStatsChange }: HazardsProps) {
  const { pointer, viewport } = useThree()
  const [hazards, setHazards] = useState<Hazard[]>([])
  const [umbrellaBonus, setUmbrellaBonus] = useState<UmbrellaBonus | null>(null)
  const [shieldActive, setShieldActive] = useState(false)
  const hazardsRef = useRef<Hazard[]>([])
  const umbrellaBonusRef = useRef<UmbrellaBonus | null>(null)
  const hazardGroups = useRef(new Map<number, Group>())
  const umbrellaGroup = useRef<Group>(null)
  const nextId = useRef(1)
  const nextBonusId = useRef(1)
  const elapsed = useRef(0)
  const spawnTimer = useRef(0)
  const bonusSpawnTimer = useRef(0)
  const statsTimer = useRef(0)
  const hasLost = useRef(false)
  const shieldUntil = useRef(0)
  const shieldActiveRef = useRef(false)
  const extendLoader = useHazardLoader()
  const hazardTemplates = useHazardTemplates(extendLoader)
  const umbrellaTemplate = useUmbrellaTemplate(extendLoader)

  useEffect(() => {
    hazardsRef.current = hazards
  }, [hazards])

  useEffect(() => {
    umbrellaBonusRef.current = umbrellaBonus
  }, [umbrellaBonus])

  useEffect(() => {
    shieldActiveRef.current = shieldActive
  }, [shieldActive])

  useEffect(() => {
    hazardsRef.current = []
    umbrellaBonusRef.current = null
    setHazards([])
    setUmbrellaBonus(null)
    setShieldActive(false)
    nextId.current = 1
    nextBonusId.current = 1
    elapsed.current = 0
    spawnTimer.current = 1.1
    bonusSpawnTimer.current = randomBetween(8, 13)
    statsTimer.current = 0
    hasLost.current = false
    shieldUntil.current = 0
    onStatsChange({ elapsedSeconds: 0, hazardCount: 0 })
  }, [onStatsChange])

  useEffect(() => {
    if (blastId <= 0 || hasLost.current) return

    hazardsRef.current = []
    umbrellaBonusRef.current = null
    setHazards([])
    setUmbrellaBonus(null)
    nextId.current = 1
    spawnTimer.current = 0.7
    bonusSpawnTimer.current = randomBetween(8, 13)
    statsTimer.current = 0
    onStatsChange({
      elapsedSeconds: Math.floor(elapsed.current),
      hazardCount: 0,
    })
  }, [blastId, onStatsChange])

  useFrame((_, rawDelta) => {
    if (!active || hasLost.current) return

    const delta = Math.min(rawDelta, 0.033)
    elapsed.current += delta
    spawnTimer.current -= delta
    bonusSpawnTimer.current -= delta
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

    if (shieldActiveRef.current && elapsed.current >= shieldUntil.current) {
      shieldActiveRef.current = false
      setShieldActive(false)
    }

    if (!umbrellaBonusRef.current && bonusSpawnTimer.current <= 0) {
      const bonus = {
        id: nextBonusId.current,
        age: 0,
        radius: 0.28,
        x: randomBetween(-bounds.x * 0.72, bounds.x * 0.72),
        y: randomBetween(-bounds.y * 0.18, bounds.y * 0.72),
      }

      nextBonusId.current += 1
      umbrellaBonusRef.current = bonus
      setUmbrellaBonus(bonus)
      bonusSpawnTimer.current = randomBetween(11, 17)
    }

    const bonus = umbrellaBonusRef.current
    if (bonus) {
      bonus.age += delta

      const bonusDistance = Math.hypot(bonus.x - mouse.x, bonus.y - mouse.y)
      if (bonusDistance <= bonus.radius + 0.22) {
        umbrellaBonusRef.current = null
        setUmbrellaBonus(null)
        shieldUntil.current = elapsed.current + SHIELD_DURATION
        shieldActiveRef.current = true
        setShieldActive(true)
      } else if (bonus.age >= UMBRELLA_LIFETIME) {
        umbrellaBonusRef.current = null
        setUmbrellaBonus(null)
      } else if (umbrellaGroup.current) {
        umbrellaGroup.current.position.set(bonus.x, bonus.y, 0)
        umbrellaGroup.current.rotation.z += delta * 0.65
        umbrellaGroup.current.rotation.y += delta * 0.9
      }
    }

    let changedHazards = false
    const nextHazards: Hazard[] = []

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
        if (shieldActiveRef.current) {
          changedHazards = true
          continue
        }

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

      nextHazards.push(hazard)
    }

    if (changedHazards) {
      hazardsRef.current = nextHazards
      setHazards(nextHazards)
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
      <ShelterShield active={shieldActive} />
      <StormBurstEffect blastId={blastId} />
      {umbrellaBonus && (
        <group ref={umbrellaGroup} position={[umbrellaBonus.x, umbrellaBonus.y, 0]} renderOrder={HAZARD_RENDER_ORDER + 3}>
          <mesh scale={umbrellaBonus.radius * 2.2} renderOrder={HAZARD_RENDER_ORDER + 2}>
            <sphereGeometry args={[1, 24, 14]} />
            <meshBasicMaterial
              color="#6ee7ff"
              transparent
              opacity={0.28}
              depthTest={false}
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
          <mesh scale={umbrellaBonus.radius * 2.55} renderOrder={HAZARD_RENDER_ORDER + 2}>
            <ringGeometry args={[0.92, 1, 56]} />
            <meshBasicMaterial
              color="#d9fbff"
              transparent
              opacity={0.68}
              depthTest={false}
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
          <UmbrellaModel radius={umbrellaBonus.radius} template={umbrellaTemplate} />
        </group>
      )}
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
