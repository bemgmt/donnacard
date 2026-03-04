// ──────────────────────────────────────────────────────────
// donnaTransition.js — DONNA logo entrance and glow
// Manages the DONNA logo appearance, breathing glow,
// and the visual transition from fragmented to organized.
// Also handles the "Entering Operational Intelligence
// Layer" tap interaction.
// ──────────────────────────────────────────────────────────

import * as THREE from 'three'
import gsap from 'gsap'

// Asset path — webpack copies to dist/assets, loader returns path
import donnaLogoPath from './assets/donna-logo.png'

const DONNA_SIZE = 0.08
const DONNA_GLOW_SIZE = 0.14
const DONNA_HEIGHT = 0.18

// ── Helper: create DONNA logo canvas texture (fallback) ───

function createDonnaTextureFallback() {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, size, size)

  // Outer glow ring
  const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.15, size / 2, size / 2, size * 0.42)
  gradient.addColorStop(0, 'rgba(54, 209, 255, 0.0)')
  gradient.addColorStop(0.5, 'rgba(54, 209, 255, 0.08)')
  gradient.addColorStop(0.85, 'rgba(138, 108, 255, 0.15)')
  gradient.addColorStop(1, 'rgba(138, 108, 255, 0.0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  // Hexagonal frame
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.3
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    const hx = cx + r * Math.cos(angle)
    const hy = cy + r * Math.sin(angle)
    if (i === 0) ctx.moveTo(hx, hy)
    else ctx.lineTo(hx, hy)
  }
  ctx.closePath()
  ctx.fillStyle = 'rgba(11, 27, 43, 0.9)'
  ctx.fill()
  ctx.strokeStyle = '#36D1FF'
  ctx.lineWidth = 4
  ctx.shadowColor = '#36D1FF'
  ctx.shadowBlur = 24
  ctx.stroke()
  ctx.shadowBlur = 0

  // Inner ring
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(138, 108, 255, 0.5)'
  ctx.lineWidth = 2
  ctx.stroke()

  // DONNA text
  ctx.fillStyle = '#36D1FF'
  ctx.font = 'bold 52px "Helvetica Neue", Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = '#36D1FF'
  ctx.shadowBlur = 12
  ctx.fillText('DONNA', cx, cy - 8)
  ctx.shadowBlur = 0

  // Subtitle
  ctx.fillStyle = 'rgba(138, 108, 255, 0.7)'
  ctx.font = '18px "Helvetica Neue", Arial, sans-serif'
  ctx.letterSpacing = '3px'
  ctx.fillText('O P E R A T I O N A L', cx, cy + 30)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

// ── Glow sprite texture ──────────────────────────────────

function createGlowTexture() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, size, size)
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(54, 209, 255, 0.35)')
  gradient.addColorStop(0.3, 'rgba(138, 108, 255, 0.15)')
  gradient.addColorStop(0.7, 'rgba(54, 209, 255, 0.05)')
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

// ── DonnaTransition class ────────────────────────────────

export class DonnaTransition {
  constructor() {
    this.group = new THREE.Group()
    this.group.name = 'donna-logo'
    this.time = 0
    this.visible = false
    this.interactive = false

    this._createLogo()
    this._createGlow()
    this._createPulseLines()

    this.group.position.y = DONNA_HEIGHT
    this.group.visible = false
  }

  get position() {
    return new THREE.Vector3(0, DONNA_HEIGHT, 0)
  }

