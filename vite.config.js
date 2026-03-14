import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 4001,
        // No proxy – frontend calls backends directly (see .env for VITE_*_API_URL)
    }
})
