import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — tiny, loads first
          'vendor-react': ['react', 'react-dom', 'react-router-dom', 'react-is'],
          // Charting library — only needed on pages that render charts
          'vendor-charts': ['recharts'],
          // CSV parsing — only needed when a data page mounts
          'vendor-csv': ['papaparse'],
          // AWS Amplify — large; split away from the app entry point
          'vendor-amplify': ['aws-amplify', '@aws-amplify/ui-react'],
        },
      },
    },
  },
})
