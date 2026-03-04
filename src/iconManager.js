import * as THREE from 'three'
import {SVGLoader} from 'three/examples/jsm/loaders/SVGLoader.js'
import gsap from 'gsap'

const ICON_DEFS = [
  {name: 'governance', colorHex: '#8A6CFF'},
  {name: 'email',      colorHex: '#36D1FF'},
  {name: 'sms',        colorHex: '#36D1FF'},
  {name: 'voice',      colorHex: '#8A6CFF'},
  {name: 'crm',        colorHex: '#8A6CFF'},
  {name: 'knowledge',  colorHex: '#36D1FF'},
  {name: 'calendar',   colorHex: '#36D1FF'},
  {name: 'reception',  colorHex: '#8A6CFF'},
  {name: 'security',   colorHex: '#36D1FF'},
]

const ICON_SIZE = 0.05
const ORGANIZED_RADIUS = 0.45
const FRAGMENTED_RADIUS_MIN = 0.15
const FRAGMENTED_RADIUS_MAX = 0.40
const FRAGMENTED_HEIGHT = 0.15
const CONNECTION_SEGMENTS = 40

function loadSVGIcon(name, colorHex) {
  return new Promise((resolve) => {
    const url = `/assets/icons/${name}.svg`
    const loader = new SVGLoader()

    loader.load(url, (data) => {
      const group = new THREE.Group()

      data.paths.forEach((shapePath) => {
        const shapes = SVGLoader.createShapes(shapePath)

        if (shapes.length > 0) {
          shapes.forEach((shape) => {
            const geometry = new THREE.ShapeGeometry(shape)
            const material = new THREE.MeshBasicMaterial({
              color: new THREE.Color(colorHex),
              transparent: true,
              opacity: 0,
              side: THREE.DoubleSide,
              depthWrite: false,
            })
            group.add(new THREE.Mesh(geometry, material))
          })
        }

        const subPaths = shapePath.subPaths
        subPaths.forEach((subPath) => {
          const points = subPath.getPoints(16)
          if (points.length < 2) return

          const geometry = new THREE.BufferGeometry().setFromPoints(points)
          const material = new THREE.LineBasicMaterial({
            color: new THREE.Color(colorHex),
            transparent: true,
            opacity: 0,
          })
          group.add(new THREE.Line(geometry, material))
        })
      })

      const box = new THREE.Box3().setFromObject(group)
      if (box.isEmpty()) {
        resolve(createFallbackIcon(name, colorHex))
        return
      }

      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, 0.001)
      const scale = ICON_SIZE / maxDim

      group.children.forEach((child) => {
        child.position.x -= center.x
        child.position.y -= center.y
      })

      group.scale.set(scale, -scale, scale)
      resolve(group)
    }, undefined, () => {
      resolve(createFallbackIcon(name, colorHex))
    })
  })
}

function createFallbackIcon(name, colorHex) {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, size, size)
  ctx.strokeStyle = colorHex
  ctx.lineWidth = 3
  ctx.shadowColor = colorHex
  ctx.shadowBlur = 8

  const pad = 12
  const r = 16
  ctx.beginPath()
  ctx.moveTo(pad + r, pad)
  ctx.lineTo(size - pad - r, pad)
  ctx.quadraticCurveTo(size - pad, pad, size - pad, pad + r)
  ctx.lineTo(size - pad, size - pad - r)
  ctx.quadraticCurveTo(size - pad, size - pad, size - pad - r, size - pad)
  ctx.lineTo(pad + r, size - pad)
  ctx.quadraticCurveTo(pad, size - pad, pad, size - pad - r)
  ctx.lineTo(pad, pad + r)
  ctx.quadraticCurveTo(pad, pad, pad + r, pad)
  ctx.closePath()
  ctx.stroke()
  ctx.shadowBlur = 0

  ctx.fillStyle = colorHex
  ctx.font = 'bold 16px "Helvetica Neue", Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(name.toUpperCase(), size / 2, size / 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true

  const geometry = new THREE.PlaneGeometry(ICON_SIZE, ICON_SIZE)
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  })

  const group = new THREE.Group()
  group.add(new THREE.Mesh(geometry, material))
  return group
}

function addNeonGlow(iconGroup, colorHex) {
  const glowGeo = new THREE.CircleGeometry(ICON_SIZE * 1.2, 32)
  const glowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(colorHex),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const glow = new THREE.Mesh(glowGeo, glowMat)
  glow.position.z = -0.001
  iconGroup.add(glow)
  return glowMat
}

