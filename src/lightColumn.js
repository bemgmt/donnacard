import * as THREE from 'three'
import gsap from 'gsap'

const COLUMN_HEIGHT = 0.4
const INNER_RADIUS_TOP = 0.015
const INNER_RADIUS_BOTTOM = 0.025
const OUTER_RADIUS_TOP = 0.04
const OUTER_RADIUS_BOTTOM = 0.06

export class LightColumn {
  constructor() {
    this.group = new THREE.Group()
    this.group.name = 'light-column'
    this.group.visible = false

    const innerGeo = new THREE.CylinderGeometry(
      INNER_RADIUS_TOP, INNER_RADIUS_BOTTOM, COLUMN_HEIGHT, 16, 1, true
    )
    this.innerMaterial = new THREE.MeshBasicMaterial({
      color: 0x36D1FF,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    this.innerMesh = new THREE.Mesh(innerGeo, this.innerMaterial)
    this.innerMesh.position.y = COLUMN_HEIGHT * 0.5
    this.group.add(this.innerMesh)

    const outerGeo = new THREE.CylinderGeometry(
      OUTER_RADIUS_TOP, OUTER_RADIUS_BOTTOM, COLUMN_HEIGHT * 0.85, 16, 1, true
    )
    this.outerMaterial = new THREE.MeshBasicMaterial({
      color: 0x8A6CFF,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    this.outerMesh = new THREE.Mesh(outerGeo, this.outerMaterial)
    this.outerMesh.position.y = COLUMN_HEIGHT * 0.45
    this.group.add(this.outerMesh)

    this.time = 0
    this.active = false
  }

  fadeIn(duration = 0.6) {
    this.group.visible = true
    this.active = true

    gsap.to(this.innerMaterial, {
      opacity: 0.7,
      duration,
      ease: 'power2.in',
    })
    gsap.to(this.outerMaterial, {
      opacity: 0.3,
      duration: duration * 1.2,
      ease: 'power2.in',
    })
    gsap.from(this.innerMesh.scale, {
      y: 0.1,
      duration,
      ease: 'power2.out',
    })
  }

  fadeOut(duration = 0.8) {
    gsap.to(this.innerMaterial, {
      opacity: 0,
      duration,
      ease: 'power2.out',
    })
    gsap.to(this.outerMaterial, {
      opacity: 0,
      duration,
      ease: 'power2.out',
      onComplete: () => {
        this.group.visible = false
        this.active = false
      },
    })
  }

  update(dt) {
    if (!this.active) return
    this.time += dt

    const pulse = 0.6 + Math.sin(this.time * 4.0) * 0.15
    this.innerMaterial.opacity = pulse
    this.outerMaterial.opacity = pulse * 0.4
  }

  dispose() {
    this.innerMesh.geometry.dispose()
    this.innerMaterial.dispose()
    this.outerMesh.geometry.dispose()
    this.outerMaterial.dispose()
  }
}
