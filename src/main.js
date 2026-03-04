// ──────────────────────────────────────────────────────────
// main.js — DONNA AR Business Card Experience
//
// Entry-point component for the 8th Wall ECS runtime.
// Registers the "donna-ar" component which is attached to
// the image-target entity defined in .expanse.json.
//
// Image target loading uses the new 8th Wall pattern:
//   - app.js calls XR8.XrController.configure({imageTargetData})
//   - This component listens on world.events.globalId for
//     'reality.imagefound' / 'reality.imagelost' events
//   - Events carry {name, position, rotation, scale} data
//
// When the business card is recognized, the component
// orchestrates a two-phase animation:
//   Phase 1 → Fragmented business tools float loosely
//   Phase 2 → DONNA organizes them into a unified network
//
// Architecture:
//   app.js               → XR8 image target data loading
//   main.js              → ECS component + event wiring
//   sceneSetup.js        → Renderer/environment config
//   networkGrid.js       → Glowing neural grid plane
//   iconManager.js       → Tool icon sprites + connections
//   donnaTransition.js   → DONNA logo + glow effects
//   animationController.js → Cinematic timeline sequencer
// ──────────────────────────────────────────────────────────

import * as ecs from '@8thwall/ecs'
import * as THREE from 'three'

import {initSceneEnvironment} from './sceneSetup'
import {NetworkGrid} from './networkGrid'
import {IconManager} from './iconManager'
import {DonnaTransition} from './donnaTransition'
import {AnimationController} from './animationController'

const IMAGE_TARGET_NAME = 'donna-logo-target'

// ── Shared state (per-session, survives hot-reload) ──────

let initialized = false
let grid = null
let icons = null
let donna = null
let controller = null
let arGroup = null

// ── Component registration ───────────────────────────────

ecs.registerComponent({
  name: 'donna-ar',
  schema: {
    imageTargetName: ecs.string,
  },
  schemaDefaults: {
    imageTargetName: IMAGE_TARGET_NAME,
  },

  // Called once when the image-target entity is created
  add: (world, {eid, schemaAttribute}) => {
    if (initialized) return
    initialized = true

    const scene = world.three.scene
    const renderer = world.three.renderer

    initSceneEnvironment(scene, renderer)

    // The image-target Object3D — everything we add as a
    // child will track with the business card automatically.
    const targetObject = world.three.entityToObject.get(eid)

    // Container group for the entire AR experience
    arGroup = new THREE.Group()
    arGroup.name = 'donna-ar-root'
    arGroup.visible = false
    arGroup.scale.set(2, 2, 2)
    if (targetObject) {
      targetObject.add(arGroup)
    } else {
      scene.add(arGroup)
    }

    // ── Build scene objects ──────────────────────────
    grid = new NetworkGrid()
    arGroup.add(grid.group)

    icons = new IconManager()
    arGroup.add(icons.group)

    donna = new DonnaTransition()
    arGroup.add(donna.group)

    controller = new AnimationController(grid, icons, donna, arGroup)

    controller.onEnterLayer = () => {
      console.log('[DONNA] enterDonnaLayer() → ready for next sequence')
    }

    // ── Image target events (new 8th Wall pattern) ───
    // Listen on globalId for reality.imagefound/lost,
    // filter by target name from schema.
    const targetName = schemaAttribute
      ? schemaAttribute.get(eid).imageTargetName
      : IMAGE_TARGET_NAME

    world.events.addListener(world.events.globalId, 'reality.imagefound', (event) => {
      const data = event.data
      if (data.name !== targetName) return

      arGroup.visible = true

      // Apply tracked position/rotation/scale from the engine
      if (targetObject) {
        if (data.position) {
          targetObject.position.set(data.position.x, data.position.y, data.position.z)
        }
        if (data.rotation) {
          targetObject.quaternion.set(data.rotation.x, data.rotation.y, data.rotation.z, data.rotation.w)
        }
        if (data.scale != null) {
          const s = typeof data.scale === 'number' ? data.scale : 1
          targetObject.scale.setScalar(s)
        }
      }

      controller.startSequence()
    })

    world.events.addListener(world.events.globalId, 'reality.imageupdated', (event) => {
      const data = event.data
      if (data.name !== targetName) return

      // Continuously update tracked pose
      if (targetObject) {
        if (data.position) {
          targetObject.position.set(data.position.x, data.position.y, data.position.z)
        }
        if (data.rotation) {
          targetObject.quaternion.set(data.rotation.x, data.rotation.y, data.rotation.z, data.rotation.w)
        }
        if (data.scale != null) {
          const s = typeof data.scale === 'number' ? data.scale : 1
          targetObject.scale.setScalar(s)
        }
      }
    })

    world.events.addListener(world.events.globalId, 'reality.imagelost', (event) => {
      const data = event.data
      if (data.name !== targetName) return
      // Keep visible briefly — the tracking system holds the last position
    })

    // ── Tap interaction via screen touch ─────────────
    setupTapHandler(world, eid)

    console.log(`[DONNA] AR experience initialized — waiting for target "${targetName}"`)
  },

  // Called every frame for each entity with this component
  tick: (world, {eid}) => {
    if (!initialized) return

    const dt = world.time.delta / 1000
    const camera = world.three.activeCamera

    if (grid) grid.update(dt)
    if (icons) icons.update(dt, camera)
    if (donna) donna.update(dt, camera)
    if (controller) controller.update(dt)
  },

  remove: (world, {eid}) => {
    if (controller) controller.dispose()
    if (grid) grid.dispose()
    if (icons) icons.dispose()
    if (donna) donna.dispose()
    initialized = false
  },
})

// ── Tap handler (raycasts screen touch → DONNA logo) ─────

function setupTapHandler(world) {
  const raycaster = new THREE.Raycaster()
  const touchPos = new THREE.Vector2()

  const handleTap = (x, y) => {
    if (!controller || !donna || !donna.interactive) return

    touchPos.x = (x / window.innerWidth) * 2 - 1
    touchPos.y = -(y / window.innerHeight) * 2 + 1

    const camera = world.three.activeCamera
    raycaster.setFromCamera(touchPos, camera)

    const donnaTarget = donna.getInteractiveMesh()
    const hits = raycaster.intersectObject(donnaTarget, true)

    if (hits.length > 0) {
      controller.triggerEnterLayer()
    }
  }

  // Listen on the renderer canvas for tap events
  const canvas = world.three.renderer.domElement
  if (canvas) {
    canvas.addEventListener('pointerup', (e) => {
      handleTap(e.clientX, e.clientY)
    }, {passive: true})
  }
}
