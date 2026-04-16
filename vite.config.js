import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')
    const sslKeyPath = env.SSL_KEY_PATH
    const sslCertPath = env.SSL_CERT_PATH
    const httpsConfig = sslKeyPath && sslCertPath && fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)
        ? {
            key: fs.readFileSync(sslKeyPath),
            cert: fs.readFileSync(sslCertPath),
        }
        : false

    return {
        plugins: [react()],
        server: {
            port: 4001,
            host: '0.0.0.0',
            https: httpsConfig,
            allowedHosts: true,
            // No proxy – frontend calls backends directly (see .env for VITE_*_API_URL)
        }
    }
})
