const Ttt = (() => {
  const SIZE = 4;
  const root = document.querySelector("#ttt");
  const stage = document.querySelector("#ttt-root");
  const ghost = document.querySelector("#ghost-board");
  const openButton = document.querySelector("#open-ttt");

  const SHAPES = {
    x: {
      name: "X",
      text: "Press E or hold the board, then click a square. It falls off for 3 of your turns. A shape on it falls too.",
    },
    o: {
      name: "O",
      text: "Press E or hold the board, click any shape, then click an empty square. It slides there.",
    },
    square: {
      name: "Square",
      text: "Press E or hold the board. A random 2×2 burns every shape inside it, including yours.",
    },
    line: {
      name: "Line",
      text: "Press E or hold the board. Two squares in that row light up. Click to drop a line in each. Horizontal only.",
    },
    star: {
      name: "Star",
      text: "Press E or hold the board, then click one enemy shape. It sparkles, then vanishes on the next turn.",
    },
    hex: {
      name: "Hexagon",
      text: "Press E or hold the board. A hex slowly locks into the center slot, then two of your shapes drop at random.",
    },
    heart: {
      name: "Heart",
      text: "Press E or hold the board. A random enemy shape turns into yours. Cooldown is 4 turns.",
    },
  };

  const LINES = (() => {
    const lines = [];
    for (let r = 0; r < SIZE; r += 1) lines.push([0, 1, 2, 3].map((c) => r * SIZE + c));
    for (let c = 0; c < SIZE; c += 1) lines.push([0, 1, 2, 3].map((r) => r * SIZE + c));
    lines.push([0, 5, 10, 15]);
    lines.push([3, 6, 9, 12]);
    return lines;
  })();

  let ghostTimer = 0;
  let winTimer = 0;
  let state = null;
  let audioCtx = null;

  const audio = () => {
    if (!audioCtx) audioCtx = new window.AudioContext();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  };

  const env = (when, peak, dur) => {
    const gain = audio().createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), when + 0.015);
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
      return;
    }
  };

  const noise = (dur, peak, delay = 0, from = 1800, to = 240) => {
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
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(from, when);
    filter.frequency.exponentialRampToValueAtTime(Math.max(to, 40), when + dur);
    const gain = env(when, peak, dur);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    source.start(when);
    } catch (error) {
      return;
    }
  };

  const sfx = {
    arm() {
      tone(480, 0.14, "square", 0.045, 0, 920);
    },
    erase() {
      noise(0.34, 0.2, 0, 2400, 180);
      tone(220, 0.28, "sawtooth", 0.07, 0, 48);
      tone(90, 0.42, "sine", 0.11, 0.04, 36);
    },
    slide() {
      tone(260, 0.46, "sine", 0.07, 0, 840);
      noise(0.32, 0.05, 0, 1400, 700);
    },
    blast() {
      noise(0.4, 0.24, 0, 900, 80);
      tone(160, 0.38, "sawtooth", 0.1, 0, 42);
      tone(980, 0.16, "square", 0.05, 0, 180);
    },
    win() {
      [523, 659, 784, 1046].forEach((freq, index) => tone(freq, 0.2, "triangle", 0.07, index * 0.11));
    },
    announce() {
      noise(0.16, 0.34, 0, 520, 70);
      tone(120, 0.18, "sine", 0.22, 0, 42);
      tone(64, 0.32, "triangle", 0.18, 0.012, 36);
      noise(0.07, 0.14, 0.02, 2800, 900);
      document.body.classList.remove("is-stamped");
      window.requestAnimationFrame(() => document.body.classList.add("is-stamped"));
    },
    drop() {
      noise(0.16, 0.07, 0, 1600, 420);
      tone(720, 0.09, "sine", 0.035, 0, 240);
      tone(240, 0.11, "triangle", 0.1, 0.36, 150);
      tone(150, 0.1, "sine", 0.07, 0.48, 96);
    },
    sparkle() {
      [988, 1318, 1568, 1976].forEach((freq, index) => tone(freq, 0.14, "sine", 0.045, index * 0.06));
    },
    poof() {
      noise(0.32, 0.14, 0, 3400, 280);
      tone(880, 0.22, "sine", 0.05, 0, 160);
    },
    hex() {
      tone(174, 2.1, "sine", 0.04, 0, 349);
      tone(261, 2.2, "triangle", 0.03, 0.35, 523);
      noise(1.4, 0.025, 0.2, 700, 180);
    },
    charm() {
      tone(392, 0.18, "sine", 0.05, 0, 784);
      tone(588, 0.24, "triangle", 0.06, 0.22, 988);
    },
  };

  const shakeBoard = () => {
    const board = stage.querySelector(".board");
    if (!board) return;
    board.classList.remove("is-shaking");
    window.requestAnimationFrame(() => board.classList.add("is-shaking"));
  };

  const burst = (anchor, kind) => {
    const board = stage.querySelector(".board");
    if (!board || !anchor) return;
    const boardRect = board.getBoundingClientRect();
    const rect = anchor.getBoundingClientRect();
    const host = document.createElement("span");
    host.className = `fx-burst fx-${kind}`;
    host.style.left = `${rect.left - boardRect.left + rect.width / 2}px`;
    host.style.top = `${rect.top - boardRect.top + rect.height / 2}px`;
    for (let i = 0; i < 8; i += 1) {
      const shard = document.createElement("i");
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.35;
      const dist = 34 + Math.random() * 30;
      shard.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
      shard.style.setProperty("--dy", `${Math.sin(angle) * dist}px`);
      host.appendChild(shard);
    }
    host.appendChild(document.createElement("b"));
    board.appendChild(host);
  };

  const net = { role: null, peer: null, conn: null, code: "" };
  let holdingFx = false;
  let pendingSnap = null;
  let fxToken = 0;
  const DROP_MS = 680;
  const peerOptions = { host: "0.peerjs.com", port: 443, path: "/", secure: true };
  const codeChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  const roomCode = () => {
    let code = "";
    for (let i = 0; i < 4; i += 1) code += codeChars[Math.floor(Math.random() * codeChars.length)];
    return code;
  };

  const peerId = (code) => `unfairgames-${code}`;

  const emit = (msg) => {
    try {
      if (net.conn && net.conn.open) net.conn.send(msg);
    } catch (error) {
      return;
    }
  };

  const dropNet = () => {
    holdingFx = false;
    pendingSnap = null;
    const conn = net.conn;
    const peer = net.peer;
    if (conn) conn.__ugSilent = true;
    net.role = null;
    net.conn = null;
    net.peer = null;
    net.code = "";
    try { conn?.close(); } catch (error) { /* ignore */ }
    try { peer?.destroy(); } catch (error) { /* ignore */ }
  };

  const takeSnap = () => ({
    board: state.board.map((cell) => ({ piece: cell.piece, sealed: cell.sealed, sealedBy: cell.sealedBy, spark: !!cell.spark })),
    turn: state.turn,
    players: state.players.map((player) => ({ shape: player.shape, cooldown: player.cooldown })),
    winner: state.winner,
    winLine: state.winLine,
    announced: state.announced,
    draw: state.draw,
    match: state.match,
  });

  const publishSnap = () => {
    if (state?.online && net.role === "host") emit({ t: "snap", snap: takeSnap() });
  };

  const publishFx = (fx) => {
    if (state?.online && net.role === "host") emit({ t: "fx", fx });
  };

  const myTurn = () => !state?.online || state.turn === state.seat;

  const relay = (act) => {
    if (state?.online && net.role === "guest") {
      emit(act);
      state.busy = true;
      if (state.view === "play") renderPlay();
      return true;
    }
    return false;
  };

  const sparkBits = () => Array.from({ length: 18 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 18 + (i % 3) * 0.22;
    const dist = 96 + (i % 7) * 28;
    const delay = (i % 9) * 0.07;
    const size = 5 + (i % 4) * 2;
    const gold = i % 2 === 0 ? " is-gold" : "";
    return `<i class="spark${gold}" style="--dx:${Math.cos(angle) * dist}px;--dy:${Math.sin(angle) * dist}px;--delay:${delay}s;--size:${size}px"></i>`;
  }).join("");

  const igniteSparks = (root = stage) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    root.querySelectorAll(".spark").forEach((el) => {
      if (el.getAnimations().some((anim) => anim.id === "spark")) return;
      const dx = el.style.getPropertyValue("--dx") || "0px";
      const dy = el.style.getPropertyValue("--dy") || "0px";
      const delay = (parseFloat(el.style.getPropertyValue("--delay")) || 0) * 1000;
      const anim = el.animate([
        { transform: "translate(0px, 0px) scale(0.25)", opacity: 0 },
        { transform: `translate(${dx}, ${dy}) scale(1)`, opacity: 1, offset: 0.2 },
        { transform: `translate(${dx}, ${dy}) scale(0.9)`, opacity: 1, offset: 0.62 },
        { transform: `translate(${dx}, ${dy}) scale(0.2)`, opacity: 0 },
      ], { duration: 1200, delay, iterations: Infinity, easing: "ease-out" });
      anim.id = "spark";
    });
  };

  const glyph = (shape) => {
    if (shape === "x") {
      return '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M24 24 L76 76 M76 24 L24 76" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/></svg>';
    }
    if (shape === "o") {
      return '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" stroke-width="10"/></svg>';
    }
    if (shape === "line") {
      return '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M16 42 H84 M16 58 H84" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/></svg>';
    }
    if (shape === "star") {
      return '<svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="50,14 60,40 88,40 65,56 74,84 50,66 26,84 35,56 12,40 40,40" fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="round"/></svg>';
    }
    if (shape === "hex") {
      return '<svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="50,12 84,32 84,68 50,88 16,68 16,32" fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="round"/></svg>';
    }
    if (shape === "heart") {
      return '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 84 C18 58 10 38 26 26 C38 18 48 26 50 36 C52 26 62 18 74 26 C90 38 82 58 50 84 Z" fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="round"/></svg>';
    }
    return '<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="26" y="26" width="48" height="48" fill="none" stroke="currentColor" stroke-width="10"/></svg>';
  };

  const freshBoard = () => Array.from({ length: SIZE * SIZE }, () => ({
    piece: null,
    sealed: 0,
    sealedBy: null,
    justSealed: false,
    spark: false,
  }));

  const emptyCells = () => state.board.map((cell, index) => (cell.piece === null && cell.sealed === 0 ? index : -1)).filter((index) => index >= 0);

  const linePair = (index) => {
    const col = index % SIZE;
    if (col >= SIZE - 1) return [index - 1, index];
    return [index, index + 1];
  };

  const openSquare = (index) => {
    const cell = state.board[index];
    return !!cell && cell.piece === null && cell.sealed === 0;
  };

  const pairOpen = (pair) => pair.every(openSquare);

  const enemyPieces = (playerIndex) => state.board
    .map((cell, index) => (cell.piece !== null && cell.piece !== playerIndex ? index : -1))
    .filter((index) => index >= 0);

  const horizontalOpen = () => {
    for (let row = 0; row < SIZE; row += 1) {
      for (let col = 0; col < SIZE - 1; col += 1) {
        const index = row * SIZE + col;
        if (openSquare(index) && openSquare(index + 1)) return true;
      }
    }
    return false;
  };

  const abilityPossible = (playerIndex) => {
    const shape = state.players[playerIndex].shape;
    if (shape === "x") return state.board.some((cell) => cell.sealed === 0);
    if (shape === "o") return state.board.some((cell) => cell.piece !== null) && emptyCells().length > 0;
    if (shape === "line") return horizontalOpen();
    if (shape === "star") return enemyPieces(playerIndex).length >= 1;
    if (shape === "heart") return enemyPieces(playerIndex).length >= 1;
    if (shape === "hex") return emptyCells().length >= 2;
    return state.board.some((cell) => cell.sealed === 0);
  };

  const hasAction = (playerIndex) => {
    if (emptyCells().length > 0) return true;
    if (state.players[playerIndex].cooldown > 0) return false;
    return abilityPossible(playerIndex);
  };

  const findWin = () => {
    for (const line of LINES) {
      const owners = line.map((index) => state.board[index].piece);
      if (owners[0] !== null && owners.every((owner) => owner === owners[0])) {
        return { owner: owners[0], line };
      }
    }
    return null;
  };

  const open = () => {
    root.hidden = false;
    document.body.style.overflow = "hidden";
    buildGhost();
    showMenu();
  };

  const close = () => {
    root.hidden = true;
    document.body.style.overflow = "";
    window.clearInterval(ghostTimer);
    window.clearTimeout(winTimer);
    dropNet();
    state = null;
    stage.innerHTML = "";
    document.querySelector(".hex-rite")?.remove();
  };

  const buildGhost = () => {
    ghost.innerHTML = "";
    for (let i = 0; i < SIZE * SIZE; i += 1) {
      const cell = document.createElement("div");
      cell.className = "ghost-cell";
      ghost.appendChild(cell);
    }
    window.clearInterval(ghostTimer);
    ghostTimer = window.setInterval(tickGhost, 700);
  };

  const tickGhost = () => {
    const cells = [...ghost.children];
    const cell = cells[Math.floor(Math.random() * cells.length)];
    const mark = cell.querySelector("b");
    if (mark) {
      mark.classList.add("is-out");
      mark.addEventListener("animationend", () => mark.remove(), { once: true });
      window.setTimeout(() => mark.remove(), 500);
      return;
    }
    const next = document.createElement("b");
    const kind = Math.random() < 0.5 ? "x" : "o";
    next.className = kind === "x" ? "g-x" : "g-o";
    next.innerHTML = glyph(kind);
    cell.appendChild(next);
  };

  const showMenu = () => {
    window.clearTimeout(winTimer);
    dropNet();
    state = { view: "menu", notice: "" };
    stage.innerHTML = `
      <section class="ttt-panel">
        <button class="ttt-back" type="button" data-action="close">Back</button>
        <p class="ttt-kicker">U.G. / table</p>
        <h2>Tic-tac-toe</h2>
        <p class="ttt-copy">Four in a line. Pick a shape, then bend the board.</p>
        <div class="mode-list">
          <button class="mode-btn" type="button" data-action="local">Local Play</button>
          <button class="mode-btn alt" type="button" data-action="online">Multiplayer</button>
        </div>
        <p class="mode-note" data-note hidden></p>
      </section>`;
  };

  const showPick = () => {
    const picking = state.picked.length;
    const cards = Object.entries(SHAPES).map(([id, shape]) => `
      <button class="shape-card" type="button" data-action="pick" data-shape="${id}">
        <span class="token" data-owner="${picking}">${glyph(id)}</span>
        <strong>${shape.name}</strong>
        <small>${shape.text}</small>
      </button>`).join("");
    stage.innerHTML = `
      <section class="ttt-panel">
        <button class="ttt-back" type="button" data-action="pick-back">Back</button>
        <p class="ttt-kicker">Local play</p>
        <h2>Player ${picking + 1}</h2>
        <p class="ttt-copy">Choose a shape. Place it, or press E. Hold the board for 0.75 seconds to use the ability.</p>
        <div class="shape-row">${cards}</div>
        <div class="preview-wrap">
          <p class="preview-label">4 across. 4 to win.</p>
          <div class="preview-board" aria-hidden="true">${"<div class='preview-cell'></div>".repeat(16)}</div>
        </div>
      </section>`;
  };

  const startMatch = () => {
    state.view = "play";
    state.match = (state.match || 0) + 1;
    state.board = freshBoard();
    state.turn = 0;
    state.mode = "idle";
    state.selected = null;
    state.chosen = [];
    state.hover = null;
    state.winner = null;
    state.winLine = null;
    state.announced = false;
    state.draw = false;
    state.busy = false;
    window.clearTimeout(winTimer);
    state.players = state.picked.map((shape) => ({ shape, cooldown: 0 }));
    renderPlay();
  };

  const statusText = () => {
    if (state.winner !== null || state.draw) return state.draw ? "No legal move remains. Draw." : "";
    if (state.online && state.turn !== state.seat && state.mode === "idle") return "Waiting for the other player.";
    const name = SHAPES[state.players[state.turn].shape].name;
    if (state.mode === "erase") return `Player ${state.turn + 1}, click a square to drop it.`;
    if (state.mode === "grab") return `Player ${state.turn + 1}, click a shape.`;
    if (state.mode === "slide") return `Player ${state.turn + 1}, click an empty square.`;
    if (state.mode === "line") return `Player ${state.turn + 1}, click. Two lines land side by side in that row.`;
    if (state.mode === "star") return `Player ${state.turn + 1}, click one enemy shape.`;
    if (state.players[state.turn].cooldown > 0) {
      return `Player ${state.turn + 1} · ${name}. Place a shape. Ability in ${state.players[state.turn].cooldown} turn${state.players[state.turn].cooldown === 1 ? "" : "s"}.`;
    }
    return `Player ${state.turn + 1} · ${name}. Place a shape, or press E. Hold the board for 0.75 seconds.`;
  };

  const renderPlay = () => {
    const boardClass = ["board"];
    if (state.mode === "erase") boardClass.push("is-erasing");
    if (state.mode === "slide" || state.mode === "grab") boardClass.push("is-moving");
    if (state.mode === "line") boardClass.push("is-lining");
    if (state.mode === "star") boardClass.push("is-starring");
    const aim = state.mode === "line" && state.hover != null ? linePair(state.hover) : [];
    const aimBlocked = aim.length > 0 && !pairOpen(aim);
    const cells = state.board.map((cell, index) => {
      const gone = cell.sealed > 0;
      const classes = ["cell"];
      if (gone) classes.push("is-gone");
      if (!gone && cell.piece === null) classes.push("is-empty");
      if (aim.includes(index)) classes.push(aimBlocked ? "is-blocked" : "is-aim");
      const marked = cell.spark || (state.chosen || []).includes(index);
      const token = cell.piece === null
        ? ""
        : `<span class="token${state.selected === index ? " is-bubbled" : ""}${marked ? " is-sparked" : ""}" data-owner="${cell.piece}">${glyph(state.players[cell.piece].shape)}${marked ? sparkBits() : ""}</span>`;
      const locked = state.busy || state.winner !== null || state.draw || (state.online && state.turn !== state.seat);
      return `<button class="${classes.join(" ")}" type="button" data-cell="${index}" ${locked ? "disabled" : ""}>${token}</button>`;
    }).join("");
    const who = state.players.map((player, index) => {
      const ready = player.cooldown === 0 ? "Ability ready" : `Ability in ${player.cooldown}`;
      return `<div class="who${state.turn === index && state.winner === null && !state.draw ? " is-active" : ""}" data-owner="${index}"><b>Player ${index + 1} · ${SHAPES[player.shape].name}</b><p>${ready}</p></div>`;
    }).join("");
    const showBar = state.draw || (state.winner !== null && state.announced);
    const bar = showBar
      ? `<div class="result-bar">${state.draw ? '<p class="status">Draw</p>' : ""}<button class="mode-btn" type="button" data-action="rematch">Rematch</button><button class="mode-btn alt" type="button" data-action="menu">Menu</button></div>`
      : "";
    let stamps = "";
    if (state.winner !== null && state.announced) {
      if (state.online) {
        const luck = state.seat === state.winner;
        stamps = `<div class="stamp-layer"><p class="stamp ${luck ? "stamp-luck" : "stamp-rigged"}">${luck ? "LUCK" : "RIGGED"}</p></div>`;
      } else {
        stamps = `<div class="stamp-layer two"><p class="stamp stamp-luck">LUCK</p><p class="stamp stamp-rigged">RIGGED</p></div>`;
      }
    }
    stage.innerHTML = `
      <section class="play-layout">
        <button class="ttt-back" type="button" data-action="menu">Back</button>
        <div class="hud">${who}</div>
        <div class="board-wrap">
          <div class="${boardClass.join(" ")}">${cells}</div>
          <p class="status">${statusText()}</p>
        </div>
      </section>${stamps}${bar}`;
    igniteSparks();
  };

  const paintWinLine = (instant) => {
    if (!state?.winLine) return;
    const board = stage.querySelector(".board");
    if (!board) return;
    board.querySelectorAll(".win-line").forEach((node) => node.remove());
    const first = board.querySelector(`[data-cell="${state.winLine[0]}"]`);
    const last = board.querySelector(`[data-cell="${state.winLine[3]}"]`);
    if (!first || !last) return;
    state.winLine.forEach((index) => {
      board.querySelector(`[data-cell="${index}"]`)?.classList.add("is-winner");
    });
    const boardRect = board.getBoundingClientRect();
    const start = first.getBoundingClientRect();
    const end = last.getBoundingClientRect();
    const pad = start.width * 0.34;
    let x1 = start.left + start.width / 2 - boardRect.left;
    let y1 = start.top + start.height / 2 - boardRect.top;
    let x2 = end.left + end.width / 2 - boardRect.left;
    let y2 = end.top + end.height / 2 - boardRect.top;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy) || 1;
    x1 -= (dx / length) * pad;
    y1 -= (dy / length) * pad;
    x2 += (dx / length) * pad;
    y2 += (dy / length) * pad;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", `win-line${instant ? " is-drawn" : ""}`);
    svg.setAttribute("viewBox", `0 0 ${boardRect.width} ${boardRect.height}`);
    svg.dataset.owner = String(state.winner);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("pathLength", "1");
    svg.appendChild(line);
    board.appendChild(svg);
  };

  const claimWin = () => {
    const found = findWin();
    if (!found) return false;
    state.winner = found.owner;
    state.winLine = found.line;
    state.announced = false;
    state.mode = "idle";
    state.selected = null;
    state.busy = true;
    renderPlay();
    paintWinLine(false);
    window.requestAnimationFrame(() => paintWinLine(false));
    sfx.win();
    publishSnap();
    const match = state.match;
    window.clearTimeout(winTimer);
    winTimer = window.setTimeout(() => {
      if (!state || state.match !== match) return;
      state.announced = true;
      state.busy = false;
      renderPlay();
      paintWinLine(true);
      window.requestAnimationFrame(() => paintWinLine(true));
      sfx.announce();
      publishSnap();
    }, 2600);
    return true;
  };

  const tickSeals = (playerIndex) => {
    state.board.forEach((cell) => {
      if (cell.sealedBy !== playerIndex || cell.sealed === 0) return;
      if (cell.justSealed) {
        cell.justSealed = false;
        return;
      }
      cell.sealed -= 1;
      if (cell.sealed === 0) cell.sealedBy = null;
    });
  };

  const finishTurn = (usedAbility, cooldownTurns = 2) => {
    const player = state.players[state.turn];
    if (usedAbility) player.cooldown = cooldownTurns;
    else if (player.cooldown > 0) player.cooldown -= 1;
    tickSeals(state.turn);
    state.mode = "idle";
    state.selected = null;
    state.chosen = [];
    state.hover = null;
    if (claimWin()) return;
    state.turn = 1 - state.turn;
    const match = state.match;
    const settle = () => {
      if (!state || state.match !== match) return;
      let spins = 0;
      while (spins < 6 && !hasAction(state.turn)) {
        const waiting = state.players[state.turn];
        if (waiting.cooldown > 0) waiting.cooldown -= 1;
        tickSeals(state.turn);
        if (!hasAction(0) && !hasAction(1)) {
          state.draw = true;
          break;
        }
        state.turn = 1 - state.turn;
        spins += 1;
      }
      state.busy = false;
      renderPlay();
      publishSnap();
    };
    const sparked = state.board.map((cell, index) => (cell.spark ? index : -1)).filter((index) => index >= 0);
    if (!sparked.length) {
      settle();
      return;
    }
    state.busy = true;
    renderPlay();
    publishFx({ kind: "poof", indexes: sparked, ms: 620 });
    sfx.poof();
    sparked.forEach((index) => stage.querySelector(`[data-cell="${index}"]`)?.classList.add("is-poof"));
    window.setTimeout(() => {
      if (!state || state.match !== match) return;
      sparked.forEach((index) => {
        state.board[index].piece = null;
        state.board[index].spark = false;
      });
      settle();
    }, 620);
  };

  const showDrops = (indexes, owner) => {
    const shape = state.players[owner]?.shape;
    if (!shape) return;
    indexes.forEach((index) => {
      const button = stage.querySelector(`[data-cell="${index}"]`);
      if (!button) return;
      button.innerHTML = `<span class="token is-dropping" data-owner="${owner}">${glyph(shape)}</span>`;
      window.setTimeout(() => burst(button, owner === 0 ? "ice" : "mag"), 390);
    });
    sfx.drop();
  };

  const place = (index) => {
    const cell = state.board[index];
    if (cell.sealed > 0 || cell.piece !== null || state.busy) return;
    if (relay({ t: "act", kind: "place", index })) return;
    state.busy = true;
    const owner = state.turn;
    const match = state.match;
    publishFx({ kind: "drop", indexes: [index], owner, ms: DROP_MS });
    showDrops([index], owner);
    window.setTimeout(() => {
      if (!state || state.match !== match) return;
      cell.piece = owner;
      if (claimWin()) return;
      finishTurn(false);
    }, DROP_MS);
  };

  const layLines = (a, b) => {
    if (state.busy || !pairOpen([a, b])) return;
    if (relay({ t: "act", kind: "lines", a, b })) return;
    state.busy = true;
    state.mode = "idle";
    state.hover = null;
    const owner = state.turn;
    const match = state.match;
    publishFx({ kind: "drop", indexes: [a, b], owner, ms: DROP_MS });
    renderPlay();
    showDrops([a, b], owner);
    window.setTimeout(() => {
      if (!state || state.match !== match) return;
      state.board[a].piece = owner;
      state.board[b].piece = owner;
      if (claimWin()) return;
      finishTurn(true);
    }, DROP_MS);
  };

  const markStars = (indexes) => {
    if (state.busy || indexes.length !== 1) return;
    const legal = indexes.every((index) => {
      const cell = state.board[index];
      return cell && cell.piece !== null && cell.piece !== state.turn;
    });
    if (!legal) return;
    if (relay({ t: "act", kind: "star", indexes })) return;
    state.busy = true;
    state.mode = "idle";
    state.chosen = [];
    indexes.forEach((index) => { state.board[index].spark = true; });
    const match = state.match;
    publishFx({ kind: "spark", indexes, ms: 420 });
    renderPlay();
    sfx.sparkle();
    window.setTimeout(() => {
      if (!state || state.match !== match) return;
      finishTurn(true);
    }, 420);
  };

  const hexShape = (filled) => `<svg viewBox="0 0 100 110" aria-hidden="true"><polygon points="50,4 96,30 96,80 50,106 4,80 4,30" fill="${filled ? "currentColor" : "none"}" fill-opacity="0.92" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg>`;

  const playHexShow = (owner) => {
    document.querySelector(".hex-rite")?.remove();
    const layer = document.createElement("div");
    layer.className = "hex-rite";
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const hexW = Math.round(Math.max(260, Math.min(vw, vh) * 0.46));
    const hexH = Math.round(hexW * 1.1);
    const colStep = hexW * 0.9;
    const rowStep = hexH * 0.72;
    const cx = vw / 2;
    const cy = vh / 2;
    const halfC = Math.ceil(vw / colStep) + 1;
    const halfR = Math.ceil(vh / rowStep) + 1;
    const cells = [];
    for (let row = -halfR; row <= halfR; row += 1) {
      const shift = Math.abs(row) % 2 ? colStep / 2 : 0;
      for (let col = -halfC; col <= halfC; col += 1) {
        if (row === 0 && col === 0) continue;
        const x = cx + col * colStep + shift - hexW / 2;
        const y = cy + row * rowStep - hexH / 2;
        if (x > vw || y > vh || x + hexW < 0 || y + hexH < 0) continue;
        cells.push(`<span class="hex-sat" style="left:${x}px;top:${y}px">${hexShape(false)}</span>`);
      }
    }
    const slotX = cx - hexW / 2;
    const slotY = cy - hexH / 2;
    layer.innerHTML = `<div class="hex-field" style="--hex-w:${hexW}px;--hex-h:${hexH}px">${cells.join("")}<span class="hex-slot" style="left:${slotX}px;top:${slotY}px">${hexShape(false)}</span><span class="hex-piece" data-owner="${owner}" style="left:${slotX}px;top:${slotY}px">${hexShape(true)}</span></div>`;
    document.body.appendChild(layer);
    sfx.hex();
    return layer;
  };

  const hexRite = () => {
    if (state.busy || emptyCells().length < 2) return;
    if (relay({ t: "act", kind: "hex" })) return;
    const pool = [...emptyCells()];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const swap = pool[i];
      pool[i] = pool[j];
      pool[j] = swap;
    }
    const spots = pool.slice(0, 2);
    state.busy = true;
    state.mode = "idle";
    const owner = state.turn;
    const match = state.match;
    const sink = 2200;
    const hold = 460;
    publishFx({ kind: "hex", spots, owner, sink, hold, ms: sink + hold + DROP_MS });
    renderPlay();
    const layer = playHexShow(owner);
    window.setTimeout(() => layer.classList.add("is-set"), sink);
    window.setTimeout(() => {
      layer.remove();
      if (!state || state.match !== match) return;
      showDrops(spots, owner);
      window.setTimeout(() => {
        if (!state || state.match !== match) return;
        spots.forEach((index) => { state.board[index].piece = owner; });
        if (claimWin()) return;
        finishTurn(true);
      }, DROP_MS);
    }, sink + hold);
  };

  const erase = (index) => {
    const cell = state.board[index];
    if (cell.sealed > 0) return;
    if (relay({ t: "act", kind: "erase", index })) return;
    state.busy = true;
    const match = state.match;
    const button = stage.querySelector(`[data-cell="${index}"]`);
    publishFx({ kind: "erase", index, ms: 500 });
    sfx.erase();
    shakeBoard();
    burst(button, "hot");
    button.classList.add("is-falling");
    window.setTimeout(() => {
      if (!state || state.match !== match) return;
      cell.piece = null;
      cell.sealed = 3;
      cell.sealedBy = state.turn;
      cell.justSealed = true;
      finishTurn(true);
    }, 500);
  };

  const slide = (from, to) => {
    if (relay({ t: "act", kind: "slide", from, to })) return;
    state.busy = true;
    const match = state.match;
    const owner = state.board[from].piece;
    publishFx({ kind: "slide", from, to, ms: 470 });
    const fromEl = stage.querySelector(`[data-cell="${from}"]`);
    const toEl = stage.querySelector(`[data-cell="${to}"]`);
    const token = fromEl.querySelector(".token");
    const start = token.getBoundingClientRect();
    const end = toEl.getBoundingClientRect();
    const floater = token.cloneNode(true);
    floater.style.position = "fixed";
    floater.style.left = `${start.left}px`;
    floater.style.top = `${start.top}px`;
    floater.style.width = `${start.width}px`;
    floater.style.height = `${start.height}px`;
    floater.style.zIndex = "30";
    floater.style.transition = "transform 0.45s cubic-bezier(.2,.7,.2,1)";
    floater.classList.add("is-sliding");
    document.body.appendChild(floater);
    token.remove();
    const trail = document.createElement("span");
    const dx = end.left - start.left;
    const dy = end.top - start.top;
    trail.className = "fx-trail";
    trail.style.left = `${start.left + start.width / 2}px`;
    trail.style.top = `${start.top + start.height / 2}px`;
    trail.style.width = `${Math.hypot(dx, dy)}px`;
    trail.style.setProperty("--rot", `${Math.atan2(dy, dx)}rad`);
    document.body.appendChild(trail);
    sfx.slide();
    window.requestAnimationFrame(() => {
      floater.style.transform = `translate(${end.left - start.left}px, ${end.top - start.top}px)`;
    });
    window.setTimeout(() => {
      floater.remove();
      trail.remove();
      burst(toEl, "ice");
      if (!state || state.match !== match) return;
      state.board[from].piece = null;
      state.board[to].piece = owner;
      finishTurn(true);
    }, 470);
  };

  const blast = () => {
    const row = Math.floor(Math.random() * (SIZE - 1));
    const col = Math.floor(Math.random() * (SIZE - 1));
    const hits = [];
    for (let dr = 0; dr < 2; dr += 1) {
      for (let dc = 0; dc < 2; dc += 1) hits.push((row + dr) * SIZE + (col + dc));
    }
    if (relay({ t: "act", kind: "blast" })) return;
    state.busy = true;
    const match = state.match;
    state.mode = "idle";
    renderPlay();
    publishFx({ kind: "blast", hits, ms: 460 });
    sfx.blast();
    shakeBoard();
    hits.forEach((index) => {
      const button = stage.querySelector(`[data-cell="${index}"]`);
      if (button && state.board[index].sealed === 0) {
        button.classList.add("is-blast");
        burst(button, "mag");
      }
    });
    window.setTimeout(() => {
      if (!state || state.match !== match) return;
      hits.forEach((index) => {
        if (state.board[index].sealed === 0) state.board[index].piece = null;
      });
      finishTurn(true);
    }, 460);
  };

  const playHeartMorph = (index, owner) => {
    const button = stage.querySelector(`[data-cell="${index}"]`);
    const token = button?.querySelector(".token");
    if (!token) return;
    token.classList.add("is-charming");
    sfx.charm();
    window.setTimeout(() => {
      if (!state || !button.isConnected) return;
      button.innerHTML = `<span class="token is-charmed" data-owner="${owner}">${glyph(state.players[owner].shape)}</span>`;
      burst(button, owner === 0 ? "ice" : "mag");
    }, 380);
  };

  const charm = () => {
    const foes = enemyPieces(state.turn);
    if (state.busy || foes.length === 0) return;
    if (relay({ t: "act", kind: "heart" })) return;
    const index = foes[Math.floor(Math.random() * foes.length)];
    const cell = state.board[index];
    state.busy = true;
    state.mode = "idle";
    const owner = state.turn;
    const match = state.match;
    publishFx({ kind: "heart", index, owner, ms: 780 });
    playHeartMorph(index, owner);
    window.setTimeout(() => {
      if (!state || state.match !== match) return;
      cell.piece = owner;
      cell.spark = false;
      if (claimWin()) return;
      finishTurn(true, 4);
    }, 780);
  };

  const beginAbility = () => {
    if (!state || state.view !== "play" || state.busy || state.winner !== null || state.draw || !myTurn()) return;
    if (state.mode !== "idle") {
      tone(320, 0.12, "sine", 0.05, 0, 140);
      state.mode = "idle";
      state.selected = null;
      state.chosen = [];
      state.hover = null;
      renderPlay();
      return;
    }
    const player = state.players[state.turn];
    if (player.cooldown > 0 || !abilityPossible(state.turn)) return;
    if (player.shape === "square") {
      blast();
      return;
    }
    if (player.shape === "hex") {
      hexRite();
      return;
    }
    if (player.shape === "heart") {
      charm();
      return;
    }
    sfx.arm();
    if (player.shape === "line") state.mode = "line";
    else if (player.shape === "star") {
      state.mode = "star";
      state.chosen = [];
    } else if (player.shape === "x") state.mode = "erase";
    else state.mode = "grab";
    state.hover = null;
    renderPlay();
  };

  const onCell = (index) => {
    if (!state || state.view !== "play" || state.busy || state.winner !== null || state.draw || !myTurn()) return;
    const cell = state.board[index];
    if (state.mode === "erase") {
      if (cell.sealed === 0) erase(index);
      return;
    }
    if (state.mode === "line") {
      const pair = linePair(index);
      if (pairOpen(pair)) layLines(pair[0], pair[1]);
      return;
    }
    if (state.mode === "star") {
      if (cell.piece === null || cell.piece === state.turn) return;
      markStars([index]);
      return;
    }
    if (state.mode === "grab") {
      if (cell.piece === null || cell.sealed > 0) return;
      state.selected = index;
      state.mode = "slide";
      renderPlay();
      return;
    }
    if (state.mode === "slide") {
      if (cell.piece !== null && cell.sealed === 0) {
        state.selected = index;
        renderPlay();
        return;
      }
      if (cell.sealed > 0 || cell.piece !== null || state.selected === null) return;
      slide(state.selected, index);
      return;
    }
    place(index);
  };

  const applySnap = (data) => {
    if (!state) return;
    const hadWinner = state.winner;
    const wasAnnounced = state.announced;
    state.view = "play";
    state.online = true;
    state.board = data.board.map((cell) => ({ ...cell, justSealed: false }));
    state.turn = data.turn;
    state.players = data.players.map((player) => ({ ...player }));
    state.winner = data.winner;
    state.winLine = data.winLine;
    state.announced = !!data.announced;
    state.draw = !!data.draw;
    state.match = data.match;
    state.busy = false;
    state.mode = "idle";
    state.selected = null;
    state.chosen = [];
    state.hover = null;
    renderPlay();
    if (state.winLine) {
      paintWinLine(state.announced);
      window.requestAnimationFrame(() => paintWinLine(state.announced));
    }
    if (state.winner !== null && hadWinner === null) sfx.win();
    if (state.announced && !wasAnnounced) sfx.announce();
  };

  const playRemoteFx = (fx) => {
    if (!state || state.view !== "play") return;
    if (fx.kind === "erase") {
      const button = stage.querySelector(`[data-cell="${fx.index}"]`);
      sfx.erase();
      shakeBoard();
      burst(button, "hot");
      button?.classList.add("is-falling");
    }
    if (fx.kind === "blast") {
      sfx.blast();
      shakeBoard();
      fx.hits.forEach((index) => {
        const button = stage.querySelector(`[data-cell="${index}"]`);
        if (!button) return;
        button.classList.add("is-blast");
        burst(button, "mag");
      });
    }
    if (fx.kind === "slide") {
      const fromEl = stage.querySelector(`[data-cell="${fx.from}"]`);
      const toEl = stage.querySelector(`[data-cell="${fx.to}"]`);
      const token = fromEl?.querySelector(".token");
      if (!token || !toEl) return;
      const start = token.getBoundingClientRect();
      const end = toEl.getBoundingClientRect();
      const floater = token.cloneNode(true);
      floater.style.position = "fixed";
      floater.style.left = `${start.left}px`;
      floater.style.top = `${start.top}px`;
      floater.style.width = `${start.width}px`;
      floater.style.height = `${start.height}px`;
      floater.style.zIndex = "30";
      floater.style.transition = "transform 0.45s cubic-bezier(.2,.7,.2,1)";
      floater.classList.add("is-sliding");
      document.body.appendChild(floater);
      token.remove();
      const trail = document.createElement("span");
      const dx = end.left - start.left;
      const dy = end.top - start.top;
      trail.className = "fx-trail";
      trail.style.left = `${start.left + start.width / 2}px`;
      trail.style.top = `${start.top + start.height / 2}px`;
      trail.style.width = `${Math.hypot(dx, dy)}px`;
      trail.style.setProperty("--rot", `${Math.atan2(dy, dx)}rad`);
      document.body.appendChild(trail);
      sfx.slide();
      window.requestAnimationFrame(() => {
        floater.style.transform = `translate(${dx}px, ${dy}px)`;
      });
      window.setTimeout(() => {
        floater.remove();
        trail.remove();
        burst(toEl, "ice");
      }, 470);
    }
    if (fx.kind === "drop") showDrops(fx.indexes || [], fx.owner);
    if (fx.kind === "spark") {
      sfx.sparkle();
      (fx.indexes || []).forEach((index) => {
        const token = stage.querySelector(`[data-cell="${index}"] .token`);
        if (!token) return;
        token.classList.add("is-sparked");
        if (!token.querySelector(".spark")) token.insertAdjacentHTML("beforeend", sparkBits());
        igniteSparks(token);
      });
    }
    if (fx.kind === "poof") {
      sfx.poof();
      (fx.indexes || []).forEach((index) => stage.querySelector(`[data-cell="${index}"]`)?.classList.add("is-poof"));
    }
    if (fx.kind === "hex") {
      const layer = playHexShow(fx.owner);
      window.setTimeout(() => layer.classList.add("is-set"), fx.sink || 2200);
      window.setTimeout(() => {
        layer.remove();
        showDrops(fx.spots || [], fx.owner);
      }, (fx.sink || 2200) + (fx.hold || 460));
    }
    if (fx.kind === "heart") playHeartMorph(fx.index, fx.owner);
  };

  const queueFx = (fx) => {
    playRemoteFx(fx);
    holdingFx = true;
    const token = fxToken + 1;
    fxToken = token;
    window.setTimeout(() => {
      if (token !== fxToken) return;
      holdingFx = false;
      if (!pendingSnap) return;
      const next = pendingSnap;
      pendingSnap = null;
      applySnap(next);
    }, fx.ms || 500);
  };

  const queueSnap = (snap) => {
    if (holdingFx) pendingSnap = snap;
    else applySnap(snap);
  };

  const beginOnline = () => {
    state.picked = [state.picks[0], state.picks[1]];
    startMatch();
    publishSnap();
  };

  const showLeft = () => {
    window.clearTimeout(winTimer);
    state = { view: "online", notice: "" };
    stage.innerHTML = `
      <section class="ttt-panel">
        <button class="ttt-back" type="button" data-action="menu">Back</button>
        <p class="ttt-kicker">U.G. / link</p>
        <h2>Link lost</h2>
        <p class="ttt-copy">The other player left the table.</p>
      </section>`;
  };

  const onDrop = () => {
    if (!net.role) return;
    dropNet();
    showLeft();
  };

  const showOnline = () => {
    dropNet();
    state = { view: "online", notice: "" };
    stage.innerHTML = `
      <section class="ttt-panel">
        <button class="ttt-back" type="button" data-action="menu">Back</button>
        <p class="ttt-kicker">U.G. / link</p>
        <h2>Multiplayer</h2>
        <p class="ttt-copy">Host a table and share the code, or join a friend's table.</p>
        <div class="mode-list">
          <button class="mode-btn" type="button" data-action="host">Host</button>
          <button class="mode-btn alt" type="button" data-action="join-mode">Join</button>
        </div>
        <p class="mode-note" data-note hidden></p>
      </section>`;
  };

  const setNote = (text) => {
    const note = stage.querySelector("[data-note]");
    if (!note) return;
    note.hidden = !text;
    note.textContent = text || "";
  };

  const showHostWait = () => {
    state.view = "lobby";
    stage.innerHTML = `
      <section class="ttt-panel">
        <button class="ttt-back" type="button" data-action="menu">Back</button>
        <p class="ttt-kicker">Room</p>
        <h2>Hosting</h2>
        <p class="room-code">${net.code}</p>
        <p class="ttt-copy">Share this code. The other player joins with it.</p>
      </section>`;
  };

  const showJoin = () => {
    state.view = "join";
    stage.innerHTML = `
      <section class="ttt-panel">
        <button class="ttt-back" type="button" data-action="online">Back</button>
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
  };

  const showOnlinePick = () => {
    state.view = "pick";
    state.online = true;
    state.seat = net.role === "host" ? 0 : 1;
    state.picks = state.picks || [null, null];
    const mine = state.picks[state.seat];
    if (mine) {
      stage.innerHTML = `
        <section class="ttt-panel">
          <button class="ttt-back" type="button" data-action="menu">Back</button>
          <p class="ttt-kicker">Linked</p>
          <h2>${SHAPES[mine].name}</h2>
          <p class="ttt-copy">Waiting for the other player to choose a shape.</p>
        </section>`;
      return;
    }
    const cards = Object.entries(SHAPES).map(([id, shape]) => `
      <button class="shape-card" type="button" data-action="pick" data-shape="${id}">
        <span class="token" data-owner="${state.seat}">${glyph(id)}</span>
        <strong>${shape.name}</strong>
        <small>${shape.text}</small>
      </button>`).join("");
    stage.innerHTML = `
      <section class="ttt-panel">
        <button class="ttt-back" type="button" data-action="menu">Back</button>
        <p class="ttt-kicker">Player ${state.seat + 1}</p>
        <h2>Your shape</h2>
        <p class="ttt-copy">Pick on your screen. The other player picks on theirs.</p>
        <div class="shape-row">${cards}</div>
      </section>`;
  };

  const onHostData = (msg) => {
    if (!state || net.role !== "host") return;
    if (msg.t === "pick") {
      state.picks[1] = msg.shape;
      emit({ t: "picks", picks: state.picks });
      if (state.picks[0] && state.picks[1]) beginOnline();
      else showOnlinePick();
      return;
    }
    if (msg.t !== "act") return;
    if (msg.kind === "rematch") {
      if (state.winner === null && !state.draw) return;
      startMatch();
      publishSnap();
      return;
    }
    if (state.view !== "play" || state.busy || state.turn !== 1 || state.winner !== null || state.draw) return;
    if (msg.kind === "place") place(msg.index);
    if (msg.kind === "erase") erase(msg.index);
    if (msg.kind === "slide") slide(msg.from, msg.to);
    if (msg.kind === "blast") blast();
    if (msg.kind === "lines") layLines(msg.a, msg.b);
    if (msg.kind === "star") markStars(msg.indexes || []);
    if (msg.kind === "hex") hexRite();
    if (msg.kind === "heart") charm();
  };

  const onGuestData = (msg) => {
    if (!state || net.role !== "guest") return;
    if (msg.t === "picks") {
      state.picks = msg.picks;
      if (!(state.picks[0] && state.picks[1])) showOnlinePick();
      return;
    }
    if (msg.t === "fx") queueFx(msg.fx);
    if (msg.t === "snap") queueSnap(msg.snap);
  };

  const hostRoom = () => {
    if (!window.Peer) {
      setNote("Multiplayer could not load. Refresh and try again.");
      return;
    }
    dropNet();
    state = { view: "lobby", notice: "" };
    const code = roomCode();
    net.code = code;
    net.role = "host";
    const peer = new window.Peer(peerId(code), peerOptions);
    net.peer = peer;
    stage.innerHTML = `
      <section class="ttt-panel">
        <button class="ttt-back" type="button" data-action="menu">Back</button>
        <p class="ttt-kicker">Room</p>
        <h2>Opening</h2>
        <p class="ttt-copy">Connecting the table...</p>
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
        state.picks = [null, null];
        state.online = true;
        state.seat = 0;
        showOnlinePick();
      });
      conn.on("data", onHostData);
      conn.on("close", () => {
        if (conn.__ugSilent) return;
        onDrop();
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
    state = { view: "join", notice: "" };
    net.role = "guest";
    net.code = code;
    const peer = new window.Peer(peerOptions);
    net.peer = peer;
    showJoin();
    setNote("Connecting...");
    peer.on("open", () => {
      if (net.peer !== peer) return;
      const conn = peer.connect(peerId(code), { reliable: true });
      net.conn = conn;
      conn.on("open", () => {
        state.picks = [null, null];
        state.online = true;
        state.seat = 1;
        showOnlinePick();
      });
      conn.on("data", onGuestData);
      conn.on("close", () => {
        if (conn.__ugSilent) return;
        onDrop();
      });
      conn.on("error", () => {
        if (conn.__ugSilent) return;
        setNote("Could not join that room. The host has to be waiting.");
      });
    });
    peer.on("error", (err) => {
      if (net.peer !== peer) return;
      const missing = err.type === "peer-unavailable";
      setNote(missing ? "Couldn't find that room. The host has to click Host first." : (err.message || "Could not join."));
    });
  };

  stage.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-join]");
    if (!form) return;
    event.preventDefault();
    joinRoom(form.querySelector("input")?.value || "");
  });

  const HOLD_DELAY = 450;
  const HOLD_MS = 750;
  let hold = null;
  let armedPointer = null;
  let suppressClick = false;

  const clearHold = () => {
    if (!hold) return;
    window.clearTimeout(hold.armTimer);
    window.clearTimeout(hold.timer);
    if (hold.ring) hold.ring.remove();
    hold = null;
  };

  const finishHold = () => {
    if (!hold || hold.done || !hold.ring) return;
    const pointerId = hold.id;
    hold.done = true;
    window.clearTimeout(hold.timer);
    hold.ring.remove();
    hold = null;
    armedPointer = pointerId;
    beginAbility();
  };

  const showRing = () => {
    if (!hold || hold.ring || hold.done) return;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "hold-ring");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.style.left = `${hold.x}px`;
    svg.style.top = `${hold.y}px`;
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "50");
    circle.setAttribute("cy", "50");
    circle.setAttribute("r", "42");
    circle.setAttribute("transform", "rotate(-90 50 50)");
    svg.appendChild(circle);
    document.body.appendChild(svg);
    hold.ring = svg;
    hold.start = performance.now();
    hold.timer = window.setTimeout(finishHold, HOLD_MS);
    try { stage.setPointerCapture(hold.id); } catch (error) { /* the ring still tracks the pointer */ }
  };

  const startHold = (event) => {
    if (!state || state.view !== "play" || state.busy || state.winner !== null || state.draw || !myTurn()) return;
    if (event.button != null && event.button !== 0) return;
    if (!event.target.closest(".board")) return;
    if (state.mode !== "idle") return;
    const player = state.players[state.turn];
    if (player.cooldown > 0 || !abilityPossible(state.turn)) return;
    clearHold();
    const pointerId = event.pointerId;
    hold = {
      id: pointerId,
      x: event.clientX,
      y: event.clientY,
      ring: null,
      done: false,
      start: 0,
      timer: 0,
      armTimer: window.setTimeout(showRing, HOLD_DELAY),
    };
  };

  stage.addEventListener("pointerdown", (event) => {
    if (armedPointer != null && event.pointerId !== armedPointer) {
      armedPointer = null;
      suppressClick = false;
    }
    startHold(event);
  });
  stage.addEventListener("pointermove", (event) => {
    if (!hold || event.pointerId !== hold.id || hold.done) return;
    const dx = event.clientX - hold.x;
    const dy = event.clientY - hold.y;
    if (dx * dx + dy * dy > 36 * 36) clearHold();
  });
  stage.addEventListener("pointerup", (event) => {
    if (hold && event.pointerId === hold.id && !hold.done) {
      if (hold.ring && performance.now() - hold.start >= HOLD_MS - 40) finishHold();
      else clearHold();
    }
    if (armedPointer === event.pointerId) {
      suppressClick = true;
      armedPointer = null;
    }
  });
  stage.addEventListener("pointercancel", (event) => {
    if (!hold || event.pointerId !== hold.id || hold.done) return;
    if (!hold.ring || performance.now() - hold.start < 200) clearHold();
  });
  stage.addEventListener("contextmenu", (event) => {
    if (event.target.closest(".board")) event.preventDefault();
  });

  stage.addEventListener("click", (event) => {
    if (suppressClick) {
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const action = event.target.closest("[data-action]");
    if (action) {
      const name = action.dataset.action;
      if (name === "close") close();
      if (name === "online") showOnline();
      if (name === "host") hostRoom();
      if (name === "join-mode") showJoin();
      if (name === "local") {
        dropNet();
        state = { view: "pick", picked: [], online: false };
        showPick();
      }
      if (name === "pick-back") {
        if (!state.picked || state.picked.length === 0) showMenu();
        else {
          state.picked.pop();
          showPick();
        }
      }
      if (name === "pick") {
        if (state.online) {
          state.picks[state.seat] = action.dataset.shape;
          if (net.role === "host") {
            emit({ t: "picks", picks: state.picks });
            if (state.picks[0] && state.picks[1]) beginOnline();
            else showOnlinePick();
          } else {
            emit({ t: "pick", shape: action.dataset.shape });
            showOnlinePick();
          }
          return;
        }
        state.picked.push(action.dataset.shape);
        if (state.picked.length < 2) showPick();
        else startMatch();
      }
      if (name === "menu") showMenu();
      if (name === "rematch") {
        if (state.online && net.role === "guest") {
          emit({ t: "act", kind: "rematch" });
          return;
        }
        startMatch();
        publishSnap();
      }
      return;
    }
    const cell = event.target.closest("[data-cell]");
    if (cell) onCell(Number(cell.dataset.cell));
  });

  stage.addEventListener("mouseover", (event) => {
    if (!state || state.view !== "play" || state.mode !== "line") return;
    const cell = event.target.closest("[data-cell]");
    const next = cell ? Number(cell.dataset.cell) : null;
    if (next === state.hover) return;
    state.hover = next;
    const aim = next == null ? [] : linePair(next);
    const blocked = aim.length > 0 && !pairOpen(aim);
    stage.querySelectorAll(".cell").forEach((button) => {
      const index = Number(button.dataset.cell);
      const aimed = aim.includes(index);
      button.classList.toggle("is-aim", aimed && !blocked);
      button.classList.toggle("is-blocked", aimed && blocked);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (!state || state.view !== "play") return;
    if (event.key === "Escape") {
      if (state.busy) return;
      state.mode = "idle";
      state.selected = null;
      state.chosen = [];
      state.hover = null;
      renderPlay();
    }
    if (event.key === "e" || event.key === "E") {
      event.preventDefault();
      beginAbility();
    }
  });

  openButton.addEventListener("click", open);
})();
