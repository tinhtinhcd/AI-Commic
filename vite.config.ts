
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
  let emptyOutDir = true;

  // Build Configuration Logic
  if (target === 'reader') {
    root = path.resolve(projectRoot, 'src/reader');
    outDir = path.resolve(projectRoot, 'dist/reader'); 
    base = '/reader/'; 
    input = { main: path.resolve(projectRoot, 'src/reader/index.html') };
  } else if (target === 'studio') {
    root = path.resolve(projectRoot, 'src/studio');
    outDir = path.resolve(projectRoot, 'dist/studio');
    base = '/studio/'; 
    input = { main: path.resolve(projectRoot, 'src/studio/index.html') };
  } else if (target === 'admin') {
    root = path.resolve(projectRoot, 'src/admin');
    outDir = path.resolve(projectRoot, 'dist/admin');
    base = '/admin/';
    input = { main: path.resolve(projectRoot, 'src/admin/index.html') };
  } else if (target === 'landing') {
    root = projectRoot;
    outDir = path.resolve(projectRoot, 'dist');
    base = '/';
    input = { main: path.resolve(projectRoot, 'index.html') };
    // Landing page builds to root dist, we might want to avoid wiping other folders if running sequentially
    // But typically build:landing is part of full build. 
    // Careful with emptyOutDir here if running parallel.
    emptyOutDir = false; 
  }

  // Ensure output directory exists to prevent build failures
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY),
      'process.env.DEEPSEEK_API_KEY': JSON.stringify(process.env.DEEPSEEK_API_KEY || env.DEEPSEEK_API_KEY),
      'process.env.OPENAI_API_KEY': JSON.stringify(process.env.OPENAI_API_KEY || env.OPENAI_API_KEY)
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
            '@': path.resolve(projectRoot, 'src'),
            '@studio': path.resolve(projectRoot, 'src/studio'),
            '@reader': path.resolve(projectRoot, 'src/reader'),
            '@admin': path.resolve(projectRoot, 'src/admin')
        }
    }
  }
})
