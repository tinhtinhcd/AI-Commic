
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import process from 'node:process'
import fs from 'node:fs'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  const target = process.env.TARGET || 'landing';
  const projectRoot = process.cwd();

  let root = projectRoot;
  let outDir = resolve(projectRoot, 'dist');
  let input: any = { main: resolve(projectRoot, 'index.html') };
  let base = '/'; 
  let emptyOutDir = false;

  // Ensure dist directory structure exists to prevent "directory not found" errors
  const distPath = resolve(projectRoot, 'dist');
  if (!fs.existsSync(distPath)) {
    fs.mkdirSync(distPath, { recursive: true });
  }

  // Build Configuration Logic
  if (target === 'reader') {
    root = resolve(projectRoot, 'src/reader');
    outDir = resolve(projectRoot, 'dist/reader'); 
    base = '/reader/'; 
    input = { main: resolve(projectRoot, 'src/reader/index.html') };
    emptyOutDir = true; 
  } else if (target === 'studio') {
    root = resolve(projectRoot, 'src/studio');
    outDir = resolve(projectRoot, 'dist/studio');
    base = '/studio/'; 
    input = { main: resolve(projectRoot, 'src/studio/index.html') };
    emptyOutDir = true;
  } else if (target === 'admin') {
    root = resolve(projectRoot, 'src/admin');
    outDir = resolve(projectRoot, 'dist/admin');
    base = '/admin/';
    input = { main: resolve(projectRoot, 'src/admin/index.html') };
    emptyOutDir = true;
  } else if (target === 'landing') {
    root = projectRoot;
    outDir = resolve(projectRoot, 'dist');
    base = '/';
    input = { main: resolve(projectRoot, 'index.html') };
  }

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY)
    },
    root: root,
    base: base,
    build: {
      outDir: outDir,
      emptyOutDir: emptyOutDir, 
      rollupOptions: {
        input: input,
      },
    },
    server: {
      fs: {
        allow: [projectRoot]
      },
      proxy: {
        '/studio': {
          target: 'http://localhost:5173/src/studio/index.html',
          rewrite: (path) => '/src/studio/index.html'
        },
        '/reader': {
          target: 'http://localhost:5173/src/reader/index.html',
          rewrite: (path) => '/src/reader/index.html'
        },
        '/admin': {
          target: 'http://localhost:5173/src/admin/index.html',
          rewrite: (path) => '/src/admin/index.html'
        }
      }
    },
    resolve: {
        alias: {
            '@': resolve(projectRoot, 'src')
        }
    }
  }
})
