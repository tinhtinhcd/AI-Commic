
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  const target = process.env.TARGET || 'landing';
  const projectRoot = process.cwd();

  let root = projectRoot;
  let outDir = path.resolve(projectRoot, 'dist');
  let input: any = { main: path.resolve(projectRoot, 'index.html') };
  let base = '/'; 
  let emptyOutDir = false;

  // Ensure dist directory structure exists to prevent "directory not found" errors
  const distPath = path.resolve(projectRoot, 'dist');
  if (!fs.existsSync(distPath)) {
    fs.mkdirSync(distPath, { recursive: true });
  }

  // Build Configuration Logic
  if (target === 'reader') {
    root = path.resolve(projectRoot, 'src/reader');
    outDir = path.resolve(projectRoot, 'dist/reader'); 
    base = '/reader/'; 
    input = { main: path.resolve(projectRoot, 'src/reader/index.html') };
    emptyOutDir = true; 
  } else if (target === 'studio') {
    root = path.resolve(projectRoot, 'src/studio');
    outDir = path.resolve(projectRoot, 'dist/studio');
    base = '/studio/'; 
    input = { main: path.resolve(projectRoot, 'src/studio/index.html') };
    emptyOutDir = true;
  } else if (target === 'admin') {
    root = path.resolve(projectRoot, 'src/admin');
    outDir = path.resolve(projectRoot, 'dist/admin');
    base = '/admin/';
    input = { main: path.resolve(projectRoot, 'src/admin/index.html') };
    emptyOutDir = true;
  } else if (target === 'landing') {
    root = projectRoot;
    outDir = path.resolve(projectRoot, 'dist');
    base = '/';
    input = { main: path.resolve(projectRoot, 'index.html') };
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
            '@': path.resolve(projectRoot, 'src')
        }
    }
  }
})
