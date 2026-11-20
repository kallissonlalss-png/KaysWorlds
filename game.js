
const config = {
  type: Phaser.AUTO,
  parent: "game-container",
  backgroundColor: "#477d45",
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 600
  },
  physics: {
    default: "arcade",
    arcade: {
      debug: false
    }
  },
  scene: {
    create,
    update
  }
};

const game = new Phaser.Game(config);

let kay;
let cursors;
let keys;
let obstacles;
let resources;
let hud;
let energy = 100;
let wood = 0;
let stone = 0;
let fiber = 0;
let moving = {};
let actionButton;
let message;
let lastAction = 0;

function create() {
  const scene = this;

  this.physics.world.setBounds(0, 0, 2400, 1800);
  this.cameras.main.setBounds(0, 0, 2400, 1800);

  const ground = this.add.graphics();
  ground.fillStyle(0x548b49);
  ground.fillRect(0, 0, 2400, 1800);

  for (let i = 0; i < 700; i++) {
    const x = Phaser.Math.Between(0, 2400);
    const y = Phaser.Math.Between(0, 1800);
    ground.fillStyle(
      Phaser.Math.RND.pick([0x619752, 0x477d40, 0x6b9b55]),
      0.55
    );
    ground.fillCircle(x, y, Phaser.Math.Between(2, 5));
  }

  ground.fillStyle(0xb6a078);
  ground.fillRect(0, 870, 2400, 65);
  ground.fillRect(1150, 0, 70, 1800);

  ground.fillStyle(0x398bba);
  ground.fillEllipse(1750, 480, 460, 280);
  ground.lineStyle(8, 0x8bc8d6, 0.7);
  ground.strokeEllipse(1750, 480, 460, 280);

  ground.generateTexture("ground", 2400, 1800);
  ground.destroy();

  this.add.image(1200, 900, "ground").setDepth(-10);

  this.add.rectangle(500, 500, 190, 150, 0x8b6545)
    .setStrokeStyle(8, 0x573d2c);

  this.add.rectangle(500, 445, 200, 65, 0x75452d)
    .setStrokeStyle(5, 0x4a3022);

  this.add.text(455, 480, "CASA", {
    fontSize: "20px",
    color: "#ffffff",
    fontStyle: "bold"
  });

  obstacles = this.physics.add.staticGroup();
  resources = this.physics.add.staticGroup();

  function makeTree(x, y) {
    const trunk = scene.add.rectangle(x, y + 20, 22, 45, 0x80502c);
    const leaves = scene.add.circle(x, y - 10, 38, 0x24643a)
      .setStrokeStyle(5, 0x174b2c);

    scene.physics.add.existing(trunk, true);
    obstacles.add(trunk);

    leaves.setDepth(y + 1);
    trunk.setDepth(y);
  }

  function makeRock(x, y) {
    const rock = scene.add.ellipse(x, y, 45, 32, 0x888c8c)
      .setStrokeStyle(4, 0x5e6464);

    scene.physics.add.existing(rock, true);
    obstacles.add(rock);
  }

  function makeResource(x, y, type) {
    let color = 0x9a6338;
    let label = "M";

    if (type === "stone") {
      color = 0x929b9e;
      label = "P";
    }

    if (type === "fiber") {
      color = 0xd5c76a;
      label = "F";
    }

    const item = scene.add.circle(x, y, 13, color)
      .setStrokeStyle(3, 0xffffff);

    scene.add.text(x - 5, y - 8, label, {
      fontSize: "13px",
      color: "#202020",
      fontStyle: "bold"
    });

    scene.physics.add.existing(item, true);
    item.setData("type", type);
    resources.add(item);
  }

  for (let i = 0; i < 65; i++) {
    const x = Phaser.Math.Between(100, 2250);
    const y = Phaser.Math.Between(100, 1650);

    if (Phaser.Math.Distance.Between(x, y, 500, 500) > 170) {
      makeTree(x, y);
    }
  }

  for (let i = 0; i < 30; i++) {
    makeRock(
      Phaser.Math.Between(100, 2250),
      Phaser.Math.Between(100, 1650)
    );
  }

  for (let i = 0; i < 35; i++) {
    makeResource(
      Phaser.Math.Between(100, 2250),
      Phaser.Math.Between(100, 1650),
      Phaser.Math.RND.pick(["wood", "stone", "fiber"])
    );
  }

  kay = this.add.container(500, 650);

  const shadow = this.add.ellipse(0, 15, 25, 12, 0x243324, 0.4);
  const body = this.add.rectangle(0, 0, 25, 32, 0x3977c5)
    .setStrokeStyle(3, 0x1c3657);
  const head = this.add.circle(0, -22, 12, 0xf0c49a)
    .setStrokeStyle(2, 0x875b42);
  const hair = this.add.arc(0, -25, 12, 180, 360, false, 0x493022)
    .setStrokeStyle(5, 0x493022);

  kay.add([shadow, body, head, hair]);
  kay.setDepth(650);

  this.physics.add.existing(kay);
  kay.body.setSize(20, 20);
  kay.body.setOffset(-10, -5);
  kay.body.setCollideWorldBounds(true);

  this.physics.add.collider(kay, obstacles);

  this.physics.add.overlap(kay, resources, collectResource, null, this);

  this.cameras.main.startFollow(kay, true, 0.08, 0.08);
  this.cameras.main.setZoom(1.15);

  cursors = this.input.keyboard.createCursorKeys();
  keys = this.input.keyboard.addKeys("W,A,S,D,SHIFT,E");

  hud = this.add.text(15, 15, "", {
    fontSize: "16px",
    color: "#ffffff",
    backgroundColor: "#17251ccc",
    padding: { x: 12, y: 10 }
  }).setScrollFactor(0).setDepth(1000);

  message = this.add.text(0, 0, "", {
    fontSize: "16px",
    color: "#ffffff",
    backgroundColor: "#17251ccc",
    padding: 10
  }).setScrollFactor(0).setDepth(1001);

  createMobileControls.call(this);
  updateHUD();
}

