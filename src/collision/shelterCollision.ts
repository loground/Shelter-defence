import type { BufferGeometry, Mesh, Object3D } from 'three'
import { Vector3 } from 'three'

export type CollisionPoint = {
  x: number
  y: number
}

export type CollisionTriangle = {
  a: CollisionPoint
  b: CollisionPoint
  c: CollisionPoint
}

let shelterTriangles: CollisionTriangle[] = []

const vertexA = new Vector3()
const vertexB = new Vector3()
const vertexC = new Vector3()

export function setShelterCollisionTriangles(triangles: CollisionTriangle[]) {
  shelterTriangles = triangles
}

export function clearShelterCollisionTriangles() {
  shelterTriangles = []
}

export function getShelterCollisionTriangles() {
  return shelterTriangles
}

function triangleArea(a: CollisionPoint, b: CollisionPoint, c: CollisionPoint) {
  return Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) * 0.5
}

export function trianglesFromMesh(mesh: Mesh, minArea = 0.0001) {
  const geometry = mesh.geometry as BufferGeometry
  const position = geometry.getAttribute('position')
  const index = geometry.getIndex()
  const triangles: CollisionTriangle[] = []

  if (!position) return triangles

  const addTriangle = (aIndex: number, bIndex: number, cIndex: number) => {
    vertexA.fromBufferAttribute(position, aIndex).applyMatrix4(mesh.matrixWorld)
    vertexB.fromBufferAttribute(position, bIndex).applyMatrix4(mesh.matrixWorld)
    vertexC.fromBufferAttribute(position, cIndex).applyMatrix4(mesh.matrixWorld)

    const area = triangleArea(
      { x: vertexA.x, y: vertexA.y },
      { x: vertexB.x, y: vertexB.y },
      { x: vertexC.x, y: vertexC.y },
    )

    if (area < minArea) return

    triangles.push({
      a: { x: vertexA.x, y: vertexA.y },
      b: { x: vertexB.x, y: vertexB.y },
      c: { x: vertexC.x, y: vertexC.y },
    })
  }

  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      addTriangle(index.getX(i), index.getX(i + 1), index.getX(i + 2))
    }
  } else {
    for (let i = 0; i < position.count; i += 3) {
      addTriangle(i, i + 1, i + 2)
    }
  }

  return triangles
}

export function trianglesFromObject(object: Object3D, minArea = 0.0001, shouldInclude?: (object: Object3D) => boolean) {
  const triangles: CollisionTriangle[] = []

  object.updateMatrixWorld(true)
  object.traverse((child) => {
    if ('geometry' in child && (!shouldInclude || shouldInclude(child))) {
      triangles.push(...trianglesFromMesh(child as Mesh, minArea))
    }
  })

  return triangles
}

function distanceToSegment(point: CollisionPoint, start: CollisionPoint, end: CollisionPoint) {
  const segmentX = end.x - start.x
  const segmentY = end.y - start.y
  const lengthSquared = segmentX * segmentX + segmentY * segmentY

  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y)

  const t = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) / lengthSquared),
  )
  const closestX = start.x + segmentX * t
  const closestY = start.y + segmentY * t
  return Math.hypot(point.x - closestX, point.y - closestY)
}

function pointInTriangle(point: CollisionPoint, triangle: CollisionTriangle) {
  const { a, b, c } = triangle
  const d1 = (point.x - b.x) * (a.y - b.y) - (a.x - b.x) * (point.y - b.y)
  const d2 = (point.x - c.x) * (b.y - c.y) - (b.x - c.x) * (point.y - c.y)
  const d3 = (point.x - a.x) * (c.y - a.y) - (c.x - a.x) * (point.y - a.y)
  const hasNegative = d1 < 0 || d2 < 0 || d3 < 0
  const hasPositive = d1 > 0 || d2 > 0 || d3 > 0
  return !(hasNegative && hasPositive)
}

function segmentsIntersect(a: CollisionPoint, b: CollisionPoint, c: CollisionPoint, d: CollisionPoint) {
  const direction = (p1: CollisionPoint, p2: CollisionPoint, p3: CollisionPoint) =>
    (p3.x - p1.x) * (p2.y - p1.y) - (p2.x - p1.x) * (p3.y - p1.y)

  const d1 = direction(c, d, a)
  const d2 = direction(c, d, b)
  const d3 = direction(a, b, c)
  const d4 = direction(a, b, d)

  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
}

function trianglesIntersect(a: CollisionTriangle, b: CollisionTriangle) {
  if (pointInTriangle(a.a, b) || pointInTriangle(a.b, b) || pointInTriangle(a.c, b)) return true
  if (pointInTriangle(b.a, a) || pointInTriangle(b.b, a) || pointInTriangle(b.c, a)) return true

  const aEdges = [
    [a.a, a.b],
    [a.b, a.c],
    [a.c, a.a],
  ] as const
  const bEdges = [
    [b.a, b.b],
    [b.b, b.c],
    [b.c, b.a],
  ] as const

  return aEdges.some(([aStart, aEnd]) =>
    bEdges.some(([bStart, bEnd]) => segmentsIntersect(aStart, aEnd, bStart, bEnd)),
  )
}

function triangleBounds(triangle: CollisionTriangle) {
  return {
    minX: Math.min(triangle.a.x, triangle.b.x, triangle.c.x),
    maxX: Math.max(triangle.a.x, triangle.b.x, triangle.c.x),
    minY: Math.min(triangle.a.y, triangle.b.y, triangle.c.y),
    maxY: Math.max(triangle.a.y, triangle.b.y, triangle.c.y),
  }
}

function boundsOverlap(a: ReturnType<typeof triangleBounds>, b: ReturnType<typeof triangleBounds>) {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY
}

export function trianglesTouchShelterMesh(itemTriangles: CollisionTriangle[]) {
  return itemTriangles.some((itemTriangle) => {
    const itemBounds = triangleBounds(itemTriangle)

    return shelterTriangles.some((shelterTriangle) => {
      if (!boundsOverlap(itemBounds, triangleBounds(shelterTriangle))) return false
      return trianglesIntersect(itemTriangle, shelterTriangle)
    })
  })
}

export function trianglesIntersectTriangleSet(aTriangles: CollisionTriangle[], bTriangles: CollisionTriangle[]) {
  return aTriangles.some((aTriangle) => {
    const aBounds = triangleBounds(aTriangle)

    return bTriangles.some((bTriangle) => {
      if (!boundsOverlap(aBounds, triangleBounds(bTriangle))) return false
      return trianglesIntersect(aTriangle, bTriangle)
    })
  })
}

export function circleTouchesShelterMesh(point: CollisionPoint, radius: number) {
  return shelterTriangles.some((triangle) => {
    if (pointInTriangle(point, triangle)) return true

    return (
      distanceToSegment(point, triangle.a, triangle.b) <= radius ||
      distanceToSegment(point, triangle.b, triangle.c) <= radius ||
      distanceToSegment(point, triangle.c, triangle.a) <= radius
    )
  })
}
