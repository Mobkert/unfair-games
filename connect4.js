const C4 = (() => {
  const COLS = 7;
  const ROWS = 6;
  const root = document.querySelector("#c4");
  const stage = document.querySelector("#c4-root");
  const sky = document.querySelector("#c4-sky");
  const openButton = document.querySelector("#open-c4");

  const EVENTS = ["spin", "shuffle", "hole"];
  const EVENT_LABEL = {
    spin: "The board spins.",
    shuffle: "The board shakes the discs loose.",
    hole: "A black hole opens.",
  };

  let state = null;
  let audioCtx = null;
  let bus = null;
  let winTimer = 0;
  let lineTimer = 0;
  let sparkTimer = 0;
  let discId = 1;
  let skyReady = false;
  let hoverCol = -1;

  const audio = () => {
    if (!audioCtx) audioCtx = new window.AudioContext();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  };

  const out = () => {
    if (bus) return bus;
    const ac = audio();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-16, ac.currentTime);
    comp.knee.setValueAtTime(16, ac.currentTime);
    comp.ratio.setValueAtTime(5, ac.currentTime);
    comp.attack.setValueAtTime(0.004, ac.currentTime);
    comp.release.setValueAtTime(0.16, ac.currentTime);
    const makeup = ac.createGain();
    makeup.gain.value = 0.9;
    comp.connect(makeup);
    makeup.connect(ac.destination);
    bus = comp;
    return bus;
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
      gain.connect(out());
      osc.start(when);
      osc.stop(when + dur + 0.02);
    } catch (error) {
      return error;
    }
    return null;
  };

  const noise = (dur, peak, delay = 0, from = 1800, to = 240, kind = "bandpass") => {
    try {
      const ac = audio();
      const when = ac.currentTime + delay;
      const length = Math.max(1, Math.floor(ac.sampleRate * dur));
      const buffer = ac.createBuffer(1, length, ac.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      const source = ac.createBufferSource();
      source.buffer = buffer;
      const filter = ac.createBiquadFilter();
      filter.type = kind;
      filter.frequency.setValueAtTime(from, when);
      filter.frequency.exponentialRampToValueAtTime(Math.max(to, 30), when + dur);
      const gain = env(when, peak, dur);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(out());
      source.start(when);
    } catch (error) {
      return error;
    }
    return null;
  };

  const motionOk = () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const ownerColor = (owner) => (owner === 1 ? "#ff2ea6" : "#2ee7ff");

  const fxLayer = () => {
    let layer = stage.querySelector(".c4-fx");
    if (!layer) {
      layer = document.createElement("div");
      layer.className = "c4-fx";
      stage.appendChild(layer);
    }
    return layer;
  };

  const dropBit = (node, anim) => {
    anim.finished.then(() => node.remove()).catch(() => node.remove());
  };

  const spark = (x, y, color, count = 12) => {
    if (!motionOk()) return;
    const layer = fxLayer();
    for (let i = 0; i < count; i += 1) {
      const bit = document.createElement("i");
      bit.className = "c4-spark";
      bit.style.left = `${x}px`;
      bit.style.top = `${y}px`;
      bit.style.background = color;
      bit.style.color = color;
      layer.appendChild(bit);
      const ang = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const dist = 26 + Math.random() * 78;
      dropBit(bit, bit.animate([
        { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist}px)) scale(0.15)`, opacity: 0 },
      ], { duration: 380 + Math.random() * 320, easing: "cubic-bezier(.12,.7,.2,1)", fill: "forwards" }));
    }
  };

  const ring = (x, y, color) => {
    if (!motionOk()) return;
    const el = document.createElement("i");
    el.className = "c4-ring";
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.color = color;
    fxLayer().appendChild(el);
    dropBit(el, el.animate([
      { transform: "translate(-50%, -50%) scale(0.15)", opacity: 0.95 },
      { transform: "translate(-50%, -50%) scale(2.6)", opacity: 0 },
    ], { duration: 520, easing: "ease-out", fill: "forwards" }));
  };

  const flash = (color) => {
    if (!motionOk()) return;
    const el = document.createElement("i");
    el.className = "c4-flash";
    el.style.color = color;
    fxLayer().appendChild(el);
    dropBit(el, el.animate([
      { opacity: 0.42 },
      { opacity: 0 },
    ], { duration: 320, easing: "ease-out", fill: "forwards" }));
  };

  const hitTable = () => {
    const table = stage.querySelector(".c4-table");
    if (!table || !motionOk()) return;
    table.classList.remove("is-hit");
    window.requestAnimationFrame(() => table.classList.add("is-hit"));
  };

  const suckMotes = () => {
    if (!motionOk()) return;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * 0.46;
    for (let i = 0; i < 26; i += 1) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 160 + Math.random() * 460;
      const x = cx + Math.cos(ang) * dist;
      const y = cy + Math.sin(ang) * dist * 0.72;
      const bit = document.createElement("i");
      bit.className = "c4-spark c4-mote";
      bit.style.left = `${x}px`;
      bit.style.top = `${y}px`;
      fxLayer().appendChild(bit);
      dropBit(bit, bit.animate([
        { transform: "translate(-50%, -50%) scale(1)", opacity: 0 },
        { transform: "translate(-50%, -50%) scale(1)", opacity: 0.9, offset: 0.12 },
        { transform: `translate(calc(-50% + ${cx - x}px), calc(-50% + ${cy - y}px)) scale(0.05)`, opacity: 0 },
      ], { duration: 680 + Math.random() * 340, easing: "ease-in", fill: "forwards" }));
    }
  };

  const sfx = {
    open() {
      [392, 523, 784].forEach((freq, index) => tone(freq, 0.22, "sine", 0.04, index * 0.08));
    },
    hover() {
      tone(1480, 0.03, "sine", 0.016);
    },
    fall() {
      noise(0.36, 0.05, 0, 1700, 280);
      tone(680, 0.3, "sine", 0.03, 0, 170);
    },
    land(owner) {
      noise(0.1, 0.16, 0, 220, 48, "lowpass");
      noise(0.05, 0.05, 0, 2600, 700);
      tone(owner ? 146 : 168, 0.12, "triangle", 0.09, 0, 64);
      tone(owner ? 640 : 920, 0.08, "sine", 0.045, 0.012);
    },
    spin() {
      noise(0.74, 0.055, 0, 260, 2400);
      tone(150, 0.72, "sine", 0.045, 0, 760);
      tone(230, 0.72, "triangle", 0.02, 0.04, 980);
    },
    lock() {
      noise(0.09, 0.11, 0, 980, 180);
      tone(520, 0.12, "square", 0.028);
      tone(780, 0.14, "sine", 0.045, 0.02);
    },
    shuffle() {
      noise(0.64, 0.07, 0, 160, 1500);
      [0, 0.12, 0.24, 0.36, 0.5].forEach((at, index) => {
        noise(0.05, 0.11, at, 460, 80, "lowpass");
        tone(86 + index * 18, 0.05, "square", 0.03, at);
      });
    },
    glide() {
      noise(0.3, 0.04, 0, 800, 1600);
      tone(520, 0.24, "sine", 0.025, 0, 240);
    },
    hole() {
      tone(64, 1.35, "sine", 0.07, 0, 26);
      noise(1.2, 0.06, 0, 480, 36, "lowpass");
      tone(42, 0.9, "triangle", 0.045, 0.12, 22);
    },
    swallow() {
      noise(0.22, 0.14, 0, 240, 36, "lowpass");
      tone(96, 0.28, "sine", 0.08, 0, 28);
    },
    release() {
      noise(0.32, 0.05, 0, 980, 180);
      [0, 0.07, 0.15].forEach((at) => {
        noise(0.07, 0.09, at, 240, 55, "lowpass");
        tone(160, 0.08, "triangle", 0.04, at, 74);
      });
    },
    win() {
      [523, 659, 784].forEach((freq, index) => tone(freq, 0.18, "triangle", 0.05, index * 0.08));
      tone(196, 1.9, "sine", 0.042, 0.9, 988);
      [1174, 1568, 2093].forEach((freq, index) => tone(freq, 0.24, "sine", 0.028, 1.05 + index * 0.26));
    },
    stamp() {
      noise(0.18, 0.2, 0, 380, 55, "lowpass");
      noise(0.05, 0.1, 0, 2000, 360);
      tone(92, 0.26, "sine", 0.16, 0, 34);
      tone(184, 0.12, "triangle", 0.05, 0.015);
      document.body.classList.remove("is-stamped");
      window.requestAnimationFrame(() => document.body.classList.add("is-stamped"));
      flash(state && state.winner === 1 ? "#ff2ea6" : "#7dffb2");
    },
    draw() {
      tone(330, 0.42, "sine", 0.05, 0, 180);
      tone(220, 0.5, "triangle", 0.04, 0.1, 140);
    },
  };

  const emptyBoard = () => Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => ({
    piece: null,
    hanging: false,
    id: 0,
  })));

  const cell = (row, col) => state.board[row][col];

  const landingRow = (col) => {
    for (let row = ROWS - 1; row >= 0; row -= 1) {
      if (cell(row, col).piece === null) return row;
    }
    return -1;
  };

  const anyHanging = () => state.board.some((row) => row.some((slot) => slot.hanging));

  const pieceList = () => {
    const list = [];
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const slot = cell(row, col);
        if (slot.piece !== null) list.push({ row, col, piece: slot.piece, id: slot.id, hanging: slot.hanging });
      }
    }
    return list;
  };

  const findWin = () => {
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const owner = cell(row, col).piece;
        if (owner === null) continue;
        for (const [dr, dc] of dirs) {
          const line = [[row, col]];
          for (let step = 1; step < 4; step += 1) {
            const r = row + dr * step;
            const c = col + dc * step;
            if (r < 0 || c < 0 || r >= ROWS || c >= COLS || cell(r, c).piece !== owner) break;
            line.push([r, c]);
          }
          if (line.length === 4) return { owner, line };
        }
      }
    }
    return null;
  };

  const boardFull = () => state.board.every((row) => row.every((slot) => slot.piece !== null));

  const paintStars = () => {
    if (skyReady) return;
    skyReady = true;
    for (let i = 0; i < 160; i += 1) {
      const star = document.createElement("i");
      star.className = "c4-star";
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 62}%`;
      const size = Math.random() < 0.1 ? 3 : Math.random() < 0.35 ? 2 : 1;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.setProperty("--tw", `${Math.random() * 3.2}s`);
      star.style.setProperty("--dur", `${2.1 + Math.random() * 2.6}s`);
      sky.appendChild(star);
    }
  };

  const open = () => {
    paintStars();
    root.hidden = false;
    document.body.style.overflow = "hidden";
    showMenu();
  };

  const close = () => {
    root.hidden = true;
    root.classList.remove("is-won", "is-hole");
    document.body.style.overflow = "";
    window.clearTimeout(winTimer);
    window.clearTimeout(lineTimer);
    window.clearInterval(sparkTimer);
    document.querySelector("#c4-void")?.classList.remove("is-open");
    state = null;
    stage.innerHTML = "";
  };

  const showMenu = () => {
    window.clearTimeout(winTimer);
    window.clearTimeout(lineTimer);
    window.clearInterval(sparkTimer);
    root.classList.remove("is-won", "is-hole");
    state = { view: "menu" };
    stage.innerHTML = `
      <section class="c4-panel">
        <button class="ttt-back" type="button" data-action="close">Back</button>
        <p class="ttt-kicker">U.G. / moon</p>
        <h2>Connect Four</h2>
        <p class="ttt-copy">Both players drop a disc. Then the moon cheats. Local play, two people, one screen.</p>
        <div class="mode-list">
          <button class="mode-btn" type="button" data-action="local">Local Play</button>
          <button class="mode-btn alt" type="button" data-action="online">Multiplayer</button>
        </div>
        <p class="mode-note" data-note hidden></p>
      </section>`;
  };

  const startMatch = () => {
    window.clearTimeout(winTimer);
    window.clearTimeout(lineTimer);
    window.clearInterval(sparkTimer);
    root.classList.remove("is-won", "is-hole");
    hoverCol = -1;
    discId = 1;
    state = {
      view: "play",
      match: (state && state.match) || 0,
      board: emptyBoard(),
      turn: 0,
      winner: null,
      winLine: null,
      announced: false,
      draw: false,
      busy: false,
      lastEvent: null,
      note: "Player 1, drop a disc.",
    };
    state.match += 1;
    stage.innerHTML = `
      <section class="c4-play">
        <button class="ttt-back" type="button" data-action="menu">Back</button>
        <div class="c4-hud">
          <div class="who is-active" data-owner="0"><b>Player 1</b><p>Cyan</p></div>
          <div class="who" data-owner="1"><b>Player 2</b><p>Magenta</p></div>
        </div>
        <div class="c4-table">
          <div class="c4-shadow"></div>
          <div class="c4-leg c4-leg-l"></div>
          <div class="c4-leg c4-leg-r"></div>
          <div class="c4-bezel">
            <div class="c4-grid"></div>
          </div>
          <div class="c4-foot c4-foot-l"></div>
          <div class="c4-foot c4-foot-r"></div>
        </div>
        <p class="status" data-status></p>
        <div class="c4-bar" data-bar hidden></div>
      </section>`;
    render();
    sfx.open();
  };

  const gridEl = () => stage.querySelector(".c4-grid");

  const setNote = (text) => {
    state.note = text;
    const status = stage.querySelector("[data-status]");
    if (status) status.textContent = text;
  };

  const renderHud = () => {
    stage.querySelectorAll(".c4-hud .who").forEach((node) => {
      const mine = Number(node.dataset.owner) === state.turn && state.winner === null && !state.draw;
      node.classList.toggle("is-active", mine);
    });
    const status = stage.querySelector("[data-status]");
    if (status) status.textContent = state.winner !== null ? "" : state.note;
    const bar = stage.querySelector("[data-bar]");
    if (!bar) return;
    const show = state.draw || (state.winner !== null && state.announced);
    bar.hidden = !show;
    bar.innerHTML = show
      ? `${state.draw ? '<p class="status">Draw</p>' : ""}<button class="mode-btn" type="button" data-action="rematch">Rematch</button><button class="mode-btn alt" type="button" data-action="menu">Menu</button>`
      : "";
  };

  const renderDiscs = () => {
    const grid = gridEl();
    if (!grid) return;
    grid.querySelectorAll(".c4-disc, .c4-line").forEach((node) => node.remove());
    pieceList().forEach((item) => {
      const won = state.winLine && state.winLine.some(([row, col]) => row === item.row && col === item.col);
      const disc = document.createElement("span");
      disc.className = `c4-disc${item.hanging ? " is-hung" : ""}${won ? " is-win" : ""}`;
      disc.dataset.owner = String(item.piece);
      disc.dataset.id = String(item.id);
      disc.style.setProperty("--c", String(item.col));
      disc.style.setProperty("--r", String(item.row));
      grid.appendChild(disc);
    });
  };

  const renderHoles = () => {
    const grid = gridEl();
    if (!grid || grid.querySelector(".c4-hole")) return;
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const hole = document.createElement("button");
        hole.type = "button";
        hole.className = "c4-hole";
        hole.dataset.col = String(col);
        hole.dataset.row = String(row);
        grid.appendChild(hole);
      }
    }
  };

  const render = () => {
    renderHoles();
    renderDiscs();
    const grid = gridEl();
    if (grid) grid.dataset.turn = String(state.turn);
    const locked = state.busy || state.winner !== null || state.draw;
    stage.querySelectorAll(".c4-hole").forEach((hole) => {
      hole.disabled = locked;
    });
    renderHud();
    if (state.winLine) paintWinLine(state.announced);
    let stamps = stage.querySelector(".stamp-layer");
    if (state.winner !== null && state.announced) {
      if (!stamps) {
        stamps = document.createElement("div");
        stamps.className = "stamp-layer two";
        stamps.innerHTML = '<p class="stamp stamp-luck">LUCK</p><p class="stamp stamp-rigged">RIGGED</p>';
        stage.appendChild(stamps);
      }
    } else if (stamps) stamps.remove();
  };

  const paintWinLine = (instant) => {
    const grid = gridEl();
    if (!grid || !state.winLine) return;
    grid.querySelectorAll(".c4-line").forEach((node) => node.remove());
    const ends = [state.winLine[0], state.winLine[3]];
    const rect = grid.getBoundingClientRect();
    const centers = ends.map(([row, col]) => {
      const hole = grid.querySelector(`[data-row="${row}"][data-col="${col}"]`);
      const box = hole.getBoundingClientRect();
      return {
        x: box.left + box.width / 2 - rect.left,
        y: box.top + box.height / 2 - rect.top,
      };
    });
    const dx = centers[1].x - centers[0].x;
    const dy = centers[1].y - centers[0].y;
    const len = Math.hypot(dx, dy) || 1;
    const pad = 28;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", `c4-line${instant ? " is-drawn" : ""}`);
    svg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
    svg.dataset.owner = String(state.winner);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", centers[0].x - (dx / len) * pad);
    line.setAttribute("y1", centers[0].y - (dy / len) * pad);
    line.setAttribute("x2", centers[1].x + (dx / len) * pad);
    line.setAttribute("y2", centers[1].y + (dy / len) * pad);
    line.setAttribute("pathLength", "1");
    svg.appendChild(line);
    grid.appendChild(svg);
  };

  const focusWin = () => {
    const grid = gridEl();
    const table = stage.querySelector(".c4-table");
    if (!grid || !table || !state.winLine) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const boxes = state.winLine.map(([row, col]) => grid.querySelector(`[data-row="${row}"][data-col="${col}"]`).getBoundingClientRect());
    const cx = boxes.reduce((sum, box) => sum + box.left + box.width / 2, 0) / boxes.length;
    const cy = boxes.reduce((sum, box) => sum + box.top + box.height / 2, 0) / boxes.length;
    const span = Math.max(
      Math.max(...boxes.map((box) => box.right)) - Math.min(...boxes.map((box) => box.left)),
      Math.max(...boxes.map((box) => box.bottom)) - Math.min(...boxes.map((box) => box.top)),
      90,
    );
    const scale = Math.min(2.4, Math.max(1.85, (Math.min(window.innerWidth, window.innerHeight) * 0.62) / span));
    const tableBox = table.getBoundingClientRect();
    table.style.transformOrigin = `${cx - tableBox.left}px ${cy - tableBox.top}px`;
    table.style.transition = "transform 0.95s cubic-bezier(0.16, 0.84, 0.2, 1)";
    const dx = window.innerWidth / 2 - cx;
    const dy = window.innerHeight / 2 - cy - window.innerHeight * 0.05;
    window.requestAnimationFrame(() => {
      if (!table.isConnected) return;
      table.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    });
  };

  const celebrate = () => {
    const match = state.match;
    const color = ownerColor(state.winner);
    window.clearTimeout(lineTimer);
    window.clearInterval(sparkTimer);
    lineTimer = window.setTimeout(() => {
      if (!state || state.match !== match) return;
      let step = 0;
      sparkTimer = window.setInterval(() => {
        if (!state || state.match !== match || !state.winLine) {
          window.clearInterval(sparkTimer);
          return;
        }
        const grid = gridEl();
        const [start, end] = [state.winLine[0], state.winLine[3]];
        const holeA = grid.querySelector(`[data-row="${start[0]}"][data-col="${start[1]}"]`);
        const holeB = grid.querySelector(`[data-row="${end[0]}"][data-col="${end[1]}"]`);
        if (!holeA || !holeB) return;
        const boxA = holeA.getBoundingClientRect();
        const boxB = holeB.getBoundingClientRect();
        const t = step / 14;
        spark(
          boxA.left + boxA.width / 2 + (boxB.left - boxA.left) * t,
          boxA.top + boxA.height / 2 + (boxB.top - boxA.top) * t,
          color,
          5,
        );
        step += 1;
        if (step > 14) window.clearInterval(sparkTimer);
      }, 110);
      gridEl().querySelectorAll(".c4-disc.is-win").forEach((disc, index) => {
        if (!motionOk()) return;
        disc.animate([
          { transform: "scale(1)", filter: "brightness(1)" },
          { transform: "scale(1.16)", filter: "brightness(1.5)", offset: 0.42 },
          { transform: "scale(1)", filter: "brightness(1)" },
        ], { duration: 420, delay: index * 90, easing: "ease-out" });
      });
    }, 980);
  };

  const claimWin = () => {
    const found = findWin();
    if (!found) return false;
    state.winner = found.owner;
    state.winLine = found.line;
    state.busy = true;
    state.note = "";
    root.classList.add("is-won");
    root.classList.remove("is-hole");
    render();
    focusWin();
    sfx.win();
    celebrate();
    const match = state.match;
    window.clearTimeout(winTimer);
    winTimer = window.setTimeout(() => {
      if (!state || state.match !== match) return;
      state.announced = true;
      state.busy = false;
      render();
      sfx.stamp();
    }, 3200);
    return true;
  };

  const finishTurn = () => {
    if (claimWin()) return;
    if (boardFull()) {
      state.draw = true;
      state.busy = false;
      state.note = "No empty slot remains. Draw.";
      render();
      sfx.draw();
      flash("#d5deea");
      return;
    }
    state.turn = 1 - state.turn;
    state.busy = false;
    state.note = `Player ${state.turn + 1}, drop a disc.`;
    render();
  };

  const snapshotRects = () => {
    const map = new Map();
    gridEl().querySelectorAll(".c4-disc").forEach((disc) => {
      map.set(disc.dataset.id, disc.getBoundingClientRect());
    });
    return map;
  };

  const glide = (before, ms) => {
    gridEl().querySelectorAll(".c4-disc").forEach((disc) => {
      const prev = before.get(disc.dataset.id);
      if (!prev) return;
      const now = disc.getBoundingClientRect();
      const dx = prev.left - now.left;
      const dy = prev.top - now.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      disc.animate([
        { transform: `translate(${dx}px, ${dy}px)` },
        { transform: "translate(0, 0)" },
      ], { duration: ms, easing: "cubic-bezier(.2,.8,.2,1)" });
    });
  };

  const releaseHanging = (done) => {
    const before = snapshotRects();
    const next = emptyBoard();
    for (let col = 0; col < COLS; col += 1) {
      const floor = [];
      const hung = [];
      for (let row = ROWS - 1; row >= 0; row -= 1) {
        const slot = cell(row, col);
        if (slot.piece === null) continue;
        const item = { piece: slot.piece, id: slot.id };
        if (slot.hanging) hung.push(item);
        else floor.push(item);
      }
      const stack = floor.concat(hung);
      stack.forEach((item, index) => {
        next[ROWS - 1 - index][col] = { piece: item.piece, hanging: false, id: item.id };
      });
    }
    state.board = next;
    renderDiscs();
    glide(before, 520);
    sfx.release();
    const match = state.match;
    window.setTimeout(() => {
      if (!state || state.match !== match) return;
      if (claimWin()) return;
      done();
    }, 540);
  };

  const spunBoard = () => {
    const next = emptyBoard();
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const slot = cell(row, col);
        if (slot.piece === null) continue;
        next[ROWS - 1 - row][COLS - 1 - col] = { piece: slot.piece, hanging: true, id: slot.id };
      }
    }
    return next;
  };

  const doSpin = () => {
    const grid = gridEl();
    const match = state.match;
    setNote(EVENT_LABEL.spin);
    sfx.spin();
    grid.classList.add("is-spinning");
    window.setTimeout(() => {
      if (!state || state.match !== match) return;
      sfx.lock();
      const rect = grid.getBoundingClientRect();
      ring(rect.left + rect.width / 2, rect.top + rect.height / 2, "#d7f6ff");
    }, 640);
    window.setTimeout(() => {
      if (!state || state.match !== match) return;
      grid.style.transition = "none";
      grid.classList.remove("is-spinning");
      state.board = spunBoard();
      render();
      window.requestAnimationFrame(() => {
        grid.style.transition = "";
      });
      window.setTimeout(() => {
        if (!state || state.match !== match) return;
        finishTurn();
      }, 80);
    }, 720);
  };

  const shuffleList = (list) => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const swap = copy[i];
      copy[i] = copy[j];
      copy[j] = swap;
    }
    return copy;
  };

  const shuffledBoard = () => {
    const pieces = shuffleList(pieceList());
    const next = emptyBoard();
    pieces.forEach((item) => {
      const open = [];
      for (let col = 0; col < COLS; col += 1) {
        const count = next.reduce((sum, row) => sum + (row[col].piece !== null ? 1 : 0), 0);
        if (count < ROWS) open.push(col);
      }
      const col = open[Math.floor(Math.random() * open.length)];
      for (let row = ROWS - 1; row >= 0; row -= 1) {
        if (next[row][col].piece === null) {
          next[row][col] = { piece: item.piece, hanging: false, id: item.id };
          break;
        }
      }
    });
    return next;
  };

  const doShuffle = () => {
    const table = stage.querySelector(".c4-table");
    const match = state.match;
    setNote(EVENT_LABEL.shuffle);
    sfx.shuffle();
    table.classList.remove("is-hit");
    table.classList.add("is-shaking");
    stage.querySelectorAll(".c4-foot").forEach((foot) => {
      const box = foot.getBoundingClientRect();
      spark(box.left + box.width / 2, box.top + 4, "rgba(236, 230, 220, 0.9)", 12);
    });
    gridEl().querySelectorAll(".c4-disc").forEach((disc) => {
      if (!motionOk()) return;
      const x = (Math.random() - 0.5) * 12;
      disc.animate([
        { transform: "translate(0, 0)" },
        { transform: `translate(${x}px, -3px)` },
        { transform: `translate(${-x}px, 2px)` },
        { transform: "translate(0, 0)" },
      ], { duration: 80, iterations: 3 });
    });
    window.setTimeout(() => {
      if (!state || state.match !== match) return;
      const before = snapshotRects();
      state.board = shuffledBoard();
      renderDiscs();
      glide(before, 420);
      sfx.glide();
      window.setTimeout(() => {
        if (!state || state.match !== match) return;
        table.classList.remove("is-shaking");
        finishTurn();
      }, 460);
    }, 220);
  };

  const doHole = () => {
    const living = pieceList();
    const count = Math.min(living.length, 2 + Math.floor(Math.random() * 3));
    const victims = shuffleList(living).slice(0, count);
    const victimIds = new Set(victims.map((item) => item.id));
    const grid = gridEl();
    const vortex = document.querySelector("#c4-void");
    const match = state.match;
    setNote(EVENT_LABEL.hole);
    sfx.hole();
    suckMotes();
    root.classList.add("is-hole");
    vortex.classList.remove("is-open");
    window.requestAnimationFrame(() => {
      vortex.offsetWidth;
      vortex.classList.add("is-open");
    });
    const vx = window.innerWidth / 2;
    const vy = window.innerHeight / 2;
    victims.forEach((item) => {
      const disc = grid.querySelector(`[data-id="${item.id}"]`);
      if (!disc) return;
      const box = disc.getBoundingClientRect();
      const dx = vx - (box.left + box.width / 2);
      const dy = vy - (box.top + box.height / 2);
      disc.animate([
        { transform: "translate(0, 0) scale(1) rotate(0deg)", opacity: 1 },
        { transform: `translate(${dx * 0.28}px, ${dy * 0.28}px) scale(1.2, 0.7) rotate(50deg)`, opacity: 1, offset: 0.38 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.04) rotate(240deg)`, opacity: 0 },
      ], { duration: 820, easing: "cubic-bezier(.45,0,.95,1)", fill: "forwards" });
    });
    window.setTimeout(() => {
      if (!state || state.match !== match) return;
      const before = snapshotRects();
      const next = emptyBoard();
      for (let col = 0; col < COLS; col += 1) {
        const stack = [];
        for (let row = ROWS - 1; row >= 0; row -= 1) {
          const slot = cell(row, col);
          if (slot.piece !== null && !victimIds.has(slot.id)) stack.push(slot);
        }
        stack.forEach((slot, index) => {
          next[ROWS - 1 - index][col] = { piece: slot.piece, hanging: false, id: slot.id };
        });
      }
      state.board = next;
      renderDiscs();
      glide(before, 420);
      sfx.glide();
      window.setTimeout(() => {
        if (!state || state.match !== match) return;
        finishTurn();
      }, 520);
    }, 900);
    window.setTimeout(() => {
      if (!state || state.match !== match) return;
      sfx.swallow();
      ring(vx, window.innerHeight * 0.46, "#c084fc");
      flash("#5b1d86");
    }, 760);
    window.setTimeout(() => {
      vortex.classList.remove("is-open");
      root.classList.remove("is-hole");
    }, 4600);
  };

  const pickEvent = () => {
    const choices = EVENTS.filter((name) => name !== state.lastEvent);
    return choices[Math.floor(Math.random() * choices.length)];
  };

  const runEvent = (name) => {
    state.lastEvent = name;
    state.busy = true;
    renderHud();
    if (name === "spin") doSpin();
    else if (name === "shuffle") doShuffle();
    else doHole();
  };

  const beginEvent = () => {
    const name = pickEvent();
    if (anyHanging()) {
      setNote("The hanging discs let go.");
      releaseHanging(() => runEvent(name));
      return;
    }
    runEvent(name);
  };

  const place = (col) => {
    if (!state || state.view !== "play" || state.busy || state.winner !== null || state.draw) return;
    const row = landingRow(col);
    if (row < 0) return;
    state.busy = true;
    renderHud();
    stage.querySelectorAll(".c4-hole").forEach((hole) => { hole.disabled = true; });
    const owner = state.turn;
    const id = discId;
    discId += 1;
    const grid = gridEl();
    const disc = document.createElement("span");
    disc.className = "c4-disc is-dropping";
    disc.dataset.owner = String(owner);
    disc.dataset.id = String(id);
    disc.style.setProperty("--c", String(col));
    disc.style.setProperty("--r", String(row));
    grid.appendChild(disc);
    const hole = grid.querySelector(".c4-hole");
    const slot = hole ? hole.getBoundingClientRect().height : 58;
    const distance = (row + 1) * (slot + 8) + 64;
    disc.animate([
      { transform: `translateY(${-distance}px) scale(0.92, 1.08)`, filter: "brightness(1.55)" },
      { transform: "translateY(0px) scale(1.18, 0.68)", filter: "brightness(1.1)", offset: 0.68 },
      { transform: "translateY(-10px) scale(0.94, 1.1)", filter: "brightness(1.25)", offset: 0.84 },
      { transform: "translateY(0px) scale(1)", filter: "brightness(1)" },
    ], { duration: 500, easing: "cubic-bezier(.18,.8,.22,1)" });
    const streak = document.createElement("i");
    streak.className = "c4-streak";
    streak.dataset.owner = String(owner);
    streak.style.setProperty("--c", String(col));
    grid.appendChild(streak);
    dropBit(streak, streak.animate([
      { transform: `translateY(${-distance}px) scaleY(0.35)`, opacity: 0 },
      { transform: `translateY(${-distance * 0.4}px) scaleY(1)`, opacity: 0.75, offset: 0.4 },
      { transform: "translateY(0px) scaleY(0.15)", opacity: 0 },
    ], { duration: 500, easing: "cubic-bezier(.18,.8,.22,1)", fill: "forwards" }));
    sfx.fall();
    const match = state.match;
    window.setTimeout(() => {
      if (!state || state.match !== match || !disc.isConnected) return;
      const box = disc.getBoundingClientRect();
      const color = ownerColor(owner);
      sfx.land(owner);
      ring(box.left + box.width / 2, box.top + box.height / 2, color);
      spark(box.left + box.width / 2, box.top + box.height / 2, color, 14);
      hitTable();
    }, 340);
    window.setTimeout(() => {
      if (!state || state.match !== match) return;
      state.board[row][col] = { piece: owner, hanging: false, id };
      renderDiscs();
      if (claimWin()) return;
      if (owner === 1) beginEvent();
      else finishTurn();
    }, 500);
  };

  const onGridMove = (event) => {
    const grid = gridEl();
    if (!grid || !state || state.view !== "play" || state.busy || state.winner !== null || state.draw) return;
    const hole = event.target.closest(".c4-hole");
    grid.querySelectorAll(".is-col").forEach((node) => node.classList.remove("is-col"));
    grid.querySelector(".c4-ghost")?.remove();
    if (!hole) {
      hoverCol = -1;
      return;
    }
    const col = Number(hole.dataset.col);
    if (col !== hoverCol) {
      hoverCol = col;
      sfx.hover();
    }
    const row = landingRow(col);
    grid.querySelectorAll(`[data-col="${col}"]`).forEach((node) => node.classList.add("is-col"));
    if (row < 0) return;
    const ghost = document.createElement("span");
    ghost.className = "c4-disc c4-ghost";
    ghost.dataset.owner = String(state.turn);
    ghost.style.setProperty("--c", String(col));
    ghost.style.setProperty("--r", "-1");
    grid.appendChild(ghost);
  };

  stage.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]");
    if (action) {
      const name = action.dataset.action;
      if (name === "close") close();
      if (name === "menu") showMenu();
      if (name === "local") startMatch();
      if (name === "rematch") startMatch();
      if (name === "online") {
        const note = stage.querySelector("[data-note]");
        if (note) {
          note.hidden = false;
          note.textContent = "Multiplayer is not on this table yet.";
        }
      }
      return;
    }
    const hole = event.target.closest(".c4-hole");
    if (hole) place(Number(hole.dataset.col));
  });

  stage.addEventListener("mousemove", onGridMove);

  openButton.addEventListener("click", open);
})();
