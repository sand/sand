import { WebGLRenderer, sRGBEncoding } from 'three';
import config from '../core/config';
import { bounds } from '../platform/container';

let renderer;

/**
 * Initialize WebGL renderer.
 */
function initRenderer() {
  renderer = new WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance' // см. https://www.khronos.org/registry/webgl/specs/latest/1.0/#5.2
  });
  
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(bounds.canvas.width, bounds.canvas.height);
  renderer.outputEncoding = sRGBEncoding;
  renderer.debug.checkShaderErrors = config.debug;
}

export {
  renderer as default,
  initRenderer
};
