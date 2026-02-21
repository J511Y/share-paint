import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/lib/**/*.ts',
        'src/stores/**/*.ts',
        'src/hooks/**/*.ts',
        'src/components/canvas/**/*.tsx',
        'src/components/timer/**/*.tsx',
        'src/app/**/draw/**/*.tsx',
      ],
      exclude: [
        'node_modules/**',
        '**/*.config.*',
        '**/*.d.ts',
        '**/types/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/index.ts',
        'vitest.setup.ts',
      ],
      thresholds: {
        // 파일별 임계값
        'src/lib/canvas/floodFill.ts': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        'src/stores/canvasStore.ts': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        'src/components/canvas/BrushSizeSlider.tsx': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        'src/components/canvas/CanvasActions.tsx': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        'src/components/canvas/CanvasToolbar.tsx': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        'src/components/canvas/ColorPicker.tsx': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        'src/components/canvas/Canvas.tsx': {
          branches: 60,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        'src/app/**/draw/DrawingCanvas.tsx': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        'src/hooks/useResponsiveCanvas.ts': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        'src/hooks/useTimer.ts': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        'src/components/timer/Timer.tsx': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        'src/components/timer/TimerSelect.tsx': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
