import { CanvasTexture, LinearFilter } from 'three'

function noise(seed: number) {
  return Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1
}

export function createShelterBackdropTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return new CanvasTexture(canvas)
  }

  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height)
  sky.addColorStop(0, '#182a31')
  sky.addColorStop(0.42, '#0b1519')
  sky.addColorStop(1, '#030707')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const glow = ctx.createRadialGradient(510, 590, 0, 510, 590, 360)
  glow.addColorStop(0, 'rgba(220, 142, 67, 0.22)')
  glow.addColorStop(0.32, 'rgba(156, 88, 45, 0.13)')
  glow.addColorStop(1, 'rgba(156, 88, 45, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = '#081011'
  ctx.beginPath()
  ctx.moveTo(0, 735)
  ctx.bezierCurveTo(260, 695, 465, 730, 645, 700)
  ctx.bezierCurveTo(785, 675, 880, 700, 1024, 670)
  ctx.lineTo(1024, 1024)
  ctx.lineTo(0, 1024)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = 'rgba(210, 230, 240, 0.18)'
  ctx.lineWidth = 2
  for (let i = 0; i < 120; i += 1) {
    const x = noise(i + 2.5) * canvas.width
    const y = noise(i + 84.2) * canvas.height
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + 10, y + 34)
    ctx.stroke()
  }

  const texture = new CanvasTexture(canvas)
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  return texture
}
