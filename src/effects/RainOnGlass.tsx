import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { ShaderMaterial } from 'three'
import { Vector2, Vector3 } from 'three'
import { createShelterBackdropTexture } from '../textures/createShelterBackdropTexture'
import type { GamePhase } from '../types/game'
import { rainFragmentShader, rainVertexShader } from './rainShader'

type RainOnGlassProps = {
  phase: GamePhase
}

export function RainOnGlass({ phase }: RainOnGlassProps) {
  const material = useRef<ShaderMaterial>(null)
  const previousPhase = useRef<GamePhase>(phase)
  const { size } = useThree()
  const targetGame = phase === 'launch' ? 0 : 1
  const targetOpacity = phase === 'launch' ? 0.64 : 0.42
  const backdrop = useMemo(() => createShelterBackdropTexture(), [])
  const uniforms = useMemo(
    () => ({
      iTime: { value: 8 },
      iResolution: { value: new Vector2(1, 1) },
      iMouse: { value: new Vector3(0, 0, 0) },
      uGame: { value: 0 },
      uOpacity: { value: 0.64 },
      iChannel0: { value: backdrop },
    }),
    [backdrop],
  )

  useEffect(() => {
    if (phase === 'launch' && previousPhase.current !== 'launch') {
      uniforms.iTime.value = 8
    }

    previousPhase.current = phase
  }, [phase, uniforms])

  useFrame((_, delta) => {
    if (!material.current) return

    material.current.uniforms.iTime.value += delta
    material.current.uniforms.iResolution.value.set(size.width, size.height)
    material.current.uniforms.uGame.value += (targetGame - material.current.uniforms.uGame.value) * 0.065
    material.current.uniforms.uOpacity.value += (targetOpacity - material.current.uniforms.uOpacity.value) * 0.065
  })

  return (
    <mesh renderOrder={20}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={material}
        args={[
          {
            uniforms,
            vertexShader: rainVertexShader,
            fragmentShader: rainFragmentShader,
            transparent: true,
            depthWrite: false,
            depthTest: false,
          },
        ]}
      />
    </mesh>
  )
}
