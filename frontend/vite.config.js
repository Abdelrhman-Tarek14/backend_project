import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    sourcemap: false
  }
})
// sourcemap: false
// rollupOptions: {
//   output: {
//     assetFileNames: 'assets/[name].[hash][extname]',
//     chunkFileNames: 'assets/[name].[hash].js',
//     entryFileNames: 'assets/[name].[hash].js'
//   }
// }
