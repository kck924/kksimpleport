import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { analytics } from './build/analytics.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), analytics()],
})
