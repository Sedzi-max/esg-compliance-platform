import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // 1. Increase the warning limit slightly for enterprise apps
    chunkSizeWarningLimit: 1000, 
    
    // 2. Tell Vite how to split the code into smaller chunks
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Put the heavy PDF generator in its own file
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'pdf-engine';
            }
            // Put the heavy charts in their own file
            if (id.includes('recharts') || id.includes('d3')) {
              return 'chart-engine';
            }
            // Put React and everything else in a generic vendor file
            return 'vendor';
          }
        }
      }
    }
  }
})