import { PerspectiveCamera } from 'three';

let camera = new PerspectiveCamera(50, 1, 0.1, 10000);
camera.position.y = 2;

export {
  camera as default
};
