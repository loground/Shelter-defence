import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { BufferAttribute, PointLight, Points } from 'three';
import { AdditiveBlending, Color } from 'three';

type CampfireProps = {
  active: boolean;
};

type Particle = {
  angle: number;
  radius: number;
  height: number;
  speed: number;
  phase: number;
};

const PARTICLE_COUNT = 64;
const FIRE_ORANGE = new Color('#ff8f32');
const FIRE_GOLD = new Color('#ffd36e');
const SMOKE_RED = new Color('#7d2c1f');

function makeParticle(index: number): Particle {
  const seed = Math.sin(index * 91.17) * 43758.5453;
  const random = seed - Math.floor(seed);
  const nextSeed = Math.sin((index + 13.4) * 31.71) * 18421.216;
  const randomB = nextSeed - Math.floor(nextSeed);

  return {
    angle: random * Math.PI * 2,
    radius: 0.012 + randomB * 0.08,
    height: random,
    speed: 0.45 + random * 0.82,
    phase: randomB * Math.PI * 2,
  };
}

export function Campfire({ active }: CampfireProps) {
  const points = useRef<Points>(null);
  const light = useRef<PointLight>(null);
  const particles = useMemo(
    () => Array.from({ length: PARTICLE_COUNT }, (_, index) => makeParticle(index)),
    [],
  );
  const positions = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);
  const colors = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);

  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime;
    const intensity = active ? 1 : 0.72;

    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      const particle = particles[index];
      particle.height = (particle.height + delta * particle.speed) % 1;

      const rise = particle.height;
      const sway = Math.sin(time * 5.1 + particle.phase) * 0.035 * rise;
      const pulse = Math.sin(time * 10.0 + particle.phase) * 0.5 + 0.5;
      const x = Math.cos(particle.angle + sway) * particle.radius * (1 - rise * 0.35);
      const z = Math.sin(particle.angle + sway) * particle.radius * 0.55;
      const y = rise * 0.5 + pulse * 0.025;

      positions[index * 3] = x;
      positions[index * 3 + 1] = y;
      positions[index * 3 + 2] = z;

      const colorStart = rise < 0.58 ? FIRE_GOLD : FIRE_ORANGE;
      const colorEnd = rise < 0.58 ? FIRE_ORANGE : SMOKE_RED;
      const colorMix = rise < 0.58 ? rise * 1.3 : rise;

      colors[index * 3] = (colorStart.r + (colorEnd.r - colorStart.r) * colorMix) * intensity;
      colors[index * 3 + 1] = (colorStart.g + (colorEnd.g - colorStart.g) * colorMix) * intensity;
      colors[index * 3 + 2] = (colorStart.b + (colorEnd.b - colorStart.b) * colorMix) * intensity;
    }

    const geometry = points.current?.geometry;
    const positionAttribute = geometry?.getAttribute('position') as BufferAttribute | undefined;
    const colorAttribute = geometry?.getAttribute('color') as BufferAttribute | undefined;
    if (positionAttribute) positionAttribute.needsUpdate = true;
    if (colorAttribute) colorAttribute.needsUpdate = true;

    if (light.current) {
      light.current.intensity =
        (active ? 4.8 : 3.2) + Math.sin(time * 13.0) * 0.42 + Math.sin(time * 21.0) * 0.22;
    }
  });

  return (
    <group position={[-0.5, 0, 0.2]}>
      <pointLight
        ref={light}
        position={[0, 0.32, 0]}
        color="#ffad58"
        distance={3.4}
        decay={1.6}
        intensity={3.6}
      />
      <mesh position={[-0.08, 0, 0]} rotation={[0.25, 1, 1.3]}>
        <cylinderGeometry args={[0.025, 0.035, 0.38, 8]} />
        <meshStandardMaterial color="#352014" roughness={0.86} />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[0.25, 0, 1.3]}>
        <cylinderGeometry args={[0.025, 0.035, 0.38, 8]} />
        <meshStandardMaterial color="#352014" roughness={0.86} />
      </mesh>
      <points ref={points} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.055}
          vertexColors
          transparent
          opacity={0.88}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
    </group>
  );
}
