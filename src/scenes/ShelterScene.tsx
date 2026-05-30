import { useMemo } from 'react'
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute } from 'three'
import type { GamePhase } from '../types/game'

type ShelterSceneProps = {
  phase: GamePhase
}

function createMenuRoofGeometry() {
  const geometry = new BufferGeometry()
  const vertices = new Float32Array([
    -1.55, 0.78, 0,
    1.55, 0.78, 0,
    0, 1.92, 0,
  ])

  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  geometry.setIndex([0, 1, 2])
  geometry.computeVertexNormals()
  return geometry
}

export function ShelterScene({ phase }: ShelterSceneProps) {
  const lightColor = useMemo(() => new Color('#f3b96a'), [])
  const roofGeometry = useMemo(() => createMenuRoofGeometry(), [])
  const hasStarted = phase !== 'launch'

  return (
    <>
      <color attach="background" args={['#071013']} />
      <fog attach="fog" args={['#071013', 6, 18]} />
      <ambientLight intensity={hasStarted ? 0.78 : 0.45} color="#9db5bd" />
      <directionalLight position={[-3, 6, 4]} intensity={hasStarted ? 1.65 : 1.2} color="#b9d6dd" />
      <pointLight position={[0, -0.55, 1.4]} intensity={phase === 'launch' ? 3.6 : 4.8} color={lightColor} />
      {hasStarted && <pointLight position={[0, -1.35, 1.15]} intensity={3.2} color="#ffe0a3" distance={4.5} />}

      <group position={[0, hasStarted ? -1.72 : -0.55, 0.2]} scale={hasStarted ? 0.58 : 1}>
        <mesh position={[0, 0.38, 0]}>
          <planeGeometry args={[2.16, 0.84]} />
          <meshBasicMaterial color="#172327" side={DoubleSide} />
        </mesh>
        <mesh geometry={roofGeometry}>
          <meshBasicMaterial color="#10191c" side={DoubleSide} />
        </mesh>
        <mesh position={[0, 0.05, 0.01]}>
          <planeGeometry args={[0.34, 0.62]} />
          <meshBasicMaterial color="#090b0b" side={DoubleSide} />
        </mesh>
        <mesh position={[-0.48, 0.52, 0.02]}>
          <planeGeometry args={[0.4, 0.28]} />
          <meshBasicMaterial color="#d7924a" side={DoubleSide} />
        </mesh>
        <mesh position={[0.48, 0.52, 0.02]}>
          <planeGeometry args={[0.4, 0.28]} />
          <meshBasicMaterial color="#d7924a" side={DoubleSide} />
        </mesh>
        <mesh position={[0, 0.58, -0.01]}>
          <planeGeometry args={[1.75, 1.12]} />
          <meshBasicMaterial color="#d7924a" transparent opacity={hasStarted ? 0.2 : 0.08} side={DoubleSide} />
        </mesh>
      </group>

      <mesh position={[0, -1.27, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[22, 22, 1, 1]} />
        <meshStandardMaterial color="#0b1517" roughness={1} />
      </mesh>
    </>
  )
}
