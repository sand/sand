class Player
  constructor: (@x, @y, @radius, @sides) ->
    @body = Matter.Bodies.polygon @x, @y, @sides, @radius, {restitution: 0.5}
    Matter.Composite.add engine.world, @body

  move: (x, y) ->
    @body.position.x += x
    @body.position.y += y
    this.x = @body.position.x
    this.y = @body.position.y

  enableControl: () ->
    Matter.Events.on engine, 'keyup', (e) ->
      switch e.keyboard.sourceEvents.keyup.keyCode
        when KEY_CODE.ARROW.LEFT,  KEY_CODE.A then player.move -5, null
        when KEY_CODE.ARROW.UP,    KEY_CODE.W then player.move null, -10
        when KEY_CODE.ARROW.RIGHT, KEY_CODE.D then player.move 5, null
        when KEY_CODE.ARROW.DOWN,  KEY_CODE.S then player.move null, 10