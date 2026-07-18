import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // o il tuo plugin react corrente

export default defineConfig({
  plugins: [react()],
  base: '/cnl_shop/', // <-- Controlla che coincida ESATTAMENTE con il nome del tuo repo su GitHub
})