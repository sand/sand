if (config.debug)
{
  var stats = new Stats();
  stats.setMode(0);
  document.body.appendChild(stats.domElement);
};

var stage = new PIXI.Stage(0x66FF99);

var renderer = PIXI.autoDetectRenderer(window.innerWidth, window.innerHeight);

document.body.appendChild(renderer.view);

requestAnimFrame(animate);

var texture = PIXI.Texture.fromImage('../assets/texture/ghost.png');
var bunny = new PIXI.Sprite(texture);

bunny.anchor.x = 0.5;
bunny.anchor.y = 0.5;

bunny.position.x = 500;
bunny.position.y = 500;

stage.addChild(bunny);

function animate()
{
  if (config.debug)
    stats.begin();

  requestAnimFrame(animate);

  renderer.render(stage);

  if (config.debug)
    stats.end();
}