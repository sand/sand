if (config.debug)
{
  var stats = new Stats();
  stats.setMode(0);
  document.body.appendChild(stats.domElement);
};

var stage = new PIXI.Stage(0xffffff);

var renderer = PIXI.autoDetectRenderer(window.innerWidth, window.innerHeight);

document.body.appendChild(renderer.view);

requestAnimFrame(animate);

for (var i = 0; i <= 5000; i++)
{
  var texture = PIXI.Texture.fromImage('../assets/texture/ghost.png');
  var ghost = new PIXI.Sprite(texture);

  ghost.position.x = 0;
  ghost.position.y = 0;

  stage.addChild(ghost);
};

function animate()
{
  if (config.debug)
    stats.begin();

  requestAnimFrame(animate);

  for (var i = 0; i <= 100; i++)
  {
    stage.children[util.random(0, 5000)].position.x = util.random(0, 2000);
    stage.children[util.random(0, 5000)].position.y = util.random(0, 1000);
  };

  renderer.render(stage);

  if (config.debug)
    stats.end();
}