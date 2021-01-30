import { ResizeObserver as ResizeObserverPolyfill } from '@juggle/resize-observer';
import onresize from '../platform/resize';
import container from '../platform/container';
import { default as tick } from './tick';

const ResizeObserver = (<any>window).ResizeObserver || ResizeObserverPolyfill;

/**
 * Initializes events:
 * * resize
 * * pointer*
 */
function initEvents() {
  // window.addEventListener('resize', onresize, false);

  let ro = new ResizeObserver(onresize);
  ro.observe(container.canvas);

  // TODO: mousemove window, чтобы определять над вёрсткой?
  // pointerManager.initListeners();
  
  // if (config.debug) {
  //   window.addEventListener('keypress', onkeypress, false);
  //   container.canvas.addEventListener('touchend', ontouchend, false);
  // }
  
  onresize();
}

/**
 * Performs after loading initializes.
 * Initializes Spatial Controls, statistics, debug statistics,
 * initializes keyframes, generating effects from them,
 * starts updating process and rendering.
 */
function afterLoadInit() {
  tick();
}

export { initEvents, afterLoadInit };
