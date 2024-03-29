import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import html from '@rollup/plugin-html';
import livereload from 'rollup-plugin-livereload';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import postcss from 'rollup-plugin-postcss';
import serve from 'rollup-plugin-serve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const production = !process.env.ROLLUP_WATCH;
const outputPath = path.resolve(__dirname, 'dist');

export default {
  input: path.join(__dirname, 'src', 'main.ts'),
  output: {
    dir: outputPath,
    entryFileNames: `[name]${production ? '-[hash]' : ''}.js`,
    format: 'iife',
    sourcemap: !production,
  },
  plugins: [
    nodeResolve({ browser: true, extensions: ['.js', '.ts'] }),
    typescript({ sourceMap: !production, inlineSources: !production }),
    postcss({ extract: true, minimize: production }),
    html({
      template: ({ files }) => (
        fs.readFileSync(path.join(__dirname, 'src', 'index.html'), 'utf8')
          .replace(
            '<link rel="stylesheet">',
            (files.css || [])
              .map(({ fileName }) => `<link rel="stylesheet" href="/${fileName}">`)
              .join('')
          )
          .replace(
            '<script></script>',
            (files.js || [])
              .map(({ fileName }) => `<script defer src="/${fileName}"></script>`)
              .join('')
          )
          .replace(/(  |\n)/g, '')
      ),
    }),
    {
      name: 'wgsl',
      transform(code, id) {
        if (/\.wgsl$/g.test(id)) {
          if (production) {
            code = code.replace(/: /g, ':').replace(/(  |\n)/g, '');
          }
          return {
            code: `export default ${JSON.stringify(code)};`,
            map: { mappings: '' }
          };
        }
      }
    },
    ...(production ? [
      terser({ format: { comments: false } }),
    ] : [
      serve({
        contentBase: outputPath,
        port: 8080,
      }),
      livereload({
        watch: outputPath,
      }),
    ]),
  ],
  watch: { clearScreen: false },
};
