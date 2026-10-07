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
  // esbuild rewrites CJS `require` into a shim that throws in ESM output.
  // Bundled deps (dotenv, pino, drizzle drivers) call require('fs') at runtime,
  // so hand the shim a real require to delegate to.
  banner: {
    js: [
      "import { createRequire as __tsupCreateRequire } from 'node:module';",
      "import { fileURLToPath as __tsupFileURLToPath } from 'node:url';",
      "import { dirname as __tsupDirname } from 'node:path';",
      'const require = __tsupCreateRequire(import.meta.url);',
      'const __filename = __tsupFileURLToPath(import.meta.url);',
      'const __dirname = __tsupDirname(__filename);',
    ].join('\n'),
  },
})
