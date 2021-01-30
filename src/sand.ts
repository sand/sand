import config from './client/core/config';
import scene from './client/core/scene';
import tick from './client/core/tick';
import camera from './client/rendering/camera';
import { default as container, bounds, updateContainersBounds } from './client/platform/container';
import renderer from './client/rendering/renderer';
import { initRenderer } from './client/rendering/renderer';
import {
  BoxBufferGeometry,
  GridHelper,
  Mesh,
  MeshDepthMaterial,
  MeshDistanceMaterial,
  MeshNormalMaterial,
  TorusKnotGeometry
} from 'three';
import controls, { initControls } from './client/core/controls';
import { afterLoadInit, initEvents } from './client/core/initialization';

function assignConfigFromOptions(options) {
  Object.keys(config).forEach(k => {
    if (options[k]) {
      config[k] = options[k];
    }
  });
}

class Sand {
  config;
  camera;
  scene;
  renderer;
  bounds;
  
  constructor(options) {
    assignConfigFromOptions(options);
  
    container.canvas = options.canvasContainer;
  
    updateContainersBounds();
    
    this.config = config;
    this.camera = camera;
    this.scene = scene;
    this.renderer = renderer;
    this.bounds = bounds;
  
    initRenderer();
    // initEffectComposer();
    initControls();
  
    container.canvas.appendChild(renderer.domElement);
  
    initEvents();
  
    afterLoadInit();
    
    this._addModels();
    
    if (config.debug) {
      console.log(this);
    }
  }
  
  _addModels() {
    const size = 10;
    const divisions = 10;
  
    const gridHelper = new GridHelper(size, divisions);
    scene.add( gridHelper );
  
    const geometry = new TorusKnotGeometry(1, 0.4, 64, 8);
    // const geometry = new BoxBufferGeometry(1, 1, 1);
    // const material = new MeshDepthMaterial();
    const material = new MeshNormalMaterial();
    const mesh = new Mesh(geometry, material);
    
    scene.add(mesh);
  }
}

export default Sand;