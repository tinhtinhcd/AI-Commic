
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // TARGET env var determines which app to build.
  const target = process.env.TARGET || 'landing';

  let root = '.';
  let outDir = 'dist';
  let input = { main: resolve(__dirname, 'index.html') };

  if (target === 'studio') {
    root = 'src/studio';
    outDir = '../../dist/studio';
    input = { main: resolve(__dirname, 'src/studio/index.html') };
  } else if (target === 'reader') {
    root = 'src/reader';
    outDir = '../../dist/reader';
    input = { main: resolve(__dirname, 'src/reader/index.html') };
  } else if (target === 'admin') {
    root = 'src/admin';
    outDir = '../../dist/admin';
    input = { main: resolve(__dirname, 'src/admin/index.html') };
  } else {
    root = '.';
    outDir = 'dist/landing';
    input = { main: resolve(__dirname, 'index.html') };
  }

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY)
    },
    root: root,
    build: {
      outDir: outDir,
      emptyOutDir: true,
      rollupOptions: {
        input: input,
      },
    },
    server: {
      fs: {
        allow: ['..']
      }
    }
  }
})
