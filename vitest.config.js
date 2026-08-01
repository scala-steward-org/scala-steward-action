import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // Everything matching `include` is reported whether the tests load it or
      // not, so a module with no tests counts as uncovered instead of
      // disappearing from the total.
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/action/**', 'src/utils/**'],
      reporter: ['text', 'cobertura'],
    },
  },
})
