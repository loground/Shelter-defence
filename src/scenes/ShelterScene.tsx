import { Suspense, useMemo } from 'react';
import { Color } from 'three';
import type { GamePhase } from '../types/game';
import { ShelterModel } from './ShelterModel';

type ShelterSceneProps = {
  phase: GamePhase;
  onReady: () => void;
};

export function ShelterScene({ phase, onReady }: ShelterSceneProps) {
  const lightColor = useMemo(() => new Color('#f3b96a'), []);
  const hasStarted = phase !== 'launch';

  return (
    <>
      <color attach="background" args={['#071013']} />
      <fog attach="fog" args={['#071013', 6, 18]} />
      <ambientLight intensity={hasStarted ? 0.95 : 0.9} color="#b9ccd2" />
      <hemisphereLight args={['#bfe9ff', '#24190f', hasStarted ? 1.6 : 1.45]} />
      <directionalLight
        position={[-3, 6, 4]}
        intensity={hasStarted ? 2.35 : 2.25}
        color="#d9f2ff"
      />
      <pointLight
        position={[0, -0.45, 1.8]}
        intensity={phase === 'launch' ? 8.4 : 6.8}
        color={lightColor}
      />
      <spotLight
        position={[0, 3.2, 3.8]}
        angle={0.58}
        penumbra={0.72}
        intensity={hasStarted ? 4.4 : 4.8}
        color="#fff1c7"
      />

      <Suspense fallback={null}>
        <ShelterModel phase={phase} onReady={onReady} />
      </Suspense>

      <mesh position={[0, -1.27, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[22, 22, 1, 1]} />
        <meshStandardMaterial color="#0b1517" roughness={1} />
      </mesh>
    </>
  );
}
