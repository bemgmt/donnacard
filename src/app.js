// ──────────────────────────────────────────────────────────
// app.js — XR8 image target configuration
// Loads the donna-card image target data into the engine.
// Must run before the ECS scene initializes.
// ──────────────────────────────────────────────────────────

const onxrloaded = () => {
  XR8.XrController.configure({
    imageTargetData: [
      require('../image-targets/donna-card.json'),
    ],
  })
}
window.XR8 ? onxrloaded() : window.addEventListener('xrloaded', onxrloaded)