function collectResource(player, item) {
  if (!item.active) return;

  const type = item.getData("type");

  if (type === "wood") wood++;
  if (type === "stone") stone++;
  if (type === "fiber") fiber++;

  item.destroy();
  updateHUD();

  message.setText("Material coletado!");
  message.setPosition(15, 100);
}

function createMobileControls() {
  const scene = this;

  function makeButton(x, y, label, direction) {
    const button = scene.add.circle(x, y, 27, 0x17251c, 0.75)
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setScrollFactor(0)
      .setDepth(1100)
      .setInteractive();

    const text = scene.add.text(x, y, label, {
      fontSize: "23px",
      color: "#ffffff"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1101);

    button.on("pointerdown", () => moving[direction] = true);
    button.on("pointerup", () => moving[direction] = false);
    button.on("pointerout", () => moving[direction] = false);

    return button;
  }

  const placeControls = () => {
    const w = scene.scale.width;
    const h = scene.scale.height;

    const left = w < 500 ? 45 : 65;
    const bottom = h - 65;

    const positions = [
      [left + 55, bottom - 55, "▲", "up"],
      [left + 55, bottom + 5, "▼", "down"],
      [left + 5, bottom - 25, "◀", "left"],
      [left + 105, bottom - 25, "▶", "right"]
    ];

    positions.forEach(p => {
      makeButton(p[0], p[1], p[2], p[3]);
    });

    actionButton = scene.add.circle(w - 65, h - 65, 34, 0x8a5a35)
      .setStrokeStyle(3, 0xffffff)
      .setScrollFactor(0)
      .setDepth(1100)
      .setInteractive();

    scene.add.text(w - 65, h - 65, "E", {
      fontSize: "24px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1101);

    actionButton.on("pointerdown", collectNearby);
  };

  placeControls();
}

function collectNearby() {
  const scene = game.scene.scenes[0];

  resources.getChildren().forEach(item => {
    if (
      item.active &&
      Phaser.Math.Distance.Between(
        kay.x, kay.y, item.x, item.y
      ) < 65
    ) {
      collectResource(kay, item);
    }
  });
}

function updateHUD() {
  if (!hud) return;

  hud.setText(
    "KAY'S WORLD\n" +
    "Energia: " + Math.floor(energy) + "%\n" +
    "Madeira: " + wood +
    " | Pedra: " + stone +
    " | Fibra: " + fiber
  );
}

function update(time, delta) {
  if (!kay || !kay.body) return;

  const speed = 175;
  let dx = 0;
  let dy = 0;

  if (cursors.left.isDown || keys.A.isDown || moving.left) dx--;
  if (cursors.right.isDown || keys.D.isDown || moving.right) dx++;
  if (cursors.up.isDown || keys.W.isDown || moving.up) dy--;
  if (cursors.down.isDown || keys.S.isDown || moving.down) dy++;

  const sprint = (
    keys.SHIFT.isDown && energy > 0
  );

  const currentSpeed = sprint ? speed * 1.55 : speed;

  if (dx !== 0 || dy !== 0) {
    const length = Math.sqrt(dx * dx + dy * dy);
    dx /= length;
    dy /= length;

    kay.body.setVelocity(
      dx * currentSpeed,
      dy * currentSpeed
    );

    energy = Math.max(
      0,
      energy - (sprint ? 18 : 0) * delta / 1000
    );
  } else {
    kay.body.setVelocity(0, 0);
  }

  if (!sprint && energy < 100) {
    energy = Math.min(100, energy + 7 * delta / 1000);
  }

  updateHUD();
      }

