import * as THREE from 'three'
import gsap from 'gsap'

export class EnergyBurst {
  constructor() {
    this.group = new THREE.Group()
    this.group.name = 'energy-burst'
    this.group.rotation.x = -Math.PI / 2
    this.rings = []
  }

  fire(color = 0x8A6CFF, duration = 1.0) {
    const geometry = new THREE.RingGeometry(0.05, 0.07, 64)
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })

    const ring = new THREE.Mesh(geometry, material)
    this.group.add(ring)
    this.rings.push({mesh: ring, material})

    gsap.to(ring.scale, {
      x: 8,
      y: 8,
      z: 8,
      duration,
      ease: 'power2.out',
    })

    gsap.to(material, {
      opacity: 0,
      duration,
      ease: 'power2.in',
      onComplete: () => {
        this.group.remove(ring)
        geometry.dispose()
        material.dispose()
        const idx = this.rings.findIndex(r => r.mesh === ring)
        if (idx >= 0) this.rings.splice(idx, 1)
      },
    })
  }

  dispose() {
    this.rings.forEach(({mesh, material}) => {
      mesh.geometry.dispose()
      material.dispose()
    })
    this.rings = []
  }
}
