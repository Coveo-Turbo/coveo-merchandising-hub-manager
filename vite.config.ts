import {crx} from '@crxjs/vite-plugin';
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite';
import {readFileSync} from 'fs';
import path from 'path';
import manifest from './src/extension/manifest';

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {version: string};

export default defineConfig(({ mode }) => {
  const isExtensionBuild = mode === 'extension';

  return {
    base: isExtensionBuild ? './' : '/',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      ...(isExtensionBuild ? [crx({manifest})] : []),
    ],
    build: {
      outDir: isExtensionBuild ? 'dist/extension' : 'dist/web',
      emptyOutDir: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      }
    },
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
    },
  }
})
