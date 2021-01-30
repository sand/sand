import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import { terser } from 'rollup-plugin-terser';
import modify from 'rollup-plugin-modify';
import execute from 'rollup-plugin-execute'
import pkg from './package.json';

const date = new Date();
const banner = `/**
 * ${ pkg.name } v${ pkg.version } build ${ date.toUTCString() }
 * ${ pkg.homepage }
 * Copyright ${ date.getUTCFullYear() } ${ pkg.author.name }
 * @license ${ pkg.license }
 */`;

const BUILD_FOLDER = 'build/ts';

const production = (process.env.NODE_ENV === 'production');
// const external = Object.keys(pkg.peerDependencies);
// const globals = Object.assign({}, ...external.map((value) => ({
//   [value]: value.replace(/-/g, '').toUpperCase()
// })));

export default [
  {
    input: 'src/sand.ts',
    output: [
      {
        file: 'build/sand.esm.js',
        format: 'es',
        exports: 'named',
        sourcemap: true,
        banner
      }
    ],
    // external,
    watch: true,
    plugins: [
      resolve({ browser: true }),
      commonjs({ sourceMap: true }),
      typescript({
        outDir: BUILD_FOLDER
      })
    ]
  }
];