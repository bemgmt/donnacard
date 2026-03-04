// ──────────────────────────────────────────────────────────
// iconManager.js — Floating business-tool icons
// Spawns tool icons in a fragmented state, manages their
// drift animations, thin grid connections, and the
// transition into an organized network layout.
// ──────────────────────────────────────────────────────────

import * as THREE from 'three'
import gsap from 'gsap'

// ── Icon definitions ─────────────────────────────────────

const ICON_DEFS = [
  {name: 'email',    label: '✉',  symbol: 'EMAIL',    colorHex: '#36D1FF'},
  {name: 'voice',    label: '☎',  symbol: 'VOICE',    colorHex: '#8A6CFF'},
  {name: 'sms',      label: '💬', symbol: 'SMS',      colorHex: '#36D1FF'},
  {name: 'chat',     label: '◉',  symbol: 'CHAT',     colorHex: '#8A6CFF'},
  {name: 'calendar', label: '📅', symbol: 'CAL',      colorHex: '#36D1FF'},
  {name: 'crm',      label: '⊞',  symbol: 'CRM',      colorHex: '#8A6CFF'},
  {name: 'docs',     label: '⊟',  symbol: 'DOCS',     colorHex: '#36D1FF'},
]

// Organized layout positions (Y is height above grid)
const ORGANIZED_LAYOUT = {
  email:    {x:  0.00, y: 0.18, z: -0.16},
  voice:    {x: -0.16, y: 0.18, z:  0.00},
  sms:     {x:  0.00, y: 0.18, z:  0.16},
  chat:     {x:  0.16, y: 0.18, z:  0.00},
  calendar: {x: -0.13, y: 0.18, z:  0.13},
  crm:      {x:  0.13, y: 0.18, z:  0.13},
  docs:     {x: -0.13, y: 0.18, z: -0.13},
}

const ICON_SIZE = 0.05
const FRAGMENTED_RADIUS_MIN = 0.12
const FRAGMENTED_RADIUS_MAX = 0.32
const FRAGMENTED_HEIGHT = 0.15

// ── Helper: create icon canvas texture ───────────────────

function createIconTexture(def) {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  // Transparent background with subtle dark fill
  ctx.clearRect(0, 0, size, size)

  // Rounded rectangle border
  const r = 32
  const pad = 16
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

  // Dark fill with border glow
  ctx.fillStyle = 'rgba(11, 27, 43, 0.85)'
  ctx.fill()
  ctx.strokeStyle = def.colorHex
  ctx.lineWidth = 4
  ctx.shadowColor = def.colorHex
  ctx.shadowBlur = 16
  ctx.stroke()
  ctx.shadowBlur = 0

  // Symbol text
  ctx.fillStyle = def.colorHex
  ctx.font = 'bold 36px "Helvetica Neue", Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(def.symbol, size / 2, size / 2 - 10)

  // Small accent line at bottom
  ctx.strokeStyle = def.colorHex
  ctx.lineWidth = 2
  ctx.globalAlpha = 0.4
  ctx.beginPath()
  ctx.moveTo(size * 0.3, size * 0.78)
  ctx.lineTo(size * 0.7, size * 0.78)
  ctx.stroke()
  ctx.globalAlpha = 1.0

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

// ── Create a thin flickering connection line to grid ─────

function createConnectionLine(startPos) {
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
    linewidth: 1,
  })
  return {line: new THREE.Line(geometry, material), material, points}
}

// ── IconManager class ────────────────────────────────────

export class IconManager {
  constructor() {
    this.group = new THREE.Group()
    this.group.name = 'icon-manager'
    this.icons = []
    this.gridConnections = []
    this.networkConnections = []
    this.time = 0
    this.organized = false

    this._createIcons()
  }

