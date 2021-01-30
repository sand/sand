let container = {
  canvas: undefined
};

let bounds = {
  canvas: undefined
};

/**
 * Update canvas container bounds using `getBoundingClientRect()`.
 */
function updateContainersBounds() {
  Object.keys(container).forEach(k => {
    const c = container[k];
    
    if (c && c !== window) {
      bounds[k] = c.getBoundingClientRect();
    }
  });
}

export {
  container as default,
  bounds,
  updateContainersBounds
};