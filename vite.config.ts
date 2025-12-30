import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load env variables
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Critical: This replaces 'process.env.API_KEY' in your code with the actual key from Cloudflare
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY)
    },
    // Optimization for better local dev experience
    optimizeDeps: {
      include: ['react', 'react-dom']
    }
  }
})