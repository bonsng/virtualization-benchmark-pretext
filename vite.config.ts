import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'no-virtualization': resolve(__dirname, 'src/no-virtualization/index.html'),
        'react-virtual': resolve(__dirname, 'src/react-virtual/index.html'),
        pretext: resolve(__dirname, 'src/pretext/index.html'),
        dashboard: resolve(__dirname, 'src/dashboard/index.html'),
      },
    },
  },
})
