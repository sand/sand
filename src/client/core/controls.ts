import { SpatialControls, KeyCode } from 'spatial-controls';
import camera from '../rendering/camera';
import renderer from '../rendering/renderer';

let controls;

/**
 * Initializes Spatial Controls.
 */
function initControls() {
  controls = new SpatialControls(camera.position, camera.quaternion, renderer.domElement);
  controls.setEnabled(true);
  controls.setOrbitEnabled(true);
  controls.settings.translation.enabled = true;
  controls.settings.rotation.enabled = true;
  controls.settings.zoom.enabled = true;
  controls.settings.pointer.lock = true;
  
  console.log(controls.settings)
  
  // TODO: возможно, это не слишком хорошее решение...
  controls.setOverviewMode = setOverviewMode;
}

/**
 * Sets overview mode status. This mode enables orbit mode, enables pointer and zoom inputs.
 */
function setOverviewMode(status: boolean) {
  controls.setEnabled(status);
  controls.setOrbitEnabled(status);
  controls.settings.pointer.hold = status;
  controls.settings.zoom.enabled = status;
}

export {
  controls as default,
  initControls,
  setOverviewMode
};
