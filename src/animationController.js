// ──────────────────────────────────────────────────────────
// animationController.js — Two-phase animation orchestrator
// Manages cinematic timing from Fragmented → DONNA Entrance
// → Organized Network → Interactive state.
//
// Timeline:
//  0.0s  Image found → Sequence 1 starts
//  0.2s  Icons begin spawning (staggered)
//  3.0s  DONNA logo fades in
//  4.5s  Grid pulses, light travels, icons begin moving
//  6.5s  Sequence 2: icons reach organized positions
//  7.5s  Network connections build
//  9.0s  Network stabilizes — interaction enabled
// ──────────────────────────────────────────────────────────

import gsap from 'gsap'

// ── Phase enum ───────────────────────────────────────────

export const Phase = {
  IDLE: 'idle',
  FRAGMENTED: 'fragmented',
  DONNA_ENTRANCE: 'donna_entrance',
  ORGANIZING: 'organizing',
  NETWORK_STABLE: 'network_stable',
  ENTERING_LAYER: 'entering_layer',
}

// ── AnimationController ──────────────────────────────────

export class AnimationController {
  constructor(networkGrid, iconManager, donnaTransition) {
    this.grid = networkGrid
    this.icons = iconManager
    this.donna = donnaTransition
    this.phase = Phase.IDLE
    this.timeline = null
    this.onEnterLayer = null
  }

  // Called when image target is found — kick off the full sequence
  startSequence() {
    if (this.phase !== Phase.IDLE) return
    this.phase = Phase.FRAGMENTED

    this.timeline = gsap.timeline()

    // ── Sequence 1: Fragmented Tools ──────────────────
    this.timeline.call(() => {
      this.icons.spawnFragmented()
    }, null, 0.2)

    // ── DONNA Entrance ────────────────────────────────
    this.timeline.call(() => {
      this.phase = Phase.DONNA_ENTRANCE
      this.donna.fadeIn()
    }, null, 3.0)

    // Grid pulse outward
    this.timeline.call(() => {
      this.grid.pulse()
    }, null, 4.2)

    // ── Sequence 2: Organized Network ─────────────────
    this.timeline.call(() => {
      this.phase = Phase.ORGANIZING
      this.icons.animateToOrganized(() => {
        this._onIconsOrganized()
      })
    }, null, 4.8)
  }

  _onIconsOrganized() {
    // Build the network connection lines
    this.icons.buildNetworkConnections(this.donna.position)

    // Second grid pulse to emphasize network formation
    gsap.delayedCall(0.3, () => {
      this.grid.pulse()
    })

    // Enable tap interaction after network settles
    gsap.delayedCall(1.5, () => {
      this.phase = Phase.NETWORK_STABLE
      this.donna.enableInteraction()
    })
  }

  // Called when user taps the DONNA logo
  triggerEnterLayer() {
    if (this.phase !== Phase.NETWORK_STABLE) return
    this.phase = Phase.ENTERING_LAYER

    // Show overlay text
    const overlayText = document.getElementById('overlay-text')
    if (overlayText) overlayText.classList.add('visible')

    // Fade scene to white after text shows
    gsap.delayedCall(1.2, () => {
      const whiteFade = document.getElementById('white-fade')
      if (whiteFade) whiteFade.classList.add('active')
    })

    // Call the placeholder function
    gsap.delayedCall(2.8, () => {
      this.enterDonnaLayer()
    })
  }

  // Placeholder for next AR sequence — wire up real navigation here
  enterDonnaLayer() {
    console.log('[DONNA] Entering Operational Intelligence Layer')
    if (this.onEnterLayer) {
      this.onEnterLayer()
    }
  }

  // Reset for when image target is lost
  reset() {
    if (this.timeline) {
      this.timeline.kill()
      this.timeline = null
    }
    gsap.killTweensOf('*')
    this.phase = Phase.IDLE

    const overlayText = document.getElementById('overlay-text')
    if (overlayText) overlayText.classList.remove('visible')
    const whiteFade = document.getElementById('white-fade')
    if (whiteFade) whiteFade.classList.remove('active')
  }

  getPhase() {
    return this.phase
  }
}
