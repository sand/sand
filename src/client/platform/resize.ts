import camera from '../rendering/camera';
import { bounds, updateContainersBounds } from './container';
import renderer from '../rendering/renderer';
// import effectComposer from '../effects/effect-composer';

let isResizeNeeded = false;

function onresize() {
  isResizeNeeded = true;
}

/**
 * Callback that triggered if container size changes.
 * Updates camera aspect and projection matrix,
 * sets renderer and effect composer size.
 */
function resize() {
  updateContainersBounds();
  
  camera.aspect = bounds.canvas.width / bounds.canvas.height;
  camera.updateProjectionMatrix();
  
  if (renderer) {
    renderer.setSize(bounds.canvas.width, bounds.canvas.height);
  }
  
  // if (effectComposer) {
  //   effectComposer.setSize(bounds.canvas.width, bounds.canvas.height);
  // }
  
  isResizeNeeded = false;
}

export {
  onresize as default,
  resize,
  isResizeNeeded
};