  _createIcons() {
    ICON_DEFS.forEach((def, i) => {
      const texture = createIconTexture(def)
      const geometry = new THREE.PlaneGeometry(ICON_SIZE, ICON_SIZE)
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
      const mesh = new THREE.Mesh(geometry, material)

      // Fragmented initial position: circular distribution
      const angle = (i / ICON_DEFS.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.4
      const radius = FRAGMENTED_RADIUS_MIN + Math.random() * (FRAGMENTED_RADIUS_MAX - FRAGMENTED_RADIUS_MIN)
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const y = FRAGMENTED_HEIGHT + (Math.random() - 0.5) * 0.04

      mesh.position.set(x, y, z)

      // Icon always faces camera (billboard via lookAt in tick)
      const iconData = {
        mesh,
        name: def.name,
        def,
        fragmentedPos: new THREE.Vector3(x, y, z),
        organizedPos: new THREE.Vector3(
          ORGANIZED_LAYOUT[def.name].x,
          ORGANIZED_LAYOUT[def.name].y,
          ORGANIZED_LAYOUT[def.name].z
        ),
        driftPhase: Math.random() * Math.PI * 2,
        driftSpeed: 0.2 + Math.random() * 0.3,
        rotSpeed: 0.15 + Math.random() * 0.2,
      }

      this.icons.push(iconData)
      this.group.add(mesh)

      // Thin connection line to grid
      const conn = createConnectionLine(mesh.position)
      this.gridConnections.push(conn)
      this.group.add(conn.line)
    })
  }

  // Fade icons in with staggered timing (Sequence 1 entry)
  spawnFragmented() {
    this.icons.forEach((icon, i) => {
      gsap.to(icon.mesh.material, {
        opacity: 0.9,
        duration: 0.8,
        delay: i * 0.15,
        ease: 'power2.out',
      })
      gsap.from(icon.mesh.position, {
        y: icon.fragmentedPos.y + 0.08,
        duration: 1.0,
        delay: i * 0.15,
        ease: 'power2.out',
      })
    })

    // Fade in grid connections
    this.gridConnections.forEach((conn, i) => {
      gsap.to(conn.material, {
        opacity: 0.2,
        duration: 0.6,
        delay: i * 0.15 + 0.3,
      })
    })
  }

  // Animate icons to organized layout (Sequence 2)
  animateToOrganized(onComplete) {
    this.organized = true

    this.icons.forEach((icon, i) => {
      gsap.to(icon.mesh.position, {
        x: icon.organizedPos.x,
        y: icon.organizedPos.y,
        z: icon.organizedPos.z,
        duration: 1.8,
        delay: i * 0.1,
        ease: 'power3.inOut',
      })
    })

    // Fade out old grid connections, build new network connections after move
    this.gridConnections.forEach((conn) => {
      gsap.to(conn.material, {
        opacity: 0,
        duration: 0.8,
      })
    })

    // Wait for icons to settle, then callback
    gsap.delayedCall(1.8 + ICON_DEFS.length * 0.1 + 0.2, () => {
      if (onComplete) onComplete()
    })
  }

  // Build organized network connection lines (icon↔DONNA, icon↔icon, icon↔grid)
  buildNetworkConnections(donnaPosition) {
    const connectionMaterial = new THREE.LineBasicMaterial({
      color: 0x36D1FF,
      transparent: true,
      opacity: 0,
      linewidth: 1,
    })

    this.icons.forEach((icon) => {
      // icon → DONNA
      const pointsToCenter = [
        icon.organizedPos.clone(),
        donnaPosition.clone(),
      ]
      const geoCenter = new THREE.BufferGeometry().setFromPoints(pointsToCenter)
      const matCenter = connectionMaterial.clone()
      const lineCenter = new THREE.Line(geoCenter, matCenter)
      this.networkConnections.push({line: lineCenter, material: matCenter})
      this.group.add(lineCenter)

      // icon → grid (vertical drop)
      const pointsToGrid = [
        icon.organizedPos.clone(),
        new THREE.Vector3(icon.organizedPos.x, 0.0, icon.organizedPos.z),
      ]
      const geoGrid = new THREE.BufferGeometry().setFromPoints(pointsToGrid)
      const matGrid = connectionMaterial.clone()
      const lineGrid = new THREE.Line(geoGrid, matGrid)
      this.networkConnections.push({line: lineGrid, material: matGrid})
      this.group.add(lineGrid)
    })

    // icon → neighboring icon connections
    for (let i = 0; i < this.icons.length; i++) {
      const next = (i + 1) % this.icons.length
      const pointsPeer = [
        this.icons[i].organizedPos.clone(),
        this.icons[next].organizedPos.clone(),
      ]
      const geoPeer = new THREE.BufferGeometry().setFromPoints(pointsPeer)
      const matPeer = connectionMaterial.clone()
      matPeer.color = new THREE.Color(0x8A6CFF)
      const linePeer = new THREE.Line(geoPeer, matPeer)
      this.networkConnections.push({line: linePeer, material: matPeer})
      this.group.add(linePeer)
    }

    // Animate connections fading in
    this.networkConnections.forEach((conn, i) => {
      gsap.to(conn.material, {
        opacity: 0.35,
        duration: 0.8,
        delay: i * 0.05,
        ease: 'power2.out',
      })
    })
  }

  // Per-frame update for drift, rotation, flicker, pulse travel
  update(dt, camera) {
    this.time += dt

    this.icons.forEach((icon) => {
      // Billboard: icon faces camera
      if (camera) {
        icon.mesh.lookAt(camera.position)
      }

      // Drift animation (only in fragmented mode)
      if (!this.organized) {
        const t = this.time
        icon.mesh.position.x = icon.fragmentedPos.x + Math.sin(t * icon.driftSpeed + icon.driftPhase) * 0.012
        icon.mesh.position.z = icon.fragmentedPos.z + Math.cos(t * icon.driftSpeed * 0.7 + icon.driftPhase) * 0.012
        icon.mesh.position.y = icon.fragmentedPos.y + Math.sin(t * 0.8 + icon.driftPhase) * 0.006
      }
    })

    // Flicker grid connections
    this.gridConnections.forEach((conn, i) => {
      if (!this.organized && conn.material.opacity > 0) {
        const flicker = 0.12 + Math.sin(this.time * 3.0 + i * 1.7) * 0.08
        conn.material.opacity = Math.max(0, flicker)
      }

      // Update line positions to follow icon
      if (!this.organized) {
        const icon = this.icons[i]
        if (icon) {
          const posAttr = conn.line.geometry.getAttribute('position')
          posAttr.array[0] = icon.mesh.position.x
          posAttr.array[1] = icon.mesh.position.y
          posAttr.array[2] = icon.mesh.position.z
          posAttr.array[3] = icon.mesh.position.x * 0.7
          posAttr.array[4] = icon.mesh.position.y * 0.3
          posAttr.array[5] = icon.mesh.position.z * 0.7
          posAttr.array[6] = icon.mesh.position.x * 0.5
          posAttr.array[7] = 0.0
          posAttr.array[8] = icon.mesh.position.z * 0.5
          posAttr.needsUpdate = true
        }
      }
    })

    // Pulse brightness on organized connections
    this.networkConnections.forEach((conn, i) => {
      if (conn.material.opacity > 0) {
        const pulse = 0.25 + Math.sin(this.time * 1.5 + i * 0.8) * 0.1
        conn.material.opacity = pulse
      }
    })
  }

  dispose() {
    this.icons.forEach((icon) => {
      icon.mesh.geometry.dispose()
      icon.mesh.material.map?.dispose()
      icon.mesh.material.dispose()
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