function createAnimatedConnection(start, end, color = 0x36D1FF) {
  const points = []
  for (let i = 0; i <= CONNECTION_SEGMENTS; i++) {
    const t = i / CONNECTION_SEGMENTS
    points.push(new THREE.Vector3().lerpVectors(start, end, t))
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  geometry.setDrawRange(0, 0)

  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.85,
  })

  const line = new THREE.Line(geometry, material)
  return {line, geometry, material, segments: CONNECTION_SEGMENTS, progress: 0, growing: false, growDelay: 0}
}

function createGridConnection(startPos) {
  const points = [
    new THREE.Vector3(startPos.x, startPos.y, startPos.z),
    new THREE.Vector3(startPos.x * 0.7, startPos.y * 0.3, startPos.z * 0.7),
    new THREE.Vector3(startPos.x * 0.5, 0.0, startPos.z * 0.5),
  ]
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({
    color: 0x36D1FF,
    transparent: true,
    opacity: 0.15,
  })
  return {line: new THREE.Line(geometry, material), material, points}
}

export class IconManager {
  constructor() {
    this.group = new THREE.Group()
    this.group.name = 'icon-manager'
    this.icons = []
    this.gridConnections = []
    this.networkConnections = []
    this.time = 0
    this.organized = false
    this.frozen = false
    this.loaded = false

    this._initIcons()
  }

