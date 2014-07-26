# Sandbox
wallOptions =
  isStatic: true
  restitution: 0.5
  render:
    background: '#deb887'
    visible: true

wall =
  up: Matter.Bodies.rectangle window.w / 2, 0, window.w, 10, wallOptions
  down: Matter.Bodies.rectangle window.w / 2, window.h - 5, window.w, 10, wallOptions
  left: Matter.Bodies.rectangle 0, window.h / 2, 10, window.h, wallOptions
  rigth: Matter.Bodies.rectangle window.w - 5, window.h / 2, 10, window.h, wallOptions

Matter.Composite.add engine.world, [wall.up, wall.left, wall.down, wall.rigth]