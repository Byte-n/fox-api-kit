import { defineConfig } from 'tsup';

const pkg = require('./package.json');

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  dts: true,
  splitting: false,
  shims: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
  define: {
    __VERSION__: JSON.stringify(pkg.version),
    __DESCRIPTION__: JSON.stringify(pkg.description),
  },
});
