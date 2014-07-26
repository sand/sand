updateWindowSize()

window.onresize = (event) ->
  updateWindowSize()

# Create engine
engine = Matter.Engine.create document.body,
  render:
    options:
      background: '#ffffff'
      wireframes: false

Matter.Engine.run engine

# Create player
player = new Player window.w / 2, window.h / 2, 100, 10
player.enableControl()

# Camera
Matter.Events.on engine, 'tick', (e) ->
  engine.render.context.offset = new PIXI.Point window.w / 2 - player.body.position.x, window.h / 2 - player.body.position.y