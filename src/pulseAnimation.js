import * as THREE from 'three'

const PULSE_RADIUS = 0.012
const PULSE_SPEED = 0.02
const MAX_PULSES = 15

export class PulseAnimation {
  constructor(parentGroup) {
    this.parent = parentGroup
    this.pulses = []
    this.connections = []
    this.active = false
    this.time = 0
    this.spawnInterval = 0.8
    this.spawnTimer = 0

    this.pulseGeometry = new THREE.SphereGeometry(PULSE_RADIUS, 8, 8)
    this.coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x36D1FF,
      transparent: true,
      opacity: 0.9,
    })
    this.glowGeometry = new THREE.SphereGeometry(PULSE_RADIUS * 3, 8, 8)
    this.glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x36D1FF,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }

  addConnection(start, end) {
    this.connections.push({start: start.clone(), end: end.clone()})
  }

  clearConnections() {
    this.connections = []
  }

  startContinuous() {
    this.active = true
    this.spawnTimer = 0
  }

  stopAll() {
    this.active = false
    this.pulses.forEach(p => this.parent.remove(p.group))
    this.pulses = []
  }

  fireConvergence(origins, target, onComplete) {
    let completed = 0
    const total = origins.length

    origins.forEach((origin, i) => {
      const group = new THREE.Group()
      const core = new THREE.Mesh(this.pulseGeometry, this.coreMaterial.clone())
      const glow = new THREE.Mesh(this.glowGeometry, this.glowMaterial.clone())
      group.add(core)
      group.add(glow)
      group.position.copy(origin)
      this.parent.add(group)

      const pulse = {
        group, core, glow,
        start: origin.clone(),
        end: target.clone(),
        progress: 0,
        speed: 0.015 + i * 0.002,
        convergence: true,
      }
      this.pulses.push(pulse)

      const checkDone = () => {
        completed++
        if (completed >= total && onComplete) onComplete()
      }

      const animate = () => {
        pulse.progress += pulse.speed
        pulse.group.position.lerpVectors(pulse.start, pulse.end, Math.min(pulse.progress, 1))

        if (pulse.progress >= 1.0) {
          this.parent.remove(group)
          core.material.dispose()
          glow.material.dispose()
          const idx = this.pulses.indexOf(pulse)
          if (idx >= 0) this.pulses.splice(idx, 1)
          checkDone()
        } else {
          requestAnimationFrame(animate)
        }
      }

      setTimeout(() => requestAnimationFrame(animate), i * 80)
    })
  }

  _spawnPulse() {
    if (this.connections.length === 0 || this.pulses.length >= MAX_PULSES) return

    const connIdx = Math.floor(Math.random() * this.connections.length)
    const conn = this.connections[connIdx]

    const group = new THREE.Group()
    const core = new THREE.Mesh(this.pulseGeometry, this.coreMaterial.clone())
    const glow = new THREE.Mesh(this.glowGeometry, this.glowMaterial.clone())
    group.add(core)
    group.add(glow)
    group.position.copy(conn.start)
    this.parent.add(group)

    this.pulses.push({
      group, core, glow,
      start: conn.start,
      end: conn.end,
      progress: 0,
      speed: PULSE_SPEED + Math.random() * 0.01,
    })
  }

  update(dt) {
    this.time += dt

    if (this.active) {
      this.spawnTimer += dt
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer = 0
        this._spawnPulse()
      }
    }

    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const pulse = this.pulses[i]
      if (pulse.convergence) continue

      pulse.progress += pulse.speed
      pulse.group.position.lerpVectors(pulse.start, pulse.end, Math.min(pulse.progress, 1))

      const brightness = 0.2 + Math.sin(this.time * 6.0 + i * 2.0) * 0.08
      pulse.glow.material.opacity = brightness

      if (pulse.progress >= 1.0) {
        this.parent.remove(pulse.group)
        pulse.core.material.dispose()
        pulse.glow.material.dispose()
        this.pulses.splice(i, 1)
      }
    }
  }

  dispose() {
    this.stopAll()
    this.pulseGeometry.dispose()
    this.coreMaterial.dispose()
    this.glowGeometry.dispose()
    this.glowMaterial.dispose()
  }
}
