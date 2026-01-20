import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,

    // Which test files Vitest should execute
    include: [
      'src/**/*.spec.{js,ts,jsx,tsx}',
      'src/**/*.test.{js,ts,jsx,tsx}'
    ],

    // Exclude non-testable paths
    exclude: [
      'node_modules',
      'dist'
    ],

    // Coverage configuration
    coverage: {
      reporter: ['text', 'html'],
      include: [
        'src/components/**/*.{vue,js}',
        'src/utils/**/*.js'
      ],
      exclude: [
        'src/main.js',
        'src/App.vue',
        '**/*.spec.js',
        '**/*.test.js',
        '**/*.css',
        '**/*.json'
      ]
    }
  }
})
