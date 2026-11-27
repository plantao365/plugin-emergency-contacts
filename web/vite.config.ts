import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';
import { fileURLToPath } from 'node:url';

// PLUGIN_ID e PLUGIN_VERSION vêm do `plantao-plugin build`; os assets são servidos pela API.
const id = process.env.PLUGIN_ID ?? 'emergency-contacts';
const version = process.env.PLUGIN_VERSION ?? '0.0.0';

export default defineConfig({
  // `root` precisa ser absoluto. Com 'web' relativo o Module Federation não lê os exports do React
  // e o plugin usa a cópia própria em vez do singleton do host (hooks quebram na tela).
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: `/plugins-assets/${id}/${version}/web/`,
  plugins: [
    react(),
    federation({
      name: 'plugin_emergency_contacts',
      filename: 'remoteEntry.js',
      exposes: { './web': './index.tsx' },
      // Mesmos singletons do host: o plugin usa o React, o router e o web-sdk do app.
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
        'react-router': { singleton: true },
        '@diovanibmotta/plantao365-web-sdk': { singleton: true },
      },
      dts: false,
    }),
  ],
  build: {
    target: 'esnext',
    outDir: '../dist/web',
    emptyOutDir: true,
    // A entrada é o web/index.html mínimo; o plugin é servido pelo remoteEntry.js.
    rollupOptions: {
      // Nomes curtos: os chunks do MF repetem o id e os shared e o kernel limita o caminho a 200.
      output: { chunkFileNames: 'assets/[hash].js', assetFileNames: 'assets/[hash][extname]' },
    },
  },
});
