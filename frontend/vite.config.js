import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // o il tuo plugin react corrente

export default defineConfig({
  plugins: [react()],
  base: '/', // <-- deve essere '/' per Firebase Hosting
})