import {defineConfig, type UserConfig} from 'tsdown'

/**
 * Each action entry point is built in its own pass so that every output file
 * is fully self-contained. GitHub Actions runs `dist/main.js` and
 * `dist/post.js` directly, so all dependencies must be bundled.
 */
const bundle = (entry: string): UserConfig => ({
  entry: [entry],
  outDir: 'dist',
  format: 'esm',
  platform: 'node',
  target: 'es2024',
  dts: false,
  clean: false,
  noExternal: /.*/,
  outExtensions: () => ({js: '.js'}),
})

export default defineConfig([bundle('src/action/main.ts'), bundle('src/action/post.ts')])
