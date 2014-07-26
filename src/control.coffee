# Key codes
KEY_CODE =
  CTRL: 17
  ALT: 18
  ESC: 27
  SPACE: 32
  ENTER: 13

  ARROW:
    UP: 38
    LEFT: 37
    DOWN: 40
    RIGHT: 39

  W: 87
  A: 65
  S: 83
  D: 68

  E: 69
  R: 82
  Q: 81

# Add mouse
mouse = Matter.MouseConstraint.create engine,
  constraint:
    stiffness: 1

Matter.Composite.add engine.world, mouse