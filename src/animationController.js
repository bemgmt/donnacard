import * as THREE from 'three'
import gsap from 'gsap'

import {LightColumn} from './lightColumn'
import {EnergyBurst} from './energyBurst'
import {PulseAnimation} from './pulseAnimation'

export const Phase = {
  IDLE: 'idle',
  GRID_WAKE: 'grid_wake',
  FRAGMENTED: 'fragmented',
  CONVERGENCE: 'convergence',
  INFRASTRUCTURE_LIFT: 'infrastructure_lift',
  DONNA_MATERIALIZE: 'donna_materialize',
  ORGANIZING: 'organizing',
  NETWORK_BUILDING: 'network_building',
  NETWORK_STABLE: 'network_stable',
  ENTERING_LAYER: 'entering_layer',
}

export class AnimationController {
  constructor(networkGrid, iconManager, donnaTransition, parentGroup) {
    this.grid = networkGrid
    this.icons = iconManager
    this.donna = donnaTransition
    this.parentGroup = parentGroup
    this.phase = Phase.IDLE
    this.timeline = null
    this.onEnterLayer = null

    this.lightColumn = new LightColumn()
    parentGroup.add(this.lightColumn.group)

    this.energyBurst = new EnergyBurst()
    parentGroup.add(this.energyBurst.group)

    this.pulses = new PulseAnimation(parentGroup)

    this.networkCompleteChecked = false
  }

  startSequence() {
    if (this.phase !== Phase.IDLE) return
    this.phase = Phase.GRID_WAKE

    this.timeline = gsap.timeline()

    // 0.0s — Grid wakes with electric scan
    this.timeline.call(() => {
      this.grid.scanWake()
      this.grid.pulse()
    }, null, 0.0)

    // 0.2s — Icons spawn floating (fragmented)
    this.timeline.call(() => {
      this.phase = Phase.FRAGMENTED
      this.icons.spawnFragmented()
    }, null, 0.2)

    // 0.5s — Signal convergence: icons freeze, pulses travel inward
    this.timeline.call(() => {
      this.phase = Phase.CONVERGENCE
      this.icons.freezeIcons()
      this._fireConvergenceSignals()
    }, null, 0.5)

    // 1.2s — Infrastructure lift + light column
    this.timeline.call(() => {
      this.phase = Phase.INFRASTRUCTURE_LIFT
      this.grid.lift()
      this.lightColumn.fadeIn(0.6)
      this.donna.showWireframe()
    }, null, 1.2)

    // 1.8s — DONNA logo materializes + shockwave
    this.timeline.call(() => {
      this.phase = Phase.DONNA_MATERIALIZE
      this.donna.materialize()
      this.energyBurst.fire(0x36D1FF, 1.0)
      this.grid.pulse()
    }, null, 1.8)

    // 2.3s — Light column fades, system online shockwave
    this.timeline.call(() => {
      this.lightColumn.fadeOut(0.8)
      this.energyBurst.fire(0x8A6CFF, 1.2)
    }, null, 2.3)

    // 2.5s — Icons organize into network positions
    this.timeline.call(() => {
      this.phase = Phase.ORGANIZING
      this.icons.unfreezeIcons()
      this.icons.animateToOrganized(() => {
        this._onIconsOrganized()
      })
    }, null, 2.5)
  }

  _fireConvergenceSignals() {
    const iconPositions = this.icons.getIconPositions()
    const center = this.donna.position

    this.pulses.fireConvergence(iconPositions, center, () => {
      this.grid.pulse()
    })
  }

  _onIconsOrganized() {
    this.phase = Phase.NETWORK_BUILDING
    this.icons.buildNetworkConnections(this.donna.position)

    gsap.delayedCall(0.3, () => {
      this.grid.pulse()
    })

    this.networkCompleteChecked = false
  }

  _onNetworkComplete() {
    this.energyBurst.fire(0x8A6CFF, 1.0)

    const endpoints = this.icons.getConnectionEndpoints(this.donna.position)
    this.pulses.clearConnections()
    endpoints.forEach(ep => this.pulses.addConnection(ep.start, ep.end))
    this.pulses.startContinuous()

    gsap.delayedCall(0.5, () => {
      this.phase = Phase.NETWORK_STABLE
      this.donna.enableInteraction()
    })
  }

  triggerEnterLayer() {
    if (this.phase !== Phase.NETWORK_STABLE) return
    this.phase = Phase.ENTERING_LAYER

    const overlayText = document.getElementById('overlay-text')
    if (overlayText) overlayText.classList.add('visible')

    gsap.delayedCall(1.2, () => {
      const whiteFade = document.getElementById('white-fade')
      if (whiteFade) whiteFade.classList.add('active')
    })

    gsap.delayedCall(2.8, () => {
      this.enterDonnaLayer()
    })
  }

  enterDonnaLayer() {
    console.log('[DONNA] Entering Operational Intelligence Layer')
    if (this.onEnterLayer) {
      this.onEnterLayer()
    }
  }

  update(dt) {
    this.lightColumn.update(dt)
    this.pulses.update(dt)

    if (this.phase === Phase.NETWORK_BUILDING && !this.networkCompleteChecked) {
      if (this.icons.isNetworkComplete()) {
        this.networkCompleteChecked = true
        this._onNetworkComplete()
      }
    }
  }

  reset() {
    if (this.timeline) {
      this.timeline.kill()
      this.timeline = null
    }
    gsap.killTweensOf('*')
    this.phase = Phase.IDLE
    this.networkCompleteChecked = false
    this.pulses.stopAll()

    const overlayText = document.getElementById('overlay-text')
    if (overlayText) overlayText.classList.remove('visible')
    const whiteFade = document.getElementById('white-fade')
    if (whiteFade) whiteFade.classList.remove('active')
  }

  getPhase() {
    return this.phase
  }

  dispose() {
    this.reset()
    this.lightColumn.dispose()
    this.energyBurst.dispose()
    this.pulses.dispose()
  }
}
