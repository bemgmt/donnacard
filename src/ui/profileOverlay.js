import gsap from 'gsap'

const SVG_ICONS = {
  website: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>',
  twitter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l11.733 16h4.267l-11.733-16z"/><path d="M4 20l6.768-6.768"/><path d="M20 4l-6.768 6.768"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.13c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.46z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>',
  medium: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="12" r="4"/><ellipse cx="15" cy="12" rx="2" ry="4"/><line x1="21" y1="8" x2="21" y2="16"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>',
}

export class ProfileOverlay {
  constructor() {
    this.container = null
    this.videoEl = null
    this.profile = null
    this.visible = false
    this.videoPlaying = false
    this._onAction = null
  }

  async init({onAction} = {}) {
    this._onAction = onAction || null

    try {
      const resp = await fetch('/assets/profile.json')
      this.profile = await resp.json()
    } catch {
      this.profile = {
        fullName: 'DONNA',
        headline: 'Operational Intelligence',
        vcardPath: '/assets/contact.vcf',
        links: {},
        video: {},
      }
    }

    this._buildDOM()
  }

  _buildDOM() {
    const p = this.profile

    this.container = document.createElement('div')
    this.container.id = 'profile-overlay'
    this.container.className = 'profile-overlay'
    this.container.setAttribute('aria-hidden', 'true')

    // -- Profile header --
    const header = document.createElement('div')
    header.className = 'po-header po-stagger'

    const nameBlock = document.createElement('div')
    nameBlock.className = 'po-name-block'

    const nameEl = document.createElement('h1')
    nameEl.className = 'po-name'
    nameEl.textContent = p.fullName || 'DONNA'

    const tagline = document.createElement('p')
    tagline.className = 'po-tagline'
    tagline.textContent = p.headline || ''

    nameBlock.appendChild(nameEl)
    nameBlock.appendChild(tagline)
    header.appendChild(nameBlock)

    // -- Video tile --
    const videoTile = document.createElement('div')
    videoTile.className = 'po-video-tile po-stagger'

    this.videoEl = document.createElement('video')
    this.videoEl.className = 'po-video'
    this.videoEl.setAttribute('playsinline', '')
    this.videoEl.setAttribute('webkit-playsinline', '')
    this.videoEl.muted = true
    this.videoEl.preload = 'metadata'
    this.videoEl.loop = true

    if (p.video && p.video.src) {
      this.videoEl.src = p.video.src
    }
    if (p.video && p.video.poster) {
      this.videoEl.poster = p.video.poster
    }

    this.playBtn = document.createElement('button')
    this.playBtn.className = 'po-play-btn'
    this.playBtn.setAttribute('aria-label', 'Play video')
    this.playBtn.innerHTML = SVG_ICONS.play

    this.playBtn.addEventListener('pointerup', (e) => {
      e.stopPropagation()
      this._toggleVideo()
    })

    this.videoEl.addEventListener('ended', () => {
      this.videoPlaying = false
      this.playBtn.innerHTML = SVG_ICONS.play
      this.playBtn.style.opacity = '1'
    })

    videoTile.appendChild(this.videoEl)
    videoTile.appendChild(this.playBtn)

    // -- Primary CTA buttons --
    const ctaRow = document.createElement('div')
    ctaRow.className = 'po-cta-row po-stagger'

    const dlBtn = this._createCTA('Download Contact', SVG_ICONS.download, () => {
      this._fireAction('download_vcard')
      const a = document.createElement('a')
      a.href = p.vcardPath || '/assets/contact.vcf'
      a.download = 'contact.vcf'
      a.click()
    })

    const webBtn = this._createCTA('Website', SVG_ICONS.website, () => {
      this._fireAction('open_website')
      if (p.links && p.links.website) {
        window.open(p.links.website, '_blank', 'noopener')
      }
    })

    ctaRow.appendChild(dlBtn)
    ctaRow.appendChild(webBtn)

    // -- Social icon row --
    const socialRow = document.createElement('div')
    socialRow.className = 'po-social-row po-stagger'

    const socialKeys = ['linkedin', 'twitter', 'instagram', 'tiktok', 'facebook', 'youtube', 'medium']
    socialKeys.forEach((key) => {
      if (!p.links || !p.links[key]) return
      const btn = document.createElement('a')
      btn.className = 'po-social-btn'
      btn.href = p.links[key]
      btn.target = '_blank'
      btn.rel = 'noopener'
      btn.setAttribute('aria-label', key)
      btn.innerHTML = SVG_ICONS[key] || ''
      btn.addEventListener('pointerup', () => this._fireAction('open_' + key))
      socialRow.appendChild(btn)
    })

    // -- Assemble --
    this.container.appendChild(header)
    this.container.appendChild(videoTile)
    this.container.appendChild(ctaRow)
    this.container.appendChild(socialRow)

    document.body.appendChild(this.container)
  }

