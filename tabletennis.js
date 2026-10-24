const TT = (() => {
  const LW = 1000;
  const LH = 600;
  const PAD_W = 18;
  const PAD_H = 118;
  const BALL = 12;
  const LEFT_X = 56;
  const RIGHT_X = LW - 56;
  const BASE_SPEED = 470;
  const WIN = 3;
  const ABILITIES = ["freeze", "flame", "weight", "triple", "mimic", "gale", "ricochet", "teleport", "grow", "curve"];
  const enabled = {};
  ABILITIES.forEach((id) => { enabled[id] = true; });

  const rootEl = document.querySelector("#tt");
  const stage = document.querySelector("#tt-root");
  const canvas = document.querySelector("#tt-canvas");
  const ctx = canvas.getContext("2d");
  const openButton = document.querySelector("#open-tt");

  const peerOptions = { host: "0.peerjs.com", port: 443, path: "/", secure: true };
  const codeChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const net = { role: null, peer: null, conn: null, code: "" };

  let view = "closed";
  let seat = 0;
  let raf = 0;
  let lastFrame = 0;
  let sendAt = 0;
  let notice = "";
  let pointerY = null;
  let cue = null;
  let cueWho = -1;
  let audioCtx = null;
  let countShown = 0;
  let guestAim = LH / 2;
  let guestSeen = false;
  let flash = 0;
  const motes = [];
  const trail = [];

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  const fresh = () => ({
    ball: { x: LW / 2, y: LH / 2, vx: 0, vy: 0 },
    paddles: [LH / 2, LH / 2],
    scores: [0, 0],
    countdown: 3,
    live: false,
    frozen: 0,
    saved: null,
    charge: [0, 0],
    chargeAcc: [0, 0],
    ready: [null, null],
    flame: [false, false],
    burn: 0,
    weight: [0, 0],
    curse: [0, 0],
    triple: [0, 0],
    mimic: [false, false],
    curl: null,
    decoy: null,
    gale: null,
    spin: null,
    ricochet: null,
    portal: [false, false],
    curve: [false, false],
    grow: 0,
    warp: null,
    pause: 0,
    winner: null,
    dead: false,
    msg: "",
    speed: BASE_SPEED,
    hitLock: 0,
    clock: 0,
  });

  let world = fresh();

  const audio = () => {
    if (!audioCtx) audioCtx = new window.AudioContext();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  };

  const env = (when, peak, dur) => {
    const gain = audio().createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), when + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    return gain;
  };

  const tone = (freq, dur, type, peak, delay = 0, slideTo = 0) => {
    try {
      const ac = audio();
      const when = ac.currentTime + delay;
      const osc = ac.createOscillator();
      const gain = env(when, peak, dur);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, when);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), when + dur);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(when);
      osc.stop(when + dur + 0.02);
    } catch (error) {
      return error;
    }
    return null;
  };

  const noise = (dur, peak, delay = 0, from = 1400, to = 180) => {
    try {
      const ac = audio();
      const when = ac.currentTime + delay;
      const length = Math.max(1, Math.floor(ac.sampleRate * dur));
      const buffer = ac.createBuffer(1, length, ac.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      const source = ac.createBufferSource();
      const filter = ac.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(from, when);
      filter.frequency.exponentialRampToValueAtTime(Math.max(to, 40), when + dur);
      const gain = env(when, peak, dur);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ac.destination);
      source.start(when);
    } catch (error) {
      return error;
    }
    return null;
  };

  const sfx = {
    hit() {
      const lift = clamp(world.speed / BASE_SPEED, 1, 2.2);
      noise(0.09, 0.32, 0, 1400 * lift, 180);
      noise(0.14, 0.16, 0.01, 500, 120);
      tone(180 * lift, 0.08, "triangle", 0.18, 0, 70);
      tone(420 * lift, 0.06, "square", 0.06, 0.01, 160);
    },
    wall() {
      noise(0.06, 0.16, 0, 1800, 400);
      tone(520, 0.05, "sine", 0.08, 0, 240);
    },
    score() {
      noise(0.22, 0.2, 0, 300, 80);
      tone(392, 0.12, "triangle", 0.14);
      tone(523, 0.16, "triangle", 0.14, 0.07);
      tone(784, 0.24, "sine", 0.12, 0.14, 988);
    },
    freeze() {
      tone(980, 0.45, "sine", 0.12, 0, 180);
      tone(740, 0.5, "triangle", 0.08, 0.04, 160);
      noise(0.4, 0.14, 0, 2400, 300);
    },
    flame() {
      noise(0.32, 0.26, 0, 500, 70);
      noise(0.16, 0.14, 0.02, 1800, 200);
      tone(160, 0.24, "sawtooth", 0.1, 0, 70);
    },
    burn() {
      noise(0.36, 0.28, 0, 420, 80);
      noise(0.22, 0.16, 0.04, 1600, 240);
      tone(220, 0.28, "sawtooth", 0.1, 0, 90);
    },
    weight() {
      tone(90, 0.28, "sine", 0.2, 0, 48);
      noise(0.22, 0.22, 0, 180, 50);
      tone(140, 0.12, "triangle", 0.1, 0.05);
    },
    ready() {
      tone(660, 0.08, "sine", 0.1);
      tone(880, 0.1, "sine", 0.1, 0.06);
      tone(1320, 0.16, "triangle", 0.08, 0.12);
    },
    tick() {
      tone(880, 0.08, "square", 0.1, 0, 440);
    },
    go() {
      noise(0.14, 0.18, 0, 900, 200);
      tone(240, 0.12, "sawtooth", 0.1, 0, 520);
    },
    wind() {
      noise(0.28, 0.22, 0, 1400, 220);
      noise(0.4, 0.12, 0.02, 700, 160);
      tone(520, 0.22, "sine", 0.08, 0, 180);
    },
    spook() {
      tone(220, 0.4, "sine", 0.1, 0, 90);
      tone(330, 0.32, "triangle", 0.06, 0.05, 140);
      noise(0.3, 0.1, 0, 400, 80);
    },
    curse() {
      tone(150, 0.34, "sawtooth", 0.12, 0, 70);
      tone(90, 0.4, "sine", 0.14, 0.04, 40);
      noise(0.22, 0.16, 0, 300, 80);
    },
    gale() {
      noise(0.45, 0.24, 0, 280, 70);
      tone(110, 0.4, "sawtooth", 0.08, 0, 60);
    },
    galehit() {
      noise(0.2, 0.18, 0, 600, 120);
      tone(180, 0.3, "sine", 0.1, 0, 90);
    },
    rico() {
      tone(680, 0.06, "square", 0.14, 0, 1240);
      tone(1360, 0.08, "triangle", 0.08, 0.03);
      noise(0.1, 0.2, 0, 1900, 420);
    },
    void() {
      noise(0.42, 0.24, 0, 200, 40);
      tone(62, 0.48, "sine", 0.14, 0, 34);
      tone(140, 0.3, "triangle", 0.06, 0.04, 70);
    },
    warp() {
      noise(0.32, 0.24, 0, 640, 70);
      tone(280, 0.24, "sine", 0.12, 0, 48);
    },
    arrive() {
      tone(160, 0.08, "square", 0.14, 0, 640);
      noise(0.14, 0.2, 0, 1100, 180);
      tone(880, 0.1, "triangle", 0.08, 0.04);
    },
    grow() {
      tone(80, 0.4, "sawtooth", 0.1, 0, 180);
      noise(0.34, 0.16, 0, 260, 70);
      tone(220, 0.28, "triangle", 0.07, 0.06, 140);
    },
    curve() {
      tone(240, 0.34, "sine", 0.12, 0, 680);
      noise(0.26, 0.16, 0, 1100, 220);
      tone(520, 0.16, "triangle", 0.07, 0.08);
    },
    stamp() {
      noise(0.18, 0.36, 0, 380, 55);
      noise(0.06, 0.2, 0, 2000, 360);
      tone(92, 0.26, "sine", 0.3, 0, 34);
      tone(184, 0.14, "triangle", 0.12, 0.02);
      document.body.classList.remove("is-stamped");
      window.requestAnimationFrame(() => document.body.classList.add("is-stamped"));
    },
  };

  const burst = (x, y, color, count, speed, life) => {
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.35 + Math.random() * 0.7);
      motes.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: life * (0.65 + Math.random() * 0.5),
        max: life,
        color,
        r: 1.6 + Math.random() * 3.4,
      });
    }
    if (motes.length > 140) motes.splice(0, motes.length - 140);
  };

  const playCue = (name, who) => {
    if (!name || !sfx[name]) return;
    if (name === "ready" && who !== -1 && who !== seat) return;
    sfx[name]();
    if (name === "hit") burst(world.ball.x, world.ball.y, "#fff7ed", 18, 240, 0.32);
    if (name === "wall") burst(world.ball.x, world.ball.y, "#dbeafe", 8, 140, 0.22);
    if (name === "score") {
      flash = 1;
      burst(world.ball.x, world.ball.y, "#fde68a", 26, 340, 0.5);
    }
    if (name === "freeze") burst(world.ball.x, world.ball.y, "#7dd3fc", 24, 170, 0.55);
    if (name === "flame") burst(world.ball.x, world.ball.y, "#fb923c", 22, 210, 0.45);
    if (name === "burn") {
      burst(world.ball.x, world.ball.y, "#fb923c", 16, 260, 0.4);
      burst(world.ball.x, world.ball.y, "#facc15", 10, 180, 0.32);
    }
    if (name === "go") burst(LW / 2, LH / 2, "#ffffff", 20, 280, 0.4);
    if (name === "weight") {
      const foe = who === 0 || who === 1 ? 1 - who : seat;
      burst(foe === 0 ? LEFT_X : RIGHT_X, world.paddles[foe], "#e7e5e4", 16, 90, 0.5);
    }
    if (name === "wind") burst(world.ball.x, world.ball.y, "#e0f2fe", 22, 280, 0.45);
    if (name === "spook") {
      const px = who === 1 ? RIGHT_X : LEFT_X;
      burst(px, world.paddles[who === 1 ? 1 : 0], "#c084fc", 18, 80, 0.5);
    }
    if (name === "curse") {
      const px = who === 1 ? RIGHT_X : LEFT_X;
      burst(px, world.paddles[who === 1 ? 1 : 0], "#ef4444", 18, 90, 0.5);
    }
    if (name === "gale" || name === "galehit") burst(world.gale ? world.gale.x : world.ball.x, world.gale ? world.gale.y : world.ball.y, "#e2e8f0", 20, 200, 0.4);
    if (name === "rico") burst(world.ball.x, world.ball.y, "#facc15", 18, 280, 0.32);
    if (name === "void") {
      const px = who === 1 ? RIGHT_X : LEFT_X;
      burst(px, world.paddles[who === 1 ? 1 : 0], "#6d28d9", 16, 70, 0.5);
      burst(px, world.paddles[who === 1 ? 1 : 0], "#020617", 10, 40, 0.6);
    }
    if (name === "warp") burst(world.ball.x, world.ball.y, "#c084fc", 22, 220, 0.4);
    if (name === "arrive") burst(world.ball.x, world.ball.y, "#e9d5ff", 20, 240, 0.4);
    if (name === "grow") burst(world.ball.x, world.ball.y, "#84cc16", 18, 120, 0.5);
    if (name === "curve") {
      const atPaddle = who === 0 || who === 1;
      const px = atPaddle ? (who === 1 ? RIGHT_X : LEFT_X) : world.ball.x;
      const py = atPaddle ? world.paddles[who] : world.ball.y;
      burst(px, py, "#86efac", 16, 150, 0.42);
    }
  };

  const markCue = (name, who = -1) => {
    playCue(name, who);
    cue = name;
    cueWho = who;
  };

  const roomCode = () => {
    let code = "";
    for (let i = 0; i < 4; i += 1) code += codeChars[Math.floor(Math.random() * codeChars.length)];
    return code;
  };

  const emit = (msg) => {
    try {
      if (net.conn && net.conn.open) net.conn.send(msg);
    } catch (error) {
      return error;
    }
    return null;
  };

  const dropNet = () => {
    const conn = net.conn;
    const peer = net.peer;
    if (conn) conn.__ugSilent = true;
    net.role = null;
    net.conn = null;
    net.peer = null;
    net.code = "";
    guestSeen = false;
    guestAim = LH / 2;
    try { conn?.close(); } catch (error) { /* ignore */ }
    try { peer?.destroy(); } catch (error) { /* ignore */ }
  };

  const beginPoint = () => {
    world.ball = { x: LW / 2, y: LH / 2, vx: 0, vy: 0 };
    world.countdown = 3;
    world.live = false;
    world.speed = BASE_SPEED;
    world.frozen = 0;
    world.saved = null;
    world.dead = false;
    world.pause = 0;
    world.hitLock = 0;
    world.msg = "";
    world.curl = null;
    world.spin = null;
    world.decoy = null;
    world.gale = null;
    world.ricochet = null;
    world.portal = [false, false];
    world.curve = [false, false];
    world.grow = 0;
    world.warp = null;
    world.burn = 0;
    world.triple = [0, 0];
    world.mimic = [false, false];
  };

  const launchBall = () => {
    const dir = Math.random() < 0.5 ? -1 : 1;
    const vy = (Math.random() * 2 - 1) * BASE_SPEED * 0.42;
    world.speed = BASE_SPEED;
    world.ball.vy = vy;
    world.ball.vx = dir * Math.sqrt(Math.max(1, BASE_SPEED * BASE_SPEED - vy * vy));
    world.live = true;
    world.countdown = 0;
    world.hitLock = 0.12;
    markCue("go");
  };

  const scorePoint = (winnerSeat) => {
    if (world.dead || world.winner !== null) return;
    world.dead = true;
    world.live = false;
    world.ball.vx = 0;
    world.ball.vy = 0;
    world.frozen = 0;
    world.saved = null;
    world.curl = null;
    world.spin = null;
    world.decoy = null;
    world.gale = null;
    world.ricochet = null;
    world.portal = [false, false];
    world.curve = [false, false];
    world.grow = 0;
    world.warp = null;
    world.burn = 0;
    world.triple = [0, 0];
    world.mimic = [false, false];
    world.scores[winnerSeat] += 1;
    world.msg = "Point.";
    markCue("score");
    if (world.scores[winnerSeat] >= WIN) {
      world.winner = winnerSeat;
      world.pause = 0;
      return;
    }
    world.pause = 1.15;
  };

  const bouncePaddle = (player) => {
    const dir = player === 0 ? 1 : -1;
    const py = world.paddles[player];
    const offset = clamp((world.ball.y - py) / (PAD_H / 2), -1, 1);
    world.curl = null;
    let ignited = false;
    const tripling = world.triple[player] > 0;
    if (tripling) {
      world.triple[player] -= 1;
      world.speed = Math.min(BASE_SPEED * 2.5, world.speed * 1.1);
    } else world.speed = Math.min(BASE_SPEED * 2.2, world.speed * 1.01);
    if (world.flame[player]) {
      world.speed = Math.min(BASE_SPEED * 3.1, world.speed * 1.5);
      world.flame[player] = false;
      world.burn = 2;
      ignited = true;
    }
    const vy = clamp(offset * world.speed * 0.72, -world.speed * 0.82, world.speed * 0.82);
    world.ball.vy = vy;
    world.ball.vx = dir * Math.sqrt(Math.max(1, world.speed * world.speed - vy * vy));
    const px = player === 0 ? LEFT_X : RIGHT_X;
    world.ball.x = px + dir * (PAD_W / 2 + ballR() + 1);
    world.hitLock = 0.16;
    if (world.portal[player]) {
      world.portal[player] = false;
      world.curl = null;
      world.spin = null;
      const next = Math.min(BASE_SPEED * 3.1, world.speed * 1.15);
      const scale = next / Math.max(1, world.speed);
      const foe = 1 - player;
      const near = foe === 1 ? RIGHT_X - 170 : LEFT_X + 170;
      const far = foe === 1 ? LW * 0.58 : LW * 0.42;
      const x = far + (near - far) * Math.random();
      const y = 80 + Math.random() * (LH - 160);
      world.warp = { t: 1, x, y, vx: world.ball.vx * scale, vy: world.ball.vy * scale };
      world.speed = next;
      world.ball.vx = 0;
      world.ball.vy = 0;
      markCue("warp");
    }
    if (tripling && world.triple[player] > 0 && !world.warp) {
      const back = player === 0 ? -1 : 1;
      world.curl = {
        t: 0,
        delay: 0.16,
        dur: 0.62,
        fromVx: world.ball.vx,
        toVx: back * Math.abs(world.ball.vx) * 0.94,
        fromVy: world.ball.vy,
        toVy: -world.ball.vy * 0.4,
      };
      markCue("wind");
    }
    if (world.curve[player] && !world.warp) {
      world.curve[player] = false;
      const next = Math.min(BASE_SPEED * 3.1, world.speed * 1.2);
      const sign = Math.random() < 0.5 ? 1 : -1;
      const startVy = sign * next * 0.32;
      const endVy = -sign * next * 0.36;
      const startVx = dir * Math.sqrt(Math.max(1, next * next - startVy * startVy));
      const endVx = dir * Math.sqrt(Math.max(1, next * next - endVy * endVy));
      world.speed = next;
      world.ball.vx = startVx;
      world.ball.vy = startVy;
      world.curl = {
        t: 0,
        delay: 0.06,
        dur: 0.55,
        bend: true,
        fromVx: startVx,
        toVx: endVx,
        fromVy: startVy,
        toVy: endVy,
      };
      markCue("curve");
    } else if (world.curve[player]) world.curve[player] = false;
    if (world.mimic[player]) {
      world.mimic[player] = false;
      const decoyVx = world.warp ? world.warp.vx : world.ball.vx;
      const decoyVy = world.warp ? world.warp.vy : world.ball.vy;
      world.decoy = {
        x: world.ball.x,
        y: clamp(world.ball.y + (Math.random() > 0.5 ? 28 : -28), BALL, LH - BALL),
        vx: decoyVx * (0.82 + Math.random() * 0.2),
        vy: -decoyVy * 0.65 + (Math.random() - 0.5) * 90,
        life: 3.1,
      };
      markCue("spook");
    }
    markCue("hit");
    if (ignited) markCue("burn");
  };

  const GROW_HOLD = 10;
  const GROW_BLOOM = 0.48;
  const GROW_BIG = 2.25;

  const growPhase = () => {
    if (world.grow <= 0) return { scale: 1, roots: 0 };
    if (world.grow > GROW_HOLD + GROW_BLOOM) {
      const p = (GROW_HOLD + GROW_BLOOM * 2 - world.grow) / GROW_BLOOM;
      return { scale: 1 + (GROW_BIG - 1) * p, roots: 1 };
    }
    if (world.grow > GROW_BLOOM) return { scale: GROW_BIG, roots: 0 };
    return { scale: 1 + (GROW_BIG - 1) * (world.grow / GROW_BLOOM), roots: 1 };
  };

  const ballR = () => BALL * growPhase().scale;

  const stepWarp = (dt) => {
    if (!world.warp) return false;
    world.warp.t -= dt;
    if (world.warp.t > 0) return true;
    const warp = world.warp;
    world.ball.x = warp.x;
    world.ball.y = warp.y;
    world.ball.vx = warp.vx;
    world.ball.vy = warp.vy;
    world.speed = Math.hypot(warp.vx, warp.vy);
    world.hitLock = 0.18;
    world.warp = null;
    markCue("arrive");
    return false;
  };

  const moveGale = (dt) => {
    const gale = world.gale;
    if (!gale) return;
    gale.life -= dt;
    gale.x += gale.vx * dt;
    gale.y += gale.vy * dt;
    const pad = 78;
    if (gale.x < pad) { gale.x = pad; gale.vx = Math.abs(gale.vx); }
    if (gale.x > LW - pad) { gale.x = LW - pad; gale.vx = -Math.abs(gale.vx); }
    if (gale.y < pad) { gale.y = pad; gale.vy = Math.abs(gale.vy); }
    if (gale.y > LH - pad) { gale.y = LH - pad; gale.vy = -Math.abs(gale.vy); }
    if (gale.life <= 0) world.gale = null;
  };

  const stepRicochet = (dt) => {
    const rico = world.ricochet;
    if (!rico) return;
    rico.wait -= dt;
    if (rico.wait > 0) return;
    const speed = Math.min(BASE_SPEED * 3.1, Math.max(160, world.speed) * 1.05);
    const ang = Math.random() * Math.PI * 2;
    world.speed = speed;
    world.ball.vx = Math.cos(ang) * speed;
    world.ball.vy = Math.sin(ang) * speed;
    world.curl = null;
    world.spin = null;
    world.frozen = 0;
    world.saved = null;
    world.hitLock = 0.12;
    rico.left -= 1;
    markCue("rico");
    if (rico.left <= 0) world.ricochet = null;
    else rico.wait = 0.5;
  };

  const releaseSpin = () => {
    world.spin = null;
    const ang = Math.random() * Math.PI * 2;
    world.speed = Math.min(BASE_SPEED * 2.6, world.speed * 1.15);
    world.ball.vx = Math.cos(ang) * world.speed;
    world.ball.vy = Math.sin(ang) * world.speed;
    world.hitLock = 0.18;
    markCue("gale");
  };

  const stepSpin = (dt) => {
    if (!world.gale) {
      releaseSpin();
      return;
    }
    world.spin.t -= dt;
    world.spin.ang += dt * 10;
    world.ball.x = clamp(world.gale.x + Math.cos(world.spin.ang) * 24, BALL, LW - BALL);
    world.ball.y = clamp(world.gale.y + Math.sin(world.spin.ang) * 24, BALL, LH - BALL);
    world.ball.vx = 0;
    world.ball.vy = 0;
    if (world.spin.t <= 0) releaseSpin();
  };

  const stepCurl = (dt) => {
    const curl = world.curl;
    if (!curl) return;
    curl.t += dt;
    if (curl.t < curl.delay) return;
    const u = clamp((curl.t - curl.delay) / curl.dur, 0, 1);
    const ease = u * u * (3 - 2 * u);
    world.ball.vx = curl.fromVx + (curl.toVx - curl.fromVx) * ease;
    world.ball.vy = curl.fromVy + (curl.toVy - curl.fromVy) * ease;
    if (u >= 1) world.curl = null;
  };

  const stepDecoy = (dt) => {
    const decoy = world.decoy;
    if (!decoy) return;
    decoy.life -= dt;
    decoy.x += decoy.vx * dt;
    decoy.y += decoy.vy * dt;
    if (decoy.y < BALL) { decoy.y = BALL; decoy.vy = Math.abs(decoy.vy); }
    if (decoy.y > LH - BALL) { decoy.y = LH - BALL; decoy.vy = -Math.abs(decoy.vy); }
    [0, 1].forEach((player) => {
      const px = player === 0 ? LEFT_X : RIGHT_X;
      const py = world.paddles[player];
      const nearX = Math.abs(decoy.x - px) <= PAD_W / 2 + BALL;
      const nearY = Math.abs(decoy.y - py) <= PAD_H / 2 + BALL;
      const movingLeft = decoy.vx < 0;
      if (nearX && nearY && ((movingLeft && player === 0) || (!movingLeft && player === 1))) {
        world.curse[player] = 4;
        world.decoy = null;
        markCue("curse", player);
        return;
      }
    });
    if (decoy.life <= 0 || decoy.x < -40 || decoy.x > LW + 40) world.decoy = null;
  };

  const step = (dt) => {
    for (let i = 0; i < 2; i += 1) {
      if (world.weight[i] > 0) world.weight[i] = Math.max(0, world.weight[i] - dt);
      if (world.curse[i] > 0) world.curse[i] = Math.max(0, world.curse[i] - dt);
    }
    if (world.burn > 0) world.burn = Math.max(0, world.burn - dt);
    if (world.grow > 0) {
      const before = world.grow;
      world.grow = Math.max(0, world.grow - dt);
      if (before > GROW_BLOOM && world.grow <= GROW_BLOOM) markCue("grow");
    }
    if (world.winner !== null) return;
    for (let i = 0; i < 2; i += 1) {
      if (world.ready[i]) continue;
      world.chargeAcc[i] += dt;
      if (world.chargeAcc[i] < 1) continue;
      world.chargeAcc[i] -= 1;
      world.charge[i] = Math.min(10, world.charge[i] + 1);
      if (world.charge[i] >= 10) {
        const pool = ABILITIES.filter((id) => enabled[id]);
        if (!pool.length) continue;
        world.ready[i] = pool[Math.floor(Math.random() * pool.length)];
        markCue("ready", i);
      }
    }
    if (world.pause > 0) {
      world.pause -= dt;
      if (world.pause <= 0) beginPoint();
      return;
    }
    if (!world.live) {
      world.countdown = Math.max(0, world.countdown - dt);
      world.ball.x = LW / 2;
      world.ball.y = LH / 2;
      world.ball.vx = 0;
      world.ball.vy = 0;
      if (world.countdown <= 0) launchBall();
      return;
    }
    moveGale(dt);
    stepDecoy(dt);
    if (world.warp) {
      if (stepWarp(dt)) return;
    } else stepRicochet(dt);
    if (world.spin) {
      stepSpin(dt);
      return;
    }
    if (world.frozen > 0) {
      world.frozen -= dt;
      world.ball.vx = 0;
      world.ball.vy = 0;
      if (world.frozen <= 0 && world.saved) {
        world.ball.vx = world.saved.vx * 1.25;
        world.ball.vy = world.saved.vy * 1.25;
        world.speed = Math.min(BASE_SPEED * 3.1, Math.hypot(world.ball.vx, world.ball.vy));
        world.saved = null;
        world.frozen = 0;
        world.hitLock = 0.12;
      }
      return;
    }
    if (world.hitLock > 0) world.hitLock -= dt;
    const r = ballR();
    const travel = Math.hypot(world.ball.vx, world.ball.vy) * dt;
    const sub = clamp(Math.ceil(travel / (r * 0.7)), 1, 10);
    const h = dt / sub;
    for (let s = 0; s < sub; s += 1) {
      if (world.dead) return;
      stepCurl(h);
      world.ball.x += world.ball.vx * h;
      world.ball.y += world.ball.vy * h;
      if (world.ball.y < r) {
        world.ball.y = r;
        world.ball.vy = Math.abs(world.ball.vy);
        markCue("wall");
      } else if (world.ball.y > LH - r) {
        world.ball.y = LH - r;
        world.ball.vy = -Math.abs(world.ball.vy);
        markCue("wall");
      }
      if (world.gale && !world.spin) {
        const dx = world.ball.x - world.gale.x;
        const dy = world.ball.y - world.gale.y;
        if (dx * dx + dy * dy < 70 * 70) {
          world.spin = { t: 2, ang: Math.random() * 6.28 };
          world.curl = null;
          markCue("galehit");
          return;
        }
      }
      if (world.hitLock <= 0) {
        const movingLeft = world.ball.vx < 0;
        const player = movingLeft ? 0 : 1;
        const px = player === 0 ? LEFT_X : RIGHT_X;
        const py = world.paddles[player];
        const nearX = Math.abs(world.ball.x - px) <= PAD_W / 2 + r;
        const nearY = Math.abs(world.ball.y - py) <= PAD_H / 2 + r;
        if (nearX && nearY && ((movingLeft && world.ball.x <= px) || (!movingLeft && world.ball.x >= px))) {
          bouncePaddle(player);
        }
      }
      if (world.ball.x < -r) {
        scorePoint(1);
        return;
      }
      if (world.ball.x > LW + r) {
        scorePoint(0);
        return;
      }
    }
  };

  const useAbility = (who) => {
    const kind = world.ready[who];
    if (!kind || world.winner !== null || world.dead || !world.live) return;
    if (kind === "freeze") {
      if (world.frozen > 0) return;
      world.saved = { vx: world.ball.vx, vy: world.ball.vy };
      world.ball.vx = 0;
      world.ball.vy = 0;
      world.frozen = 3;
      markCue("freeze");
    } else if (kind === "weight") {
      world.weight[1 - who] = 4;
      markCue("weight", who);
    } else if (kind === "triple") {
      world.triple[who] = 3;
      markCue("wind");
    } else if (kind === "mimic") {
      world.mimic[who] = true;
      markCue("spook", who);
    } else if (kind === "gale") {
      const dir = who === 0 ? 1 : -1;
      world.gale = {
        x: who === 0 ? LW * 0.34 : LW * 0.66,
        y: LH * (0.28 + Math.random() * 0.44),
        vx: dir * (360 + Math.random() * 140),
        vy: (Math.random() * 2 - 1) * 380,
        life: 5.5,
      };
      markCue("gale");
    } else if (kind === "teleport") {
      world.portal[who] = true;
      markCue("void", who);
    } else if (kind === "grow") {
      world.grow = GROW_HOLD + GROW_BLOOM * 2;
      markCue("grow");
    } else if (kind === "curve") {
      world.curve[who] = true;
      markCue("curve", who);
    } else if (kind === "ricochet") {
      world.ricochet = { left: 4, wait: 0.5 };
      markCue("rico");
    } else {
      world.flame[who] = true;
      markCue("flame");
    }
    world.ready[who] = null;
    world.charge[who] = 0;
    world.chargeAcc[who] = 0;
  };

  const packet = () => ({
    t: "state",
    ball: { ...world.ball },
    paddles: world.paddles.slice(),
    scores: world.scores.slice(),
    countdown: world.countdown,
    live: world.live,
    frozen: world.frozen,
    charge: world.charge.slice(),
    chargeAcc: world.chargeAcc.slice(),
    ready: world.ready.slice(),
    flame: world.flame.slice(),
    burn: world.burn,
    weight: world.weight.slice(),
    curse: world.curse.slice(),
    triple: world.triple.slice(),
    mimic: world.mimic.slice(),
    curl: world.curl ? { ...world.curl } : null,
    decoy: world.decoy ? { ...world.decoy } : null,
    gale: world.gale ? { ...world.gale } : null,
    spin: world.spin ? { ...world.spin } : null,
    ricochet: world.ricochet ? { left: world.ricochet.left, wait: world.ricochet.wait } : null,
    portal: world.portal.slice(),
    curve: world.curve.slice(),
    grow: world.grow,
    warp: world.warp ? { ...world.warp } : null,
    pause: world.pause,
    winner: world.winner,
    dead: world.dead,
    msg: world.msg,
    speed: world.speed,
    cue,
    cueWho,
  });

  const applyPacket = (data) => {
    if (data.cue) playCue(data.cue, data.cueWho);
    world.ball = data.ball;
    world.paddles[1 - seat] = data.paddles[1 - seat];
    world.scores = data.scores.slice();
    world.countdown = data.countdown ?? 0;
    world.live = data.live;
    world.frozen = data.frozen;
    world.charge = data.charge.slice();
    world.chargeAcc = (data.chargeAcc || [0, 0]).slice();
    world.ready = data.ready.slice();
    world.flame = data.flame.slice();
    world.burn = data.burn || 0;
    world.weight = (data.weight || [0, 0]).slice();
    world.curse = (data.curse || [0, 0]).slice();
    world.triple = (data.triple || [0, 0]).slice();
    world.mimic = (data.mimic || [false, false]).slice();
    world.curl = data.curl || null;
    world.decoy = data.decoy || null;
    world.gale = data.gale || null;
    world.spin = data.spin || null;
    world.ricochet = data.ricochet || null;
    world.portal = (data.portal || [false, false]).slice();
    world.curve = (data.curve || [false, false]).slice();
    world.grow = data.grow || 0;
    world.warp = data.warp || null;
    world.pause = data.pause;
    world.winner = data.winner;
    world.dead = data.dead;
    world.msg = data.msg;
    world.speed = data.speed;
    if (view !== "play") startMatch(false);
  };

  const sendState = () => {
    emit(packet());
    cue = null;
    cueWho = -1;
  };

  const onHostData = (msg) => {
    if (!msg || net.role !== "host") return;
    if (msg.t === "pad" && typeof msg.y === "number") {
      guestAim = clamp(msg.y, PAD_H / 2, LH - PAD_H / 2);
      guestSeen = true;
    }
    if (msg.t === "ability") useAbility(1);
    if (msg.t === "rematch" && world.winner !== null) {
      world = fresh();
      beginPoint();
      sendState();
    }
  };

  const onGuestData = (msg) => {
    if (!msg || net.role !== "guest") return;
    if (msg.t === "state") applyPacket(msg);
  };

  const fit = () => {
    const vw = rootEl.clientWidth || window.innerWidth;
    const vh = rootEl.clientHeight || window.innerHeight;
    const scale = Math.min(vw / LW, vh / LH);
    return {
      vw,
      vh,
      scale,
      ox: (vw - LW * scale) / 2,
      oy: (vh - LH * scale) / 2,
    };
  };

  const resize = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = rootEl.clientWidth || window.innerWidth;
    const h = rootEl.clientHeight || window.innerHeight;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const drawTable = (viewBox) => {
    const { vw, vh, scale, ox, oy } = viewBox;
    const floor = ctx.createLinearGradient(0, 0, 0, vh);
    floor.addColorStop(0, "#24180f");
    floor.addColorStop(0.45, "#140e0a");
    floor.addColorStop(1, "#070504");
    ctx.fillStyle = floor;
    ctx.fillRect(0, 0, vw, vh);
    ctx.strokeStyle = "rgba(90, 58, 32, 0.35)";
    ctx.lineWidth = 1;
    for (let y = 0; y < vh; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(vw, y + 6);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(ox + 18 * scale, oy + 22 * scale);
    ctx.scale(scale, scale);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, LW, LH);
    ctx.restore();
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);

    const wood = ctx.createLinearGradient(0, 0, 0, LH);
    wood.addColorStop(0, "#7a2a22");
    wood.addColorStop(0.2, "#a33b2e");
    wood.addColorStop(0.5, "#6e221c");
    wood.addColorStop(1, "#4a1612");
    ctx.fillStyle = wood;
    ctx.fillRect(0, 0, LW, LH);
    ctx.strokeStyle = "rgba(255, 214, 180, 0.18)";
    ctx.lineWidth = 2;
    for (let x = 8; x < LW; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x, 4);
      ctx.lineTo(x + 6, LH - 4);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.strokeRect(3, 3, LW - 6, LH - 6);
    ctx.fillStyle = "#f3e6d0";
    [[0, 0], [LW - 22, 0], [0, LH - 22], [LW - 22, LH - 22]].forEach(([x, y]) => {
      ctx.fillRect(x + 6, y + 6, 16, 16);
      ctx.strokeStyle = "#8a8175";
      ctx.strokeRect(x + 6, y + 6, 16, 16);
    });

    const felt = ctx.createLinearGradient(0, 28, LW, LH - 28);
    felt.addColorStop(0, "#1b8ed8");
    felt.addColorStop(0.35, "#146eae");
    felt.addColorStop(0.5, "#1878b8");
    felt.addColorStop(1, "#0d568c");
    ctx.fillStyle = felt;
    ctx.fillRect(28, 28, LW - 56, LH - 56);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let y = 34; y < LH - 34; y += 7) ctx.fillRect(32, y, LW - 64, 1);
    ctx.fillStyle = "rgba(8, 40, 70, 0.18)";
    ctx.beginPath();
    ctx.ellipse(LW * 0.3, LH * 0.45, 90, 40, -0.4, 0, Math.PI * 2);
    ctx.ellipse(LW * 0.72, LH * 0.62, 120, 36, 0.3, 0, Math.PI * 2);
    ctx.fill();
    const sheen = ctx.createLinearGradient(80, 40, 420, 260);
    sheen.addColorStop(0, "rgba(255,255,255,0.16)");
    sheen.addColorStop(0.45, "rgba(255,255,255,0)");
    ctx.fillStyle = sheen;
    ctx.beginPath();
    ctx.moveTo(48, 48);
    ctx.lineTo(460, 48);
    ctx.lineTo(300, 250);
    ctx.lineTo(48, 180);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 5;
    ctx.strokeRect(46, 46, LW - 92, LH - 92);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(46, LH / 2);
    ctx.lineTo(LW - 46, LH / 2);
    ctx.moveTo(LW * 0.25, 46);
    ctx.lineTo(LW * 0.25, LH - 46);
    ctx.moveTo(LW * 0.75, 46);
    ctx.lineTo(LW * 0.75, LH - 46);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(LW / 2, 46);
    ctx.lineTo(LW / 2, LH / 2 - 28);
    ctx.moveTo(LW / 2, LH / 2 + 28);
    ctx.lineTo(LW / 2, LH - 46);
    ctx.stroke();

    const netX = LW / 2;
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(netX - 16, 36, 34, LH - 64);
    ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
    for (let i = 0; i < 28; i += 1) {
      const y = 40 + ((LH - 80) * i) / 27;
      ctx.fillRect(netX - 18, y, 36, 1.3);
    }
    for (let i = 0; i < 9; i += 1) {
      ctx.fillRect(netX - 18 + i * 4.5, 40, 1.1, LH - 80);
    }
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(netX - 20, 34, 40, 7);
    ctx.fillStyle = "#111827";
    ctx.fillRect(netX - 6, 16, 12, 28);
    ctx.fillRect(netX - 6, LH - 44, 12, 28);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(netX - 8, 14, 16, 8);
    ctx.fillRect(netX - 8, LH - 22, 16, 8);
    ctx.restore();
  };

  const drawPaddle = (x, y, mine, lit, heavy, gust, spook, hole, bend, cursed, viewBox) => {
    const { scale, ox, oy } = viewBox;
    const sx = ox + x * scale;
    const sy = oy + y * scale;
    const rw = (PAD_W / 2) * scale;
    const rh = (PAD_H / 2) * scale;
    ctx.save();
    ctx.translate(sx, sy);
    if (heavy) {
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.beginPath();
      ctx.ellipse(4 * scale, 8 * scale, rw * 1.3, rh * 1.05, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#3f2414";
    ctx.fillRect(-rw * 0.35, rh * 0.72, rw * 0.7, rh * 0.38);
    const g = ctx.createLinearGradient(-rw, -rh, rw, rh);
    if (mine) {
      g.addColorStop(0, "#fecaca");
      g.addColorStop(0.35, "#ef4444");
      g.addColorStop(1, "#7f1d1d");
    } else {
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.4, "#e2e8f0");
      g.addColorStop(1, "#334155");
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, rw, rh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = Math.max(2, 3 * scale);
    ctx.strokeStyle = lit ? "#ffb020" : "#fff7ed";
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0, rw * 0.55, rh * 0.72, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = Math.max(1, 1.5 * scale);
    ctx.stroke();
    if (lit) {
      ctx.strokeStyle = "rgba(255, 140, 40, 0.85)";
      ctx.lineWidth = Math.max(3, 5 * scale);
      ctx.beginPath();
      ctx.ellipse(0, 0, rw + 4 * scale, rh + 4 * scale, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (heavy) {
      const u = 11 * scale;
      ctx.save();
      ctx.globalAlpha = 0.72;
      ctx.lineWidth = Math.max(2, 3 * scale);
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.fillStyle = "rgba(226, 232, 240, 0.42)";
      ctx.beginPath();
      ctx.moveTo(-u * 1.1, 0);
      ctx.lineTo(u * 1.1, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-u, 0, u * 0.62, 0, Math.PI * 2);
      ctx.arc(u, 0, u * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    if (cursed) {
      ctx.save();
      ctx.strokeStyle = "rgba(239, 68, 68, 0.95)";
      ctx.shadowColor = "#b91c1c";
      ctx.shadowBlur = 16;
      ctx.lineWidth = Math.max(2, 2.8 * scale);
      ctx.beginPath();
      ctx.ellipse(0, 0, rw + 8 * scale, rh + 8 * scale, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(127, 29, 29, 0.9)";
      for (let i = 0; i < 4; i += 1) {
        const y = -rh * 0.7 + i * rh * 0.45 + Math.sin(world.clock * 5 + i) * 4 * scale;
        ctx.beginPath();
        ctx.moveTo(-rw * 0.2, y);
        ctx.quadraticCurveTo(rw * 0.15, y + 10 * scale, rw * 0.05, y + 22 * scale);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(220, 38, 38, 0.28)";
      ctx.beginPath();
      ctx.ellipse(0, 0, rw * 0.85, rh * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (gust) {
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = "rgba(224, 242, 254, 0.95)";
      ctx.lineWidth = Math.max(1.5, 2.2 * scale);
      for (let i = 0; i < 5; i += 1) {
        const shift = ((world.clock * 140 + i * 26) % (rh * 2.2)) - rh;
        ctx.beginPath();
        ctx.moveTo(-rw - 22 * scale, shift);
        ctx.quadraticCurveTo(0, shift - 10 * scale, rw + 26 * scale, shift + 6 * scale);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (spook) {
      ctx.save();
      ctx.strokeStyle = "rgba(192, 132, 252, 0.9)";
      ctx.shadowColor = "#a855f7";
      ctx.shadowBlur = 18;
      ctx.lineWidth = Math.max(2, 3 * scale);
      ctx.beginPath();
      ctx.ellipse(0, 0, rw + 8 * scale, rh + 10 * scale, Math.sin(world.clock * 3) * 0.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(88, 28, 135, 0.28)";
      ctx.beginPath();
      ctx.ellipse(-rw * 0.2, -rh * 0.15, rw * 0.7, rh * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (hole) {
      ctx.save();
      const core = ctx.createRadialGradient(0, 0, rw * 0.08, 0, 0, rh);
      core.addColorStop(0, "#000000");
      core.addColorStop(0.42, "#14051f");
      core.addColorStop(0.7, "rgba(109, 40, 217, 0.85)");
      core.addColorStop(1, "rgba(168, 85, 247, 0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.ellipse(0, 0, rw * 1.45, rh * 1.08, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(216, 180, 254, 0.9)";
      ctx.lineWidth = Math.max(1.5, 2 * scale);
      for (let i = 0; i < 3; i += 1) {
        ctx.save();
        ctx.rotate(world.clock * (2.2 + i * 0.7) + i);
        ctx.beginPath();
        ctx.ellipse(0, 0, rw * (0.85 + i * 0.38), rh * (0.28 + i * 0.16), 0, 0.2, Math.PI * 1.55);
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = "#020617";
      ctx.beginPath();
      ctx.ellipse(0, 0, rw * 0.42, rh * 0.28, world.clock * 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (bend) {
      ctx.save();
      ctx.strokeStyle = "rgba(134, 239, 172, 0.95)";
      ctx.shadowColor = "#22c55e";
      ctx.shadowBlur = 16;
      ctx.lineWidth = Math.max(2, 2.6 * scale);
      ctx.beginPath();
      ctx.ellipse(0, 0, rw + 10 * scale, rh + 6 * scale, Math.sin(world.clock * 3) * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      for (let i = 0; i < 3; i += 1) {
        const shift = ((world.clock * 110 + i * 36) % (rh * 2.1)) - rh;
        ctx.beginPath();
        ctx.moveTo(-rw - 6 * scale, shift);
        ctx.quadraticCurveTo(0, shift + 16 * scale, rw + 16 * scale, shift - 10 * scale);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(34, 197, 94, 0.22)";
      ctx.beginPath();
      ctx.ellipse(0, 0, rw * 0.9, rh * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  };

  const drawScene = () => {
    const viewBox = fit();
    const { scale, ox, oy, vw, vh } = viewBox;
    ctx.save();
    if (flash > 0) ctx.translate((Math.random() - 0.5) * 10 * flash, (Math.random() - 0.5) * 6 * flash);
    drawTable(viewBox);
    const preview = view !== "play";
    const pads = preview ? [LH * 0.42, LH * 0.58] : world.paddles;
    const ball = preview
      ? { x: LW * 0.56, y: LH * 0.48, vx: 0, vy: 0 }
      : world.ball;
    const heavy = preview ? [false, false] : world.weight.map((n) => n > 0);
    const gust = preview ? [false, false] : world.triple.map((n) => n > 0);
    const spook = preview ? [false, false] : world.mimic.slice();
    const hole = preview ? [false, false] : world.portal.slice();
    const bend = preview ? [false, false] : world.curve.slice();
    const cursed = preview ? [false, false] : world.curse.map((n) => n > 0);
    drawPaddle(LEFT_X, pads[0], seat === 0, !preview && world.flame[0], heavy[0], gust[0], spook[0], hole[0], bend[0], cursed[0], viewBox);
    drawPaddle(RIGHT_X, pads[1], seat === 1, !preview && world.flame[1], heavy[1], gust[1], spook[1], hole[1], bend[1], cursed[1], viewBox);
    if (!preview && world.gale) {
      const gale = world.gale;
      const gx = ox + gale.x * scale;
      const gy = oy + gale.y * scale;
      ctx.save();
      ctx.translate(gx, gy);
      for (let i = 0; i < 6; i += 1) {
        ctx.save();
        ctx.rotate(world.clock * (3.2 + i * 0.85) + i * 0.7);
        ctx.strokeStyle = `rgba(226, 232, 240, ${0.28 + i * 0.08})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, (16 + i * 9) * scale, (8 + i * 5) * scale, 0, 0, Math.PI * 1.6);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
    if (!preview && world.decoy) {
      const dx = ox + world.decoy.x * scale;
      const dy = oy + world.decoy.y * scale;
      const shade = ctx.createRadialGradient(dx - 4 * scale, dy - 4 * scale, 1, dx, dy, BALL * scale);
      shade.addColorStop(0, "#d1d5db");
      shade.addColorStop(1, "#6b7280");
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.arc(dx, dy, BALL * scale * 0.94, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!preview) {
      trail.forEach((bit, index) => {
        const t = bit.life * (index + 1) / trail.length;
        const tx = ox + bit.x * scale;
        const ty = oy + bit.y * scale;
        if (world.burn > 0) {
          ctx.fillStyle = `rgba(220, 38, 38, ${t * 0.45})`;
          ctx.beginPath();
          ctx.arc(tx, ty, BALL * scale * (0.7 + t * 0.9), 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(251, 146, 60, ${t * 0.7})`;
          ctx.beginPath();
          ctx.arc(tx, ty, BALL * scale * (0.4 + t * 0.55), 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(254, 240, 138, ${t * 0.85})`;
          ctx.beginPath();
          ctx.arc(tx, ty, BALL * scale * (0.16 + t * 0.22), 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = world.frozen > 0 ? `rgba(125, 211, 252, ${t * 0.35})` : `rgba(255,255,255,${t * 0.28})`;
          ctx.beginPath();
          ctx.arc(tx, ty, BALL * scale * (0.35 + t * 0.5), 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
    const hidden = !preview && world.warp;
    const phase = hidden || preview ? { scale: 1, roots: 0 } : growPhase();
    const bx = ox + (hidden ? world.warp.x : ball.x) * scale;
    const by = oy + (hidden ? world.warp.y : ball.y) * scale;
    const rad = BALL * phase.scale * scale * (!hidden && world.frozen > 0 ? 1.15 : 1);
    if (hidden) {
      const left = Math.max(0, world.warp.t);
      ctx.save();
      ctx.translate(bx, by);
      ctx.strokeStyle = "rgba(216, 180, 254, 0.95)";
      ctx.shadowColor = "#7c3aed";
      ctx.shadowBlur = 18;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, (36 + Math.sin(world.clock * 9) * 6) * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 16 * scale, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - left));
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(88, 28, 135, ${0.22 + (1 - left) * 0.4})`;
      ctx.beginPath();
      ctx.arc(0, 0, 12 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (!hidden) {
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(bx + 4 * scale, by + 8 * scale, rad * 0.95, rad * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    if (world.frozen > 0) {
      ctx.strokeStyle = "rgba(186, 230, 253, 0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bx, by, rad + 8 + Math.sin(world.clock * 6) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (!preview && world.ricochet) {
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(world.clock * 9);
      ctx.strokeStyle = "rgba(250, 204, 21, 0.95)";
      ctx.lineWidth = 2;
      for (let i = 0; i < world.ricochet.left; i += 1) {
        ctx.beginPath();
        ctx.arc(0, 0, rad + 10 + i * 5, i * 0.4, i * 0.4 + 1.1);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (world.spin) {
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(world.clock * 14);
      ctx.strokeStyle = "rgba(226, 232, 240, 0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, rad + 12, 0.2, Math.PI * 1.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, rad + 18, Math.PI, Math.PI * 1.8);
      ctx.stroke();
      ctx.restore();
    }
    const glow = Math.min(1, world.speed / (BASE_SPEED * 1.6));
    if (!preview && world.live && glow > 0.2) {
      ctx.fillStyle = `rgba(255, 244, 214, ${glow * 0.22})`;
      ctx.beginPath();
      ctx.arc(bx, by, rad * (2.2 + glow), 0, Math.PI * 2);
      ctx.fill();
    }
    const g = ctx.createRadialGradient(bx - rad * 0.35, by - rad * 0.4, 1, bx, by, rad);
    g.addColorStop(0, world.burn > 0 ? "#fff7ed" : "#ffffff");
    g.addColorStop(1, world.frozen > 0 ? "#7dd3fc" : world.burn > 0 ? "#ea580c" : "#d1d5db");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(bx, by, rad, 0, Math.PI * 2);
    ctx.fill();
    if (!hidden && world.burn > 0) {
      ctx.save();
      ctx.translate(bx, by);
      const back = Math.atan2(-ball.vy, -ball.vx);
      for (let i = 0; i < 5; i += 1) {
        const flick = Math.sin(world.clock * 18 + i * 1.7);
        const a = back + (i - 2) * 0.28 + flick * 0.08;
        const h = rad * (1.5 + flick * 0.35 + i * 0.05);
        ctx.fillStyle = i % 2 === 0 ? "rgba(249, 115, 22, 0.9)" : "rgba(250, 204, 21, 0.92)";
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - 0.45) * rad * 0.55, Math.sin(a - 0.45) * rad * 0.55);
        ctx.quadraticCurveTo(Math.cos(a) * h * 0.7, Math.sin(a) * h * 0.7, Math.cos(a) * h, Math.sin(a) * h);
        ctx.quadraticCurveTo(Math.cos(a) * h * 0.55, Math.sin(a) * h * 0.55, Math.cos(a + 0.45) * rad * 0.55, Math.sin(a + 0.45) * rad * 0.55);
        ctx.fill();
      }
      ctx.restore();
    }
    if (phase.roots > 0) {
      ctx.save();
      ctx.translate(bx, by);
      ctx.globalAlpha = phase.roots;
      ctx.lineCap = "round";
      for (let i = 0; i < 8; i += 1) {
        const a = world.clock * 6 + i * ((Math.PI * 2) / 8);
        const len = rad * 1.7;
        ctx.strokeStyle = i % 2 === 0 ? "rgba(101, 67, 33, 0.95)" : "rgba(190, 242, 100, 0.95)";
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * rad * 0.7, Math.sin(a) * rad * 0.7);
        ctx.quadraticCurveTo(Math.cos(a + 0.6) * len * 0.75, Math.sin(a + 0.25) * len * 0.75, Math.cos(a) * len, Math.sin(a) * len);
        ctx.stroke();
      }
      ctx.restore();
    }
    }
    motes.forEach((bit) => {
      ctx.globalAlpha = Math.max(0, bit.life / bit.max);
      ctx.fillStyle = bit.color;
      ctx.beginPath();
      ctx.arc(ox + bit.x * scale, oy + bit.y * scale, bit.r * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
    if (flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${flash * 0.16})`;
      ctx.fillRect(-20, -20, vw + 40, vh + 40);
    }
    ctx.restore();
  };

  const statusLine = () => {
    if (view !== "play") return "";
    if (world.winner !== null) return world.winner === seat ? "You take the table." : "The other racket takes it.";
    if (!world.live && world.countdown > 0) return "Get ready.";
    if (world.frozen > 0) return "The ball is frozen.";
    if (world.curse[seat] > 0) return "Your racket is cursed.";
    if (world.curse[1 - seat] > 0) return "Their racket is cursed.";
    if (world.weight[seat] > 0) return "Your racket is weighted.";
    if (world.weight[1 - seat] > 0) return "Their racket is weighted.";
    if (world.triple[seat] > 0) return "Wind on your racket. Hit three times.";
    if (world.mimic[seat]) return "Your racket is haunted.";
    if (world.portal[seat]) return "Your racket is a black hole.";
    if (world.curve[seat]) return "Your racket is curved.";
    if (world.curl && world.curl.bend) return "The ball is bending.";
    if (world.warp) return "Purple mark. The ball arrives in one second.";
    if (world.grow > GROW_BLOOM && world.grow <= GROW_HOLD + GROW_BLOOM) return "The ball is huge.";
    if (world.grow > 0) return "The ball pops.";
    if (world.spin) return "The ball is spinning in the gale.";
    if (world.ricochet) return "Ricochet. The ball is about to kick.";
    if (world.flame[seat]) return "Your racket is lit. The next hit burns.";
    if (world.burn > 0) return "The ball is on fire.";
    if (world.msg) return world.msg;
    return "Rally.";
  };

  const renderHud = () => {
    const hud = stage.querySelector(".tt-hud");
    if (!hud || view !== "play") return;
    hud.querySelector("[data-you]").textContent = String(world.scores[seat]);
    hud.querySelector("[data-them]").textContent = String(world.scores[1 - seat]);
    hud.querySelector("[data-status]").textContent = statusLine();
    const hex = hud.querySelector("[data-hex]");
    const label = hud.querySelector("[data-hex-label]");
    const ready = world.ready[seat];
    const fill = ready ? 1 : Math.min(1, (world.charge[seat] + world.chargeAcc[seat]) / 10);
    hex.style.setProperty("--p", fill.toFixed(3));
    const juice = hex.querySelector(".tt-hex-well i");
    if (juice) {
      juice.style.height = `${fill * 100}%`;
      juice.style.transform = "none";
    }
    hex.classList.toggle("is-ready", !!ready);
    hex.classList.toggle("is-flame", ready === "flame");
    hex.classList.toggle("is-freeze", ready === "freeze");
    hex.classList.toggle("is-weight", ready === "weight");
    hex.classList.toggle("is-triple", ready === "triple");
    hex.classList.toggle("is-mimic", ready === "mimic");
    hex.classList.toggle("is-gale", ready === "gale");
    hex.classList.toggle("is-ricochet", ready === "ricochet");
    hex.classList.toggle("is-teleport", ready === "teleport");
    hex.classList.toggle("is-grow", ready === "grow");
    hex.classList.toggle("is-curve", ready === "curve");
    label.textContent = ready || "";
    hex.setAttribute("aria-label", ready ? `Use ${ready}` : "Ability charging");
    let stamps = stage.querySelector(".stamp-layer");
    if (world.winner !== null) {
      if (!stamps) {
        stamps = document.createElement("div");
        stamps.className = "stamp-layer two";
        stamps.innerHTML = '<p class="stamp stamp-luck">LUCK</p><p class="stamp stamp-rigged">RIGGED</p>';
        stage.appendChild(stamps);
        sfx.stamp();
      }
    } else if (stamps) {
      stamps.remove();
      document.body.classList.remove("is-stamped");
    }
    const countEl = hud.querySelector("[data-count]");
    if (countEl) {
      const showCount = !world.live && world.countdown > 0 && world.winner === null && world.pause <= 0;
      countEl.hidden = !showCount;
      if (showCount) {
        const n = Math.ceil(world.countdown);
        if (n !== countShown) {
          countShown = n;
          sfx.tick();
        }
        countEl.textContent = String(n);
      } else if (countShown !== 0) countShown = 0;
    }
    const bar = hud.querySelector("[data-bar]");
    bar.hidden = world.winner === null;
  };

  const showMenu = () => {
    view = "menu";
    notice = "";
    document.body.classList.remove("is-stamped");
    stage.innerHTML = `
      <section class="ttt-panel">
        <button class="ttt-back" type="button" data-action="close">Back</button>
        <p class="ttt-kicker">U.G. / table</p>
        <h2>Table tennis</h2>
        <p class="ttt-copy">Move your racket with the mouse or finger. Tap the hexagon, or press E, when it is ready. Local plays the table. Host a side and share the code to play together.</p>
        <div class="mode-list">
          <button class="mode-btn" type="button" data-action="local">Local</button>
          <button class="mode-btn alt" type="button" data-action="host">Host</button>
          <button class="mode-btn alt" type="button" data-action="join-mode">Join</button>
        </div>
        <p class="mode-note" data-note hidden></p>
      </section>`;
  };

  const setNote = (text) => {
    notice = text;
    const note = stage.querySelector("[data-note]");
    if (!note) return;
    note.hidden = !text;
    note.textContent = text;
  };

  const showHostWait = () => {
    view = "lobby";
    stage.innerHTML = `
      <section class="ttt-panel">
        <button class="ttt-back" type="button" data-action="menu">Back</button>
        <p class="ttt-kicker">Room</p>
        <h2>Hosting</h2>
        <p class="room-code">${net.code}</p>
        <p class="ttt-copy">Share this code. You play the left side. They play the right.</p>
        <p class="mode-note" data-note hidden></p>
      </section>`;
    if (notice) setNote(notice);
  };

  const showJoin = () => {
    view = "join";
    stage.innerHTML = `
      <section class="ttt-panel">
        <button class="ttt-back" type="button" data-action="menu">Back</button>
        <p class="ttt-kicker">Join</p>
        <h2>Enter the code</h2>
        <form data-join>
          <p class="ttt-copy"><input class="code-input" maxlength="4" autocomplete="off" placeholder="CODE" aria-label="Room code"></p>
          <div class="mode-list">
            <button class="mode-btn" type="submit">Connect</button>
          </div>
        </form>
        <p class="mode-note" data-note hidden></p>
      </section>`;
    if (notice) setNote(notice);
  };

  const showPowers = () => {
    view = "powers";
    const cards = ABILITIES.map((id) => `
      <button class="tt-hex power-hex is-${id}${enabled[id] ? " is-on" : ""}" type="button" data-action="power" data-kind="${id}" aria-pressed="${enabled[id] ? "true" : "false"}">
        <span class="tt-hex-well" aria-hidden="true"><i></i></span>
        <svg viewBox="0 0 100 114" aria-hidden="true">
          <polygon points="50,4 96,30 96,84 50,110 4,84 4,30" class="tt-hex-shell"></polygon>
        </svg>
        <strong>${id}</strong>
      </button>
    `).join("");
    stage.innerHTML = `
      <section class="ttt-panel">
        <button class="ttt-back" type="button" data-action="menu">Back</button>
        <p class="ttt-kicker">Abilities</p>
        <h2>What can appear</h2>
        <p class="ttt-copy">Press an ability to turn it off for this game. Off abilities cannot be rolled.</p>
        <div class="power-grid">${cards}</div>
        <div class="mode-list power-actions">
          <button class="mode-btn" type="button" data-action="powers-all">Select all</button>
          <button class="mode-btn alt" type="button" data-action="powers-none">Deselect all</button>
          <button class="mode-btn" type="button" data-action="powers-start">Start</button>
        </div>
      </section>`;
  };

  const beginChosen = () => {
    startMatch(true);
    if (net.role === "host") sendState();
  };

  const startMatch = (reset) => {
    view = "play";
    if (reset) {
      world = fresh();
      beginPoint();
    }
    stage.innerHTML = `
      <div class="tt-hud">
        <button class="ttt-back" type="button" data-action="menu">Back</button>
        <p class="tt-score"><b data-you>0</b><b data-them>0</b></p>
        <button class="tt-hex" type="button" data-hex style="--p:0" aria-label="Use ability">
          <span class="tt-hex-well" aria-hidden="true"><i></i></span>
          <svg viewBox="0 0 100 114" aria-hidden="true">
            <polygon points="50,4 96,30 96,84 50,110 4,84 4,30" class="tt-hex-shell"></polygon>
          </svg>
          <strong data-hex-label></strong>
        </button>
        <p class="tt-status" data-status></p>
        <p class="tt-count" data-count hidden>3</p>
        <div class="tt-bar" data-bar hidden>
          <button class="mode-btn" type="button" data-action="rematch">Rematch</button>
        </div>
      </div>`;
    renderHud();
  };

  const hostRoom = () => {
    if (!window.Peer) {
      setNote("Multiplayer could not load. Refresh and try again.");
      return;
    }
    dropNet();
    notice = "";
    const code = roomCode();
    net.code = code;
    net.role = "host";
    seat = 0;
    const peer = new window.Peer(`unfairgames-tt-${code}`, peerOptions);
    net.peer = peer;
    view = "lobby";
    stage.innerHTML = `
      <section class="ttt-panel">
        <button class="ttt-back" type="button" data-action="menu">Back</button>
        <p class="ttt-kicker">Room</p>
        <h2>Opening</h2>
        <p class="ttt-copy">Connecting...</p>
        <p class="mode-note" data-note hidden></p>
      </section>`;
    peer.on("open", () => {
      if (net.peer !== peer) return;
      showHostWait();
    });
    peer.on("connection", (conn) => {
      if (net.peer !== peer || net.conn) {
        conn.close();
        return;
      }
      net.conn = conn;
      conn.on("open", () => {
        ABILITIES.forEach((id) => { enabled[id] = true; });
        showPowers();
      });
      conn.on("data", onHostData);
      conn.on("close", () => {
        if (conn.__ugSilent) return;
        notice = "The other racket left.";
        showMenu();
        setNote(notice);
      });
    });
    peer.on("error", (err) => {
      if (net.peer !== peer) return;
      if (err.type === "unavailable-id") {
        try { peer.destroy(); } catch (error) { /* ignore */ }
        if (net.peer === peer) net.peer = null;
        hostRoom();
        return;
      }
      setNote(err.message || "Could not open a room.");
    });
  };

  const joinRoom = (raw) => {
    const code = raw.trim().toUpperCase();
    if (!window.Peer) {
      setNote("Multiplayer could not load. Refresh and try again.");
      return;
    }
    if (code.length < 4) {
      setNote("Enter the 4-letter code from the host.");
      return;
    }
    dropNet();
    notice = "";
    net.role = "guest";
    net.code = code;
    seat = 1;
    const peer = new window.Peer(peerOptions);
    net.peer = peer;
    showJoin();
    setNote("Connecting...");
    peer.on("open", () => {
      if (net.peer !== peer) return;
      const conn = peer.connect(`unfairgames-tt-${code}`, { reliable: true });
      net.conn = conn;
      conn.on("open", () => setNote("Waiting for the host to choose abilities."));
      conn.on("data", onGuestData);
      conn.on("close", () => {
        if (conn.__ugSilent) return;
        notice = "The other racket left.";
        showMenu();
        setNote(notice);
      });
      conn.on("error", () => setNote("Could not join that room. The host has to be waiting."));
    });
    peer.on("error", (err) => {
      if (net.peer !== peer) return;
      const missing = err.type === "peer-unavailable";
      setNote(missing ? "Couldn't find that room. The host has to click Host first." : (err.message || "Could not join."));
    });
  };

  const botThink = (dt) => {
    if (world.winner !== null) return;
    let aim = LH / 2;
    if (world.live && world.ball.vx > 40) {
      const travel = Math.max(0.05, (RIGHT_X - world.ball.x) / world.ball.vx);
      aim = world.ball.y + world.ball.vy * Math.min(travel, 0.55);
      aim += Math.sin(world.clock * 2.4) * 16;
    }
    aim = clamp(aim, PAD_H / 2, LH - PAD_H / 2);
    const cur = world.paddles[1];
    const pace = 430 * (world.weight[1] > 0 ? 0.6 : 1) * (world.curse[1] > 0 ? 0.75 : 1);
    const stepY = clamp(aim - cur, -pace * dt, pace * dt);
    world.paddles[1] = clamp(cur + stepY, PAD_H / 2, LH - PAD_H / 2);
    const incoming = world.live && world.ball.vx > 280 && world.ball.x > LW * 0.55 && world.frozen <= 0;
    if (world.ready[1] === "freeze" && incoming && world.speed > BASE_SPEED * 1.25) useAbility(1);
    if (world.ready[1] === "flame" && incoming && !world.flame[1]) useAbility(1);
    if (world.ready[1] === "weight" && world.live && world.ball.vx < -220 && world.ball.x < LW * 0.48 && world.weight[0] <= 0) useAbility(1);
    if (world.ready[1] === "triple" && incoming && world.triple[1] <= 0) useAbility(1);
    if (world.ready[1] === "mimic" && incoming && !world.mimic[1]) useAbility(1);
    if (world.ready[1] === "gale" && world.live && !world.gale && world.ball.x > LW * 0.35) useAbility(1);
    if (world.ready[1] === "ricochet" && world.live && !world.ricochet && world.frozen <= 0) useAbility(1);
    if (world.ready[1] === "teleport" && incoming && !world.portal[1]) useAbility(1);
    if (world.ready[1] === "grow" && world.live && world.grow <= 0 && !world.warp) useAbility(1);
    if (world.ready[1] === "curve" && incoming && !world.curve[1]) useAbility(1);
  };

  const startLocal = () => {
    dropNet();
    net.role = "local";
    seat = 0;
    ABILITIES.forEach((id) => { enabled[id] = true; });
    showPowers();
  };

  const placePaddle = (index, target, dt) => {
    const y = clamp(target, PAD_H / 2, LH - PAD_H / 2);
    const drag = (world.weight[index] > 0 ? 0.6 : 1) * (world.curse[index] > 0 ? 0.75 : 1);
    if (drag < 1) {
      const blend = 1 - Math.exp(-1.15 * (drag / 0.6) * dt);
      world.paddles[index] = clamp(world.paddles[index] + (y - world.paddles[index]) * blend, PAD_H / 2, LH - PAD_H / 2);
    } else world.paddles[index] = y;
    return y;
  };

  const setLocalPaddle = (screenY, dt) => {
    const box = fit();
    const y = clamp((screenY - box.oy) / box.scale, PAD_H / 2, LH - PAD_H / 2);
    if (seat === 0 && (net.role === "host" || net.role === "local")) return placePaddle(0, y, dt);
    if (seat === 1 && net.role === "guest") return placePaddle(1, y, dt);
    return y;
  };

  const frame = (now) => {
    raf = window.requestAnimationFrame(frame);
    const dt = Math.min(0.033, lastFrame ? (now - lastFrame) / 1000 : 0.016);
    lastFrame = now;
    world.clock += dt;
    flash = Math.max(0, flash - dt * 1.7);
    for (let i = motes.length - 1; i >= 0; i -= 1) {
      const bit = motes[i];
      bit.life -= dt;
      bit.x += bit.vx * dt;
      bit.y += bit.vy * dt;
      bit.vy += 30 * dt;
      if (bit.life <= 0) motes.splice(i, 1);
    }
    if (view === "play" && world.live && world.frozen <= 0 && !world.warp) {
      trail.push({ x: world.ball.x, y: world.ball.y, life: 1 });
      const trailCap = world.burn > 0 ? 28 : 16;
      if (trail.length > trailCap) trail.shift();
    } else if (trail.length) trail.length = 0;
    trail.forEach((bit) => { bit.life = Math.max(0, bit.life - dt * 2.4); });
    if (view === "play" && world.frozen > 0 && Math.random() < 0.55) burst(world.ball.x, world.ball.y, "#bae6fd", 1, 36, 0.45);
    if (view === "play") {
      for (let i = 0; i < 2; i += 1) {
        if (world.flame[i] && Math.random() < 0.65) burst(i === 0 ? LEFT_X : RIGHT_X, world.paddles[i] + (Math.random() - 0.5) * PAD_H, "#fb923c", 1, 40, 0.32);
        if (world.triple[i] > 0 && Math.random() < 0.8) burst(i === 0 ? LEFT_X : RIGHT_X, world.paddles[i] + (Math.random() - 0.5) * PAD_H, "#e0f2fe", 1, 70, 0.28);
        if (world.mimic[i] && Math.random() < 0.55) burst(i === 0 ? LEFT_X : RIGHT_X, world.paddles[i], "#c084fc", 1, 30, 0.4);
        if (world.curse[i] > 0 && Math.random() < 0.7) burst(i === 0 ? LEFT_X : RIGHT_X, world.paddles[i] + (Math.random() - 0.5) * PAD_H, "#ef4444", 1, 28, 0.4);
      }
      if (world.gale && Math.random() < 0.85) burst(world.gale.x, world.gale.y, "#f8fafc", 2, 50, 0.3);
      if (world.ricochet && Math.random() < 0.75) burst(world.ball.x, world.ball.y, "#facc15", 1, 70, 0.22);
      if (world.burn > 0 && !world.warp) {
        burst(world.ball.x, world.ball.y, "#fb923c", 2, 90, 0.28);
        burst(world.ball.x, world.ball.y, "#fde68a", 1, 50, 0.2);
      }
      if (world.warp && Math.random() < 0.85) burst(world.warp.x, world.warp.y, "#c084fc", 2, 50, 0.28);
      for (let i = 0; i < 2; i += 1) {
        if (world.portal[i] && Math.random() < 0.8) burst(i === 0 ? LEFT_X : RIGHT_X, world.paddles[i], "#6d28d9", 1, 36, 0.4);
        if (world.curve[i] && Math.random() < 0.7) burst(i === 0 ? LEFT_X : RIGHT_X, world.paddles[i] + (Math.random() - 0.5) * PAD_H, "#86efac", 1, 50, 0.3);
      }
      if (world.curl && world.curl.bend && Math.random() < 0.8) burst(world.ball.x, world.ball.y, "#86efac", 2, 80, 0.28);
      else if (world.curl && Math.random() < 0.7) burst(world.ball.x, world.ball.y, "#bae6fd", 2, 90, 0.25);
    }
    let sentY = null;
    if (view === "play" && pointerY != null) sentY = setLocalPaddle(pointerY, dt);
    if (view === "play" && net.role === "host" && guestSeen) placePaddle(1, guestAim, dt);
    if (view === "play" && (net.role === "host" || net.role === "local")) {
      try {
        if (net.role === "local") botThink(dt);
        step(dt);
      } catch (error) {
        console.error(error);
      }
    }
    if (view === "play" && net.role === "guest" && sentY != null && now - sendAt > 32) {
      emit({ t: "pad", y: sentY });
      sendAt = now;
    }
    if (view === "play" && net.role === "host" && now - sendAt > 32) {
      sendState();
      sendAt = now;
    }
    resize();
    try {
      drawScene();
    } catch (error) {
      console.error(error);
    }
    renderHud();
  };

  const open = () => {
    rootEl.hidden = false;
    document.body.style.overflow = "hidden";
    world = fresh();
    showMenu();
    resize();
    if (!raf) raf = window.requestAnimationFrame(frame);
  };

  const close = () => {
    dropNet();
    view = "closed";
    rootEl.hidden = true;
    document.body.style.overflow = "";
    stage.innerHTML = "";
    document.body.classList.remove("is-stamped");
    window.cancelAnimationFrame(raf);
    raf = 0;
    lastFrame = 0;
  };

  const castAbility = () => {
    if (view !== "play" || rootEl.hidden) return;
    if (net.role === "host" || net.role === "local") useAbility(0);
    else emit({ t: "ability" });
  };

  const trackMouse = (event) => {
    const target = event.target;
    if (target && target.closest && target.closest("[data-hex], .ttt-back, .tt-bar, .ttt-panel, .code-input")) return;
    const rect = rootEl.getBoundingClientRect();
    const y = event.clientY - rect.top;
    if (!Number.isFinite(y)) return;
    pointerY = y;
  };
  window.addEventListener("pointermove", trackMouse, true);
  window.addEventListener("mousemove", trackMouse, true);

  window.addEventListener("keydown", (event) => {
    if (view !== "play" || rootEl.hidden) return;
    if (event.key !== "e" && event.key !== "E") return;
    event.preventDefault();
    castAbility();
  });

  stage.addEventListener("click", (event) => {
    if (event.target.closest("[data-hex]")) {
      event.preventDefault();
      castAbility();
      return;
    }
    const action = event.target.closest("[data-action]");
    if (!action) return;
    const name = action.dataset.action;
    if (name === "close") close();
    if (name === "menu") {
      dropNet();
      showMenu();
    }
    if (name === "local") startLocal();
    if (name === "power") {
      const kind = action.dataset.kind;
      if (enabled[kind] != null) enabled[kind] = !enabled[kind];
      showPowers();
    }
    if (name === "powers-all") {
      ABILITIES.forEach((id) => { enabled[id] = true; });
      showPowers();
    }
    if (name === "powers-none") {
      ABILITIES.forEach((id) => { enabled[id] = false; });
      showPowers();
    }
    if (name === "powers-start") beginChosen();
    if (name === "host") hostRoom();
    if (name === "join-mode") showJoin();
    if (name === "rematch") {
      if (net.role === "host" || net.role === "local") {
        world = fresh();
        beginPoint();
        if (net.role === "host") sendState();
        renderHud();
      } else emit({ t: "rematch" });
    }
  });

  stage.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-join]");
    if (!form) return;
    event.preventDefault();
    joinRoom(form.querySelector("input")?.value || "");
  });

  openButton.addEventListener("click", open);
  window.addEventListener("resize", resize);
})();
