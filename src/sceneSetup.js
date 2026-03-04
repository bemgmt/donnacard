// ──────────────────────────────────────────────────────────
// sceneSetup.js — Scene environment configuration
// Sets up renderer tone-mapping, fog, and scene-level
// visual properties for the dark-indigo AR aesthetic.
// ──────────────────────────────────────────────────────────

import * as THREE from 'three'

const COLORS = {
  background: 0x0B1B2B,
  fog: 0x0B1B2B,
}

export function initSceneEnvironment(scene, renderer) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.outputColorSpace = THREE.SRGBColorSpace

  scene.fog = new THREE.FogExp2(COLORS.fog, 0.8)

  const ambientFill = new THREE.AmbientLight(0x36D1FF, 0.08)
  scene.add(ambientFill)

  const rimLight = new THREE.PointLight(0x8A6CFF, 0.4, 2.0)
  rimLight.position.set(0, 0.5, 0)
  scene.add(rimLight)

  return { ambientFill, rimLight }
}
