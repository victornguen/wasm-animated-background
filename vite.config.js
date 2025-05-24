import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    fs: {
      allow: ['..']
    }
  },
  optimizeDeps: {
    exclude: ['./pkg/wasm_animation.js']
  },
  assetsInclude: ['**/*.wasm']
})
