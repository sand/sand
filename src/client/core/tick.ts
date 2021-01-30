import renderer from '../rendering/renderer';
import clock from './clock';
import camera from '../rendering/camera';
import config from './config';
import scene from './scene';

/**
 * Render frame.
 */
function render(delta) {
  renderer.render(scene, camera);
}

/**
 * Main update loop.
 */
function tick() {
  requestAnimationFrame(tick.bind(this));
  
  // if (isResizeNeeded) {
  //   resize();
  // }
  
  if (config.enabled === false) {
    return;
  }
  
  let delta = clock.getDelta();
  
  render(delta);
}

export {
  tick as default,
  render
};
