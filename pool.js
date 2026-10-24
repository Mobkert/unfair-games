(() => {
  const root = document.querySelector("#pool");
  const canvas = document.querySelector("#pool-canvas");
  const stage = document.querySelector("#pool-root");
  const openButton = document.querySelector("#open-pool");
  if (!root || !canvas || !stage || !openButton) return;

  const ctx = canvas.getContext("2d");
  const LW = 1280;
  const LH = 720;
  const RAIL = 72;
  const FELT_L = RAIL;
  const FELT_T = RAIL;
  const FELT_R = LW - RAIL;
  const FELT_B = LH - RAIL;
  const FELT_W = FELT_R - FELT_L;
  const FELT_H = FELT_B - FELT_T;
  const MID_X = LW / 2;
  const MID_Y = LH / 2;
  const HEAD_X = FELT_L + FELT_W * 0.25;
  const FOOT_X = FELT_L + FELT_W * 0.75;
  const R = 16;
  const MAX_SPEED = 1040;
  const FRICTION = 215;
  const CUSHION = 0.8;
  const BOUNCE = 0.98;
  const STOP = 15;
  const MAX_PULL = 170;
  const CORNER = 48;
  const SIDE = 32;

  const pockets = [
    { x: FELT_L - 8, y: FELT_T - 8, r: 36 },
    { x: FELT_R + 8, y: FELT_T - 8, r: 36 },
    { x: FELT_L - 8, y: FELT_B + 8, r: 36 },
    { x: FELT_R + 8, y: FELT_B + 8, r: 36 },
    { x: MID_X, y: FELT_T - 14, r: 32 },
    { x: MID_X, y: FELT_B + 14, r: 32 },
  ];

  const COLORS = {
    1: "#f5d90a",
    2: "#2563eb",
    3: "#ef4444",
    4: "#7c3aed",
    5: "#f97316",
    6: "#16a34a",
    7: "#9f1239",
    8: "#111111",
    9: "#f5d90a",
    10: "#2563eb",
    11: "#ef4444",
    12: "#7c3aed",
    13: "#f97316",
    14: "#16a34a",
    15: "#9f1239",
  };

  const RACK = [
    [1],
    [9, 2],
    [10, 8, 3],
    [11, 4, 14, 5],
    [6, 13, 7, 12, 15],
  ];

  const GROUP_NAME = { solid: "Full", stripe: "Lined" };
  const STICK_NAME = {
    light: "Light",
    mischief: "Mischievous",
    trick: "Trickshot",
    frost: "Frostbite",
    tempest: "Tempest",
    ferris: "Ferris wheel",
    laser: "Laser",
    clone: "Clone",
    gate: "Gate",
    drill: "Drill",
  };

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  let view = "menu";
  let phase = "aim";
  let player = 0;
  let picking = 0;
  let sticks = ["light", "mischief"];
  let groups = ["solid", "stripe"];
  let balls = [];
  let shot = null;
  let isBreak = true;
  let winner = null;
  let status = "";
  let pointer = { x: HEAD_X - 180, y: MID_Y };
  let aim = { x: 1, y: 0, dist: 180 };
  let charging = false;
  let placing = false;
  let pull = 0;
  let charge = 0;
  let clock = 0;
  const ice = [];
  let beam = null;
  let last = 0;
  let raf = 0;
  let clickAt = 0;
  let viewW = 0;
  let viewH = 0;
  let viewDpr = 0;
  const motes = [];
  const shocks = [];
  const links = [];
  const portals = [];
  let cam = { x: MID_X, y: MID_Y, z: 1, tx: MID_X, ty: MID_Y, tz: 1, shake: 0, cinema: 0, bars: 0, flash: 0 };
  let audio = null;
  let noiseBuf = null;
  let fxOn = true;
  let railAt = 0;

  const STICK_FX = {
    light: "#7dd3fc",
    mischief: "#e879f9",
    trick: "#ef4444",
    frost: "#e0f2fe",
    tempest: "#a5f3fc",
    ferris: "#fbbf24",
    laser: "#22d3ee",
    clone: "#cbd5e1",
    gate: "#ff2ea6",
    drill: "#fb923c",
  };

  const tone = (freq, dur, type, gain) => {
    if (!audio) return;
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.value = gain;
    amp.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
    osc.connect(amp);
    amp.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + dur);
  };

  const sweep = (from, to, dur, type, gain) => {
    if (!audio) return;
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type;
    const now = audio.currentTime;
    osc.frequency.setValueAtTime(Math.max(28, from), now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(28, to), now + dur);
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(amp);
    amp.connect(audio.destination);
    osc.start();
    osc.stop(now + dur);
  };

  const crack = (dur, gain, hz) => {
    if (!audio) return;
    if (!noiseBuf) {
      noiseBuf = audio.createBuffer(1, Math.floor(audio.sampleRate * 0.35), audio.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    }
    const src = audio.createBufferSource();
    src.buffer = noiseBuf;
    const filter = audio.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = hz;
    filter.Q.value = 0.6;
    const amp = audio.createGain();
    const now = audio.currentTime;
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(audio.destination);
    src.start();
    src.stop(now + dur);
  };

  const unlock = () => {
    if (audio) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audio = new Ctx();
    if (audio.state === "suspended") audio.resume();
  };

  const trimMotes = () => {
    if (motes.length > 360) motes.splice(0, motes.length - 360);
  };

  const burst = (x, y, color, count, speed) => {
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.35 + Math.random() * 0.75);
      motes.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.28 + Math.random() * 0.28,
        color,
        r: 1.4 + Math.random() * 2.2,
        streak: true,
      });
    }
    trimMotes();
  };

  const spark = (x, y, color, count, speed, aim) => {
    for (let i = 0; i < count; i += 1) {
      const a = aim == null ? Math.random() * Math.PI * 2 : aim + (Math.random() - 0.5) * 1.5;
      const s = speed * (0.4 + Math.random() * 0.9);
      motes.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.18 + Math.random() * 0.28,
        color,
        r: 1.2 + Math.random() * 1.8,
        streak: true,
      });
    }
    trimMotes();
  };

  const ring = (x, y, color, radius) => {
    shocks.push({ x, y, life: 0.32, max: 0.32, color, radius });
    if (shocks.length > 24) shocks.splice(0, shocks.length - 24);
  };

  const makeBall = (id, x, y) => ({ id, x, y, vx: 0, vy: 0, curve: 0, flash: 0, in: true });

  const rack = () => {
    const list = [makeBall(0, HEAD_X, MID_Y)];
    const gap = R * 2 + 0.5;
    const step = gap * Math.sqrt(3) / 2;
    RACK.forEach((row, rowIndex) => {
      row.forEach((id, col) => {
        const x = FOOT_X + rowIndex * step;
        const y = MID_Y + (col - (row.length - 1) / 2) * gap;
        list.push(makeBall(id, x, y));
      });
    });
    return list;
  };

  const groupOf = (id) => {
    if (id <= 0 || id === 8) return null;
    return id < 8 ? "solid" : "stripe";
  };

  const remaining = (who) => balls.reduce((n, ball) => (
    n + (ball.in && groupOf(ball.id) === groups[who] ? 1 : 0)
  ), 0);

  const roles = (a, b, nx, ny, pvx, pvy, qvx, qvy) => {
    const aApproach = pvx * nx + pvy * ny;
    const bApproach = -(qvx * nx + qvy * ny);
    const hitter = aApproach >= bApproach ? a : b;
    const struck = hitter === a ? b : a;
    return {
      hitter,
      struck,
      nx: hitter === a ? nx : -nx,
      ny: hitter === a ? ny : -ny,
      vx: hitter === a ? pvx : qvx,
      vy: hitter === a ? pvy : qvy,
    };
  };

  const bendLight = (list, hitter, struck) => {
    if (!struck || struck.id === 0) return;
    let best = null;
    let bestD = Infinity;
    list.forEach((other) => {
      if (!other.in || other === struck || other === hitter) return;
      const d = (other.x - struck.x) ** 2 + (other.y - struck.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = other;
      }
    });
    if (!best) return;
    const ahead = (struck.x - hitter.x) * (best.x - struck.x) + (struck.y - hitter.y) * (best.y - struck.y);
    if (ahead <= 0) return;
    const speed = Math.hypot(struck.vx, struck.vy);
    if (speed < 18) return;
    const mag = Math.hypot(best.x - struck.x, best.y - struck.y) || 1;
    const blend = 0.92;
    const vx = struck.vx * (1 - blend) + ((best.x - struck.x) / mag) * speed * blend;
    const vy = struck.vy * (1 - blend) + ((best.y - struck.y) / mag) * speed * blend;
    const next = Math.hypot(vx, vy) || 1;
    struck.vx = (vx / next) * speed;
    struck.vy = (vy / next) * speed;
    struck.flash = 0.7;
    best.flash = 0.85;
    if (list === balls) {
      links.push({ x1: struck.x, y1: struck.y, x2: best.x, y2: best.y, life: 0.95 });
      burst(struck.x, struck.y, "#e0f2fe", 16, 240);
      burst(best.x, best.y, "#7dd3fc", 14, 200);
      ring(struck.x, struck.y, "#e0f2fe", 32);
      ring(best.x, best.y, "#7dd3fc", 26);
      tone(860, 0.07, "sine", 0.035);
      sweep(700, 1100, 0.1, "sine", 0.025);
    }
  };

  const curveHit = (hitter, struck, hvx, hvy, nx, ny) => {
    const speed = Math.hypot(hvx, hvy) || 1;
    const cross = (hvx * ny - hvy * nx) / speed;
    const amount = clamp(cross * 1.4, -1, 1) * 3.7;
    if (Math.abs(amount) < 0.18) return;
    struck.curve = amount;
    struck.flash = 0.32;
    if (hitter.id === 0) hitter.curve = -amount * 0.55;
    if (fxOn) {
      spark(struck.x, struck.y, "#e879f9", 8, 140);
      ring(struck.x, struck.y, "#ff2ea6", 24);
      sweep(520, 180, 0.1, "sine", 0.022);
    }
  };

  const onIce = (ball) => {
    if (!ball || ball.id === 0) return false;
    return ice.some((bit) => bit.life > 0 && Math.hypot(bit.x - ball.x, bit.y - ball.y) < bit.r * 0.7 + R * 0.2);
  };

  const layIce = (x, y) => {
    const last = ice.length ? ice[ice.length - 1] : null;
    if (last && Math.hypot(last.x - x, last.y - y) < 12) return;
    ice.push({ x, y, life: 6.5, r: 38 });
    if (ice.length > 260) ice.shift();
  };

  const startFerris = (cue, side) => {
    const speed = Math.max(240, Math.hypot(cue.vx, cue.vy));
    const radius = 96;
    const tx = cue.vx / (Math.hypot(cue.vx, cue.vy) || 1);
    const ty = cue.vy / (Math.hypot(cue.vx, cue.vy) || 1);
    const sign = side >= 0 ? 1 : -1;
    const rx = sign > 0 ? ty : -ty;
    const ry = sign > 0 ? -tx : tx;
    const cx = cue.x - rx * radius;
    const cy = cue.y - ry * radius;
    const ang = Math.atan2(cue.y - cy, cue.x - cx);
    const omega = sign * speed / radius;
    cue.orbit = { cx, cy, radius, ang, omega, grace: 0.22 };
    const spd = omega * radius;
    cue.vx = -Math.sin(ang) * spd;
    cue.vy = Math.cos(ang) * spd;
    if (fxOn) {
      ring(cue.x, cue.y, "#fbbf24", 42);
      spark(cue.x, cue.y, "#fde68a", 10, 120);
      tone(520, 0.08, "triangle", 0.03);
      sweep(360, 720, 0.12, "sine", 0.022);
    }
  };

  const distToSeg = (px, py, x1, y1, x2, y2) => {
    const vx = x2 - x1;
    const vy = y2 - y1;
    const len2 = vx * vx + vy * vy || 1;
    const t = clamp(((px - x1) * vx + (py - y1) * vy) / len2, 0, 1);
    return { d: Math.hypot(px - (x1 + vx * t), py - (y1 + vy * t)), t };
  };

  const wallPoint = (x, y, dx, dy) => {
    let t = 4000;
    if (dx > 0.001) t = Math.min(t, (FELT_R - 10 - x) / dx);
    if (dx < -0.001) t = Math.min(t, (FELT_L + 10 - x) / dx);
    if (dy > 0.001) t = Math.min(t, (FELT_B - 10 - y) / dy);
    if (dy < -0.001) t = Math.min(t, (FELT_T + 10 - y) / dy);
    t = Math.max(40, t);
    return { x: x + dx * t, y: y + dy * t };
  };

  const fireLaser = (list, dir) => {
    const cue = list[0];
    const end = wallPoint(cue.x, cue.y, dir.x, dir.y);
    beam = { x1: cue.x, y1: cue.y, x2: end.x, y2: end.y, life: 0.7 };
    let first = null;
    let firstT = Infinity;
    list.forEach((ball) => {
      if (!ball.in || ball.id === 0) return;
      const hit = distToSeg(ball.x, ball.y, cue.x, cue.y, end.x, end.y);
      if (hit.d > R * 2.2) return;
      const along = 820 + (1 - hit.d / (R * 2.2)) * 460;
      const side = clamp(((ball.x - cue.x) * -dir.y + (ball.y - cue.y) * dir.x) / R, -1, 1) * 70;
      ball.vx = dir.x * along - dir.y * side;
      ball.vy = dir.y * along + dir.x * side;
      ball.flash = 0.5;
      ball.orbit = null;
      spark(ball.x, ball.y, "#22d3ee", 6, 180);
      ring(ball.x, ball.y, "#e0f2fe", 20);
      if (hit.t < firstT) {
        firstT = hit.t;
        first = ball.id;
      }
    });
    cue.vx = dir.x * MAX_SPEED * 0.9;
    cue.vy = dir.y * MAX_SPEED * 0.9;
    cue.orbit = null;
      burst((cue.x + end.x) / 2, (cue.y + end.y) / 2, "#e0f2fe", 16, 80);
      spark(end.x, end.y, "#ffffff", 14, 260);
      ring(cue.x, cue.y, "#22d3ee", 36);
      ring(end.x, end.y, "#e0f2fe", 48);
      tone(920, 0.14, "square", 0.05);
      tone(160, 0.2, "sawtooth", 0.045);
      sweep(1400, 320, 0.18, "sawtooth", 0.03);
      crack(0.09, 0.05, 1800);
    return first;
  };

  const pocketBall = (ball, hooks) => {
    if (!ball.in) return;
    ball.in = false;
    ball.vx = 0;
    ball.vy = 0;
    ball.curve = 0;
    if (hooks && hooks.onPocket) hooks.onPocket(ball);
  };

  const knock = (ball, axis) => {
    const incoming = Math.hypot(ball.vx, ball.vy);
    if (fxOn && incoming > 80 && clock - railAt > 0.04) {
      railAt = clock;
      spark(ball.x, ball.y, "#fde68a", 7, 140);
      ring(ball.x, ball.y, "rgba(255,244,214,0.9)", 22 + Math.min(18, incoming * 0.02));
      crack(0.05, 0.035, 700 + Math.min(500, incoming));
      tone(120 + Math.min(160, incoming * 0.08), 0.04, "square", 0.02);
    } else if (fxOn && incoming > 80) {
      spark(ball.x, ball.y, "#fde68a", 4, 90);
    }
    if (ball.limit === 0) {
      ball.vx = 0;
      ball.vy = 0;
      ball.orbit = null;
      return;
    }
    if (axis === "x") ball.vx = -ball.vx * CUSHION;
    else ball.vy = -ball.vy * CUSHION;
    ball.orbit = null;
    if (ball.limit > 0) ball.limit -= 1;
  };

  const rails = (ball, hooks) => {
    if (!ball.in || ball.frozen) return;
    const jaw = CORNER;
    const nearTop = ball.y < FELT_T + jaw;
    const nearBot = ball.y > FELT_B - jaw;
    const nearLeft = ball.x < FELT_L + jaw;
    const nearRight = ball.x > FELT_R - jaw;
    const nearSide = Math.abs(ball.x - MID_X) < SIDE;
    if (ball.x < FELT_L + R && !(nearTop || nearBot)) {
      ball.x = FELT_L + R;
      ball.orbit = null;
      if (ball.vx < 0) knock(ball, "x");
    }
    if (ball.x > FELT_R - R && !(nearTop || nearBot)) {
      ball.x = FELT_R - R;
      ball.orbit = null;
      if (ball.vx > 0) knock(ball, "x");
    }
    if (ball.y < FELT_T + R && !(nearLeft || nearRight || nearSide)) {
      ball.y = FELT_T + R;
      ball.orbit = null;
      if (ball.vy < 0) knock(ball, "y");
    }
    if (ball.y > FELT_B - R && !(nearLeft || nearRight || nearSide)) {
      ball.y = FELT_B - R;
      ball.orbit = null;
      if (ball.vy > 0) knock(ball, "y");
    }
    for (let i = 0; i < pockets.length; i += 1) {
      const pocket = pockets[i];
      if (Math.hypot(ball.x - pocket.x, ball.y - pocket.y) < pocket.r * 0.82) {
        pocketBall(ball, hooks);
        return;
      }
    }
    if (ball.x < FELT_L - 2) {
      ball.x = FELT_L + R;
      if (ball.limit === 0) { ball.vx = 0; ball.vy = 0; }
      else if (ball.vx < 0) knock(ball, "x");
    } else if (ball.x > FELT_R + 2) {
      ball.x = FELT_R - R;
      if (ball.limit === 0) { ball.vx = 0; ball.vy = 0; }
      else if (ball.vx > 0) knock(ball, "x");
    }
    if (ball.y < FELT_T - 2) {
      ball.y = FELT_T + R;
      if (ball.limit === 0) { ball.vx = 0; ball.vy = 0; }
      else if (ball.vy < 0) knock(ball, "y");
    } else if (ball.y > FELT_B + 2) {
      ball.y = FELT_B - R;
      if (ball.limit === 0) { ball.vx = 0; ball.vy = 0; }
      else if (ball.vy > 0) knock(ball, "y");
    }
  };

  const collide = (list, hooks) => {
    const live = list.filter((ball) => ball.in);
    for (let i = 0; i < live.length; i += 1) {
      for (let j = i + 1; j < live.length; j += 1) {
        const a = live[i];
        const b = live[j];
        if (a.frozen || b.frozen) continue;
        if ((a.clone && b.id === 0) || (b.clone && a.id === 0)) continue;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.hypot(dx, dy);
        if (dist < 0.001) {
          dx = 1;
          dy = 0;
          dist = 1;
        }
        if (dist >= R * 2) continue;
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = R * 2 - dist;
        a.x -= nx * overlap * 0.5;
        a.y -= ny * overlap * 0.5;
        b.x += nx * overlap * 0.5;
        b.y += ny * overlap * 0.5;
        const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (rel <= 0) continue;
        if (a.limit === 0 || b.limit === 0) {
          if (a.limit === 0) { a.vx = 0; a.vy = 0; }
          if (b.limit === 0) { b.vx = 0; b.vy = 0; }
          continue;
        }
        const hadA = a.orbit;
        const hadB = b.orbit;
        const pvx = a.vx;
        const pvy = a.vy;
        const qvx = b.vx;
        const qvy = b.vy;
        const impulse = rel * BOUNCE;
        a.vx -= impulse * nx;
        a.vy -= impulse * ny;
        b.vx += impulse * nx;
        b.vy += impulse * ny;
        if (a.limit > 0) a.limit -= 1;
        if (b.limit > 0) b.limit -= 1;
        if (hooks && hooks.onHit) hooks.onHit(a, b, nx, ny, pvx, pvy, qvx, qvy);
        if (hadA && !(a.orbit && a.orbit.grace > 0)) a.orbit = null;
        if (hadB && !(b.orbit && b.orbit.grace > 0)) b.orbit = null;
      }
    }
  };

  const moveBall = (ball, dt) => {
    if (!ball.in || ball.frozen) return;
    if (ball.orbit) {
      const spin = ball.orbit;
      spin.ang += spin.omega * dt;
      ball.x = spin.cx + Math.cos(spin.ang) * spin.radius;
      ball.y = spin.cy + Math.sin(spin.ang) * spin.radius;
      const spd = spin.omega * spin.radius;
      ball.vx = -Math.sin(spin.ang) * spd;
      ball.vy = Math.cos(spin.ang) * spd;
      spin.omega *= Math.exp(-0.42 * dt);
      if (spin.grace > 0) spin.grace = Math.max(0, spin.grace - dt);
      if (Math.abs(spd) < STOP) {
        ball.orbit = null;
        ball.vx = 0;
        ball.vy = 0;
      }
      return;
    }
    const speed = Math.hypot(ball.vx, ball.vy);
    if (Math.abs(ball.curve) > 0.05 && speed > STOP) {
      const ang = ball.curve * dt;
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      const vx = ball.vx * c - ball.vy * s;
      ball.vy = ball.vx * s + ball.vy * c;
      ball.vx = vx;
      ball.curve *= Math.exp(-1.65 * dt);
    } else ball.curve = 0;
    const nextSpeed = Math.hypot(ball.vx, ball.vy);
    if (nextSpeed > 0) {
      const drag = onIce(ball) ? 16 : FRICTION;
      const slowed = Math.max(0, nextSpeed - drag * dt);
      const scale = slowed / nextSpeed;
      ball.vx *= scale;
      ball.vy *= scale;
      if (slowed < STOP) {
        ball.vx = 0;
        ball.vy = 0;
        ball.curve = 0;
      }
    }
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
  };

  const step = (list, dt, hooks, stick) => {
    let maxV = 0;
    list.forEach((ball) => {
      if (ball.in) maxV = Math.max(maxV, Math.hypot(ball.vx, ball.vy));
    });
    const sub = clamp(Math.ceil((maxV * dt) / (R * 0.5)), 1, 16);
    const h = dt / sub;
    for (let s = 0; s < sub; s += 1) {
      for (let i = 0; i < list.length; i += 1) {
        moveBall(list[i], h);
        rails(list[i], hooks);
      }
      collide(list, hooks);
      if (stick === "tempest") {
        const cue = list[0];
        if (cue && cue.in && Math.hypot(cue.vx, cue.vy) > 36) {
          list.forEach((ball) => {
            if (!ball.in || ball.id === 0) return;
            const dx = cue.x - ball.x;
            const dy = cue.y - ball.y;
            const dist = Math.hypot(dx, dy) || 1;
            if (dist > 214) return;
            const pullN = (1 - dist / 214) * 3400 * h;
            ball.vx += (dx / dist) * pullN;
            ball.vy += (dy / dist) * pullN;
          });
        }
      }
    }
  };

  const liveHooks = {
    onHit(a, b, nx, ny, pvx, pvy, qvx, qvy) {
      if (!shot) return;
      const role = roles(a, b, nx, ny, pvx, pvy, qvx, qvy);
      if (shot.firstHit == null && (role.hitter.id === 0 || role.struck.id === 0)) {
        shot.firstHit = role.hitter.id === 0 ? role.struck.id : role.hitter.id;
      }
      if (shot.stick === "light") bendLight(balls, role.hitter, role.struck);
      if (shot.stick === "mischief") curveHit(role.hitter, role.struck, role.vx, role.vy, role.nx, role.ny);
      if (shot.stick === "ferris" && (role.hitter.id === 0 || role.struck.id === 0)) {
        const cue = role.hitter.id === 0 ? role.hitter : role.struck;
        if (!cue.orbit) startFerris(cue, role.vx * role.ny - role.vy * role.nx);
      }
      if (shot.stick === "gate" && (role.hitter.id === 0 || role.struck.id === 0)) {
        const other = role.hitter.id === 0 ? role.struck : role.hitter;
        if (other.id > 0) {
          if (!shot.gated) shot.gated = [];
          if (!shot.gated.some((gate) => gate.id === other.id)) {
            shot.gated.push({ id: other.id, left: 5, t: 0, trail: [] });
            other.flash = 0.7;
            burst(other.x, other.y, "#ff2ea6", 10, 160);
            ring(other.x, other.y, "#ff2ea6", 30);
            sweep(280, 860, 0.12, "sine", 0.03);
            crack(0.06, 0.03, 900);
          }
        }
      }
      if (shot.stick === "drill" && !shot.drill && (role.hitter.id === 0 || role.struck.id === 0)) {
        const cue = role.hitter.id === 0 ? role.hitter : role.struck;
        const other = role.hitter.id === 0 ? role.struck : role.hitter;
        if (other.id > 0) {
          let nx = other.x - cue.x;
          let ny = other.y - cue.y;
          const mag = Math.hypot(nx, ny) || 1;
          nx /= mag;
          ny /= mag;
          const cx = clamp((cue.x + other.x) / 2, FELT_L + R * 2 + 6, FELT_R - R * 2 - 6);
          const cy = clamp((cue.y + other.y) / 2, FELT_T + R * 2 + 6, FELT_B - R * 2 - 6);
          shot.drill = {
            id: other.id,
            cx,
            cy,
            nx,
            ny,
            t: 0,
            spin: 0,
            buzz: 0,
            launched: false,
            power: Math.max(920, Math.hypot(role.vx, role.vy)),
          };
          balls.forEach((ball) => {
            ball.frozen = true;
          });
          cue.vx = 0;
          cue.vy = 0;
          cue.orbit = null;
          other.vx = 0;
          other.vy = 0;
          other.orbit = null;
          cue.x = cx - nx * R;
          cue.y = cy - ny * R;
          other.x = cx + nx * R;
          other.y = cy + ny * R;
          cam.tx = cx;
          cam.ty = cy;
          cam.tz = 3.4;
          cam.bars = 1;
          cam.shake = 0.8;
          tone(70, 0.22, "sine", 0.045);
          sweep(90, 40, 0.28, "sawtooth", 0.03);
          ring(cx, cy, "#fb923c", 28);
        }
      }
      const speed = Math.hypot(role.vx, role.vy);
      if (speed > 80 && clock - clickAt > 0.045) {
        clickAt = clock;
        const hx = (a.x + b.x) / 2;
        const hy = (a.y + b.y) / 2;
        const col = STICK_FX[shot.stick] || "#ffffff";
        spark(hx, hy, "#ffffff", 8, 180);
        spark(hx, hy, col, 10, 240);
        ring(hx, hy, col, 26 + Math.min(20, speed * 0.02));
        crack(0.045, 0.04, 500 + Math.min(700, speed));
        tone(190 + Math.min(380, speed * 0.25), 0.045, "square", 0.028);
        tone(640 + Math.min(400, speed * 0.2), 0.03, "sine", 0.02);
      }
    },
    onPocket(ball) {
      if (!shot) return;
      if (ball.id === 0) {
        shot.scratched = true;
        tone(96, 0.18, "sine", 0.07);
        sweep(160, 48, 0.22, "sawtooth", 0.04);
        crack(0.1, 0.05, 140);
        ring(ball.x, ball.y, "#111111", 40);
        spark(ball.x, ball.y, "#94a3b8", 12, 120);
        return;
      }
      if (ball.clone || ball.id < 0) return;
      if (shot.pocketed.indexOf(ball.id) === -1) {
        shot.pocketed.push(ball.id);
        tone(540, 0.11, "triangle", 0.05);
        tone(780, 0.14, "sine", 0.03);
        sweep(480, 920, 0.16, "triangle", 0.03);
        crack(0.06, 0.035, 1200);
        burst(ball.x, ball.y, "#f8fafc", 14, 150);
        spark(ball.x, ball.y, "#fde68a", 10, 200);
        ring(ball.x, ball.y, "#fff7ed", 46);
      }
    },
  };

  const settled = () => balls.every((ball) => !ball.in || Math.hypot(ball.vx, ball.vy) <= STOP);

  const spotEight = () => {
    const eight = balls.find((ball) => ball.id === 8);
    if (!eight) return;
    let x = FOOT_X;
    for (let n = 0; n < 24; n += 1) {
      const blocked = balls.some((other) => other.in && other.id !== 8 && Math.hypot(other.x - x, other.y - MID_Y) < R * 2);
      if (!blocked && x > FELT_L + R && x < FELT_R - R) {
        eight.x = x;
        eight.y = MID_Y;
        eight.vx = 0;
        eight.vy = 0;
        eight.curve = 0;
        eight.in = true;
        return;
      }
      x -= R * 2.2;
    }
  };

  const showEnd = () => {
    const name = winner === 0 ? "Player 1" : "Player 2";
    stage.innerHTML = `
      <section class="ttt-panel">
        <p class="ttt-kicker">U.G. / pool</p>
        <h2>${name} wins</h2>
        <p class="ttt-copy">${status}</p>
        <div class="mode-list">
          <button class="mode-btn" type="button" data-action="rematch">Rematch</button>
          <button class="mode-btn alt" type="button" data-action="local">New picks</button>
        </div>
      </section>`;
  };

  const renderHud = () => {
    stage.innerHTML = `
      <div class="pool-hud">
        <button class="ttt-back" type="button" data-action="menu">Back</button>
        <div class="pool-players">
          <p data-p1></p>
          <p data-p2></p>
        </div>
        <div class="pool-meter" aria-hidden="true"><i data-power></i></div>
        <p class="pool-status" data-status></p>
      </div>`;
    syncHud();
  };

  const syncHud = () => {
    const one = stage.querySelector("[data-p1]");
    const two = stage.querySelector("[data-p2]");
    const line = stage.querySelector("[data-status]");
    if (!one || !two) return;
    one.classList.toggle("is-turn", player === 0 && phase !== "over");
    two.classList.toggle("is-turn", player === 1 && phase !== "over");
    one.textContent = `Player 1 · ${GROUP_NAME[groups[0]]} ${remaining(0)} · ${STICK_NAME[sticks[0]]}`;
    two.textContent = `Player 2 · ${GROUP_NAME[groups[1]]} ${remaining(1)} · ${STICK_NAME[sticks[1]]}`;
    if (line) line.textContent = status;
  };

  const giveHand = (who, note) => {
    player = who;
    phase = "place";
    balls[0].in = false;
    balls[0].vx = 0;
    balls[0].vy = 0;
    balls[0].curve = 0;
    status = note;
    tone(140, 0.16, "sawtooth", 0.03);
    sweep(180, 60, 0.16, "sine", 0.025);
    syncHud();
  };

  const releaseCam = () => {
    cam.tz = 1;
    cam.tx = MID_X;
    cam.ty = MID_Y;
    cam.bars = 0;
    cam.shake = 0;
  };

  const aimTurn = (dir, ang) => ({
    x: dir.x * Math.cos(ang) - dir.y * Math.sin(ang),
    y: dir.x * Math.sin(ang) + dir.y * Math.cos(ang),
  });

  const clearExtras = () => {
    balls.forEach((ball) => {
      ball.frozen = false;
      ball.limit = null;
    });
    for (let i = balls.length - 1; i >= 0; i -= 1) {
      if (balls[i].clone) balls.splice(i, 1);
    }
    releaseCam();
  };

  const gateSpot = (selfId) => {
    for (let n = 0; n < 30; n += 1) {
      const x = FELT_L + R + 24 + Math.random() * (FELT_W - R * 2 - 48);
      const y = FELT_T + R + 24 + Math.random() * (FELT_H - R * 2 - 48);
      const blocked = balls.some((ball) => ball.in && ball.id !== selfId && Math.hypot(ball.x - x, ball.y - y) < R * 2.6);
      const mouth = pockets.some((pocket) => Math.hypot(pocket.x - x, pocket.y - y) < pocket.r + R * 1.4);
      if (!blocked && !mouth) return { x, y };
    }
    return { x: MID_X, y: FELT_T + FELT_H * 0.35 };
  };

  const openGate = (ball) => {
    const fromX = ball.x;
    const fromY = ball.y;
    const spot = gateSpot(ball.id);
    const ang = Math.random() * Math.PI * 2;
    const spd = Math.max(680, Math.hypot(ball.vx, ball.vy));
    portals.push({ x: fromX, y: fromY, life: 0.46, max: 0.46, out: false, dir: Math.atan2(ball.vy, ball.vx) });
    ball.x = spot.x;
    ball.y = spot.y;
    ball.vx = Math.cos(ang) * spd;
    ball.vy = Math.sin(ang) * spd;
    ball.orbit = null;
    ball.curve = 0;
    portals.push({ x: spot.x, y: spot.y, life: 0.46, max: 0.46, out: true, dir: ang });
    burst(fromX, fromY, "#ff2ea6", 14, 280);
    burst(spot.x, spot.y, "#2ee7ff", 16, 340);
    ring(fromX, fromY, "#ff2ea6", 34);
    ring(spot.x, spot.y, "#2ee7ff", 42);
    spark(spot.x, spot.y, "#ffffff", 12, 300, ang);
    tone(220, 0.08, "square", 0.04);
    tone(840, 0.1, "sine", 0.045);
    sweep(180, 980, 0.14, "sine", 0.03);
    crack(0.07, 0.04, 1100);
  };

  const holdDrill = (dt) => {
    const d = shot.drill;
    const cue = balls[0];
    const other = balls.find((ball) => ball.id === d.id && ball.in);
    if (!cue || !cue.in || !other) {
      balls.forEach((ball) => { ball.frozen = false; });
      releaseCam();
      shot.drill = null;
      return;
    }
    d.t += dt;
    cue.x = d.cx - d.nx * R;
    cue.y = d.cy - d.ny * R;
    other.x = d.cx + d.nx * R;
    other.y = d.cy + d.ny * R;
    cue.vx = 0;
    cue.vy = 0;
    other.vx = 0;
    other.vy = 0;
    const zoomIn = 0.4;
    const saw = 2;
    const sawT = d.t - zoomIn;
    if (d.t < zoomIn) {
      d.spin += dt * 9;
      cam.shake = 0.6;
      cam.bars = 1;
    } else if (sawT < saw) {
      const u = sawT / saw;
      d.spin += dt * (16 + u * u * 96);
      cam.shake = u > 0.9 ? 2.4 : 1.4 + u * 7;
      cam.bars = 1;
      const tx = -d.ny;
      const ty = d.nx;
      const spray = Math.random() < 0.5 ? 1 : -1;
      motes.push({
        x: d.cx + tx * spray * 3,
        y: d.cy + ty * spray * 3,
        vx: tx * spray * (180 + u * 460) + (Math.random() - 0.5) * 80,
        vy: ty * spray * (180 + u * 460) + (Math.random() - 0.5) * 80,
        life: 0.16 + Math.random() * 0.18,
        color: Math.random() < 0.45 ? "#fff7ed" : "#fb923c",
        r: 1.3 + Math.random() * 1.8,
      });
      d.buzz -= dt;
      if (d.buzz <= 0) {
        d.buzz = 0.08;
        tone(80 + u * 320, 0.06, "sawtooth", 0.025 + u * 0.035);
      }
    } else {
      d.launched = true;
      balls.forEach((ball) => { ball.frozen = false; });
      const spd = Math.max(920, d.power);
      other.vx = d.nx * spd;
      other.vy = d.ny * spd;
      cue.vx = -d.nx * spd;
      cue.vy = -d.ny * spd;
      cam.tz = 1;
      cam.tx = MID_X;
      cam.ty = MID_Y;
      cam.bars = 0;
      cam.shake = 16;
      cam.flash = 1;
      burst(d.cx, d.cy, "#fff7ed", 26, 540);
      burst(d.cx, d.cy, "#fb923c", 16, 360);
      ring(d.cx, d.cy, "#fff7ed", 70);
      ring(d.cx, d.cy, "#fb923c", 46);
      tone(120, 0.18, "square", 0.08);
      tone(52, 0.3, "sawtooth", 0.07);
      sweep(70, 240, 0.2, "square", 0.04);
      crack(0.12, 0.06, 220);
    }
  };

  const dropClone = () => {
    for (let i = balls.length - 1; i >= 0; i -= 1) {
      const ball = balls[i];
      if (!ball.clone) continue;
      if (!ball.in || Math.hypot(ball.vx, ball.vy) <= STOP) balls.splice(i, 1);
    }
  };

  const resolve = () => {
    if (!shot) return;
    clearExtras();
    const who = shot.player;
    const eight = shot.pocketed.indexOf(8) !== -1;
    if (eight && shot.breakShot) spotEight();
    if (eight && !shot.breakShot) {
      const legal = shot.legalEight && shot.firstHit === 8 && !shot.scratched;
      winner = legal ? who : 1 - who;
      status = legal
        ? `Player ${who + 1} pockets the 8.`
        : `Player ${who + 1} loses on the 8.`;
      phase = "over";
      shot = null;
      tone(legal ? 520 : 110, 0.28, "sine", 0.08);
      if (legal) {
        tone(680, 0.22, "triangle", 0.04);
        tone(920, 0.18, "sine", 0.035);
        sweep(420, 1040, 0.32, "triangle", 0.03);
        spark(MID_X, MID_Y, "#fde68a", 28, 280);
        ring(MID_X, MID_Y, "#fff7ed", 90);
      } else {
        sweep(200, 46, 0.32, "sawtooth", 0.045);
        crack(0.14, 0.05, 110);
        spark(MID_X, MID_Y, "#64748b", 16, 160);
      }
      showEnd();
      return;
    }
    let foul = shot.scratched || shot.firstHit == null;
    if (!foul && !shot.breakShot) {
      foul = shot.legalEight ? shot.firstHit !== 8 : groupOf(shot.firstHit) !== groups[who];
    }
    const scored = shot.pocketed.some((id) => groupOf(id) === groups[who]);
    const scratched = shot.scratched;
    shot = null;
    if (scratched) {
      giveHand(1 - who, `Scratch. Player ${2 - who} places the white ball on the line.`);
      return;
    }
    if (foul) {
      player = 1 - who;
      phase = "aim";
      status = `Foul. Player ${player + 1}'s turn.`;
      tone(140, 0.12, "sawtooth", 0.03);
      sweep(220, 70, 0.14, "square", 0.025);
      crack(0.06, 0.03, 180);
      syncHud();
      return;
    }
    if (scored) {
      phase = "aim";
      status = `Pocket. Player ${who + 1} shoots again.`;
    } else {
      player = 1 - who;
      phase = "aim";
      status = `Player ${player + 1} · ${GROUP_NAME[groups[player]]}. Pull back and release.`;
    }
    syncHud();
  };

  const shoot = () => {
    const cue = balls[0];
    if (!cue || !cue.in || phase !== "aim") return;
    const laser = sticks[player] === "laser" && pull >= MAX_PULL - 8;
    const power = 0.2 + (pull / MAX_PULL) * 0.8;
    const orb = sticks[player] === "trick" && charge >= 2;
    const speed = orb ? MAX_SPEED * 3 : power * MAX_SPEED;
    if (!laser) {
      cue.vx = aim.x * speed;
      cue.vy = aim.y * speed;
    }
    cue.curve = 0;
    cue.orbit = null;
    if (orb) {
      cue.flash = 0.75;
      burst(cue.x, cue.y, "#ef4444", 22, 340);
      burst(cue.x, cue.y, "#111111", 10, 180);
      ring(cue.x, cue.y, "#ef4444", 54);
      tone(68, 0.24, "sawtooth", 0.09);
      tone(420, 0.1, "square", 0.04);
      sweep(90, 40, 0.22, "sawtooth", 0.04);
      crack(0.1, 0.05, 160);
    }
    shot = {
      player,
      stick: sticks[player],
      firstHit: null,
      pocketed: [],
      scratched: false,
      breakShot: isBreak,
      legalEight: remaining(player) === 0,
    };
    if (shot.stick === "clone") {
      cue.limit = 1;
      const dir = aimTurn(aim, 0.58);
      const copy = makeBall(-1, cue.x + dir.x * (R * 2.2), cue.y + dir.y * (R * 2.2));
      copy.clone = true;
      copy.limit = 1;
      copy.vx = dir.x * speed;
      copy.vy = dir.y * speed;
      balls.push(copy);
      burst(copy.x, copy.y, "#cbd5e1", 12, 160);
      ring(copy.x, copy.y, "#e2e8f0", 28);
      ring(cue.x, cue.y, "#ffffff", 28);
    }
    if (shot.stick === "gate") shot.gated = [];
    isBreak = false;
    phase = "run";
    charging = false;
    pull = 0;
    charge = 0;
    if (laser) {
      const id = fireLaser(balls, aim);
      if (id != null) shot.firstHit = id;
    }
    const col = STICK_FX[shot.stick] || "#ffffff";
    const ang = Math.atan2(aim.y, aim.x);
    ring(cue.x, cue.y, col, 40);
    spark(cue.x, cue.y, "#ffffff", 8, 200, ang);
    spark(cue.x, cue.y, col, 12, 280, ang);
    crack(0.06, 0.04, 480);
    sweep(300, 100, 0.1, "triangle", 0.03);
    if (shot.stick === "frost") sweep(980, 360, 0.16, "sine", 0.028);
    if (shot.stick === "tempest") sweep(620, 180, 0.18, "sine", 0.028);
    if (shot.stick === "ferris") tone(640, 0.08, "triangle", 0.03);
    if (shot.stick === "mischief") sweep(740, 200, 0.14, "sawtooth", 0.02);
    if (shot.stick === "drill") sweep(90, 42, 0.14, "sawtooth", 0.028);
    if (shot.stick === "gate") sweep(260, 900, 0.12, "sine", 0.028);
    status = laser ? "Laser." : orb ? "Orb away." : shot.stick === "clone" ? "Clone." : shot.stick === "gate" ? "Gate." : shot.stick === "drill" ? "Drill." : "Rolling.";
    tone(160, 0.05, "triangle", 0.07);
    syncHud();
  };

  const preview = () => {
    if (sticks[player] === "trick") return null;
    if (phase !== "aim" || !balls[0] || !balls[0].in) return null;
    if (sticks[player] === "laser" && charging && pull >= MAX_PULL - 8) {
      const end = wallPoint(balls[0].x, balls[0].y, aim.x, aim.y);
      return { stick: "laser", laser: { x1: balls[0].x, y1: balls[0].y, x2: end.x, y2: end.y }, cue: [], obj: [] };
    }
    if (sticks[player] === "clone") {
      const trace = (ang) => {
        fxOn = false;
        const ghost = balls.filter((ball) => !ball.clone).map((ball) => ({
          id: ball.id, x: ball.x, y: ball.y, vx: 0, vy: 0, curve: 0, flash: 0, in: ball.in, orbit: null, limit: null,
        }));
        const cueBall = ghost[0];
        const dir = aimTurn(aim, ang);
        const power = charging ? 0.2 + (pull / MAX_PULL) * 0.8 : 0.48;
        cueBall.vx = dir.x * power * MAX_SPEED;
        cueBall.vy = dir.y * power * MAX_SPEED;
        cueBall.limit = 1;
        if (ang !== 0) {
          cueBall.x += dir.x * (R * 2.2);
          cueBall.y += dir.y * (R * 2.2);
        }
        const path = [{ x: cueBall.x, y: cueBall.y }];
        let time = 0;
        let tail = -1;
        const traceHooks = { onHit() {}, onPocket(ball) { ball.in = false; } };
        while (time < 1.05 && cueBall.in && Math.hypot(cueBall.vx, cueBall.vy) > STOP) {
          step(ghost, 0.02, traceHooks, "clone");
          time += 0.02;
          path.push({ x: cueBall.x, y: cueBall.y });
          if (cueBall.limit === 0) {
            if (tail < 0) tail = 0;
            tail += 0.02;
            if (tail > 0.28) break;
          }
        }
        fxOn = true;
        return path;
      };
      return { stick: "clone", cue: trace(0), clone: trace(0.58), obj: [], wind: [] };
    }
    const ghost = balls.map((ball) => ({
      id: ball.id, x: ball.x, y: ball.y, vx: 0, vy: 0, curve: 0, flash: 0, in: ball.in, orbit: null,
    }));
    const cue = ghost[0];
    const power = charging ? 0.2 + (pull / MAX_PULL) * 0.8 : 0.48;
    cue.vx = aim.x * power * MAX_SPEED;
    cue.vy = aim.y * power * MAX_SPEED;
    const cuePath = [{ x: cue.x, y: cue.y }];
    const objPath = [];
    let tracked = -1;
    let hideObj = false;
    let hits = 0;
    let drillMark = null;
    const gateMarks = [];
    const stick = sticks[player];
    const hooks = {
      onHit(a, b, nx, ny, pvx, pvy, qvx, qvy) {
        hits += 1;
        const role = roles(a, b, nx, ny, pvx, pvy, qvx, qvy);
        if (tracked < 0 && (role.hitter.id === 0 || role.struck.id === 0)) {
          tracked = role.hitter.id === 0 ? role.struck.id : role.hitter.id;
          const object = ghost.find((ball) => ball.id === tracked);
          hideObj = !!(object && onIce(object));
        }
        if (stick === "light" && role.struck.id !== 0) bendLight(ghost, role.hitter, role.struck);
        if (stick === "mischief") curveHit(role.hitter, role.struck, role.vx, role.vy, role.nx, role.ny);
        if (stick === "ferris" && (role.hitter.id === 0 || role.struck.id === 0)) {
          const wheel = role.hitter.id === 0 ? role.hitter : role.struck;
          if (!wheel.orbit) startFerris(wheel, role.vx * role.ny - role.vy * role.nx);
        }
        if (stick === "drill" && !drillMark && (role.hitter.id === 0 || role.struck.id === 0)) {
          const cueB = role.hitter.id === 0 ? role.hitter : role.struck;
          const obj = role.hitter.id === 0 ? role.struck : role.hitter;
          if (obj.id > 0) {
            drillMark = { x: (cueB.x + obj.x) / 2, y: (cueB.y + obj.y) / 2, nx: obj.x - cueB.x, ny: obj.y - cueB.y };
            hits = 20;
          }
        }
        if (stick === "gate" && (role.hitter.id === 0 || role.struck.id === 0)) {
          const obj = role.hitter.id === 0 ? role.struck : role.hitter;
          if (obj.id > 0 && !gateMarks.some((mark) => mark.id === obj.id)) {
            gateMarks.push({ id: obj.id, x: obj.x, y: obj.y, dir: Math.atan2(role.vy, role.vx) });
          }
        }
      },
      onPocket(ball) { ball.in = false; },
    };
    const wind = [];
    let windId = -1;
    if (stick === "tempest") {
      let best = 214;
      ghost.forEach((ball) => {
        if (!ball.in || ball.id === 0) return;
        const dist = Math.hypot(ball.x - cue.x, ball.y - cue.y);
        if (dist < best) {
          best = dist;
          windId = ball.id;
        }
      });
    }
    fxOn = false;
    let time = 0;
    const limit = stick === "ferris" ? 1.55 : 1.12;
    while (time < limit && hits < (stick === "ferris" ? 8 : 4)) {
      step(ghost, 0.02, hooks, stick);
      time += 0.02;
      if (cue.in) cuePath.push({ x: cue.x, y: cue.y });
      if (tracked >= 0 && !hideObj && stick !== "gate") {
        const object = ghost.find((ball) => ball.id === tracked);
        if (object && object.in) objPath.push({ x: object.x, y: object.y });
      }
      if (windId >= 0) {
        const followed = ghost.find((ball) => ball.id === windId);
        if (followed && followed.in) wind.push({ x: followed.x, y: followed.y });
      }
    }
    fxOn = true;
    return {
      cue: cuePath,
      obj: objPath,
      wind,
      stick,
      drill: drillMark,
      gates: gateMarks,
    };
  };

  const placePoint = (x, y) => {
    const px = HEAD_X;
    const py = clamp(y, FELT_T + R + 6, FELT_B - R - 6);
    const blocked = balls.some((ball) => ball.id !== 0 && ball.in && Math.hypot(ball.x - px, ball.y - py) < R * 2 + 0.4);
    return { x: px, y: py, ok: !blocked };
  };

  const updateAim = (point) => {
    const cue = balls[0];
    if (!cue) return;
    const dx = cue.x - point.x;
    const dy = cue.y - point.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 26) aim = { x: dx / dist, y: dy / dist, dist };
    else aim.dist = dist;
    pull = charging ? clamp(aim.dist - 78, 0, MAX_PULL) : 0;
  };

  const fit = () => {
    const vw = root.clientWidth || window.innerWidth;
    const vh = root.clientHeight || window.innerHeight;
    const scale = Math.min(vw / LW, vh / LH);
    return { vw, vh, scale, ox: (vw - LW * scale) / 2, oy: (vh - LH * scale) / 2 };
  };

  const resize = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = root.clientWidth || window.innerWidth;
    const h = root.clientHeight || window.innerHeight;
    if (w === viewW && h === viewH && dpr === viewDpr) return;
    viewW = w;
    viewH = h;
    viewDpr = dpr;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  };

  const roundRect = (x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  const drawTable = () => {
    const wood = ctx.createLinearGradient(0, 0, 0, LH);
    wood.addColorStop(0, "#6b3418");
    wood.addColorStop(0.2, "#8a4622");
    wood.addColorStop(0.55, "#5a2c14");
    wood.addColorStop(1, "#3a1c0d");
    ctx.fillStyle = wood;
    roundRect(18, 18, LW - 36, LH - 36, 28);
    ctx.fill();
    ctx.save();
    roundRect(18, 18, LW - 36, LH - 36, 28);
    ctx.clip();
    ctx.strokeStyle = "rgba(255, 220, 180, 0.16)";
    ctx.lineWidth = 2;
    for (let x = 30; x < LW; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x + 10, LH - 20);
      ctx.stroke();
    }
    ctx.restore();

    pockets.forEach((pocket) => {
      ctx.fillStyle = "#050505";
      ctx.beginPath();
      ctx.arc(pocket.x, pocket.y, pocket.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#c2a15a";
      ctx.lineWidth = 4;
      ctx.stroke();
    });

    const felt = ctx.createRadialGradient(MID_X, MID_Y - 20, 40, MID_X, MID_Y, 760);
    felt.addColorStop(0, "#1c8f58");
    felt.addColorStop(0.6, "#127246");
    felt.addColorStop(1, "#0b5134");
    ctx.fillStyle = felt;
    ctx.fillRect(FELT_L, FELT_T, FELT_W, FELT_H);
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let y = FELT_T + 8; y < FELT_B; y += 7) {
      ctx.beginPath();
      ctx.moveTo(FELT_L, y);
      ctx.lineTo(FELT_R, y);
      ctx.stroke();
    }

    ctx.strokeStyle = "#083828";
    ctx.lineWidth = 16;
    ctx.lineCap = "round";
    const gap = 54;
    const sideGap = 40;
    ctx.beginPath();
    ctx.moveTo(FELT_L + gap, FELT_T + 10);
    ctx.lineTo(MID_X - sideGap, FELT_T + 10);
    ctx.moveTo(MID_X + sideGap, FELT_T + 10);
    ctx.lineTo(FELT_R - gap, FELT_T + 10);
    ctx.moveTo(FELT_L + gap, FELT_B - 10);
    ctx.lineTo(MID_X - sideGap, FELT_B - 10);
    ctx.moveTo(MID_X + sideGap, FELT_B - 10);
    ctx.lineTo(FELT_R - gap, FELT_B - 10);
    ctx.moveTo(FELT_L + 10, FELT_T + gap);
    ctx.lineTo(FELT_L + 10, FELT_B - gap);
    ctx.moveTo(FELT_R - 10, FELT_T + gap);
    ctx.lineTo(FELT_R - 10, FELT_B - gap);
    ctx.stroke();

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.78)";
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 8]);
    ctx.beginPath();
    ctx.moveTo(HEAD_X, FELT_T + 16);
    ctx.lineTo(HEAD_X, FELT_B - 16);
    ctx.stroke();
    ctx.restore();

    [HEAD_X, MID_X, FOOT_X].forEach((x) => {
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.beginPath();
      ctx.arc(x, MID_Y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    });

    const marks = [0.16, 0.3, 0.42, 0.58, 0.7, 0.84];
    marks.forEach((t) => {
      const x = FELT_L + FELT_W * t;
      diamond(x, 40);
      diamond(x, LH - 40);
    });
    [0.28, 0.5, 0.72].forEach((t) => {
      const y = FELT_T + FELT_H * t;
      diamond(40, y);
      diamond(LW - 40, y);
    });
  };

  const diamond = (x, y) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = "#f6e7c8";
    ctx.fillRect(-4.5, -4.5, 9, 9);
    ctx.strokeStyle = "rgba(90, 50, 20, 0.45)";
    ctx.lineWidth = 1;
    ctx.strokeRect(-4.5, -4.5, 9, 9);
    ctx.restore();
  };

  const drawBall = (ball) => {
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(3.5, 6, R * 0.86, R * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.save();
    ctx.clip();
    if (ball.clone) ctx.fillStyle = "#94a3b8";
    else if (ball.id === 0) ctx.fillStyle = "#f8fafc";
    else if (ball.id === 8) ctx.fillStyle = "#0c0c0c";
    else if (ball.id > 8) ctx.fillStyle = "#f8fafc";
    else ctx.fillStyle = COLORS[ball.id];
    ctx.fillRect(-R, -R, R * 2, R * 2);
    if (ball.id > 8) {
      ctx.fillStyle = COLORS[ball.id];
      ctx.fillRect(-R, -R * 0.42, R * 2, R * 0.84);
    }
    const shade = ctx.createRadialGradient(-R * 0.38, -R * 0.42, 1, 0, 0, R);
    shade.addColorStop(0, "rgba(255,255,255,0.8)");
    shade.addColorStop(0.4, "rgba(255,255,255,0)");
    shade.addColorStop(1, "rgba(0,0,0,0.4)");
    ctx.fillStyle = shade;
    ctx.fillRect(-R, -R, R * 2, R * 2);
    ctx.restore();
    if (ball.id > 0) {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.46, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#161616";
      ctx.font = `700 ${Math.round(R * 0.72)}px Rajdhani, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(ball.id), 0, 1);
    }
    const kind = shot ? shot.stick : sticks[player];
    if (ball.flash > 0) {
      const ring = kind === "mischief" ? "rgba(255,46,166,0.95)" : kind === "trick" ? "rgba(239,68,68,0.95)" : "rgba(224,242,254,0.95)";
      ctx.strokeStyle = ring;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, R + 4 + ball.flash * 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (Math.abs(ball.curve) > 0.25) {
      ctx.strokeStyle = "rgba(255,46,166,0.85)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, R + 7, ball.curve > 0 ? 0.2 : Math.PI, ball.curve > 0 ? 2.2 : Math.PI + 2);
      ctx.stroke();
    }
    ctx.restore();
  };

  const strokePath = (points, color, width, glow) => {
    if (!points || points.length < 2) return;
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    if (glow) {
      ctx.strokeStyle = glow;
      ctx.lineWidth = width + 4;
      ctx.shadowColor = glow;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
    ctx.restore();
  };

  const cueWidth = (t) => {
    if (t < 0.02) return 3.3;
    if (t < 0.07) return 4.8;
    if (t < 0.72) return 5 + t * 3.4;
    if (t < 0.88) return 9.4;
    return 11;
  };

  const drawCue = (tipX, tipY, ang, kind) => {
    if (kind === "light") {
      const glow = ctx.createRadialGradient(tipX, tipY, 2, tipX, tipY, 42);
      glow.addColorStop(0, "rgba(224,242,254,0.95)");
      glow.addColorStop(0.45, "rgba(125,211,252,0.35)");
      glow.addColorStop(1, "rgba(125,211,252,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(tipX, tipY, 42, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === "gate") {
      const glow = ctx.createRadialGradient(tipX, tipY, 2, tipX, tipY, 36);
      glow.addColorStop(0, "rgba(255,46,166,0.9)");
      glow.addColorStop(0.5, "rgba(46,231,255,0.28)");
      glow.addColorStop(1, "rgba(46,231,255,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(tipX, tipY, 36, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === "drill") {
      const glow = ctx.createRadialGradient(tipX, tipY, 2, tipX, tipY, 30);
      glow.addColorStop(0, "rgba(255,247,237,0.95)");
      glow.addColorStop(0.45, "rgba(251,146,60,0.4)");
      glow.addColorStop(1, "rgba(251,146,60,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(tipX, tipY, 30, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    ctx.translate(tipX, tipY);
    ctx.rotate(ang);
    const len = 430;
    const samples = 32;
    const bow = (t) => (kind === "mischief" ? Math.sin(t * Math.PI) * 16 : 0);
    const trick = kind === "trick";
    ctx.beginPath();
    for (let i = 0; i <= samples; i += 1) {
      const t = i / samples;
      ctx.lineTo(t * len, -cueWidth(t) + bow(t));
    }
    for (let i = samples; i >= 0; i -= 1) {
      const t = i / samples;
      ctx.lineTo(t * len, cueWidth(t) + bow(t));
    }
    ctx.closePath();
    const wood = ctx.createLinearGradient(0, -12, len, 12);
    if (kind === "light") {
      wood.addColorStop(0, "#e0f2fe");
      wood.addColorStop(0.08, "#ffffff");
      wood.addColorStop(0.16, "#f4e4c4");
      wood.addColorStop(0.62, "#e6cb96");
      wood.addColorStop(0.74, "#cffafe");
      wood.addColorStop(0.82, "#0891b2");
      wood.addColorStop(1, "#083344");
    } else if (trick) {
      wood.addColorStop(0, "#ef4444");
      wood.addColorStop(0.07, "#111111");
      wood.addColorStop(0.18, "#7f1d1d");
      wood.addColorStop(0.55, "#1a1a1a");
      wood.addColorStop(0.78, "#ef4444");
      wood.addColorStop(1, "#0a0a0a");
    } else if (kind === "frost") {
      wood.addColorStop(0, "#f0f9ff");
      wood.addColorStop(0.16, "#e0f2fe");
      wood.addColorStop(0.55, "#7dd3fc");
      wood.addColorStop(1, "#0c4a6e");
    } else if (kind === "tempest") {
      wood.addColorStop(0, "#ffffff");
      wood.addColorStop(0.2, "#a5f3fc");
      wood.addColorStop(0.7, "#0891b2");
      wood.addColorStop(1, "#164e63");
    } else if (kind === "ferris") {
      wood.addColorStop(0, "#fffbeb");
      wood.addColorStop(0.2, "#fde68a");
      wood.addColorStop(0.65, "#d97706");
      wood.addColorStop(1, "#451a03");
    } else if (kind === "laser") {
      wood.addColorStop(0, "#f8fafc");
      wood.addColorStop(0.08, "#22d3ee");
      wood.addColorStop(0.22, "#0f172a");
      wood.addColorStop(0.78, "#020617");
      wood.addColorStop(1, "#083344");
    } else if (kind === "clone") {
      wood.addColorStop(0, "#f8fafc");
      wood.addColorStop(0.16, "#e2e8f0");
      wood.addColorStop(0.48, "#64748b");
      wood.addColorStop(1, "#0f172a");
    } else if (kind === "gate") {
      wood.addColorStop(0, "#fdf4ff");
      wood.addColorStop(0.14, "#ff2ea6");
      wood.addColorStop(0.42, "#2ee7ff");
      wood.addColorStop(0.7, "#4c1d95");
      wood.addColorStop(1, "#0b0614");
    } else if (kind === "drill") {
      wood.addColorStop(0, "#fff7ed");
      wood.addColorStop(0.1, "#fb923c");
      wood.addColorStop(0.28, "#44403c");
      wood.addColorStop(0.7, "#1c1917");
      wood.addColorStop(1, "#0c0a09");
    } else {
      wood.addColorStop(0, "#ddd6fe");
      wood.addColorStop(0.08, "#7c3aed");
      wood.addColorStop(0.2, "#4c1d95");
      wood.addColorStop(0.68, "#2e1065");
      wood.addColorStop(0.8, "#ff2ea6");
      wood.addColorStop(1, "#1a0618");
    }
    ctx.fillStyle = wood;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = kind === "light" ? "rgba(120, 72, 24, 0.28)" : trick ? "rgba(239,68,68,0.35)" : "rgba(255,255,255,0.14)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i += 1) {
      const y = -6 + i * 3;
      ctx.beginPath();
      ctx.moveTo(28, y);
      ctx.bezierCurveTo(120, y + bow(0.3), 240, y - 2, 300, y + bow(0.7) * 0.2);
      ctx.stroke();
    }
    if (kind === "light") {
      ctx.strokeStyle = "rgba(224,242,254,0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20, -2);
      ctx.lineTo(300, -3);
      ctx.stroke();
    }
    ctx.restore();
    const tint = {
      light: ["#7dd3fc", "#f8fafc", "#155e75", "rgba(224,242,254,0.9)", "#0f172a"],
      trick: ["#ef4444", "#111111", "#ef4444", "rgba(239,68,68,0.95)", "#0a0a0a"],
      frost: ["#e0f2fe", "#ffffff", "#38bdf8", "rgba(186,230,253,0.95)", "#0c4a6e"],
      tempest: ["#ecfeff", "#cffafe", "#06b6d4", "rgba(165,243,252,0.95)", "#155e75"],
      ferris: ["#fde68a", "#fffbeb", "#d97706", "rgba(251,191,36,0.95)", "#78350f"],
      laser: ["#f8fafc", "#0f172a", "#22d3ee", "rgba(34,211,238,0.95)", "#020617"],
      clone: ["#e2e8f0", "#f8fafc", "#64748b", "rgba(203,213,225,0.95)", "#0f172a"],
      gate: ["#ff2ea6", "#f8fafc", "#2ee7ff", "rgba(46,231,255,0.95)", "#2e1065"],
      drill: ["#fb923c", "#fff7ed", "#ea580c", "rgba(251,146,60,0.95)", "#1c1917"],
    }[kind] || ["#c4b5fd", "#f8fafc", "#ff2ea6", "rgba(255,46,166,0.9)", "#11060f"];
    ctx.fillStyle = tint[0];
    ctx.fillRect(0, -3.4, 9, 6.8);
    ctx.fillStyle = tint[1];
    ctx.fillRect(9, -4.6, 18, 9.2);
    ctx.strokeStyle = tint[2];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(27, -5);
    ctx.lineTo(27, 5);
    ctx.moveTo(292, -8);
    ctx.lineTo(292, 8);
    ctx.stroke();
    ctx.strokeStyle = tint[3];
    ctx.lineWidth = 1.3;
    for (let i = 0; i < 7; i += 1) {
      const x = 310 + i * 12;
      ctx.beginPath();
      ctx.moveTo(x, -7);
      ctx.lineTo(x + 8, 7);
      ctx.moveTo(x + 8, -7);
      ctx.lineTo(x, 7);
      ctx.stroke();
    }
    ctx.fillStyle = tint[4];
    roundRect(392, -10, 34, 20, 4);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(396, -7, 26, 3);
    ctx.restore();
  };

  const drawIce = () => {
    if (!ice.length) return;
    if (ice.length > 1) {
      const mid = ice[Math.floor(ice.length / 2)];
      const fade = mid.life > 1.5 ? 1 : Math.max(0, mid.life / 1.5);
      ctx.save();
      ctx.globalAlpha = 0.9 * fade;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(186, 230, 253, 0.28)";
      ctx.lineWidth = 46;
      ctx.beginPath();
      ctx.moveTo(ice[0].x, ice[0].y);
      for (let i = 1; i < ice.length; i += 1) ctx.lineTo(ice[i].x, ice[i].y);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.42)";
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.restore();
    }
    ice.forEach((bit) => {
      const fade = bit.life > 1.5 ? 1 : Math.max(0, bit.life / 1.5);
      ctx.save();
      const glaze = ctx.createRadialGradient(bit.x - 8, bit.y - 10, 2, bit.x, bit.y, bit.r);
      glaze.addColorStop(0, `rgba(255,255,255,${0.5 * fade})`);
      glaze.addColorStop(0.28, `rgba(224,242,254,${0.22 * fade})`);
      glaze.addColorStop(0.62, `rgba(125,211,252,${0.1 * fade})`);
      glaze.addColorStop(1, "rgba(125,211,252,0)");
      ctx.fillStyle = glaze;
      ctx.beginPath();
      ctx.arc(bit.x, bit.y, bit.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${0.45 * fade})`;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(bit.x - 4, bit.y - 5, bit.r * 0.42, 0.6, 2.4);
      ctx.stroke();
      ctx.restore();
    });
  };

  const drawBeam = (ray, alpha) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(34,211,238,0.32)";
    ctx.lineWidth = 34;
    ctx.shadowColor = "#22d3ee";
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.moveTo(ray.x1, ray.y1);
    ctx.lineTo(ray.x2, ray.y2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.restore();
  };

  const drawLaserAura = (tipX, tipY) => {
    const flare = ctx.createRadialGradient(tipX, tipY, 1, tipX, tipY, 34);
    flare.addColorStop(0, "rgba(255,255,255,0.95)");
    flare.addColorStop(0.35, "rgba(34,211,238,0.55)");
    flare.addColorStop(1, "rgba(34,211,238,0)");
    ctx.fillStyle = flare;
    ctx.beginPath();
    ctx.arc(tipX, tipY, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(tipX, tipY);
    ctx.rotate(clock * 7);
    ctx.strokeStyle = "rgba(34,211,238,0.95)";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#67e8f9";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(0, 0, 14 + Math.sin(clock * 16) * 2, 0.1, 1.7);
    ctx.stroke();
    ctx.rotate(2.2);
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0.4, 2.5);
    ctx.stroke();
    ctx.restore();
  };

  const drawCharge = (x, y) => {
    const ready = charge >= 2;
    const gather = Math.min(1, charge / 2);
    ctx.save();
    ctx.translate(x, y);
    for (let i = 0; i < 3; i += 1) {
      ctx.save();
      ctx.rotate(clock * (2.8 + i * 0.7) * (i % 2 ? -1 : 1));
      ctx.strokeStyle = i === 1 ? "rgba(10,10,10,0.9)" : `rgba(239, 68, 68, ${0.4 + gather * 0.55})`;
      ctx.lineWidth = 2.2 + i * 0.6;
      const rad = (16 + i * 13) * (1.2 - gather * 0.28);
      ctx.beginPath();
      ctx.arc(0, 0, rad, 0.15, 1.35);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, rad, 2.15, 3.45);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, rad, 4.3, 5.5);
      ctx.stroke();
      ctx.restore();
    }
    ctx.strokeStyle = ready ? "rgba(255,255,255,0.9)" : "rgba(254,202,202,0.75)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i += 1) {
      const a = clock * 4 + i * (Math.PI / 6);
      const inner = ready ? 18 : 7 + (1 - gather) * 4;
      const outer = ready ? 34 : 22 + (1 - gather) * 28;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * outer, Math.sin(a) * outer);
      ctx.lineTo(Math.cos(a) * inner, Math.sin(a) * inner);
      ctx.stroke();
    }
    if (ready) {
      const pulse = 15 + Math.sin(clock * 12) * 2.2;
      const orb = ctx.createRadialGradient(-4, -5, 1, 0, 0, pulse + 8);
      orb.addColorStop(0, "#fff7ed");
      orb.addColorStop(0.22, "#ef4444");
      orb.addColorStop(0.58, "#7f1d1d");
      orb.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = orb;
      ctx.beginPath();
      ctx.arc(0, 0, pulse + 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#050505";
      ctx.beginPath();
      ctx.arc(3.5, 2.5, pulse * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(-2, -3, pulse * 0.28, 0.5, 2.3);
      ctx.stroke();
    }
    ctx.restore();
  };

  const applyWorld = (box) => {
    const dpr = viewDpr || 1;
    const z = Math.max(1, cam.z);
    const jx = cam.shake ? Math.sin(clock * 70) * cam.shake : 0;
    const jy = cam.shake ? Math.cos(clock * 58) * cam.shake * 0.7 : 0;
    if (z <= 1.01 && cam.shake < 0.2) {
      ctx.setTransform(dpr * box.scale, 0, 0, dpr * box.scale, dpr * box.ox, dpr * box.oy);
      return;
    }
    const s = dpr * box.scale * z;
    const fx = cam.x + jx;
    const fy = cam.y + jy;
    ctx.setTransform(s, 0, 0, s, box.vw * 0.5 * dpr - fx * s, box.vh * 0.5 * dpr - fy * s);
  };

  const drawPortal = (p) => {
    const u = clamp(p.life / (p.max || 0.48), 0, 1);
    const open = u > 0.84 ? (1 - u) / 0.16 : clamp(u / 0.84, 0, 1);
    if (open <= 0.02) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = Math.min(1, open * 1.15);
    const hole = ctx.createRadialGradient(0, 0, 2, 0, 0, 28 * open);
    hole.addColorStop(0, "rgba(0,0,0,0.96)");
    hole.addColorStop(0.45, "rgba(88, 10, 60, 0.92)");
    hole.addColorStop(1, "rgba(255,46,166,0)");
    ctx.fillStyle = hole;
    ctx.beginPath();
    ctx.arc(0, 0, 32 * open, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2ee7ff";
    ctx.lineWidth = 2.4;
    ctx.shadowColor = "#2ee7ff";
    ctx.shadowBlur = 16;
    ctx.rotate(clock * (p.out ? 9 : -9));
    ctx.beginPath();
    ctx.arc(0, 0, 16 * open, 0.15, 1.45);
    ctx.arc(0, 0, 16 * open, 2.2, 3.6);
    ctx.arc(0, 0, 16 * open, 4.4, 5.7);
    ctx.stroke();
    ctx.rotate(clock * -7);
    ctx.strokeStyle = "#ff2ea6";
    ctx.shadowColor = "#ff2ea6";
    ctx.beginPath();
    ctx.arc(0, 0, 26 * open, 0.35, 2.1);
    ctx.arc(0, 0, 26 * open, 3.4, 5.15);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.92)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + clock * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 11 * open, Math.sin(a) * 11 * open);
      ctx.lineTo(Math.cos(a) * 23 * open, Math.sin(a) * 23 * open);
      ctx.stroke();
    }
    ctx.restore();
    if (!p.out) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.dir || 0);
    ctx.globalAlpha = Math.min(1, open);
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 5; i += 1) {
      const y = (i - 2) * 4.2;
      ctx.beginPath();
      ctx.moveTo(18, y);
      ctx.lineTo(36 + i * 4, y);
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawSaw = () => {
    const d = shot && shot.drill;
    if (!d || d.launched || view !== "play") return;
    const heat = clamp((d.t - 0.4) / 2, 0, 1);
    const glow = ctx.createRadialGradient(d.cx, d.cy, 2, d.cx, d.cy, 34 + heat * 12);
    glow.addColorStop(0, `rgba(255,247,237,${0.4 + heat * 0.5})`);
    glow.addColorStop(0.45, `rgba(251,146,60,${0.28 + heat * 0.4})`);
    glow.addColorStop(1, "rgba(251,146,60,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(d.cx, d.cy, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(d.cx - d.nx * R, d.cy - d.ny * R);
    ctx.rotate(d.spin);
    ctx.strokeStyle = `rgba(255,237,213,${0.75 + heat * 0.25})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2;
      ctx.moveTo(Math.cos(a) * (R + 1), Math.sin(a) * (R + 1));
      ctx.lineTo(Math.cos(a + 0.22) * (R + 8), Math.sin(a + 0.22) * (R + 8));
    }
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = `rgba(255,255,255,${0.25 + heat * 0.65})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(d.cx, d.cy, 74 - heat * 46, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };

  const draw = (guide) => {
    const box = fit();
    ctx.setTransform(viewDpr || 1, 0, 0, viewDpr || 1, 0, 0);
    const room = ctx.createRadialGradient(box.vw * 0.5, box.vh * 0.4, 40, box.vw * 0.5, box.vh * 0.5, box.vw * 0.7);
    room.addColorStop(0, "#24160f");
    room.addColorStop(1, "#070504");
    ctx.fillStyle = room;
    ctx.fillRect(0, 0, box.vw, box.vh);
    applyWorld(box);
    drawTable();
    drawIce();
    if (shot && shot.gated) {
      shot.gated.forEach((gate) => {
        (gate.trail || []).forEach((bit) => {
          ctx.globalAlpha = Math.max(0, bit.life * 3);
          ctx.fillStyle = "#ff2ea6";
          ctx.beginPath();
          ctx.arc(bit.x, bit.y, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        });
      });
    }
    portals.forEach((portal) => drawPortal(portal));
    balls.forEach((ball) => {
      if (ball.in && !(phase === "place" && ball.id === 0)) drawBall(ball);
    });
    if (view === "play" && phase === "place") {
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.shadowColor = "#fff";
      ctx.shadowBlur = 12;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(HEAD_X, FELT_T + 14);
      ctx.lineTo(HEAD_X, FELT_B - 14);
      ctx.stroke();
      ctx.restore();
      const spot = placePoint(pointer.x, pointer.y);
      drawBall({ id: 0, x: spot.x, y: spot.y, flash: 0, curve: 0 });
      if (!spot.ok) {
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(spot.x, spot.y, R + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    links.forEach((link) => {
      const fade = Math.max(0, Math.min(1, link.life));
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.strokeStyle = "#e0f2fe";
      ctx.lineWidth = 4;
      ctx.shadowColor = "#7dd3fc";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(link.x1, link.y1);
      ctx.lineTo(link.x2, link.y2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(link.x2, link.y2, R + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
    if (guide) {
      const glow = guide.stick === "mischief"
        ? "rgba(255,46,166,0.85)"
        : guide.stick === "ferris"
          ? "rgba(251,191,36,0.9)"
          : guide.stick === "tempest"
            ? "rgba(165,243,252,0.9)"
            : guide.stick === "drill"
              ? "rgba(251,146,60,0.9)"
              : "rgba(125,211,252,0.9)";
      if (guide.clone) strokePath(guide.clone, "rgba(148,163,184,0.95)", 2.5, "rgba(100,116,139,0.8)");
      strokePath(guide.cue, guide.stick === "clone" ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.95)", 2.4, glow);
      strokePath(guide.obj, "rgba(255,255,255,0.8)", 1.8, glow);
      strokePath(guide.wind, "rgba(224,242,254,0.75)", 1.6, "rgba(165,243,252,0.8)");
      if (guide.laser) drawBeam(guide.laser, 0.45);
      if (guide.gates) {
        guide.gates.forEach((mark) => {
          drawPortal({
            x: mark.x,
            y: mark.y,
            life: 0.3 + Math.sin(clock * 9) * 0.06,
            max: 0.48,
            out: true,
            dir: mark.dir,
          });
        });
      }
      if (guide.drill) {
        const mark = guide.drill;
        const mag = Math.hypot(mark.nx, mark.ny) || 1;
        const nx = mark.nx / mag;
        const ny = mark.ny / mag;
        strokePath(
          [{ x: mark.x, y: mark.y }, { x: mark.x + nx * 160, y: mark.y + ny * 160 }],
          "rgba(251,146,60,0.95)",
          2.3,
          "rgba(251,146,60,0.45)",
        );
        strokePath(
          [{ x: mark.x, y: mark.y }, { x: mark.x - nx * 140, y: mark.y - ny * 140 }],
          "rgba(255,255,255,0.92)",
          2.1,
          "rgba(255,255,255,0.35)",
        );
      }
      const end = guide.cue[guide.cue.length - 1];
      if (end) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(end.x, end.y, 5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (beam && beam.life > 0) drawBeam(beam, Math.min(1, beam.life * 1.6));
    if (balls[0] && balls[0].orbit) {
      const spin = balls[0].orbit;
      ctx.save();
      ctx.strokeStyle = "rgba(251,191,36,0.55)";
      ctx.setLineDash([7, 7]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(spin.cx, spin.cy, spin.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (view === "play" && phase === "run" && shot && shot.stick === "tempest" && balls[0] && balls[0].in) {
      const cue = balls[0];
      ctx.save();
      ctx.translate(cue.x, cue.y);
      ctx.rotate(clock * 3.2);
      ctx.strokeStyle = "rgba(224,242,254,0.62)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 72, 0.2, 2.4);
      ctx.arc(0, 0, 112, 3.2, 5.4);
      ctx.stroke();
      ctx.restore();
    }
    if (view === "play" && phase === "run" && shot && shot.gated) {
      shot.gated.forEach((gate) => {
        if (gate.left <= 0) return;
        const ball = balls.find((item) => item.id === gate.id && item.in);
        if (!ball) return;
        ctx.save();
        ctx.translate(ball.x, ball.y);
        ctx.rotate(clock * 7);
        ctx.strokeStyle = "rgba(255,46,166,0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, R + 7, 0.15, 2.1);
        ctx.stroke();
        ctx.strokeStyle = "rgba(46,231,255,0.9)";
        ctx.beginPath();
        ctx.arc(0, 0, R + 12, 3.3, 5.4);
        ctx.stroke();
        ctx.restore();
      });
    }
    if (view === "play" && phase === "aim" && balls[0] && balls[0].in) {
      const cue = balls[0];
      const tipDist = R + 8 + pull;
      const tipX = cue.x - aim.x * tipDist;
      const tipY = cue.y - aim.y * tipDist;
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cue.x - aim.x * R, cue.y - aim.y * R);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      drawCue(tipX, tipY, Math.atan2(-aim.y, -aim.x), sticks[player]);
      if (sticks[player] === "trick" && charging && pull >= MAX_PULL - 8) drawCharge(tipX, tipY);
      if (sticks[player] === "laser" && charging && pull >= MAX_PULL - 8) drawLaserAura(tipX, tipY);
    }
    drawSaw();
    shocks.forEach((bit) => {
      const fade = Math.max(0, bit.life / bit.max);
      const grow = 1 - fade;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.strokeStyle = bit.color;
      ctx.lineWidth = 2.6 * fade + 0.6;
      ctx.beginPath();
      ctx.arc(bit.x, bit.y, 8 + bit.radius * grow, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
    motes.forEach((bit) => {
      const fade = Math.max(0, bit.life * 3);
      ctx.save();
      ctx.globalAlpha = Math.min(1, fade);
      ctx.strokeStyle = bit.color;
      ctx.fillStyle = bit.color;
      ctx.lineCap = "round";
      if (bit.streak) {
        ctx.lineWidth = Math.max(1, bit.r * 0.8);
        ctx.beginPath();
        ctx.moveTo(bit.x, bit.y);
        ctx.lineTo(bit.x - bit.vx * 0.028, bit.y - bit.vy * 0.028);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(bit.x, bit.y, bit.r * 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    if (cam.cinema > 0.01 || cam.flash > 0.01 || cam.z > 1.05) {
      const dpr = viewDpr || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (cam.z > 1.05) {
        const vig = ctx.createRadialGradient(box.vw * 0.5, box.vh * 0.5, box.vh * 0.18, box.vw * 0.5, box.vh * 0.5, box.vh * 0.75);
        vig.addColorStop(0, "rgba(0,0,0,0)");
        vig.addColorStop(1, `rgba(0,0,0,${0.62 * Math.min(1, (cam.z - 1) / 2.2)})`);
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, box.vw, box.vh);
      }
      if (cam.cinema > 0.01) {
        const bar = box.vh * 0.11 * cam.cinema;
        ctx.fillStyle = `rgba(0,0,0,${0.94 * cam.cinema})`;
        ctx.fillRect(0, 0, box.vw, bar);
        ctx.fillRect(0, box.vh - bar, box.vw, bar);
      }
      if (cam.flash > 0.01) {
        ctx.fillStyle = `rgba(255,247,237,${cam.flash * 0.5})`;
        ctx.fillRect(0, 0, box.vw, box.vh);
      }
    }
  };

  const eventPoint = (event) => {
    const rect = canvas.getBoundingClientRect();
    const box = fit();
    return {
      x: (event.clientX - rect.left - box.ox) / box.scale,
      y: (event.clientY - rect.top - box.oy) / box.scale,
    };
  };

  const showMenu = () => {
    view = "menu";
    phase = "aim";
    charging = false;
    winner = null;
    ice.length = 0;
    beam = null;
    portals.length = 0;
    balls = rack();
    isBreak = true;
    cam = { x: MID_X, y: MID_Y, z: 1, tx: MID_X, ty: MID_Y, tz: 1, shake: 0, cinema: 0, bars: 0, flash: 0 };
    stage.innerHTML = `
      <section class="ttt-panel">
        <button class="ttt-back" type="button" data-action="close">Back</button>
        <p class="ttt-kicker">U.G. / pool</p>
        <h2>Pool</h2>
        <p class="ttt-copy">Two players, one table. Move around the white ball to aim. Hold and pull the stick back, then release. The white ball is only placed again if it falls in a pocket, and then only on the head line.</p>
        <div class="mode-list">
          <button class="mode-btn" type="button" data-action="local">Local</button>
        </div>
      </section>`;
  };

  const stickCard = (id, title, copy, art) => `
    <button class="stick-card" type="button" data-stick="${id}">
      <span class="cue-art ${art}"></span>
      <strong>${title}</strong>
      <p>${copy}</p>
    </button>`;

  const showSticks = (who) => {
    view = "sticks";
    picking = who;
    if (who === 0) balls = rack();
    stage.innerHTML = `
      <section class="ttt-panel">
        <button class="ttt-back" type="button" data-action="${who === 0 ? "menu" : "sticks"}">Back</button>
        <p class="ttt-kicker">Player ${who + 1}</p>
        <h2>Choose a stick</h2>
        <div class="stick-row">
          ${stickCard("light", "Light", "Each hit bends toward the nearest ball ahead. If that ball is behind the one you hit, the shot stays straight.", "light")}
          ${stickCard("mischief", "Mischievous", "A cut shot curves to the side you hit. The aim line bends with it.", "mischief")}
          ${stickCard("trick", "Trickshot", "No aim line. Hold a full pull for 2 seconds and the tip becomes a red orb that fires the white ball at triple speed.", "trick")}
          ${stickCard("frost", "Frostbite", "The white ball leaves a thick ice trail for 5 seconds while the balls are moving. Balls on the ice slide. An iced ball, other than the white one, hides its path.", "frost")}
          ${stickCard("tempest", "Tempest", "A wind aura around the white ball pulls nearby balls along until the white ball stops.", "tempest")}
          ${stickCard("ferris", "Ferris wheel", "After the first ball the white one hits, the white ball rolls in a circle. The aim line shows the wheel.", "ferris")}
          ${stickCard("laser", "Laser", "A full pull lights the cue. Release it and one beam cuts straight to the far cushion, shoving every ball it passes.", "laser")}
          ${stickCard("clone", "Clone", "Two aim lines leave at different angles. The grey one is a clone. Each can hit or bounce only once.", "clone")}
          ${stickCard("gate", "Gate", "Balls the white one hits drop through a portal every half second, five times, to a random spot and a new direction. Every ball it hits does it.", "gate")}
          ${stickCard("drill", "Drill", "The first ball the white one hits gets a close-up. The white ball saws into it for 2 seconds, then both launch apart.", "drill")}
        </div>
      </section>`;
  };

  const dotRow = (kind) => [1, 2, 3, 4, 5, 6, 7].map((n) => {
    const color = COLORS[kind === "solid" ? n : n + 8];
    return `<i class="mini ${kind}" style="--c:${color}"></i>`;
  }).join("");

  const showGroups = () => {
    view = "groups";
    groups = ["solid", "stripe"];
    stage.innerHTML = `
      <section class="ttt-panel">
        <button class="ttt-back" type="button" data-action="sticks2">Back</button>
        <p class="ttt-kicker">Player 1</p>
        <h2>Choose your balls</h2>
        <p class="ttt-copy">Drag the slider. It settles on full or lined. Player 2 gets the other set. Pocket yours, then the 8. The 8 early, or a scratch on the 8, loses. If the white ball falls in any other time, the other player puts it on the head line.</p>
        <div class="pool-choices">
          <span>${dotRow("solid")}</span>
          <span>${dotRow("stripe")}</span>
        </div>
        <div class="pool-track" data-slider>
          <span class="pool-track-label left">Full</span>
          <span class="pool-track-label right">Lined</span>
          <span class="pool-knob" data-knob>Full</span>
        </div>
        <p class="mode-note" data-other>Player 2 gets the lined balls.</p>
        <div class="mode-list">
          <button class="mode-btn" type="button" data-action="start">Start</button>
        </div>
      </section>`;
    bindSlider();
  };

  const bindSlider = () => {
    const track = stage.querySelector("[data-slider]");
    const knob = stage.querySelector("[data-knob]");
    if (!track || !knob) return;
    let drag = false;
    const set = (t, snap) => {
      const next = snap ? (t < 0.5 ? 0 : 1) : clamp(t, 0, 1);
      const travel = Math.max(0, track.clientWidth - knob.clientWidth - 14);
      knob.style.transform = `translateX(${travel * next}px)`;
      knob.textContent = next < 0.5 ? "Full" : "Lined";
      knob.classList.toggle("is-lined", next >= 0.5);
      groups[0] = next < 0.5 ? "solid" : "stripe";
      groups[1] = groups[0] === "solid" ? "stripe" : "solid";
      const other = stage.querySelector("[data-other]");
      if (other) other.textContent = `Player 2 gets the ${GROUP_NAME[groups[1]].toLowerCase()} balls.`;
    };
    set(0, true);
    const fromEvent = (event) => {
      const rect = track.getBoundingClientRect();
      return (event.clientX - rect.left) / Math.max(1, rect.width);
    };
    track.addEventListener("pointerdown", (event) => {
      drag = true;
      track.classList.add("is-drag");
      track.setPointerCapture(event.pointerId);
      set(fromEvent(event), false);
    });
    track.addEventListener("pointermove", (event) => {
      if (drag) set(fromEvent(event), false);
    });
    const end = (event) => {
      if (!drag) return;
      drag = false;
      track.classList.remove("is-drag");
      set(fromEvent(event), true);
    };
    track.addEventListener("pointerup", end);
    track.addEventListener("pointercancel", end);
  };

  const beginGame = () => {
    balls = rack();
    player = 0;
    winner = null;
    isBreak = true;
    phase = "aim";
    shot = null;
    charging = false;
    placing = false;
    pull = 0;
    charge = 0;
    ice.length = 0;
    beam = null;
    portals.length = 0;
    cam = { x: MID_X, y: MID_Y, z: 1, tx: MID_X, ty: MID_Y, tz: 1, shake: 0, cinema: 0, bars: 0, flash: 0 };
    const cue = balls[0];
    pointer = { x: cue.x - 180, y: cue.y };
    aim = { x: 1, y: 0, dist: 180 };
    status = `Player 1 breaks with the ${STICK_NAME[sticks[0]]}. Pull back, then release.`;
    view = "play";
    renderHud();
  };

  const close = () => {
    root.hidden = true;
    document.body.style.overflow = "";
    view = "menu";
    window.cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  };

  const open = () => {
    root.hidden = false;
    document.body.style.overflow = "hidden";
    showMenu();
    if (!raf) raf = window.requestAnimationFrame(frame);
  };

  const frame = (now) => {
    raf = window.requestAnimationFrame(frame);
    const dt = Math.min(0.033, last ? (now - last) / 1000 : 0.016);
    last = now;
    clock += dt;
    if (root.hidden) return;
    resize();
    const blend = 1 - Math.exp(-dt * 7);
    cam.z += (cam.tz - cam.z) * blend;
    cam.x += (cam.tx - cam.x) * blend;
    cam.y += (cam.ty - cam.y) * blend;
    cam.cinema += ((cam.bars || 0) - cam.cinema) * blend;
    cam.flash = Math.max(0, cam.flash - dt * 1.7);
    if (!(shot && shot.drill && !shot.drill.launched)) cam.shake *= Math.exp(-dt * 3.4);
    if (view === "play" && phase === "run" && shot) {
      if (shot.drill && !shot.drill.launched) holdDrill(dt);
      else step(balls, dt, liveHooks, shot.stick);
      if (shot.stick === "frost" && balls[0] && balls[0].in) {
        const cue = balls[0];
        if (shot.markX == null) {
          shot.markX = cue.x;
          shot.markY = cue.y;
        }
        const span = Math.hypot(cue.x - shot.markX, cue.y - shot.markY);
        const bits = Math.max(1, Math.ceil(span / 12));
        for (let i = 1; i <= bits; i += 1) {
          const t = i / bits;
          layIce(shot.markX + (cue.x - shot.markX) * t, shot.markY + (cue.y - shot.markY) * t);
        }
        shot.markX = cue.x;
        shot.markY = cue.y;
      }
      for (let i = ice.length - 1; i >= 0; i -= 1) {
        ice[i].life -= dt;
        if (ice[i].life <= 0) ice.splice(i, 1);
      }
      if (shot.stick === "tempest" && balls[0] && balls[0].in && Math.random() < 0.8) {
        const cue = balls[0];
        const spin = Math.random() * Math.PI * 2;
        motes.push({
          x: cue.x + Math.cos(spin) * 100,
          y: cue.y + Math.sin(spin) * 100,
          vx: -Math.cos(spin) * 240,
          vy: -Math.sin(spin) * 240,
          life: 0.35,
          color: "#e0f2fe",
          r: 1.8,
        });
      }
      if (shot && shot.stick === "gate" && shot.gated && !(shot.drill && !shot.drill.launched)) {
        for (let g = shot.gated.length - 1; g >= 0; g -= 1) {
          const gate = shot.gated[g];
          const ball = balls.find((item) => item.id === gate.id && item.in);
          if (!ball) {
            shot.gated.splice(g, 1);
            continue;
          }
          if (!gate.trail) gate.trail = [];
          if (gate.left > 0 || Math.hypot(ball.vx, ball.vy) > STOP) {
            gate.trail.push({ x: ball.x, y: ball.y, life: 0.2 });
          }
          for (let i = gate.trail.length - 1; i >= 0; i -= 1) {
            gate.trail[i].life -= dt;
            if (gate.trail[i].life <= 0) gate.trail.splice(i, 1);
          }
          if (gate.left > 0) {
            gate.t += dt;
            if (gate.t >= 0.5) {
              gate.t -= 0.5;
              gate.left -= 1;
              openGate(ball);
            }
          }
        }
      }
      dropClone();
      const gating = shot && shot.gated && shot.gated.some((gate) => gate.left > 0);
      if (shot && !(shot.drill && !shot.drill.launched) && !gating && settled()) resolve();
    }
    if (beam) {
      beam.life -= dt;
      if (beam.life <= 0) beam = null;
    }
    for (let i = portals.length - 1; i >= 0; i -= 1) {
      portals[i].life -= dt;
      if (portals[i].life <= 0) portals.splice(i, 1);
    }
    for (let i = shocks.length - 1; i >= 0; i -= 1) {
      shocks[i].life -= dt;
      if (shocks[i].life <= 0) shocks.splice(i, 1);
    }
    for (let i = motes.length - 1; i >= 0; i -= 1) {
      const bit = motes[i];
      bit.life -= dt;
      bit.x += bit.vx * dt;
      bit.y += bit.vy * dt;
      if (bit.life <= 0) motes.splice(i, 1);
    }
    for (let i = links.length - 1; i >= 0; i -= 1) {
      links[i].life -= dt;
      if (links[i].life <= 0) links.splice(i, 1);
    }
    balls.forEach((ball) => {
      if (ball.flash > 0) ball.flash = Math.max(0, ball.flash - dt);
      if (view === "play" && phase === "run" && ball.in && Math.abs(ball.curve) > 0.3 && Math.random() < 0.7) {
        spark(ball.x, ball.y, "#f0abfc", 2, 40);
      }
      if (view === "play" && phase === "run" && ball.in) {
        const sp = Math.hypot(ball.vx, ball.vy);
        if (sp > 460 && Math.random() < 0.45) {
          const col = ball.clone ? "#cbd5e1" : ball.id === 0 ? (STICK_FX[shot && shot.stick] || "#ffffff") : "#ffffff";
          motes.push({
            x: ball.x - ball.vx * 0.02,
            y: ball.y - ball.vy * 0.02,
            vx: -ball.vx * 0.05,
            vy: -ball.vy * 0.05,
            life: 0.16,
            color: col,
            r: 1.5,
            streak: true,
          });
        }
        if (ball.orbit && Math.random() < 0.85) spark(ball.x, ball.y, "#fbbf24", 1, 50);
      }
    });
    if (view === "play" && phase === "run" && shot && shot.stick === "frost" && ice.length && Math.random() < 0.7) {
      const bit = ice[Math.floor(Math.random() * ice.length)];
      spark(bit.x, bit.y, "#f8fafc", 1, 30);
    }
    if (beam && beam.life > 0 && Math.random() < 0.9) {
      const t = Math.random();
      spark(beam.x1 + (beam.x2 - beam.x1) * t, beam.y1 + (beam.y2 - beam.y1) * t, "#e0f2fe", 2, 80);
    }
    trimMotes();
    let guide = null;
    const fullPull = charging && pull >= MAX_PULL - 8;
    if (view === "play" && phase === "aim" && sticks[player] === "trick" && fullPull) charge = Math.min(2.6, charge + dt);
    else if (!fullPull) charge = 0;
    if (view === "play" && phase === "aim" && balls[0] && balls[0].in) {
      guide = preview();
      const tipX = balls[0].x - aim.x * (R + 8 + pull);
      const tipY = balls[0].y - aim.y * (R + 8 + pull);
      if (sticks[player] === "light" && Math.random() < 0.8) burst(tipX, tipY, "#bae6fd", 1, 36);
      if (sticks[player] === "mischief" && Math.random() < 0.65) burst(tipX, tipY, "#e879f9", 1, 28);
      if (sticks[player] === "clone" && Math.random() < 0.7) burst(tipX, tipY, "#cbd5e1", 1, 28);
      if (sticks[player] === "gate" && Math.random() < 0.75) burst(tipX, tipY, Math.random() < 0.5 ? "#ff2ea6" : "#2ee7ff", 1, 32);
      if (sticks[player] === "drill" && Math.random() < 0.75) burst(tipX, tipY, "#fb923c", 1, 30);
      if (sticks[player] === "frost" && Math.random() < 0.7) burst(tipX, tipY, "#e0f2fe", 1, 24);
      if (sticks[player] === "tempest" && Math.random() < 0.7) burst(tipX, tipY, "#a5f3fc", 1, 30);
      if (sticks[player] === "ferris" && Math.random() < 0.7) burst(tipX, tipY, "#fbbf24", 1, 26);
      if (sticks[player] === "laser" && Math.random() < 0.55) burst(tipX, tipY, "#22d3ee", 1, 34);
      if (sticks[player] === "trick" && fullPull) {
        const spin = Math.random() * Math.PI * 2;
        const reach = 18 + (1 - Math.min(1, charge / 2)) * 46;
        motes.push({
          x: tipX + Math.cos(spin) * reach,
          y: tipY + Math.sin(spin) * reach,
          vx: Math.cos(spin) * -140,
          vy: Math.sin(spin) * -140,
          life: 0.32,
          color: Math.random() < 0.55 ? "#ef4444" : "#fecaca",
          r: 1.6 + Math.random() * 2.4,
        });
        if (motes.length > 240) motes.splice(0, motes.length - 240);
      }
    }
    draw(guide);
    const meter = stage.querySelector("[data-power]");
    if (meter) {
      const chargingTrick = view === "play" && sticks[player] === "trick" && charging && pull >= MAX_PULL - 8;
      meter.style.width = `${chargingTrick ? Math.min(100, (charge / 2) * 100) : view === "play" && charging ? (pull / MAX_PULL) * 100 : 0}%`;
      meter.style.background = chargingTrick ? "linear-gradient(90deg, #111, #ef4444)" : "linear-gradient(90deg, #fff, #2ee7ff)";
    }
  };

  canvas.addEventListener("pointerdown", (event) => {
    if (root.hidden || view !== "play" || phase === "over" || phase === "run") return;
    unlock();
    canvas.setPointerCapture(event.pointerId);
    pointer = eventPoint(event);
    if (phase === "place") {
      placing = true;
      return;
    }
    updateAim(pointer);
    charging = true;
    pull = clamp(aim.dist - 78, 0, MAX_PULL);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (root.hidden || view !== "play") return;
    pointer = eventPoint(event);
    if (phase === "aim") updateAim(pointer);
  });

  const release = (event) => {
    if (root.hidden || view !== "play") return;
    pointer = eventPoint(event);
    if (phase === "place" && placing) {
      placing = false;
      const spot = placePoint(pointer.x, pointer.y);
      if (!spot.ok) return;
      balls[0].x = spot.x;
      balls[0].y = spot.y;
      balls[0].in = true;
      balls[0].vx = 0;
      balls[0].vy = 0;
      phase = "aim";
      status = `Player ${player + 1} · ${GROUP_NAME[groups[player]]}. Pull back and release.`;
      syncHud();
      return;
    }
    if (!charging) return;
    updateAim(pointer);
    charging = false;
    if (pull >= 16) shoot();
    else pull = 0;
  };

  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", () => {
    charging = false;
    placing = false;
    pull = 0;
    charge = 0;
  });

  stage.addEventListener("click", (event) => {
    const stick = event.target.closest("[data-stick]");
    if (stick && view === "sticks") {
      sticks[picking] = stick.dataset.stick;
      if (picking === 0) showSticks(1);
      else showGroups();
      return;
    }
    const action = event.target.closest("[data-action]");
    if (!action) return;
    const name = action.dataset.action;
    if (name === "close") close();
    if (name === "menu") showMenu();
    if (name === "local" || name === "sticks") showSticks(0);
    if (name === "sticks2") showSticks(1);
    if (name === "start" || name === "rematch") beginGame();
  });

  openButton.addEventListener("click", () => {
    unlock();
    open();
  });

  balls = rack();
})();