  _createLogo() {
    // Use fallback texture immediately; replace with real logo when loaded
    const texture = createDonnaTextureFallback()
    const geometry = new THREE.PlaneGeometry(DONNA_SIZE, DONNA_SIZE)
    this.logoMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      alphaTest: 0.1, // Helps with dark-background logos
    })
    this.logoMesh = new THREE.Mesh(geometry, this.logoMaterial)
    this.group.add(this.logoMesh)

    // Load actual DONNA logo asset
    const loader = new THREE.TextureLoader()
    const url = donnaLogoPath.startsWith('/') ? donnaLogoPath : '/' + donnaLogoPath
    loader.load(
      url,
      (loadedTexture) => {
        loadedTexture.colorSpace = THREE.SRGBColorSpace
        this.logoMaterial.map = loadedTexture
        this.logoMaterial.map.needsUpdate = true
        // Dispose fallback
        texture.dispose()
      },
      undefined,
      () => {
        // On error, keep canvas fallback
      }
    )
  }

  _createGlow() {
    const glowTexture = createGlowTexture()
    this.glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    this.glowSprite = new THREE.Sprite(this.glowMaterial)
    this.glowSprite.scale.set(DONNA_GLOW_SIZE, DONNA_GLOW_SIZE, 1)
    this.group.add(this.glowSprite)
  }

  // Radial pulse lines emanating from center
  _createPulseLines() {
    this.pulseLines = []
    const lineCount = 8
    for (let i = 0; i < lineCount; i++) {
      const angle = (i / lineCount) * Math.PI * 2
      const innerR = DONNA_SIZE * 0.45
      const outerR = DONNA_SIZE * 0.7
      const points = [
        new THREE.Vector3(Math.cos(angle) * innerR, Math.sin(angle) * innerR, 0.001),
        new THREE.Vector3(Math.cos(angle) * outerR, Math.sin(angle) * outerR, 0.001),
      ]
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const material = new THREE.LineBasicMaterial({
        color: 0x36D1FF,
        transparent: true,
        opacity: 0,
      })
      const line = new THREE.Line(geometry, material)
      this.pulseLines.push({line, material})
      this.group.add(line)
    }
  }

  // Fade in DONNA logo with glow (called ~3s after sequence 1)
  fadeIn() {
    this.group.visible = true
    this.visible = true

    // Logo fade in
    gsap.to(this.logoMaterial, {
      opacity: 1.0,
      duration: 1.5,
      ease: 'power2.inOut',
    })

    // Glow fade in
    gsap.to(this.glowMaterial, {
      opacity: 0.6,
      duration: 2.0,
      ease: 'power2.inOut',
    })

    // Slight elevation rise
    gsap.from(this.group.position, {
      y: DONNA_HEIGHT - 0.03,
      duration: 1.5,
      ease: 'power2.out',
    })

    // Scale pop
    gsap.from(this.group.scale, {
      x: 0.5, y: 0.5, z: 0.5,
      duration: 1.2,
      ease: 'back.out(1.7)',
    })

    // Pulse lines flash
    this.pulseLines.forEach((pl, i) => {
      gsap.to(pl.material, {
        opacity: 0.5,
        duration: 0.4,
        delay: 0.8 + i * 0.06,
        ease: 'power2.out',
        onComplete: () => {
          gsap.to(pl.material, {
            opacity: 0,
            duration: 0.6,
          })
        },
      })
    })
  }

  // Enable tap interaction after network stabilizes
  enableInteraction() {
    this.interactive = true
  }

  // Check if a world-space point is near the logo (for tap detection)
  hitTest(point) {
    if (!this.interactive) return false
    const logoWorldPos = new THREE.Vector3()
    this.logoMesh.getWorldPosition(logoWorldPos)
    return logoWorldPos.distanceTo(point) < DONNA_SIZE * 1.2
  }

  // The mesh to raycast against for tap detection
  getInteractiveMesh() {
    return this.logoMesh
  }

  // Per-frame update: breathing glow animation
  update(dt, camera) {
    if (!this.visible) return
    this.time += dt

    // Billboard: face camera
    if (camera) {
      this.logoMesh.lookAt(camera.position)
    }

    // Breathing glow scale
    const breathe = 1.0 + Math.sin(this.time * 1.2) * 0.06
    this.glowSprite.scale.set(
      DONNA_GLOW_SIZE * breathe,
      DONNA_GLOW_SIZE * breathe,
      1
    )

    // Subtle glow opacity pulse
    if (this.glowMaterial.opacity > 0) {
      this.glowMaterial.opacity = 0.45 + Math.sin(this.time * 1.5) * 0.15
    }
  }

  dispose() {
    this.logoMesh.geometry.dispose()
    this.logoMaterial.map?.dispose()
    this.logoMaterial.dispose()
    this.glowMaterial.map?.dispose()
    this.glowMaterial.dispose()
    this.pulseLines.forEach((pl) => {
      pl.line.geometry.dispose()
      pl.material.dispose()
    })
  }
}
