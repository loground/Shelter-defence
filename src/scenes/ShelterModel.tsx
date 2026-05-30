import { useGLTF } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo } from 'react';
import type { Object3D } from 'three';
import { MeshStandardMaterial } from 'three';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { GAME_SHELTER } from '../config/shelter';
import type { GamePhase } from '../types/game';
import { Campfire } from './Campfire';

const SHELTER_MODEL_URL = '/3d/shelter.glb';
const DRACO_DECODER_PATH = '/draco/';
const BASIS_TRANSCODER_PATH = '/basis/';

type ShelterModelProps = {
  phase: GamePhase;
};

type ExtendGltfLoader = NonNullable<Parameters<typeof useGLTF>[3]>;
type Ktx2CapableLoader = { setKTX2Loader: (loader: unknown) => void };

export function ShelterModel({ phase }: ShelterModelProps) {
  const { gl } = useThree();
  const hasStarted = phase !== 'launch';
  const ktx2Loader = useMemo(() => {
    const loader = new KTX2Loader();
    loader.setTranscoderPath(BASIS_TRANSCODER_PATH);
    loader.detectSupport(gl);
    return loader;
  }, [gl]);
  const extendLoader = useCallback(
    ((loader: Ktx2CapableLoader) => {
      loader.setKTX2Loader(ktx2Loader);
    }) as ExtendGltfLoader,
    [ktx2Loader],
  );
  const { scene } = useGLTF(SHELTER_MODEL_URL, DRACO_DECODER_PATH, false, extendLoader);

  useEffect(() => {
    return () => {
      ktx2Loader.dispose();
    };
  }, [ktx2Loader]);

  useEffect(() => {
    scene.traverse((object: Object3D) => {
      object.frustumCulled = false;

      if ('material' in object) {
        const mesh = object as Object3D & {
          material: MeshStandardMaterial | MeshStandardMaterial[];
        };
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => {
          material.envMapIntensity = hasStarted ? 1.45 : 1.2;
          material.roughness = Math.min(material.roughness, 0.72);
          material.needsUpdate = true;
        });
      }
    });
  }, [hasStarted, scene]);

  return (
    <group
      position={[
        GAME_SHELTER.position.x,
        hasStarted ? GAME_SHELTER.position.y : -0.62,
        hasStarted ? GAME_SHELTER.position.z : 0.1,
      ]}
      rotation={[0, (hasStarted ? 0 : -0.08) - Math.PI / 1.8, 0]}
      scale={hasStarted ? GAME_SHELTER.scale : 0.86}>
      <primitive object={scene} />
      <pointLight
        position={[0, 0.5, 0.32]}
        intensity={hasStarted ? 5.8 : 4.2}
        color="#ffb45f"
        distance={4.2}
      />
      <pointLight
        position={[0, 1.35, 1.1]}
        intensity={hasStarted ? 2.2 : 1.6}
        color="#d6f1ff"
        distance={5.5}
      />
      <Campfire active={hasStarted} />
    </group>
  );
}
