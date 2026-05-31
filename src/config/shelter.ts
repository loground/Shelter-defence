export const GAME_SHELTER = {
  position: {
    x: 0,
    y: -1.16,
    z: 1.15,
  },
  scale: 0.58,
  body: {
    centerY: 0.25,
    width: 0.42,
    height: 2.3,
  },
  roof: {
    left: [-1.35, 0.08] as const,
    right: [1.35, 0.08] as const,
    peak: [0, 3.05] as const,
  },
  roofThickness: 0.015,
  collisionPadding: 0.005,
  hazardCollisionScale: 0.16,
  spawnClearance: 1.65,
}
