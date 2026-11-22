import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { app } from './server.js'

function attachRecipeApi(server) {
  server.middlewares.use(app)
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'recipe-api',
      configureServer: attachRecipeApi,
      configurePreviewServer: attachRecipeApi,
    },
  ],
})
