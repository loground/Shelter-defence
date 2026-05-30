export const GAME_SHELTER = {
  position: {
    x: 0,
    y: -1.16,
    z: 1.15,
  },
  scale: 0.58,
  body: {
    centerY: 0.38,
    width: 2.16,
    height: 0.84,
  },
  roof: {
    left: [-1.55, 0.78] as const,
    right: [1.55, 0.78] as const,
    peak: [0, 1.92] as const,
  },
  collisionPadding: 0.01,
  hazardCollisionScale: 0.58,
  spawnClearance: 1.65,
}
