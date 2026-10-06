import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['esm'],
  target: 'node22',
  sourcemap: true,
  clean: true,
  // Bundle everything — no external resolution issues on Render
  noExternal: [/.*/],
})