  _createCTA(label, iconSvg, onClick) {
    const btn = document.createElement('button')
    btn.className = 'po-cta-btn'
    btn.innerHTML = `<span class="po-cta-icon">${iconSvg}</span><span>${label}</span>`
    btn.addEventListener('pointerup', (e) => {
      e.stopPropagation()
      onClick()
    })
    return btn
  }

  _toggleVideo() {
    if (!this.videoEl) return

    if (this.videoPlaying) {
      this.videoEl.pause()
      this.videoPlaying = false
      this.playBtn.innerHTML = SVG_ICONS.play
      this.playBtn.style.opacity = '1'
      this._fireAction('video_pause')
    } else {
      this.videoEl.muted = false
      const playPromise = this.videoEl.play()
      if (playPromise !== undefined) {
        playPromise.then(() => {
          this.videoPlaying = true
          this.playBtn.innerHTML = SVG_ICONS.pause
          this.playBtn.style.opacity = '0.5'
          this._fireAction('video_play')
        }).catch(() => {
          this.videoEl.muted = true
          this.videoEl.play().then(() => {
            this.videoPlaying = true
            this.playBtn.innerHTML = SVG_ICONS.pause
            this.playBtn.style.opacity = '0.5'
            this._fireAction('video_play')
          }).catch(() => {
            console.warn('[ProfileOverlay] Video playback blocked')
            this._fireAction('video_error')
          })
        })
      }
    }
  }

  _fireAction(actionId) {
    if (this._onAction) this._onAction({actionId})
  }

  show() {
    if (!this.container) return
    this.visible = true
    this.container.setAttribute('aria-hidden', 'false')
    this.container.style.display = 'flex'

    const items = this.container.querySelectorAll('.po-stagger')

    gsap.set(this.container, {opacity: 0})
    gsap.set(items, {opacity: 0, scale: 0.92, y: 12})

    gsap.to(this.container, {
      opacity: 1,
      duration: 0.3,
      ease: 'power2.out',
    })

    items.forEach((el, i) => {
      gsap.to(el, {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.25,
        delay: 0.15 + i * 0.12,
        ease: 'power2.out',
      })
    })
  }

  hide(fast = false) {
    if (!this.container) return
    this.visible = false

    const dur = fast ? 0.1 : 0.15
    gsap.to(this.container, {
      opacity: 0,
      duration: dur,
      ease: 'power2.in',
      onComplete: () => {
        if (this.container) {
          this.container.style.display = 'none'
          this.container.setAttribute('aria-hidden', 'true')
        }
      },
    })

    this.pauseVideo()
  }

  pauseVideo() {
    if (this.videoEl && this.videoPlaying) {
      this.videoEl.pause()
      this.videoPlaying = false
      if (this.playBtn) {
        this.playBtn.innerHTML = SVG_ICONS.play
        this.playBtn.style.opacity = '1'
      }
    }
  }

  showFallback() {
    if (!this.container) return
    this.visible = true
    this.container.setAttribute('aria-hidden', 'false')
    this.container.classList.add('po-fallback-mode')
    this.container.style.display = 'flex'
    this.container.style.opacity = '1'

    const items = this.container.querySelectorAll('.po-stagger')
    items.forEach((el) => {
      el.style.opacity = '1'
      el.style.transform = 'none'
    })
  }

  dispose() {
    if (this.videoEl) {
      this.videoEl.pause()
      this.videoEl.removeAttribute('src')
      this.videoEl.load()
    }
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
    }
    this.container = null
    this.videoEl = null
  }
}