  async _initIcons() {
    const promises = ICON_DEFS.map(async (def, i) => {
      const iconGroup = await loadSVGIcon(def.name, def.colorHex)
      const glowMat = addNeonGlow(iconGroup, def.colorHex)

      const container = new THREE.Group()
      container.add(iconGroup)
      container.visible = false

      const angle = (i / ICON_DEFS.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.4
      const radius = FRAGMENTED_RADIUS_MIN + Math.random() * (FRAGMENTED_RADIUS_MAX - FRAGMENTED_RADIUS_MIN)
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const y = FRAGMENTED_HEIGHT + (Math.random() - 0.5) * 0.04

      container.position.set(x, y, z)

      const orgAngle = (i / ICON_DEFS.length) * Math.PI * 2
      const orgX = Math.cos(orgAngle) * ORGANIZED_RADIUS
      const orgZ = Math.sin(orgAngle) * ORGANIZED_RADIUS

      const iconData = {
        container,
        iconGroup,
        glowMat,
        name: def.name,
        def,
        fragmentedPos: new THREE.Vector3(x, y, z),
        organizedPos: new THREE.Vector3(orgX, 0.15, orgZ),
        driftPhase: Math.random() * Math.PI * 2,
        driftSpeed: 0.2 + Math.random() * 0.3,
      }

      this.icons.push(iconData)
      this.group.add(container)

      const conn = createGridConnection(container.position)
      this.gridConnections.push(conn)
      this.group.add(conn.line)

      return iconData
    })

    await Promise.all(promises)
    this.loaded = true
  }

  getIconPositions() {
    return this.icons.map(icon => icon.container.position.clone())
  }

  spawnFragmented() {
    this.icons.forEach((icon, i) => {
      icon.container.visible = true

      icon.iconGroup.traverse((child) => {
        if (child.material) {
          gsap.to(child.material, {
            opacity: child.material instanceof THREE.LineBasicMaterial ? 0.9 : 0.95,
            duration: 0.8,
            delay: i * 0.12,
            ease: 'power2.out',
          })
        }
      })

      gsap.to(icon.glowMat, {
        opacity: 0.2,
        duration: 1.0,
        delay: i * 0.12 + 0.3,
      })

      gsap.from(icon.container.position, {
        y: icon.fragmentedPos.y + 0.06,
        duration: 1.0,
        delay: i * 0.12,
        ease: 'power2.out',
      })
    })

    this.gridConnections.forEach((conn, i) => {
      gsap.to(conn.material, {
        opacity: 0.2,
        duration: 0.6,
        delay: i * 0.12 + 0.3,
      })
    })
  }

  freezeIcons() {
    this.frozen = true
  }

  unfreezeIcons() {
    this.frozen = false
  }

  animateToOrganized(onComplete) {
    this.organized = true
    this.frozen = false

    this.icons.forEach((icon, i) => {
      gsap.to(icon.container.position, {
        x: icon.organizedPos.x,
        y: icon.organizedPos.y,
        z: icon.organizedPos.z,
        duration: 1.8,
        delay: i * 0.08,
        ease: 'power3.inOut',
        onComplete: () => {
          gsap.to(icon.glowMat, {
            opacity: 0.35,
            duration: 0.3,
            yoyo: true,
            repeat: 1,
          })
        },
      })
    })

    this.gridConnections.forEach((conn) => {
      gsap.to(conn.material, {opacity: 0, duration: 0.8})
    })

    const totalDuration = 1.8 + ICON_DEFS.length * 0.08 + 0.2
    gsap.delayedCall(totalDuration, () => {
      if (onComplete) onComplete()
    })
  }

  buildNetworkConnections(donnaPosition) {
    this.icons.forEach((icon) => {
      const conn = createAnimatedConnection(
        donnaPosition.clone(),
        icon.organizedPos.clone(),
        0x36D1FF
      )
      conn.growing = true
      this.networkConnections.push(conn)
      this.group.add(conn.line)
    })

    for (let i = 0; i < this.icons.length; i++) {
      const next = (i + 1) % this.icons.length
      const conn = createAnimatedConnection(
        this.icons[i].organizedPos.clone(),
        this.icons[next].organizedPos.clone(),
        0x8A6CFF
      )
      conn.growing = true
      conn.growDelay = 0.6
      this.networkConnections.push(conn)
      this.group.add(conn.line)
    }

    this.icons.forEach((icon) => {
      const conn = createAnimatedConnection(
        icon.organizedPos.clone(),
        new THREE.Vector3(icon.organizedPos.x, 0.0, icon.organizedPos.z),
        0x36D1FF
      )
      conn.growing = true
      conn.growDelay = 0.3
      this.networkConnections.push(conn)
      this.group.add(conn.line)
    })
  }

  getConnectionEndpoints(donnaPosition) {
    const endpoints = []

    this.icons.forEach((icon) => {
      endpoints.push({start: icon.organizedPos.clone(), end: donnaPosition.clone()})
      endpoints.push({start: donnaPosition.clone(), end: icon.organizedPos.clone()})
    })

    for (let i = 0; i < this.icons.length; i++) {
      const next = (i + 1) % this.icons.length
      endpoints.push({
        start: this.icons[i].organizedPos.clone(),
        end: this.icons[next].organizedPos.clone(),
      })
    }

    return endpoints
  }

  isNetworkComplete() {
    return this.networkConnections.length > 0 &&
      this.networkConnections.every(c => !c.growing)
  }

  update(dt, camera) {
    this.time += dt

    this.icons.forEach((icon) => {
      if (camera) {
        icon.iconGroup.lookAt(camera.position)
      }

      if (!this.organized && !this.frozen) {
        const t = this.time
        icon.container.position.x = icon.fragmentedPos.x + Math.sin(t * icon.driftSpeed + icon.driftPhase) * 0.012
        icon.container.position.z = icon.fragmentedPos.z + Math.cos(t * icon.driftSpeed * 0.7 + icon.driftPhase) * 0.012
        icon.container.position.y = icon.fragmentedPos.y + Math.sin(t * 0.8 + icon.driftPhase) * 0.006
      }

      if (this.organized) {
        const floatY = Math.sin(this.time * 0.8 + icon.driftPhase) * 0.003
        icon.container.position.y = icon.organizedPos.y + floatY
      }
    })

    this.gridConnections.forEach((conn, i) => {
      if (!this.organized && conn.material.opacity > 0) {
        const flicker = 0.12 + Math.sin(this.time * 3.0 + i * 1.7) * 0.08
        conn.material.opacity = Math.max(0, flicker)
      }

      if (!this.organized) {
        const icon = this.icons[i]
        if (icon) {
          const pos = icon.container.position
          const posAttr = conn.line.geometry.getAttribute('position')
          posAttr.array[0] = pos.x
          posAttr.array[1] = pos.y
          posAttr.array[2] = pos.z
          posAttr.array[3] = pos.x * 0.7
          posAttr.array[4] = pos.y * 0.3
          posAttr.array[5] = pos.z * 0.7
          posAttr.array[6] = pos.x * 0.5
          posAttr.array[7] = 0.0
          posAttr.array[8] = pos.z * 0.5
          posAttr.needsUpdate = true
        }
      }
    })

    this.networkConnections.forEach((conn, i) => {
      if (conn.growing) {
        if (conn.growDelay > 0) {
          conn.growDelay -= dt
          return
        }
        conn.progress += dt * 30
        const count = Math.min(Math.floor(conn.progress), conn.segments + 1)
        conn.geometry.setDrawRange(0, count)

        if (count >= conn.segments) {
          conn.growing = false
        }
      }

      if (!conn.growing && conn.material.opacity > 0) {
        const pulse = 0.6 + Math.sin(this.time * 1.5 + i * 0.8) * 0.15
        conn.material.opacity = pulse
      }
    })
  }

  dispose() {
    this.icons.forEach((icon) => {
      icon.iconGroup.traverse((child) => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) {
          if (child.material.map) child.material.map.dispose()
          child.material.dispose()
        }
      })
      if (icon.glowMat) icon.glowMat.dispose()
    })
    this.gridConnections.forEach((conn) => {
      conn.line.geometry.dispose()
      conn.material.dispose()
    })
    this.networkConnections.forEach((conn) => {
      conn.line.geometry.dispose()
      conn.material.dispose()
    })
  }
}
