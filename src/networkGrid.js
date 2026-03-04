import * as THREE from 'three'
import gsap from 'gsap'

const GRID_SIZE = 0.9
const GRID_SEGMENTS = 48
const NODE_COUNT = 80
const PARTICLE_COUNT = 120

const gridVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPulse;
  uniform float uScan;
  varying vec2 vUv;
  varying float vElevation;
  varying float vDistFromCenter;

  void main() {
    vUv = uv;

    vec3 pos = position;
    vec2 centered = uv - 0.5;
    vDistFromCenter = length(centered);

    float wave1 = sin(pos.x * 8.0 + uTime * 0.6) * 0.004;
    float wave2 = cos(pos.y * 6.0 + uTime * 0.4) * 0.003;
    float wave3 = sin((pos.x + pos.y) * 5.0 + uTime * 0.5) * 0.002;
    float elevation = wave1 + wave2 + wave3;

    if (uPulse >= 0.0) {
      float pulseDist = abs(vDistFromCenter - uPulse * 0.7);
      float pulseWave = smoothstep(0.08, 0.0, pulseDist) * 0.012;
      elevation += pulseWave;
    }

    if (uScan >= 0.0) {
      float scanLine = abs(centered.y - (uScan - 0.5));
      float scanWave = smoothstep(0.06, 0.0, scanLine) * 0.008;
      elevation += scanWave;
    }

    pos.z += elevation;
    vElevation = elevation;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const gridFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uPulse;
  uniform float uScan;
  uniform vec3 uPrimaryColor;
  uniform vec3 uSecondaryColor;
  varying vec2 vUv;
  varying float vElevation;
  varying float vDistFromCenter;

  void main() {
    vec2 gridUv = vUv * 20.0;
    vec2 grid = abs(fract(gridUv - 0.5) - 0.5);
    vec2 lineWidth = fwidth(gridUv) * 1.2;
    vec2 lines = smoothstep(lineWidth, vec2(0.0), grid);
    float gridLine = max(lines.x, lines.y);

    vec3 bgColor = vec3(0.043, 0.106, 0.169);

    float colorMix = sin(vUv.x * 6.28 + uTime * 0.3) * 0.5 + 0.5;
    vec3 lineColor = mix(uPrimaryColor, uSecondaryColor, colorMix) * 0.45;

    float elevGlow = smoothstep(-0.005, 0.01, vElevation) * 0.3;
    lineColor += uPrimaryColor * elevGlow;

    if (uPulse >= 0.0) {
      float pulseDist = abs(vDistFromCenter - uPulse * 0.7);
      float pulseGlow = smoothstep(0.12, 0.0, pulseDist) * 0.6;
      lineColor += uPrimaryColor * pulseGlow;
    }

    if (uScan >= 0.0) {
      vec2 centered = vUv - 0.5;
      float scanLine = abs(centered.y - (uScan - 0.5));
      float scanGlow = smoothstep(0.08, 0.0, scanLine) * 0.8;
      lineColor += uPrimaryColor * scanGlow;
    }

    vec3 color = mix(bgColor, lineColor, gridLine);

    float edgeFade = smoothstep(0.52, 0.32, vDistFromCenter);

    gl_FragColor = vec4(color, edgeFade * 0.75);
  }
`

export class NetworkGrid {
  constructor() {
    this.group = new THREE.Group()
    this.group.name = 'network-grid'
    this.time = 0
    this.pulseProgress = -1
    this.scanProgress = -1

    this._createGridPlane()
    this._createNodes()
    this._createParticles()

    this.group.rotation.x = -Math.PI / 2
    this.group.position.y = -0.005
  }

  _createGridPlane() {
    const geometry = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE, GRID_SEGMENTS, GRID_SEGMENTS)

    this.gridMaterial = new THREE.ShaderMaterial({
      vertexShader: gridVertexShader,
      fragmentShader: gridFragmentShader,
      uniforms: {
        uTime: {value: 0},
        uPulse: {value: -1},
        uScan: {value: -1},
        uPrimaryColor: {value: new THREE.Color(0x36D1FF)},
        uSecondaryColor: {value: new THREE.Color(0x8A6CFF)},
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    })

    this.gridMesh = new THREE.Mesh(geometry, this.gridMaterial)
    this.group.add(this.gridMesh)
  }

  _createNodes() {
    const nodeGeometry = new THREE.SphereGeometry(0.003, 6, 6)
    const nodeMaterial = new THREE.MeshBasicMaterial({
      color: 0x36D1FF,
      transparent: true,
      opacity: 0.6,
    })

    this.nodesMesh = new THREE.InstancedMesh(nodeGeometry, nodeMaterial, NODE_COUNT)
    this.nodesMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

    const dummy = new THREE.Object3D()
    this.nodeBasePositions = []

    for (let i = 0; i < NODE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * GRID_SIZE * 0.42
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius

      dummy.position.set(x, y, 0.001)
      dummy.updateMatrix()
      this.nodesMesh.setMatrixAt(i, dummy.matrix)
      this.nodeBasePositions.push({x, y, phase: Math.random() * Math.PI * 2})
    }

    this.nodesMesh.instanceMatrix.needsUpdate = true
    this.group.add(this.nodesMesh)
  }

  _createParticles() {
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    this.particleData = []

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * GRID_SIZE * 0.45
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      const z = 0.005 + Math.random() * 0.04

      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z

      this.particleData.push({
        baseX: x, baseY: y, baseZ: z,
        speedX: (Math.random() - 0.5) * 0.01,
        speedY: (Math.random() - 0.5) * 0.01,
        speedZ: (Math.random() - 0.5) * 0.005,
        phase: Math.random() * Math.PI * 2,
      })
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    this.particleMaterial = new THREE.PointsMaterial({
      size: 0.004,
      color: 0x36D1FF,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })

    this.particles = new THREE.Points(geometry, this.particleMaterial)
    this.group.add(this.particles)
  }

  pulse() {
    this.pulseProgress = 0
  }

  scanWake() {
    this.scanProgress = 0
  }

  lift(duration = 0.6) {
    gsap.to(this.group.position, {
      y: 0.02,
      duration,
      ease: 'power2.out',
    })
    gsap.to(this.group.scale, {
      x: 1.05,
      y: 1.05,
      z: 1.05,
      duration,
      ease: 'power2.out',
    })
  }

  update(dt) {
    this.time += dt

    this.gridMaterial.uniforms.uTime.value = this.time

    if (this.pulseProgress >= 0) {
      this.pulseProgress += dt * 0.6
      this.gridMaterial.uniforms.uPulse.value = this.pulseProgress
      if (this.pulseProgress > 1.5) {
        this.pulseProgress = -1
        this.gridMaterial.uniforms.uPulse.value = -1
      }
    }

    if (this.scanProgress >= 0) {
      this.scanProgress += dt * 1.2
      this.gridMaterial.uniforms.uScan.value = this.scanProgress
      if (this.scanProgress > 1.0) {
        this.scanProgress = -1
        this.gridMaterial.uniforms.uScan.value = -1
      }
    }

    const dummy = new THREE.Object3D()
    for (let i = 0; i < NODE_COUNT; i++) {
      const nd = this.nodeBasePositions[i]
      const pulse = Math.sin(this.time * 1.5 + nd.phase) * 0.002
      dummy.position.set(nd.x, nd.y, 0.001 + pulse)
      const s = 0.8 + Math.sin(this.time * 2.0 + nd.phase) * 0.3
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      this.nodesMesh.setMatrixAt(i, dummy.matrix)
    }
    this.nodesMesh.instanceMatrix.needsUpdate = true

    const posAttr = this.particles.geometry.getAttribute('position')
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const pd = this.particleData[i]
      const t = this.time
      posAttr.array[i * 3] = pd.baseX + Math.sin(t * 0.3 + pd.phase) * 0.015
      posAttr.array[i * 3 + 1] = pd.baseY + Math.cos(t * 0.25 + pd.phase) * 0.015
      posAttr.array[i * 3 + 2] = pd.baseZ + Math.sin(t * 0.4 + pd.phase * 2.0) * 0.008
    }
    posAttr.needsUpdate = true
  }

  dispose() {
    this.gridMesh.geometry.dispose()
    this.gridMaterial.dispose()
    this.nodesMesh.geometry.dispose()
    this.nodesMesh.material.dispose()
    this.particles.geometry.dispose()
    this.particleMaterial.dispose()
  }
}
