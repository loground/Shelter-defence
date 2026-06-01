import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { Group, Object3D } from 'three';
import { MathUtils, MeshStandardMaterial } from 'three';
import {
  clearShelterCollisionTriangles,
  setShelterCollisionTriangles,
  trianglesFromObject,
} from '../collision/shelterCollision';
import { GAME_SHELTER } from '../config/shelter';
import { useSharedGltfLoader } from '../loaders/useSharedGltfLoader';
import type { GamePhase } from '../types/game';
import { Campfire } from './Campfire';

const SHELTER_MODEL_URL = '/3d/shelter.glb';
const DRACO_DECODER_PATH = '/draco/';

type ShelterModelProps = {
  phase: GamePhase;
  onReady: () => void;
};

export function ShelterModel({ phase, onReady }: ShelterModelProps) {
  const group = useRef<Group>(null);
  const hasStarted = phase !== 'launch';
  const extendLoader = useSharedGltfLoader();
  const { scene } = useGLTF(SHELTER_MODEL_URL, DRACO_DECODER_PATH, false, extendLoader);

  useEffect(() => {
    onReady();
  }, [onReady]);

  useEffect(() => {
    scene.traverse((object: Object3D) => {
      object.frustumCulled = false;

      if ('material' in object) {
        const mesh = object as Object3D & {
          material: MeshStandardMaterial | MeshStandardMaterial[];
        };
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => {
          material.envMapIntensity = hasStarted ? 1.45 : 1.8;
          material.roughness = Math.min(material.roughness, 0.72);
          material.needsUpdate = true;
        });
        object.userData.shelterCollisionMesh = true;
      }
    });
  }, [hasStarted, scene]);

  useEffect(() => {
    if (!hasStarted) clearShelterCollisionTriangles();
  }, [hasStarted]);

  useEffect(() => {
    return () => clearShelterCollisionTriangles();
  }, []);

  useFrame((_, delta) => {
    if (!group.current) return;

    const targetY = hasStarted ? GAME_SHELTER.position.y : -0.62;
    const targetZ = hasStarted ? GAME_SHELTER.position.z : 0.1;
    const targetRotationY = (hasStarted ? 0 : -0.08) - Math.PI / 1.8;
    const targetScale = hasStarted ? GAME_SHELTER.scale : 0.86;
    const smoothness = hasStarted ? 1.35 : 1.9;

    group.current.position.x = MathUtils.damp(group.current.position.x, GAME_SHELTER.position.x, smoothness, delta);
    group.current.position.y = MathUtils.damp(group.current.position.y, targetY, smoothness, delta);
    group.current.position.z = MathUtils.damp(group.current.position.z, targetZ, smoothness, delta);
    group.current.rotation.y = MathUtils.damp(group.current.rotation.y, targetRotationY, smoothness, delta);

    const nextScale = MathUtils.damp(group.current.scale.x, targetScale, smoothness, delta);
    group.current.scale.setScalar(nextScale);

    if (hasStarted) {
      setShelterCollisionTriangles(
        trianglesFromObject(
          group.current,
          0.00004,
          (object) => object.userData.shelterCollisionMesh === true,
        ),
      );
    }
  });

  return (
    <group
      ref={group}
      position={[GAME_SHELTER.position.x, -0.62, 0.1]}
      rotation={[0, -0.08 - Math.PI / 1.8, 0]}
      scale={0.86}>
      <primitive object={scene} />
      <pointLight
        position={[0, 0.5, 0.32]}
        intensity={hasStarted ? 5.8 : 7.2}
        color="#ffb45f"
        distance={4.2}
      />
      <pointLight
        position={[0, 1.35, 1.1]}
        intensity={hasStarted ? 2.2 : 2.8}
        color="#d6f1ff"
        distance={5.5}
      />
      <Campfire active={hasStarted} />
    </group>
  );
}
