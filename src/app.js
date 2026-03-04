// ──────────────────────────────────────────────────────────
// app.js — XR8 image target configuration
// Loads the donna-logo image target data into the engine.
// Must run before the ECS scene initializes.
// ──────────────────────────────────────────────────────────

const onxrloaded = () => {
  XR8.XrController.configure({
    imageTargetData: [
      require('../image-targets/donna-logo-target.json'),
    ],
  })
}
window.XR8 ? onxrloaded() : window.addEventListener('xrloaded', onxrloaded)
