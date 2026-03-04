import * as THREE from 'three'
import gsap from 'gsap'

import donnaLogoPath from './assets/donna-logo.png'

const DONNA_SIZE = 0.08
const DONNA_GLOW_SIZE = 0.14
const DONNA_HEIGHT = 0.18

function createDonnaTextureFallback() {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, size, size)

  const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.15, size / 2, size / 2, size * 0.42)
  gradient.addColorStop(0, 'rgba(54, 209, 255, 0.0)')
  gradient.addColorStop(0.5, 'rgba(54, 209, 255, 0.08)')
  gradient.addColorStop(0.85, 'rgba(138, 108, 255, 0.15)')
  gradient.addColorStop(1, 'rgba(138, 108, 255, 0.0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

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

  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(138, 108, 255, 0.5)'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = '#36D1FF'
  ctx.font = 'bold 52px "Helvetica Neue", Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = '#36D1FF'
  ctx.shadowBlur = 12
  ctx.fillText('DONNA', cx, cy - 8)
  ctx.shadowBlur = 0

  ctx.fillStyle = 'rgba(138, 108, 255, 0.7)'
  ctx.font = '18px "Helvetica Neue", Arial, sans-serif'
  ctx.fillText('O P E R A T I O N A L', cx, cy + 30)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

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

export class DonnaTransition {
  constructor() {
    this.group = new THREE.Group()
    this.group.name = 'donna-logo'
    this.time = 0
    this.visible = false
    this.interactive = false

    this._createWireframe()
    this._createLogo()
    this._createGlow()
    this._createPulseLines()
    this._createSignalRings()

    this.group.position.y = DONNA_HEIGHT
    this.group.visible = false
  }

  get position() {
    return new THREE.Vector3(0, DONNA_HEIGHT, 0)
  }

  _createWireframe() {
    const hexPoints = []
    for (let i = 0; i <= 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6
      hexPoints.push(new THREE.Vector3(
        Math.cos(angle) * DONNA_SIZE * 0.5,
        Math.sin(angle) * DONNA_SIZE * 0.5,
        0.001
      ))
    }

    const hexGeo = new THREE.BufferGeometry().setFromPoints(hexPoints)
    this.wireframeMaterial = new THREE.LineBasicMaterial({
      color: 0x36D1FF,
      transparent: true,
      opacity: 0,
    })
    this.wireframeMesh = new THREE.Line(hexGeo, this.wireframeMaterial)
    this.group.add(this.wireframeMesh)

    const innerPoints = []
    const innerR = DONNA_SIZE * 0.3
    for (let i = 0; i <= 32; i++) {
      const angle = (i / 32) * Math.PI * 2
      innerPoints.push(new THREE.Vector3(
        Math.cos(angle) * innerR,
        Math.sin(angle) * innerR,
        0.001
      ))
    }
    const innerGeo = new THREE.BufferGeometry().setFromPoints(innerPoints)
    this.innerRingMaterial = new THREE.LineBasicMaterial({
      color: 0x8A6CFF,
      transparent: true,
      opacity: 0,
    })
    this.innerRingMesh = new THREE.Line(innerGeo, this.innerRingMaterial)
    this.group.add(this.innerRingMesh)
  }

  _createLogo() {
    const texture = createDonnaTextureFallback()
    const geometry = new THREE.PlaneGeometry(DONNA_SIZE, DONNA_SIZE)
    this.logoMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      alphaTest: 0.1,
    })
    this.logoMesh = new THREE.Mesh(geometry, this.logoMaterial)
    this.group.add(this.logoMesh)

    const loader = new THREE.TextureLoader()
    const url = donnaLogoPath.startsWith('/') ? donnaLogoPath : '/' + donnaLogoPath
    loader.load(
      url,
      (loadedTexture) => {
        loadedTexture.colorSpace = THREE.SRGBColorSpace
        this.logoMaterial.map = loadedTexture
        this.logoMaterial.map.needsUpdate = true
        texture.dispose()
      },
      undefined,
      () => {}
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

  _createSignalRings() {
    this.signalRings = []
    const ringCount = 2

    for (let i = 0; i < ringCount; i++) {
      const ringPoints = []
      const r = DONNA_SIZE * (0.6 + i * 0.25)
      for (let j = 0; j <= 64; j++) {
        const angle = (j / 64) * Math.PI * 2
        ringPoints.push(new THREE.Vector3(
          Math.cos(angle) * r,
          Math.sin(angle) * r,
          0.002
        ))
      }

      const geo = new THREE.BufferGeometry().setFromPoints(ringPoints)
      const mat = new THREE.LineBasicMaterial({
        color: i === 0 ? 0x36D1FF : 0x8A6CFF,
        transparent: true,
        opacity: 0,
      })
      const ring = new THREE.Line(geo, mat)
      this.signalRings.push({mesh: ring, material: mat, speed: 0.1 + i * 0.08})
      this.group.add(ring)
    }
  }

  showWireframe() {
    gsap.to(this.wireframeMaterial, {
      opacity: 0.8,
      duration: 0.4,
      ease: 'power2.in',
    })
    gsap.to(this.innerRingMaterial, {
      opacity: 0.5,
      duration: 0.5,
      delay: 0.1,
      ease: 'power2.in',
    })
  }

  materialize() {
    this.group.visible = true
    this.visible = true

    gsap.to(this.wireframeMaterial, {
      opacity: 0.3,
      duration: 0.5,
      delay: 0.3,
    })

    gsap.to(this.logoMaterial, {
      opacity: 1.0,
      duration: 1.0,
      delay: 0.2,
      ease: 'power2.inOut',
    })

    gsap.to(this.glowMaterial, {
      opacity: 0.6,
      duration: 1.5,
      delay: 0.3,
      ease: 'power2.inOut',
    })

    gsap.from(this.group.position, {
      y: DONNA_HEIGHT - 0.03,
      duration: 1.0,
      ease: 'power2.out',
    })

    gsap.from(this.group.scale, {
      x: 0.3, y: 0.3, z: 0.3,
      duration: 0.8,
      ease: 'back.out(1.7)',
    })

    this.pulseLines.forEach((pl, i) => {
      gsap.to(pl.material, {
        opacity: 0.5,
        duration: 0.4,
        delay: 0.5 + i * 0.06,
        ease: 'power2.out',
        onComplete: () => {
          gsap.to(pl.material, {opacity: 0, duration: 0.6})
        },
      })
    })

    this.signalRings.forEach((ring, i) => {
      gsap.to(ring.material, {
        opacity: 0.3,
        duration: 0.8,
        delay: 0.8 + i * 0.2,
        ease: 'power2.out',
      })
    })
  }

  enableInteraction() {
    this.interactive = true
  }

  getInteractiveMesh() {
    return this.logoMesh
  }

  update(dt, camera) {
    if (!this.visible) return
    this.time += dt

    if (camera) {
      this.logoMesh.lookAt(camera.position)
    }

    const breathe = 1.0 + Math.sin(this.time * 1.2) * 0.06
    this.glowSprite.scale.set(
      DONNA_GLOW_SIZE * breathe,
      DONNA_GLOW_SIZE * breathe,
      1
    )

    if (this.glowMaterial.opacity > 0) {
      this.glowMaterial.opacity = 0.45 + Math.sin(this.time * 1.5) * 0.15
    }

    this.signalRings.forEach((ring) => {
      if (ring.material.opacity > 0) {
        ring.mesh.rotation.z += ring.speed * dt
      }
    })
  }

  dispose() {
    this.logoMesh.geometry.dispose()
    this.logoMaterial.map?.dispose()
    this.logoMaterial.dispose()
    this.glowMaterial.map?.dispose()
    this.glowMaterial.dispose()
    this.wireframeMesh.geometry.dispose()
    this.wireframeMaterial.dispose()
    this.innerRingMesh.geometry.dispose()
    this.innerRingMaterial.dispose()
    this.pulseLines.forEach((pl) => {
      pl.line.geometry.dispose()
      pl.material.dispose()
    })
    this.signalRings.forEach((ring) => {
      ring.mesh.geometry.dispose()
      ring.material.dispose()
    })
  }
}
