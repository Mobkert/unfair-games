(() => {
  const openButton = document.querySelector("#open-battle");
  const root = document.querySelector("#battle");
  const ui = document.querySelector("#battle-root");
  const call = document.querySelector("#battle-call");
  const loot = document.querySelector("#battle-loot");
  let fx = document.querySelector("#battle-fx");
  if (!fx && root) {
    fx = document.createElement("div");
    fx.id = "battle-fx";
    fx.className = "bs-fx";
    fx.hidden = true;
    root.appendChild(fx);
  }
  if (!openButton || !root || !ui || !call || !loot || !fx) return;

  const FLEET = [
    { id: "carrier", name: "Carrier", len: 5, color: "#4a515a" },
    { id: "battleship", name: "Battleship", len: 4, color: "#3a414a" },
    { id: "cruiser", name: "Cruiser", len: 3, color: "#5c6572" },
    { id: "submarine", name: "Submarine", len: 3, color: "#1b2128" },
    { id: "destroyer", name: "Destroyer", len: 2, color: "#6d7682" },
  ];
  const COLS = "ABCDEFGHIJ".split("");
  const CD = { radar: 3 };
  const CARDS = {
    torpedo: ["Torpedo", "One line from the left or the top. It stops at the first ship."],
    mine: ["Sea mine", "Arm a 2×2. It explodes at the start of your next turn."],
    buoy: ["Decoy buoy", "Place a 1×1 on your water. Their radar has a 50% chance to find the buoy instead."],
    patch: ["Patch", "Repair one hit on a ship that is still afloat. That square no longer counts until they shoot it again."],
    missile: ["Missile", "Aim a 3×3. It strikes at the start of your turn, two turns after launch."],
  };
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  let phase = "menu";
  let mode = "bot";
  let players = [];
  let current = 0;
  let placer = 0;
  let rot = "h";
  let selected = "carrier";
  let weapon = null;
  let notice = "";
  let eyesCopy = "";
  let eyesNext = null;
  let winner = -1;
  let busy = false;
  let hover = null;
  let timer = 0;
  let callTimer = 0;
  let callToken = 0;
  let pickTimer = 0;
  let flyTimer = 0;
  let fxToken = 0;
  let splash = null;
  let pendingImpact = null;
  let audioCtx = null;
  let seat = 0;
  let selfReady = false;
  let foeReady = false;
  let battleStarted = false;
  let wantAgain = false;
  let foeAgain = false;
  let endKind = "";
  let netLive = false;
  let queuedAct = null;
  const net = { peer: null, conn: null, role: "", code: "", seq: 0, wait: 0, boom: null };
  const peerOptions = { host: "0.peerjs.com", port: 443, path: "/", secure: true };
  const codeChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  const hush = () => {
    clearTimeout(callTimer);
    callToken += 1;
    call.hidden = true;
    call.classList.remove("is-on", "is-win");
  };

  const clearLoot = () => {
    clearTimeout(pickTimer);
    clearTimeout(flyTimer);
    loot.hidden = true;
    loot.className = "bs-loot";
    loot.innerHTML = "";
    loot.onclick = null;
  };

  const flashCall = (title, detail, suspense) => {
    callToken += 1;
    const token = callToken;
    call.classList.remove("is-on", "is-win");
    call.hidden = false;
    call.innerHTML = `<div class="bs-call-card"><i></i><p>${esc(title)}</p>${detail ? `<span>${esc(detail)}</span>` : ""}<i></i></div>`;
    void call.offsetWidth;
    call.classList.add("is-on");
    if (suspense) call.classList.add("is-win");
    clearTimeout(callTimer);
    callTimer = setTimeout(() => {
      if (token !== callToken) return;
      call.hidden = true;
      call.classList.remove("is-on", "is-win");
    }, suspense ? 3600 : 1560);
  };

  const callTitle = (note) => {
    if (/sank the/i.test(note)) return "Sunk";
    if (note.includes("Hit")) return "Hit";
    if (note.includes("Miss")) return "Miss";
    if (note.startsWith("Radar")) return "Radar";
    if (note.startsWith("Sea mine")) return "Mine armed";
    if (note.startsWith("Patched")) return "Patched";
    if (note.startsWith("Missile")) return "Missile";
    if (note.includes("old damage")) return "Wreckage";
    return "Turn";
  };

  const esc = (value) => String(value).replace(/[&<>"]/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;",
  }[ch]));

  let masterGain = null;
  let noiseBuffer = null;

  const audio = () => {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") audioCtx.resume();
    if (!masterGain) {
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.85;
      masterGain.connect(audioCtx.destination);
    }
    return audioCtx;
  };

  const tone = (freq, dur, type) => {
    try {
      const ctx = audio();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime;
      osc.type = type || "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      osc.stop(t + dur);
    } catch (error) {
      /* This browser blocked the sound. */
    }
  };

  const sfx = (name) => {
    try {
      const ctx = audio();
      const t = ctx.currentTime;
      const bus = masterGain;
      const beep = (freq, dur, type, peak, delay = 0, slide) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = t + delay;
        osc.type = type;
        osc.frequency.setValueAtTime(Math.max(30, freq), start);
        if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slide), start + dur);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.03, dur * 0.25));
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        osc.connect(gain);
        gain.connect(bus);
        osc.start(start);
        osc.stop(start + dur + 0.03);
      };
      const wash = (dur, peak, freq, q, delay = 0, slide) => {
        if (!noiseBuffer) {
          noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
          const data = noiseBuffer.getChannelData(0);
          for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
        }
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer;
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        const start = t + delay;
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(freq, start);
        if (slide) filter.frequency.exponentialRampToValueAtTime(Math.max(80, slide), start + dur);
        filter.Q.value = q;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(peak, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(bus);
        src.start(start);
        src.stop(start + dur + 0.03);
      };
      if (name === "splash") {
        beep(160, 0.22, "sine", 0.14, 0, 55);
        beep(70, 0.34, "sine", 0.08, 0.02, 40);
        wash(0.4, 0.2, 900, 0.6, 0, 400);
        wash(0.18, 0.07, 2800, 3, 0.05);
        beep(1600, 0.07, "sine", 0.025, 0.08);
        beep(2100, 0.05, "sine", 0.015, 0.14);
      } else if (name === "hit") {
        wash(0.16, 0.2, 2200, 0.8);
        wash(0.38, 0.22, 320, 0.5, 0, 90);
        beep(130, 0.36, "sine", 0.16, 0, 42);
        beep(62, 0.45, "triangle", 0.1, 0.03, 36);
      } else if (name === "sunk") {
        wash(0.55, 0.26, 240, 0.45, 0, 70);
        wash(0.2, 0.14, 1600, 0.7);
        beep(98, 0.6, "sine", 0.18, 0, 30);
        beep(210, 0.4, "sawtooth", 0.05, 0.04, 50);
        beep(46, 0.8, "sine", 0.1, 0.1);
      } else if (name === "sonar") {
        beep(540, 0.35, "sine", 0.07, 0, 320);
        beep(860, 0.28, "sine", 0.05, 0.18, 500);
        beep(420, 0.4, "triangle", 0.03, 0.42, 240);
        wash(0.5, 0.04, 1400, 4, 0.05, 600);
      } else if (name === "torpedo") {
        wash(0.7, 0.1, 180, 0.8, 0, 90);
        beep(90, 0.55, "sawtooth", 0.04, 0, 40);
        beep(220, 0.2, "sine", 0.03, 0.05, 140);
      } else if (name === "rocket") {
        wash(0.85, 0.16, 400, 0.5, 0, 2200);
        beep(180, 0.7, "sawtooth", 0.05, 0, 900);
        beep(640, 0.4, "square", 0.02, 0.12, 1800);
      } else if (name === "boom") {
        wash(0.45, 0.24, 200, 0.4, 0, 60);
        beep(70, 0.5, "sine", 0.18, 0, 32);
        beep(40, 0.6, "triangle", 0.08, 0.04);
      } else if (name === "hammer") {
        beep(180, 0.08, "square", 0.06);
        wash(0.12, 0.1, 900, 1.4);
        beep(90, 0.2, "triangle", 0.08, 0.03, 50);
      } else if (name === "glass") {
        wash(0.28, 0.12, 3200, 2.4, 0, 1400);
        beep(1800, 0.12, "square", 0.03);
        beep(2400, 0.1, "square", 0.02, 0.04);
      } else if (name === "chime") {
        beep(660, 0.18, "sine", 0.05);
        beep(990, 0.22, "sine", 0.03, 0.04);
      } else if (name === "buoy") {
        beep(240, 0.12, "sine", 0.06, 0, 120);
        wash(0.2, 0.08, 1000, 1);
      } else if (name === "clunk") {
        beep(110, 0.12, "triangle", 0.08, 0, 60);
        wash(0.1, 0.06, 500, 1);
      } else if (name === "win") {
        beep(392, 0.2, "sine", 0.06);
        beep(494, 0.2, "sine", 0.06, 0.12);
        beep(587, 0.28, "sine", 0.07, 0.24);
        beep(784, 0.5, "triangle", 0.05, 0.38);
      } else if (name === "lose") {
        beep(311, 0.3, "sine", 0.06, 0, 180);
        beep(196, 0.4, "triangle", 0.05, 0.22, 90);
        beep(98, 0.6, "sine", 0.05, 0.4, 50);
      }
    } catch (error) {
      /* This browser blocked the sound. */
    }
  };

  const later = (fn, ms) => {
    clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };

  const grid = () => Array.from({ length: 10 }, () => Array(10).fill(null));

  const createPlayer = () => ({
    ships: [],
    ocean: grid(),
    attack: grid(),
    wrecks: [],
    cd: { radar: 0 },
    charges: { torpedo: 0, mine: 0, buoy: 0, patch: 0, missile: 0 },
    buoys: [],
    pendingSunk: [],
    fresh: "",
    radar: null,
    mine: null,
    missile: null,
    flash: [],
    incoming: [],
    quiet: 0,
  });

  const nameOf = (index) => {
    if (mode === "online") return index === seat ? "You" : "Rival";
    return mode === "bot" ? (index === 0 ? "You" : "Rival") : `Player ${index + 1}`;
  };

  const turnName = (index) => {
    if (mode === "online") return index === seat ? "Your" : "Rival's";
    return mode === "bot" ? (index === 0 ? "Your" : "Rival's") : `Player ${index + 1}'s`;
  };

  const boardTurn = () => (current === viewIndex() ? `${turnName(current)} turn` : "Next player's turn");

  const viewIndex = () => (mode === "bot" ? 0 : mode === "online" ? seat : current);

  const yourTurn = () => phase === "battle" && !busy && (
    mode === "online" ? current === seat : (mode === "hotseat" || current === 0)
  );

  const specOf = (id) => FLEET.find((ship) => ship.id === id);

  const remaining = (player) => {
    const used = new Set(player.ships.map((ship) => ship.id));
    return FLEET.filter((ship) => !used.has(ship.id));
  };

  const shipAt = (player, x, y) => player.ships.find((ship) => ship.cells.some((cell) => cell.x === x && cell.y === y)) || null;

  const footprint = (x, y, len, facing) => {
    const cells = [];
    for (let i = 0; i < len; i += 1) {
      const cx = x + (facing === "h" ? i : 0);
      const cy = y + (facing === "v" ? i : 0);
      if (cx < 0 || cy < 0 || cx >= 10 || cy >= 10) return null;
      cells.push({ x: cx, y: cy });
    }
    return cells;
  };

  const canPlace = (player, cells) => cells.every((cell) => !shipAt(player, cell.x, cell.y));

  const commit = (player, spec, cells) => {
    player.ships.push({
      id: spec.id,
      name: spec.name,
      len: spec.len,
      color: spec.color,
      cells,
      hits: 0,
    });
  };

  const allSunk = (player) => player.ships.length === 5 && player.ships.every((ship) => ship.hits >= ship.len);

  const unsunk = (player) => player.ships.filter((ship) => ship.hits < ship.len);

  const taken = (cell) => !!(cell && cell !== "sealed");

  const resolveCell = (attacker, defender, x, y) => {
    if (taken(attacker.attack[y][x])) return null;
    defender.buoys = defender.buoys.filter((cell) => !(cell.x === x && cell.y === y));
    const ship = shipAt(defender, x, y);
    const key = `${x},${y}`;
    attacker.flash.push(key);
    defender.incoming.push(key);
    if (!ship) {
      attacker.attack[y][x] = "miss";
      defender.ocean[y][x] = "miss";
      return { kind: "miss" };
    }
    attacker.attack[y][x] = "hit";
    defender.ocean[y][x] = "hit";
    ship.hits += 1;
    if (ship.hits >= ship.len) {
      attacker.wrecks.push({
        id: ship.id,
        name: ship.name,
        color: ship.color,
        cells: ship.cells.map((cell) => ({ x: cell.x, y: cell.y })),
      });
      return { kind: "sunk", ship };
    }
    return { kind: "hit", ship };
  };

  const spend = (player, key) => {
    player.cd[key] = CD[key] + 1;
  };

  const shuffle = (list) => {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const swap = copy[i];
      copy[i] = copy[j];
      copy[j] = swap;
    }
    return copy;
  };

  const cardChoices = (ship) => {
    let choices;
    if (ship.id === "destroyer" || ship.id === "cruiser") choices = ["mine"];
    else {
      const deck = shuffle(["torpedo", "mine", "buoy", "patch"]);
      choices = ship.id === "carrier" ? deck.slice(0, 3) : deck.slice(0, 2);
    }
    const chance = ship.id === "carrier" ? 0.15 : 0.05;
    if (Math.random() < chance) choices = choices.concat("missile");
    return choices;
  };

  const stocked = (player, id) => {
    if (id === "radar") return player.cd.radar <= 0;
    if (id === "mine" && player.mine) return false;
    if (id === "missile" && player.missile) return false;
    return (player.charges[id] || 0) > 0;
  };

  const radarZones = (ship) => {
    const zones = [];
    for (let y = 0; y <= 7; y += 1) {
      for (let x = 0; x <= 7; x += 1) {
        const covers = ship.cells.some((cell) => cell.x >= x && cell.x < x + 3 && cell.y >= y && cell.y < y + 3);
        if (covers) zones.push({ x, y });
      }
    }
    return zones;
  };

  const strikeCells = (player, opponent, cells) => {
    const sunk = [];
    cells.forEach((cell) => {
      const result = resolveCell(player, opponent, cell.x, cell.y);
      if (result && result.kind !== "miss") {
        player.tags.push({
          x: cell.x,
          y: cell.y,
          title: result.kind === "sunk" ? "Sunk" : "Hit",
          detail: result.kind === "sunk" ? result.ship.name : "",
        });
      }
      if (result && result.kind === "sunk") {
        sunk.push(result.ship.name);
        player.pendingSunk.push(result.ship);
      }
    });
    return sunk;
  };

  const beginTurn = (player, opponent) => {
    player.pendingSunk = [];
    if (player.cd.radar > 0) player.cd.radar -= 1;
    if (player.radar) {
      if (player.radar.seen) player.radar = null;
      else player.radar.seen = true;
    }
    const arriving = player.missile && player.missile.left <= 1;
    if (player.mine || arriving) {
      player.flash = [];
      player.tags = [];
    }
    const notes = [];
    const who = nameOf(players.indexOf(player));
    const whose = who === "You" ? "Your" : `${who}'s`;
    if (player.mine) {
      player.boom = { x: player.mine[0].x, y: player.mine[0].y };
      player.justBoom = true;
      const sunk = strikeCells(player, opponent, player.mine);
      player.mine = null;
      let text = `${whose} sea mine detonates.`;
      if (sunk.length) text += ` Sank the ${sunk.join(" and the ")}.`;
      notes.push(text);
    }
    if (player.missile) {
      player.missile.left -= 1;
      if (player.missile.left <= 0) {
        player.strike = { x: player.missile.x + 1, y: player.missile.y + 1 };
        player.justBoom = true;
        const sunk = strikeCells(player, opponent, player.missile.cells);
        player.missile = null;
        let text = `${whose} missile strikes.`;
        if (sunk.length) text += ` Sank the ${sunk.join(" and the ")}.`;
        notes.push(text);
      }
    }
    return notes.join(" ");
  };

  const showWin = (who, text, disconnected) => {
    clearTimeout(timer);
    winner = who;
    endKind = disconnected ? "disconnect" : "";
    notice = text || "";
    busy = true;
    weapon = null;
    if (phase !== "battle" && phase !== "place" && phase !== "again") phase = "battle";
    if (phase !== "end") render();
    const yours = endKind === "disconnect" || (mode === "online" ? who === seat : (mode !== "bot" || who === 0));
    flashCall(
      endKind === "disconnect" ? "Player disconnected" : (yours ? "Good job" : "Fleet lost"),
      endKind === "disconnect" ? "The other player left" : (yours ? "The fleet is gone" : "They sank the fleet"),
      true,
    );
    sfx(endKind === "disconnect" || yours ? "win" : "lose");
    later(() => {
      if (root.hidden || phase === "menu") return;
      phase = "end";
      busy = false;
      render();
    }, 2700);
  };

  const botPlace = (player) => {
    const specs = [...FLEET].sort(() => Math.random() - 0.5);
    specs.forEach((spec) => {
      const options = [];
      ["h", "v"].forEach((facing) => {
        for (let y = 0; y < 10; y += 1) {
          for (let x = 0; x < 10; x += 1) {
            const cells = footprint(x, y, spec.len, facing);
            if (cells && canPlace(player, cells)) options.push(cells);
          }
        }
      });
      commit(player, spec, options[Math.floor(Math.random() * options.length)]);
    });
  };

  const openHits = (attacker) => {
    const wreck = new Set();
    attacker.wrecks.forEach((ship) => ship.cells.forEach((cell) => wreck.add(`${cell.x},${cell.y}`)));
    const hits = [];
    for (let y = 0; y < 10; y += 1) {
      for (let x = 0; x < 10; x += 1) {
        const mark = attacker.attack[y][x];
        if ((mark === "hit" || mark === "sealed") && !wreck.has(`${x},${y}`)) hits.push({ x, y });
      }
    }
    return hits;
  };

  const lineShot = (bot, hits) => {
    const options = [];
    const rows = new Map();
    const cols = new Map();
    hits.forEach((hit) => {
      if (!rows.has(hit.y)) rows.set(hit.y, []);
      rows.get(hit.y).push(hit.x);
      if (!cols.has(hit.x)) cols.set(hit.x, []);
      cols.get(hit.x).push(hit.y);
    });
    rows.forEach((xs, y) => {
      if (xs.length < 2) return;
      xs.sort((a, b) => a - b);
      for (let x = xs[0] - 1; x >= 0; x -= 1) {
        if (bot.attack[y][x] === "miss") break;
        if (!bot.attack[y][x]) {
          options.push({ x, y });
          break;
        }
      }
      for (let x = xs[xs.length - 1] + 1; x < 10; x += 1) {
        if (bot.attack[y][x] === "miss") break;
        if (!bot.attack[y][x]) {
          options.push({ x, y });
          break;
        }
      }
    });
    cols.forEach((ys, x) => {
      if (ys.length < 2) return;
      ys.sort((a, b) => a - b);
      for (let y = ys[0] - 1; y >= 0; y -= 1) {
        if (bot.attack[y][x] === "miss") break;
        if (!bot.attack[y][x]) {
          options.push({ x, y });
          break;
        }
      }
      for (let y = ys[ys.length - 1] + 1; y < 10; y += 1) {
        if (bot.attack[y][x] === "miss") break;
        if (!bot.attack[y][x]) {
          options.push({ x, y });
          break;
        }
      }
    });
    if (!options.length) return null;
    return options[Math.floor(Math.random() * options.length)];
  };

  const botTarget = (bot) => {
    if (bot.radar) {
      const inside = bot.radar.cells.filter((cell) => !bot.attack[cell.y][cell.x]);
      if (inside.length) return inside[Math.floor(Math.random() * inside.length)];
    }
    const hits = openHits(bot);
    if (hits.length >= 2) {
      const lined = lineShot(bot, hits);
      if (lined) return lined;
    }
    if (hits.length) {
      const neighbors = [];
      hits.forEach((hit) => {
        DIRS.forEach(([dx, dy]) => {
          const x = hit.x + dx;
          const y = hit.y + dy;
          if (x >= 0 && y >= 0 && x < 10 && y < 10 && !bot.attack[y][x]) neighbors.push({ x, y });
        });
      });
      if (neighbors.length) return neighbors[Math.floor(Math.random() * neighbors.length)];
    }
    const unknown = [];
    for (let y = 0; y < 10; y += 1) {
      for (let x = 0; x < 10; x += 1) {
        if (!bot.attack[y][x]) unknown.push({ x, y });
      }
    }
    const parity = unknown.filter((cell) => (cell.x + cell.y) % 2 === 0);
    const pool = parity.length ? parity : unknown;
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const mineTarget = (bot) => {
    const hits = openHits(bot);
    if (!hits.length) return null;
    let best = null;
    let score = 0;
    for (let y = 0; y < 9; y += 1) {
      for (let x = 0; x < 9; x += 1) {
        let unknown = 0;
        let near = 0;
        for (let dy = 0; dy < 2; dy += 1) {
          for (let dx = 0; dx < 2; dx += 1) {
            if (!bot.attack[y + dy][x + dx]) unknown += 1;
            const close = hits.some((hit) => Math.abs(hit.x - (x + dx)) + Math.abs(hit.y - (y + dy)) <= 1);
            if (close) near += 1;
          }
        }
        const rank = unknown + near * 2;
        if (unknown >= 2 && near > 0 && rank > score) {
          score = rank;
          best = { x, y };
        }
      }
    }
    return best;
  };

  const torpedoTarget = (bot) => {
    const hits = openHits(bot);
    let best = null;
    let score = 0;
    ["row", "col"].forEach((axis) => {
      for (let index = 0; index < 10; index += 1) {
        let unknown = 0;
        let hunt = 0;
        for (let step = 0; step < 10; step += 1) {
          const x = axis === "col" ? index : step;
          const y = axis === "row" ? index : step;
          if (!bot.attack[y][x]) unknown += 1;
          if (hits.some((hit) => hit.x === x && hit.y === y)) hunt += 1;
        }
        const rank = unknown + hunt * 4;
        if (unknown >= 4 && rank > score) {
          score = rank;
          best = { axis, index };
        }
      }
    });
    return best;
  };

  const startBattle = () => {
    phase = "battle";
    current = 0;
    weapon = null;
    busy = false;
    notice = "Your turn. A hit lets you shoot again.";
    beginTurn(players[0], players[1]);
    render();
  };

  const showEyes = (detail, copy, next) => {
    phase = "eyes";
    notice = detail;
    eyesCopy = copy;
    eyesNext = next;
    busy = false;
    render();
  };

  const afterPlace = () => {
    tone(440, 0.05, "square");
    const player = players[placer];
    const left = remaining(player);
    if (mode === "online") {
      if (left.length) {
        selected = left[0].id;
        notice = "Ship placed.";
        render();
        return;
      }
      selfReady = true;
      busy = true;
      notice = "Fleet set. Waiting for the other player.";
      send({ t: "placed" });
      render();
      tryGo();
      return;
    }
    if (mode === "bot") {
      if (!left.length) startBattle();
      else {
        selected = left[0].id;
        notice = "Ship placed.";
        render();
      }
      return;
    }
    const done = players[0].ships.length === 5 && players[1].ships.length === 5;
    const next = done ? 0 : 1 - placer;
    showEyes(
      "Ship placed.",
      done ? `Let ${nameOf(0)} take the first shot.` : `Let ${nameOf(next)} place a ship.`,
      () => {
        if (done) startBattle();
        else {
          placer = next;
          selected = remaining(players[placer])[0].id;
          phase = "place";
          notice = "";
          render();
        }
      },
    );
  };

  const keepTurn = (delay) => {
    weapon = null;
    phase = "battle";
    if (mode === "bot" && current === 1) {
      busy = true;
      render();
      later(() => {
        if (root.hidden || phase !== "battle" || current !== 1) return;
        if (!botWeapon()) botShoot();
      }, delay || 520);
      return;
    }
    busy = false;
    render();
  };

  const shatterCard = (card, index) => {
    card.classList.add("is-shatter");
    const lines = index % 2 === 0
      ? "M52 4 L44 34 L14 46 M44 34 L50 72 L24 122 M50 72 L84 92 L76 134 M50 72 L66 48 L96 22"
      : "M28 8 L46 40 L18 74 M46 40 L72 58 L94 26 M72 58 L58 96 L36 132 M46 40 L40 18";
    const bits = Array.from({ length: 16 }, (_, bit) => {
      const spark = bit > 10;
      const spin = (360 / 16) * bit - 16;
      const dist = (spark ? 64 : 108) + ((bit * 19) % 54);
      const delay = (0.66 + (bit % 5) * 0.035).toFixed(2);
      return `<i class="${spark ? "is-spark" : ""}" style="--d:${dist}px;--spin:${spin}deg;--delay:${delay}s"></i>`;
    }).join("");
    card.insertAdjacentHTML("beforeend", `
      <svg class="bs-cracks" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true"><path d="${lines}"></path></svg>
      <span class="bs-shatter" aria-hidden="true"><b class="bs-flash"></b><b class="bs-ring"></b>${bits}</span>`);
  };

  const showDeal = (who, ship, done) => {
    const choices = cardChoices(ship);
    loot.hidden = false;
    loot.className = "bs-loot";
    loot.innerHTML = `
      <div class="bs-deal">
        <p class="bs-deal-title">Sunk</p>
        <p class="bs-deal-sub">${esc(ship.name)}. ${choices.length === 1 ? "Take this card." : "Take one card."}</p>
        <div class="bs-fan">${choices.map((id, index) => `
          <button type="button" class="bs-prize" data-prize="${id}" style="--i:${index}">
            ${id === "missile" ? `<b class="bs-rare">Rare</b>` : ""}
            <span class="bs-mount">${gear[id]}</span>
            <strong>${CARDS[id][0]}</strong>
            <em>${CARDS[id][1]}</em>
          </button>`).join("")}
        </div>
      </div>`;
    clearTimeout(pickTimer);
    pickTimer = setTimeout(() => {
      if (!loot.hidden) loot.classList.add("is-live");
    }, 1100);
    loot.onclick = (event) => {
      const button = event.target.closest("[data-prize]");
      if (!button || !loot.classList.contains("is-live")) return;
      loot.onclick = null;
      const id = button.dataset.prize;
      players[who].charges[id] += 1;
      players[who].fresh = id;
      const target = ui.querySelector(`.bs-weapon.is-${id}`);
      const from = button.getBoundingClientRect();
      const to = target ? target.getBoundingClientRect() : from;
      const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
      const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
      button.style.setProperty("--fly-x", `${dx}px`);
      button.style.setProperty("--fly-y", `${dy}px`);
      loot.classList.add("is-fly");
      button.classList.add("is-chosen");
      const rejected = [...loot.querySelectorAll(".bs-prize")].filter((card) => card !== button);
      rejected.forEach((card, index) => shatterCard(card, index));
      sfx("chime");
      if (rejected.length) setTimeout(() => sfx("glass"), 420);
      if (rejected.length) setTimeout(() => sfx("boom"), 700);
      clearTimeout(flyTimer);
      flyTimer = setTimeout(() => {
        if (root.hidden || phase === "menu") return;
        clearLoot();
        done();
      }, rejected.length && !calm() ? 1500 : 880);
    };
  };

  const offerCards = (who, ships, done) => {
    const list = ships.filter(Boolean);
    const pause = players[who] && players[who].justBoom ? (players[who].strike ? 1200 : 760) : 0;
    if (players[who]) players[who].justBoom = false;
    if (!list.length) {
      done();
      return;
    }
    if (mode === "bot" && who === 1) {
      list.forEach((ship) => {
        const choices = cardChoices(ship);
        const pick = choices[Math.floor(Math.random() * choices.length)];
        players[who].charges[pick] += 1;
      });
      done();
      return;
    }
    busy = true;
    const queue = list.slice();
    const nextCard = () => {
      if (root.hidden || phase === "menu") return;
      const ship = queue.shift();
      if (!ship) {
        done();
        return;
      }
      showDeal(who, ship, nextCard);
    };
    render();
    setTimeout(nextCard, pause);
  };

  const finishAction = (note, again, sunkShips = []) => {
    const me = current;
    const foe = 1 - me;
    if (allSunk(players[foe])) {
      showWin(me, note);
      return;
    }
    if (again) {
      notice = `${note} ${turnName(me)} turn.`;
      const marked = splash;
      splash = null;
      offerCards(me, sunkShips, () => {
        keepTurn(marked ? 980 : 520);
        if (marked) tagShot(marked.x, marked.y, marked.title, marked.detail);
      });
      return;
    }
    const passed = `${note} ${turnName(foe)} turn.`;
    const handoff = () => {
      if (root.hidden) return;
      current = foe;
      weapon = null;
      const opened = beginTurn(players[foe], players[me]);
      const sunk = players[foe].pendingSunk || [];
      players[foe].pendingSunk = [];
      if (allSunk(players[me])) {
        showWin(foe, opened || passed);
        return;
      }
      notice = opened ? `${opened} ${turnName(foe)} turn.` : passed;
      phase = "battle";
      const start = () => {
        if (root.hidden || phase === "menu") return;
        if (mode === "bot" && current === 1) {
          busy = true;
          render();
          later(() => {
            if (root.hidden || phase !== "battle" || current !== 1) return;
            if (!botWeapon()) botShoot();
          }, 640);
          return;
        }
        busy = false;
        render();
      };
      offerCards(foe, sunk, start);
    };
    if (mode === "hotseat") {
      showEyes(`${note} ${nameOf(foe)}.`, "Close your eyes", handoff);
      return;
    }
    hush();
    handoff();
  };

  const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clearFx = () => {
    fxToken += 1;
    fx.hidden = true;
    fx.innerHTML = "";
  };

  const seenBoard = () => (viewIndex() === current ? "attack" : "ocean");

  const cellCenter = (board, x, y) => {
    const el = ui.querySelector(`.bs-cell[data-board="${board}"][data-x="${x}"][data-y="${y}"]`);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { el, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, w: rect.width, h: rect.height };
  };

  const tagShot = (x, y, title, detail) => {
    const cell = ui.querySelector(`.bs-cell[data-board="${seenBoard()}"][data-x="${x}"][data-y="${y}"]`);
    if (!cell) return;
    const tag = document.createElement("div");
    tag.className = "bs-tag";
    tag.innerHTML = `<strong>${esc(title)}</strong>${detail ? `<span>${esc(detail)}</span>` : ""}`;
    cell.appendChild(tag);
  };

  const stampShot = (board, x, y, kind) => {
    const el = ui.querySelector(`.bs-cell[data-board="${board}"][data-x="${x}"][data-y="${y}"]`);
    if (!el || !kind) return;
    el.classList.add(kind === "hit" ? "is-hit" : "is-miss", "is-fresh");
    const mark = kind === "hit" ? "bs-peg" : "bs-dot";
    if (!el.querySelector(`.${mark}`)) el.insertAdjacentHTML("beforeend", `<i class="${mark}"></i>`);
  };

  const splashMarkup = () => {
    const drops = Array.from({ length: 16 }, (_, i) => {
      const angle = (360 / 16) * i + (i % 2 ? 7 : -4);
      const dist = 34 + (i % 5) * 16;
      const delay = ((i % 4) * 0.03).toFixed(3);
      const size = 8 + (i % 4) * 3;
      const spike = i % 4 === 0;
      return `<b class="${spike ? "is-spike" : ""}" style="--a:${angle}deg;--d:${dist}px;--delay:${delay}s;--s:${size}px"></b>`;
    }).join("");
    const foam = Array.from({ length: 6 }, (_, i) => {
      const angle = 40 + i * 55;
      return `<b class="is-foam" style="--a:${angle}deg;--d:${22 + i * 4}px;--delay:0.04s;--s:10px"></b>`;
    }).join("");
    return `<i class="bs-splash-mist"></i><i class="bs-splash-ring"></i><i class="bs-splash-ring is-late"></i><i class="bs-splash-sheet"></i><i class="bs-splash-crown"></i><i class="bs-splash-jet"></i>${drops}${foam}`;
  };

  const explodeMarkup = () => {
    const bits = Array.from({ length: 22 }, (_, i) => {
      const angle = (360 / 22) * i + (i % 2 ? 6 : 0);
      const dist = 32 + (i % 6) * 16;
      const delay = ((i % 5) * 0.02).toFixed(3);
      const cls = i % 4 === 0 ? "is-spark" : (i % 4 === 1 ? "is-chunk" : "");
      return `<b class="${cls}" style="--a:${angle}deg;--d:${dist}px;--delay:${delay}s"></b>`;
    }).join("");
    return `<i class="bs-ex-flash"></i><i class="bs-ex-smoke"></i><i class="bs-ex-ring"></i><i class="bs-ex-ring is-late"></i><i class="bs-ex-fire"></i><i class="bs-ex-core"></i>${bits}`;
  };

  const playImpact = (board, x, y, kind) => {
    if (calm()) return;
    requestAnimationFrame(() => {
      const box = cellCenter(board, x, y);
      if (!box || root.hidden) return;
      fx.hidden = false;
      const node = document.createElement("i");
      node.className = kind === "miss" ? "bs-splash" : "bs-explode";
      if (kind === "sunk") node.classList.add("is-sunk");
      node.style.left = `${box.x}px`;
      node.style.top = `${box.y}px`;
      node.innerHTML = kind === "miss" ? splashMarkup() : explodeMarkup();
      fx.appendChild(node);
      sfx(kind === "miss" ? "splash" : (kind === "sunk" ? "sunk" : "hit"));
      setTimeout(() => {
        node.remove();
        if (!fx.children.length) fx.hidden = true;
      }, kind === "miss" ? 1400 : 1500);
    });
  };

  const armImpact = () => {
    if (!pendingImpact || phase !== "battle") return;
    const shot = pendingImpact;
    pendingImpact = null;
    playImpact(shot.board, shot.x, shot.y, shot.kind);
  };

  const burst = (box, kind) => {
    if (!box) return;
    const boom = document.createElement("i");
    boom.className = `bs-burst is-${kind} ${kind === "hit" ? "bs-explode" : "bs-splash"}`;
    boom.style.left = `${box.x}px`;
    boom.style.top = `${box.y}px`;
    boom.innerHTML = kind === "hit" ? explodeMarkup() : splashMarkup();
    fx.appendChild(boom);
    sfx(kind === "hit" ? "hit" : "splash");
    setTimeout(() => boom.remove(), 1200);
  };

  const playSonar = (done) => {
    if (calm()) {
      done();
      return;
    }
    const token = ++fxToken;
    fx.hidden = false;
    fx.innerHTML = `<div class="bs-sonar"><div class="bs-sonar-disc"><i></i><i></i><i></i><i></i><b></b><em>RADAR</em></div></div>`;
    sfx("sonar");
    setTimeout(() => {
      if (token !== fxToken) return;
      fx.hidden = true;
      fx.innerHTML = "";
      done();
    }, 1500);
  };

  const rocketSvg = () => `<svg viewBox="0 0 32 80" aria-hidden="true"><polygon points="16,2 24,20 8,20" fill="#ff5a36"/><rect x="8" y="18" width="16" height="36" rx="7" fill="#f4fbff"/><rect x="11" y="26" width="10" height="14" rx="3" fill="#7fd4ff"/><polygon points="8,34 1,50 8,46" fill="#9aa8b5"/><polygon points="24,34 31,50 24,46" fill="#9aa8b5"/><polygon points="11,54 16,76 21,54" fill="#ffb020"/><polygon points="13,54 16,68 19,54" fill="#fff6d2"/></svg>`;

  const armBoom = () => {
    const owner = players[current];
    if (!owner || phase === "menu" || phase === "place" || phase === "eyes") return;
    const boom = owner.boom;
    const strike = owner.strike;
    if (!boom && !strike) return;
    const tags = owner.tags || [];
    owner.boom = null;
    owner.strike = null;
    owner.tags = [];
    const boardName = seenBoard();
    requestAnimationFrame(() => {
      const board = ui.querySelector(`.bs-board[data-kind="${boardName}"]`);
      if (!board || root.hidden) return;
      if (boom) {
        const blast = document.createElement("i");
        blast.className = "bs-blast";
        blast.style.setProperty("--mx", boom.x);
        blast.style.setProperty("--my", boom.y);
        board.appendChild(blast);
        setTimeout(() => blast.remove(), 720);
      }
      if (strike) {
        const war = document.createElement("i");
        war.className = "bs-warhead";
        war.style.setProperty("--hx", strike.x);
        war.style.setProperty("--hy", strike.y);
        war.innerHTML = `<b class="bs-rocket">${rocketSvg()}</b><b class="bs-war-blast"></b><b class="bs-war-ring"></b>`;
        board.appendChild(war);
        setTimeout(() => war.remove(), 1300);
      }
      sfx(strike ? "sunk" : "boom");
      tags.forEach((tag) => tagShot(tag.x, tag.y, tag.title, tag.detail));
    });
  };

  const useShot = (x, y) => {
    if (mode === "online") {
      const me = players[seat];
      if (taken(me.attack[y][x])) return;
      me.flash = [];
      me.incoming = [];
      splash = null;
      weapon = null;
      busy = true;
      const n = ++net.seq;
      net.wait = n;
      send({ t: "act", n, from: seat, kind: "shot", x, y });
      notice = "Shot away.";
      render();
      return;
    }
    const me = players[current];
    const foe = players[1 - current];
    if (taken(me.attack[y][x])) return;
    me.flash = [];
    me.incoming = [];
    splash = null;
    const result = resolveCell(me, foe, x, y);
    const spot = `${COLS[x]}${y + 1}`;
    const hit = !!(result && result.kind !== "miss");
    let text = `${spot}. Miss.`;
    if (result && result.kind === "sunk") text = `${spot}. ${nameOf(current)} sank the ${result.ship.name}.`;
    else if (hit) text = `${spot}. Hit.`;
    if (hit) {
      const again = mode === "bot" && current === 1 ? "Rival shoots again" : "Shoot again";
      splash = {
        x,
        y,
        title: result.kind === "sunk" ? "Sunk" : "Hit",
        detail: result.kind === "sunk" ? result.ship.name : again,
      };
    }
    if (mode === "bot" && current === 1) me.quiet += 1;
    pendingImpact = {
      x,
      y,
      board: seenBoard(),
      kind: !hit ? "miss" : (result.kind === "sunk" ? "sunk" : "hit"),
    };
    if (hit) {
      finishAction(text, true, result && result.kind === "sunk" ? [result.ship] : []);
      return;
    }
    busy = true;
    render();
    setTimeout(() => {
      if (root.hidden || phase === "menu") return;
      finishAction(text, false, []);
    }, calm() ? 0 : 980);
  };

  const useRadar = (shipId) => {
    if (mode === "online") {
      const me = players[seat];
      const spec = specOf(shipId);
      if (!spec || me.cd.radar > 0 || me.wrecks.some((wreck) => wreck.id === shipId)) return;
      me.incoming = [];
      splash = null;
      weapon = null;
      busy = true;
      const n = ++net.seq;
      net.wait = n;
      send({ t: "act", n, from: seat, kind: "radar", ship: shipId });
      render();
      return;
    }
    const me = players[current];
    const foe = players[1 - current];
    const ship = unsunk(foe).find((item) => item.id === shipId);
    if (!ship || me.cd.radar > 0) return;
    me.incoming = [];
    splash = null;
    const trap = foe.buoys.length && Math.random() < 0.5
      ? foe.buoys[Math.floor(Math.random() * foe.buoys.length)]
      : null;
    let text = `Radar on the ${ship.name}. The mark stays through your next turn.`;
    if (trap) {
      me.radar = { cells: [{ x: trap.x, y: trap.y }], seen: false, decoy: true };
      text = `Radar on the ${ship.name}. A decoy buoy answers.`;
    } else {
      const zones = radarZones(ship);
      const zone = zones[Math.floor(Math.random() * zones.length)];
      const cells = [];
      for (let y = zone.y; y < zone.y + 3; y += 1) {
        for (let x = zone.x; x < zone.x + 3; x += 1) cells.push({ x, y });
      }
      me.radar = { cells, seen: false };
    }
    spend(me, "radar");
    weapon = null;
    if (current === 1) me.quiet = 0;
    busy = true;
    render();
    playSonar(() => {
      if (root.hidden || phase === "menu") return;
      finishAction(text);
    });
  };

  const useTorpedo = (axis, index) => {
    if (mode === "online") {
      const me = players[seat];
      if ((me.charges.torpedo || 0) <= 0) return;
      me.charges.torpedo -= 1;
      me.flash = [];
      me.incoming = [];
      splash = null;
      weapon = null;
      busy = true;
      sfx("torpedo");
      const n = ++net.seq;
      net.wait = n;
      send({ t: "act", n, from: seat, kind: "torpedo", axis, index });
      render();
      return;
    }
    const me = players[current];
    const foe = players[1 - current];
    if ((me.charges.torpedo || 0) <= 0) return;
    me.charges.torpedo -= 1;
    me.flash = [];
    me.incoming = [];
    splash = null;
    const where = axis === "col" ? `column ${COLS[index]}` : `row ${index + 1}`;
    const path = [];
    for (let step = 0; step < 10; step += 1) {
      const x = axis === "col" ? index : step;
      const y = axis === "row" ? index : step;
      const shipHere = !!shipAt(foe, x, y);
      path.push({ x, y, shipHere });
      if (shipHere) break;
    }
    const outcome = { text: `Torpedo swept ${where}. Miss.`, again: false, sunkShip: null };
    weapon = null;
    if (current === 1) me.quiet = 0;
    busy = true;
    sfx("torpedo");
    render();
    const board = seenBoard();
    const arrive = (step) => {
      if (!step.shipHere) {
        resolveCell(me, foe, step.x, step.y);
        stampShot(board, step.x, step.y, me.attack[step.y][step.x] || "miss");
        return "";
      }
      const before = me.attack[step.y][step.x];
      const result = resolveCell(me, foe, step.x, step.y);
      stampShot(board, step.x, step.y, "hit");
      if (result && result.kind === "sunk") {
        outcome.text = `Torpedo hit ${where}. ${nameOf(current)} sank the ${result.ship.name}.`;
        outcome.sunkShip = result.ship;
        outcome.again = true;
        splash = { x: step.x, y: step.y, title: "Sunk", detail: result.ship.name };
        return "hit";
      }
      if (taken(before)) {
        outcome.text = `Torpedo found old damage in ${where}.`;
        outcome.again = false;
        return "old";
      }
      outcome.text = `Torpedo hit ${where}.`;
      outcome.again = true;
      splash = {
        x: step.x,
        y: step.y,
        title: "Hit",
        detail: mode === "bot" && current === 1 ? "Rival shoots again" : "Shoot again",
      };
      return "hit";
    };
    const finish = () => {
      if (root.hidden || phase === "menu") return;
      if (/\bMiss\b/.test(outcome.text)) sfx("splash");
      finishAction(outcome.text, outcome.again, outcome.sunkShip ? [outcome.sunkShip] : []);
    };
    if (calm()) {
      path.forEach(arrive);
      finish();
      return;
    }
    const token = ++fxToken;
    fx.hidden = false;
    const node = document.createElement("div");
    node.className = `bs-fish is-${axis}`;
    node.innerHTML = `<svg viewBox="0 0 68 18" aria-hidden="true"><polygon points="2,9 14,2 14,16" fill="#9ee7ff"/><rect x="12" y="3" width="36" height="12" rx="5" fill="#f4fbff"/><rect x="18" y="5" width="14" height="2.4" rx="1" fill="#7fd4ff"/><polygon points="48,1 66,9 48,17" fill="#d5e6f2"/><path d="M44 4 L54 9 L44 7 Z" fill="#ff2ea6"/><path d="M44 14 L54 9 L44 11 Z" fill="#ff2ea6"/></svg>`;
    fx.appendChild(node);
    const first = cellCenter(board, path[0].x, path[0].y);
    if (!first) {
      path.forEach(arrive);
      finish();
      return;
    }
    node.style.width = `${Math.max(30, first.w * 0.92)}px`;
    node.style.height = `${Math.max(10, first.h * 0.32)}px`;
    const park = (box, instant) => {
      if (instant) node.style.transition = "none";
      node.style.left = `${box.x}px`;
      node.style.top = `${box.y}px`;
      if (instant) {
        void node.offsetWidth;
        node.style.transition = "";
      }
    };
    park({
      x: axis === "row" ? first.x - first.w : first.x,
      y: axis === "col" ? first.y - first.h : first.y,
    }, true);
    let hop = 0;
    const stepAlong = () => {
      if (token !== fxToken || root.hidden) return;
      const step = path[hop];
      const box = cellCenter(board, step.x, step.y);
      if (box) {
        park(box, false);
        const wake = document.createElement("i");
        wake.className = "bs-wake";
        wake.style.left = `${box.x}px`;
        wake.style.top = `${box.y}px`;
        fx.appendChild(wake);
        setTimeout(() => wake.remove(), 700);
      }
      setTimeout(() => {
        if (token !== fxToken || root.hidden) return;
        const kind = arrive(step);
        if (kind && box) burst(box, kind);
        hop += 1;
        if (kind || hop >= path.length) {
          setTimeout(() => {
            if (token !== fxToken) return;
            node.remove();
            if (!fx.children.length) fx.hidden = true;
            finish();
          }, kind ? 460 : 90);
          return;
        }
        stepAlong();
      }, 150);
    };
    setTimeout(stepAlong, 40);
  };

  const useBuoy = (x, y) => {
    const me = players[current];
    if ((me.charges.buoy || 0) <= 0) return;
    if (shipAt(me, x, y) || me.ocean[y][x] || me.buoys.some((cell) => cell.x === x && cell.y === y)) {
      notice = "Open water on your ships only. Not on a ship, a shot, or a buoy.";
      tone(120, 0.05, "square");
      render();
      return;
    }
    me.charges.buoy -= 1;
    me.buoys.push({ x, y });
    weapon = null;
    if (current === 1) me.quiet = 0;
    sfx("buoy");
    const spot = `${COLS[x]}${y + 1}`;
    if (mode === "online") {
      send({ t: "act", n: ++net.seq, from: seat, kind: "pass", note: "A decoy buoy was dropped." });
      handOff(`Decoy buoy dropped on ${spot}.`);
      return;
    }
    finishAction(`Decoy buoy dropped on ${spot}.`);
  };

  const useMine = (x, y) => {
    const me = players[current];
    if ((me.charges.mine || 0) <= 0 || me.mine) return;
    me.charges.mine -= 1;
    me.incoming = [];
    const origin = { x: Math.min(x, 8), y: Math.min(y, 8) };
    const cells = [];
    for (let dy = 0; dy < 2; dy += 1) {
      for (let dx = 0; dx < 2; dx += 1) cells.push({ x: origin.x + dx, y: origin.y + dy });
    }
    me.mine = cells;
    weapon = null;
    if (current === 1) me.quiet = 0;
    sfx("clunk");
    sfx("splash");
    const armed = "Sea mine armed. It explodes at the start of your next turn.";
    if (mode === "online") {
      send({ t: "act", n: ++net.seq, from: seat, kind: "pass", note: "A sea mine was armed." });
      handOff(armed);
      return;
    }
    finishAction(armed);
  };

  const playRocket = (done) => {
    if (calm()) {
      done();
      return;
    }
    const token = ++fxToken;
    fx.hidden = false;
    const node = document.createElement("div");
    node.className = "bs-rocket-flight";
    node.innerHTML = rocketSvg();
    fx.appendChild(node);
    sfx("rocket");
    setTimeout(() => {
      if (token !== fxToken) return;
      node.remove();
      if (!fx.children.length) fx.hidden = true;
      done();
    }, 900);
  };

  const usePatch = (x, y) => {
    const me = players[current];
    const foe = players[1 - current];
    if ((me.charges.patch || 0) <= 0) return;
    const ship = shipAt(me, x, y);
    const spot = `${COLS[x]}${y + 1}`;
    if (!ship || ship.hits >= ship.len || me.ocean[y][x] !== "hit") {
      notice = "Patch a hit on a ship that is still afloat.";
      tone(120, 0.05, "square");
      render();
      return;
    }
    me.charges.patch -= 1;
    weapon = null;
    if (current === 1) me.quiet = 0;
    const apply = () => {
      if (root.hidden || phase === "menu") return;
      me.ocean[y][x] = null;
      ship.hits -= 1;
      foe.attack[y][x] = "sealed";
      const key = `${x},${y}`;
      me.incoming = (me.incoming || []).filter((cell) => cell !== key);
      foe.flash = (foe.flash || []).filter((cell) => cell !== key);
      const patched = `Patched ${spot} on the ${ship.name}.`;
      if (mode === "online") {
        send({ t: "act", n: ++net.seq, from: seat, kind: "patch", x, y, note: "A hit was patched." });
        handOff(patched);
        return;
      }
      finishAction(patched);
    };
    busy = true;
    render();
    if (calm() || viewIndex() !== current) {
      apply();
      return;
    }
    const board = ui.querySelector('.bs-board[data-kind="ocean"]');
    if (!board) {
      apply();
      return;
    }
    const hammer = document.createElement("i");
    hammer.className = "bs-hammer";
    hammer.style.setProperty("--hx", x);
    hammer.style.setProperty("--hy", y);
    hammer.innerHTML = `<svg viewBox="0 0 80 96" aria-hidden="true"><rect x="35" y="0" width="10" height="52" rx="3" fill="#2c343d" stroke="#0c1014" stroke-width="2"/><rect x="4" y="44" width="72" height="24" rx="4" fill="#f7fafc" stroke="#12181e" stroke-width="3"/><rect x="8" y="48" width="64" height="7" rx="2" fill="#ffffff"/><rect x="8" y="60" width="64" height="4" rx="1" fill="#ff9a3c"/></svg><b></b>`;
    board.appendChild(hammer);
    setTimeout(() => sfx("hammer"), 340);
    setTimeout(apply, 760);
  };

  const useMissile = (x, y) => {
    const me = players[current];
    if ((me.charges.missile || 0) <= 0 || me.missile) return;
    me.charges.missile -= 1;
    const origin = { x: Math.min(x, 7), y: Math.min(y, 7) };
    const cells = [];
    for (let dy = 0; dy < 3; dy += 1) {
      for (let dx = 0; dx < 3; dx += 1) cells.push({ x: origin.x + dx, y: origin.y + dy });
    }
    me.missile = { x: origin.x, y: origin.y, cells, left: 2 };
    me.incoming = [];
    weapon = null;
    if (current === 1) me.quiet = 0;
    busy = true;
    render();
    const spot = `${COLS[origin.x + 1]}${origin.y + 2}`;
    const text = `Missile locked on ${spot}. It arrives in 2 turns.`;
    playRocket(() => {
      if (root.hidden || phase === "menu") return;
      if (mode === "online") {
        send({ t: "act", n: ++net.seq, from: seat, kind: "pass", note: "A missile was launched." });
        handOff(text);
        return;
      }
      finishAction(text);
    });
  };

  const botWeapon = () => {
    const bot = players[1];
    if (bot.quiet < 3 || Math.random() > 0.3) return false;
    const options = [];
    const mined = mineTarget(bot);
    const drop = buoyTarget(bot);
    const repaired = patchTarget(bot);
    const aimed = missileTarget(bot);
    if ((bot.charges.mine || 0) > 0 && !bot.mine && mined) options.push("mine");
    if (bot.cd.radar === 0 && !bot.radar && unsunk(players[0]).length) options.push("radar");
    if ((bot.charges.torpedo || 0) > 0 && torpedoTarget(bot)) options.push("torpedo");
    if ((bot.charges.buoy || 0) > 0 && drop) options.push("buoy");
    if ((bot.charges.patch || 0) > 0 && repaired) options.push("patch");
    if ((bot.charges.missile || 0) > 0 && !bot.missile && aimed) options.push("missile");
    if (!options.length) return false;
    const pick = options[Math.floor(Math.random() * options.length)];
    if (pick === "mine") useMine(mined.x, mined.y);
    else if (pick === "buoy") useBuoy(drop.x, drop.y);
    else if (pick === "patch") usePatch(repaired.x, repaired.y);
    else if (pick === "missile") useMissile(aimed.x, aimed.y);
    else if (pick === "radar") {
      const ships = unsunk(players[0]);
      useRadar(ships[Math.floor(Math.random() * ships.length)].id);
    } else {
      const line = torpedoTarget(bot);
      useTorpedo(line.axis, line.index);
    }
    return true;
  };

  const buoyTarget = (bot) => {
    const open = [];
    for (let y = 0; y < 10; y += 1) {
      for (let x = 0; x < 10; x += 1) {
        if (shipAt(bot, x, y) || bot.ocean[y][x]) continue;
        if (bot.buoys.some((cell) => cell.x === x && cell.y === y)) continue;
        open.push({ x, y });
      }
    }
    if (!open.length) return null;
    return open[Math.floor(Math.random() * open.length)];
  };

  const patchTarget = (bot) => {
    const spots = [];
    bot.ships.forEach((ship) => {
      if (ship.hits <= 0 || ship.hits >= ship.len) return;
      ship.cells.forEach((cell) => {
        if (bot.ocean[cell.y][cell.x] === "hit") spots.push(cell);
      });
    });
    if (!spots.length) return null;
    return spots[Math.floor(Math.random() * spots.length)];
  };

  const missileTarget = (bot) => {
    const hits = openHits(bot);
    if (!hits.length) return null;
    let best = null;
    let score = 0;
    for (let y = 0; y <= 7; y += 1) {
      for (let x = 0; x <= 7; x += 1) {
        let unknown = 0;
        let near = 0;
        for (let dy = 0; dy < 3; dy += 1) {
          for (let dx = 0; dx < 3; dx += 1) {
            if (!bot.attack[y + dy][x + dx]) unknown += 1;
            const close = hits.some((hit) => Math.abs(hit.x - (x + dx)) + Math.abs(hit.y - (y + dy)) <= 1);
            if (close) near += 1;
          }
        }
        const rank = unknown + near * 2;
        if (unknown >= 4 && near > 0 && rank > score) {
          score = rank;
          best = { x, y };
        }
      }
    }
    return best;
  };

  const botShoot = () => {
    const cell = botTarget(players[1]);
    if (!cell) {
      finishAction("Rival holds fire.");
      return;
    }
    useShot(cell.x, cell.y);
  };

  const tryPlace = (x, y) => {
    const spec = specOf(selected);
    const player = players[placer];
    if (!spec || !remaining(player).some((ship) => ship.id === spec.id)) return;
    const cells = footprint(x, y, spec.len, rot);
    if (!cells || !canPlace(player, cells)) {
      notice = "That ship does not fit there.";
      tone(120, 0.05, "square");
      render();
      return;
    }
    commit(player, spec, cells);
    afterPlace();
  };

  const rotate = () => {
    if (phase !== "place") return;
    rot = rot === "h" ? "v" : "h";
    tone(360, 0.04, "square");
    render();
  };

  const asCell = (x, y) => {
    const cx = Number(x);
    const cy = Number(y);
    if (!Number.isInteger(cx) || !Number.isInteger(cy) || cx < 0 || cy < 0 || cx > 9 || cy > 9) return null;
    return { x: cx, y: cy };
  };

  const publicShip = (ship) => {
    const spec = ship ? specOf(ship.id) : null;
    if (!spec) return null;
    return {
      id: spec.id,
      name: spec.name,
      color: spec.color,
      len: spec.len,
      cells: ship.cells.map((cell) => ({ x: cell.x, y: cell.y })),
    };
  };

  const shotPublic = (result, x, y) => {
    if (result && result.kind === "sunk") return { x, y, kind: "sunk", ship: publicShip(result.ship) };
    if (result && result.kind === "hit") return { x, y, kind: "hit" };
    if (!result) return { x, y, kind: "old" };
    return { x, y, kind: "miss" };
  };

  const trustedShip = (ship) => {
    const spec = ship ? specOf(ship.id) : null;
    if (!spec || !Array.isArray(ship.cells)) return null;
    const cells = [];
    ship.cells.forEach((cell) => {
      const spot = asCell(cell.x, cell.y);
      if (spot) cells.push(spot);
    });
    if (cells.length !== spec.len) return null;
    return { id: spec.id, name: spec.name, color: spec.color, len: spec.len, cells };
  };

  const send = (msg) => {
    if (net.conn && net.conn.open) net.conn.send(msg);
  };

  const dropNet = () => {
    netLive = false;
    net.wait = 0;
    queuedAct = null;
    const conn = net.conn;
    const peer = net.peer;
    net.conn = null;
    net.peer = null;
    try { if (conn) conn.close(); } catch (error) { /* already closed */ }
    try { if (peer) peer.destroy(); } catch (error) { /* already closed */ }
  };

  const handOff = (note) => {
    current = 1 - seat;
    weapon = null;
    busy = true;
    notice = `${note} ${turnName(current)} turn.`;
    render();
    flushAct();
  };

  const applyShots = (me, shots) => {
    const sunk = [];
    (shots || []).forEach((shot) => {
      const spot = asCell(shot.x, shot.y);
      if (!spot || shot.kind === "old") return;
      me.attack[spot.y][spot.x] = shot.kind === "miss" ? "miss" : "hit";
      me.flash.push(`${spot.x},${spot.y}`);
      if (shot.kind !== "sunk") return;
      const wreck = trustedShip(shot.ship);
      if (!wreck || me.wrecks.some((item) => item.id === wreck.id)) return;
      me.wrecks.push(wreck);
      sunk.push(wreck);
    });
    return sunk;
  };

  const shotNote = (shot, mine) => {
    const spot = asCell(shot.x, shot.y);
    if (!spot) return "";
    const where = `${COLS[spot.x]}${spot.y + 1}`;
    if (shot.kind === "sunk") {
      const spec = specOf(shot.ship && shot.ship.id);
      return `${where}. ${mine ? "You" : "Rival"} sank the ${spec ? spec.name : "ship"}.`;
    }
    if (shot.kind === "hit") return `${where}. Hit.`;
    if (shot.kind === "old") return `${where}. Old damage.`;
    return `${where}. Miss.`;
  };

  const playLine = (board, axis, steps, done) => {
    const path = (steps || []).map((step) => asCell(step.x, step.y)).filter(Boolean);
    if (!path.length || calm()) {
      done();
      return;
    }
    const token = ++fxToken;
    fx.hidden = false;
    const node = document.createElement("div");
    node.className = `bs-fish is-${axis === "col" ? "col" : "row"}`;
    node.innerHTML = `<svg viewBox="0 0 68 18" aria-hidden="true"><polygon points="2,9 14,2 14,16" fill="#9ee7ff"/><rect x="12" y="3" width="36" height="12" rx="5" fill="#f4fbff"/><rect x="18" y="5" width="14" height="2.4" rx="1" fill="#7fd4ff"/><polygon points="48,1 66,9 48,17" fill="#d5e6f2"/><path d="M44 4 L54 9 L44 7 Z" fill="#ff2ea6"/><path d="M44 14 L54 9 L44 11 Z" fill="#ff2ea6"/></svg>`;
    fx.appendChild(node);
    const first = cellCenter(board, path[0].x, path[0].y);
    if (!first) {
      node.remove();
      done();
      return;
    }
    node.style.width = `${Math.max(30, first.w * 0.92)}px`;
    node.style.height = `${Math.max(10, first.h * 0.32)}px`;
    const park = (box, instant) => {
      if (instant) node.style.transition = "none";
      node.style.left = `${box.x}px`;
      node.style.top = `${box.y}px`;
      if (instant) {
        void node.offsetWidth;
        node.style.transition = "";
      }
    };
    park({
      x: axis === "row" ? first.x - first.w : first.x,
      y: axis === "col" ? first.y - first.h : first.y,
    }, true);
    let hop = 0;
    const stepAlong = () => {
      if (token !== fxToken || root.hidden) return;
      const step = path[hop];
      const box = cellCenter(board, step.x, step.y);
      if (box) {
        park(box, false);
        const wake = document.createElement("i");
        wake.className = "bs-wake";
        wake.style.left = `${box.x}px`;
        wake.style.top = `${box.y}px`;
        fx.appendChild(wake);
        setTimeout(() => wake.remove(), 700);
      }
      setTimeout(() => {
        if (token !== fxToken || root.hidden) return;
        hop += 1;
        if (hop >= path.length) {
          const last = steps[steps.length - 1];
          if (box && last && (last.kind === "hit" || last.kind === "sunk" || last.kind === "old")) {
            burst(box, last.kind === "old" ? "old" : "hit");
          }
          setTimeout(() => {
            if (token !== fxToken) return;
            node.remove();
            if (!fx.children.length) fx.hidden = true;
            done();
          }, last && last.kind !== "miss" ? 460 : 90);
          return;
        }
        stepAlong();
      }, 150);
    };
    setTimeout(stepAlong, 40);
  };

  const continueTurn = (note, again, sunk) => {
    if (typeof note === "string" && note) notice = note;
    if (!again) {
      handOff(note || "Turn passed.");
      return;
    }
    queuedAct = null;
    offerCards(seat, sunk || [], () => {
      if (root.hidden || phase === "menu" || phase === "end") return;
      current = seat;
      weapon = null;
      busy = false;
      notice = `${note || "Hit."} ${turnName(seat)} turn.`;
      render();
      if (splash) tagShot(splash.x, splash.y, splash.title, splash.detail);
      splash = null;
    });
  };

  const rollRadar = (defender, shipId) => {
    const ship = unsunk(defender).find((item) => item.id === shipId);
    if (!ship) return null;
    const trap = defender.buoys.length && Math.random() < 0.5
      ? defender.buoys[Math.floor(Math.random() * defender.buoys.length)]
      : null;
    if (trap) return { cells: [{ x: trap.x, y: trap.y }], decoy: true, name: ship.name };
    const zones = radarZones(ship);
    if (!zones.length) return null;
    const zone = zones[Math.floor(Math.random() * zones.length)];
    const cells = [];
    for (let y = zone.y; y < zone.y + 3; y += 1) {
      for (let x = zone.x; x < zone.x + 3; x += 1) cells.push({ x, y });
    }
    return { cells, decoy: false, name: ship.name };
  };

  const resolveTorpedo = (attacker, defender, axis, index) => {
    const steps = [];
    for (let step = 0; step < 10; step += 1) {
      const x = axis === "col" ? index : step;
      const y = axis === "row" ? index : step;
      const before = attacker.attack[y][x];
      if (!shipAt(defender, x, y)) {
        if (!taken(before)) resolveCell(attacker, defender, x, y);
        steps.push({ x, y, kind: "miss" });
        continue;
      }
      if (taken(before)) {
        steps.push({ x, y, kind: "old" });
        return { steps, again: false, sunk: [] };
      }
      const result = resolveCell(attacker, defender, x, y);
      steps.push(shotPublic(result, x, y));
      const sunk = result && result.kind === "sunk" ? [publicShip(result.ship)].filter(Boolean) : [];
      return { steps, again: !!(result && result.kind !== "miss"), sunk };
    }
    return { steps, again: false, sunk: [] };
  };

  const openOurTurn = (note) => {
    if (root.hidden || phase === "menu" || phase === "end") return;
    current = seat;
    weapon = null;
    phase = "battle";
    const me = players[seat];
    me.pendingSunk = [];
    if (me.cd.radar > 0) me.cd.radar -= 1;
    if (me.radar) {
      if (me.radar.seen) me.radar = null;
      else me.radar.seen = true;
    }
    const cells = [];
    let origin = null;
    let strike = null;
    if (me.mine) {
      origin = { x: me.mine[0].x, y: me.mine[0].y };
      me.mine.forEach((cell) => cells.push(cell));
      me.mine = null;
    }
    if (me.missile) {
      me.missile.left -= 1;
      if (me.missile.left <= 0) {
        strike = { x: me.missile.x + 1, y: me.missile.y + 1 };
        me.missile.cells.forEach((cell) => cells.push(cell));
        me.missile = null;
      }
    }
    if (!cells.length) {
      busy = false;
      net.wait = 0;
      notice = note ? `${note} ${turnName(seat)} turn.` : "Your turn. A hit lets you shoot again.";
      render();
      flushAct();
      return;
    }
    const n = ++net.seq;
    net.wait = n;
    net.boom = { origin, strike };
    busy = true;
    notice = note || "Weapons arriving.";
    send({
      t: "act",
      n,
      from: seat,
      kind: "boom",
      cells,
      ox: origin ? origin.x : null,
      oy: origin ? origin.y : null,
      sx: strike ? strike.x : null,
      sy: strike ? strike.y : null,
    });
    render();
  };

  const flushAct = () => {
    if (!queuedAct || net.wait || current === seat) return;
    const msg = queuedAct;
    queuedAct = null;
    handleAct(msg);
  };

  const paintBoom = (owner, origin, strike, shots) => {
    owner.boom = origin;
    owner.strike = strike;
    owner.justBoom = true;
    owner.tags = (shots || []).filter((shot) => shot.kind === "hit" || shot.kind === "sunk").map((shot) => ({
      x: shot.x,
      y: shot.y,
      title: shot.kind === "sunk" ? "Sunk" : "Hit",
      detail: shot.kind === "sunk" && shot.ship && specOf(shot.ship.id) ? specOf(shot.ship.id).name : "",
    }));
  };

  const handleAct = (msg) => {
    if (!msg || msg.from !== 1 - seat || phase === "menu" || phase === "end") return;
    if (current === seat || net.wait) {
      queuedAct = msg;
      return;
    }
    const attacker = players[1 - seat];
    const me = players[seat];
    if (msg.kind === "pass") {
      openOurTurn(msg.note || "");
      return;
    }
    if (msg.kind === "patch") {
      const spot = asCell(msg.x, msg.y);
      if (spot && me.attack[spot.y][spot.x] === "hit") me.attack[spot.y][spot.x] = "sealed";
      openOurTurn(msg.note || "A hit was patched.");
      return;
    }
    if (msg.kind === "shot") {
      const spot = asCell(msg.x, msg.y);
      if (!spot || taken(attacker.attack[spot.y][spot.x])) {
        send({ t: "res", n: msg.n, from: seat, kind: "shot", fail: true });
        return;
      }
      attacker.flash = [];
      me.incoming = [];
      const result = resolveCell(attacker, me, spot.x, spot.y);
      const shot = shotPublic(result, spot.x, spot.y);
      const sunk = shot.kind === "sunk" && shot.ship ? [shot.ship] : [];
      const winner = allSunk(me) ? 1 - seat : null;
      send({ t: "res", n: msg.n, from: seat, kind: "shot", shots: [shot], sunk, winner, again: !winner && shot.kind !== "miss" && shot.kind !== "old" });
      pendingImpact = {
        x: spot.x,
        y: spot.y,
        board: "ocean",
        kind: shot.kind === "miss" ? "miss" : (shot.kind === "sunk" ? "sunk" : "hit"),
      };
      if (shot.kind === "hit" || shot.kind === "sunk") {
        splash = {
          x: spot.x,
          y: spot.y,
          title: shot.kind === "sunk" ? "Sunk" : "Hit",
          detail: shot.kind === "sunk" && shot.ship ? specOf(shot.ship.id).name : "They shoot again",
        };
      }
      notice = shotNote(shot, false);
      render();
      if (splash) tagShot(splash.x, splash.y, splash.title, splash.detail);
      splash = null;
      if (winner != null) showWin(winner, notice);
      else if (shot.kind === "miss" || shot.kind === "old") openOurTurn(notice);
      return;
    }
    if (msg.kind === "radar") {
      const rolled = rollRadar(me, msg.ship);
      if (!rolled) {
        send({ t: "res", n: msg.n, from: seat, kind: "radar", fail: true });
        return;
      }
      send({
        t: "res",
        n: msg.n,
        from: seat,
        kind: "radar",
        radar: { cells: rolled.cells, decoy: rolled.decoy },
        ship: msg.ship,
        again: false,
      });
      openOurTurn(rolled.decoy ? "A decoy buoy answered their radar." : "They used radar.");
      return;
    }
    if (msg.kind === "torpedo") {
      const axis = msg.axis === "col" ? "col" : "row";
      const index = Number(msg.index);
      if (!Number.isInteger(index) || index < 0 || index > 9) {
        send({ t: "res", n: msg.n, from: seat, kind: "torpedo", fail: true });
        return;
      }
      attacker.flash = [];
      me.incoming = [];
      const outcome = resolveTorpedo(attacker, me, axis, index);
      const winner = allSunk(me) ? 1 - seat : null;
      send({
        t: "res",
        n: msg.n,
        from: seat,
        kind: "torpedo",
        axis,
        shots: outcome.steps,
        sunk: outcome.sunk,
        winner,
        again: !winner && outcome.again,
      });
      const last = outcome.steps[outcome.steps.length - 1];
      notice = last ? shotNote(last, false) : "Torpedo missed.";
      render();
      playLine("ocean", axis, outcome.steps, () => {
        if (root.hidden || phase === "end") return;
        if (winner != null) showWin(winner, notice);
        else if (!outcome.again) openOurTurn(notice);
      });
      return;
    }
    if (msg.kind === "boom") {
      const cells = [];
      (msg.cells || []).forEach((cell) => {
        const spot = asCell(cell.x, cell.y);
        if (spot && !cells.some((item) => item.x === spot.x && item.y === spot.y)) cells.push(spot);
      });
      attacker.flash = [];
      me.incoming = [];
      const shots = cells.slice(0, 13).map((cell) => shotPublic(resolveCell(attacker, me, cell.x, cell.y), cell.x, cell.y));
      const sunk = shots.filter((shot) => shot.kind === "sunk" && shot.ship).map((shot) => shot.ship);
      const winner = allSunk(me) ? 1 - seat : null;
      const origin = asCell(msg.ox, msg.oy);
      const strike = asCell(msg.sx, msg.sy);
      send({ t: "res", n: msg.n, from: seat, kind: "boom", shots, sunk, winner, again: winner == null });
      paintBoom(attacker, origin, strike, shots);
      notice = winner != null ? "The fleet is gone." : "Incoming blast.";
      render();
      if (winner != null) showWin(winner, notice);
      return;
    }
  };

  const receiveRes = (msg) => {
    if (!msg || msg.n !== net.wait || phase === "menu" || phase === "end") return;
    net.wait = 0;
    const me = players[seat];
    if (msg.fail) {
      if (msg.kind === "torpedo") me.charges.torpedo = (me.charges.torpedo || 0) + 1;
      busy = false;
      notice = "That did not fire.";
      render();
      return;
    }
    if (msg.kind === "shot") {
      const sunk = applyShots(me, msg.shots);
      const shot = (msg.shots || [])[0] || { kind: "miss", x: 0, y: 0 };
      const note = shotNote(shot, true);
      pendingImpact = {
        x: shot.x,
        y: shot.y,
        board: "attack",
        kind: shot.kind === "sunk" ? "sunk" : (shot.kind === "hit" ? "hit" : "miss"),
      };
      if (shot.kind === "hit" || shot.kind === "sunk") {
        splash = {
          x: shot.x,
          y: shot.y,
          title: shot.kind === "sunk" ? "Sunk" : "Hit",
          detail: shot.kind === "sunk" ? (specOf(shot.ship && shot.ship.id) || {}).name || "" : "Shoot again",
        };
      }
      if (msg.winner != null) {
        notice = note;
        render();
        showWin(msg.winner, note);
        return;
      }
      continueTurn(note, !!msg.again, sunk);
      return;
    }
    if (msg.kind === "radar") {
      const cells = [];
      ((msg.radar && msg.radar.cells) || []).forEach((cell) => {
        const spot = asCell(cell.x, cell.y);
        if (spot) cells.push(spot);
      });
      const spec = specOf(msg.ship);
      me.radar = { cells: cells.slice(0, 9), seen: false, decoy: !!(msg.radar && msg.radar.decoy) };
      spend(me, "radar");
      const text = me.radar.decoy
        ? `Radar on the ${spec ? spec.name : "ship"}. A decoy buoy answers.`
        : `Radar on the ${spec ? spec.name : "ship"}. The mark stays through your next turn.`;
      busy = true;
      render();
      playSonar(() => {
        if (root.hidden || phase === "menu" || phase === "end") return;
        handOff(text);
      });
      return;
    }
    if (msg.kind === "torpedo") {
      const sunk = applyShots(me, msg.shots);
      const last = (msg.shots || [])[(msg.shots || []).length - 1];
      const note = last && last.kind !== "miss" ? shotNote(last, true) : "Torpedo missed.";
      if (last && (last.kind === "hit" || last.kind === "sunk")) {
        splash = {
          x: last.x,
          y: last.y,
          title: last.kind === "sunk" ? "Sunk" : "Hit",
          detail: last.kind === "sunk" ? ((specOf(last.ship && last.ship.id) || {}).name || "") : "Shoot again",
        };
      }
      render();
      playLine("attack", msg.axis === "col" ? "col" : "row", msg.shots || [], () => {
        if (root.hidden || phase === "end") return;
        if (msg.winner != null) showWin(msg.winner, note);
        else continueTurn(note, !!msg.again, sunk);
      });
      return;
    }
    if (msg.kind === "boom") {
      const sunk = applyShots(me, msg.shots);
      const saved = net.boom || {};
      net.boom = null;
      paintBoom(me, saved.origin, saved.strike, msg.shots);
      const names = sunk.map((ship) => ship.name);
      const note = names.length ? `Sank the ${names.join(" and the ")}.` : "The blast lands.";
      render();
      if (msg.winner != null) {
        showWin(msg.winner, note);
        return;
      }
      continueTurn(note, true, sunk);
    }
  };

  const onNet = (msg) => {
    if (!msg || typeof msg !== "object") return;
    if (msg.t === "placed") {
      foeReady = true;
      tryGo();
      return;
    }
    if (msg.t === "go") {
      startOnlineBattle();
      return;
    }
    if (msg.t === "again") {
      foeAgain = true;
      if (wantAgain) beginOnlineMatch();
      else if (phase === "end") {
        notice = "Rival wants a rematch.";
        render();
      }
      return;
    }
    if (msg.t === "act") handleAct(msg);
    else if (msg.t === "res") receiveRes(msg);
  };

  const tryGo = () => {
    if (!selfReady || !foeReady || battleStarted || seat !== 0) return;
    battleStarted = true;
    send({ t: "go" });
    startOnlineBattle();
  };

  const startOnlineBattle = () => {
    if (phase === "battle" || phase === "end") return;
    battleStarted = true;
    weapon = null;
    hover = null;
    phase = "battle";
    current = 0;
    if (seat === 0) openOurTurn("");
    else {
      busy = true;
      notice = "Waiting for the first shot.";
      render();
    }
  };

  const beginOnlineMatch = () => {
    if (phase === "place" || phase === "battle") return;
    netLive = true;
    net.wait = 0;
    net.boom = null;
    queuedAct = null;
    selfReady = false;
    foeReady = false;
    battleStarted = false;
    wantAgain = false;
    foeAgain = false;
    endKind = "";
    mode = "online";
    players = [createPlayer(), createPlayer()];
    placer = seat;
    current = 0;
    rot = "h";
    selected = "carrier";
    weapon = null;
    notice = "Place your fleet. They are placing at the same time.";
    winner = -1;
    busy = false;
    hover = null;
    phase = "place";
    render();
  };

  const roomCode = () => {
    let code = "";
    for (let i = 0; i < 4; i += 1) code += codeChars[Math.floor(Math.random() * codeChars.length)];
    return code;
  };

  const bindConn = (conn) => {
    net.conn = conn;
    conn.on("data", onNet);
    conn.on("close", () => {
      if (net.conn !== conn) return;
      net.conn = null;
      if (!netLive) return;
      netLive = false;
      if (root.hidden || phase === "menu" || phase === "online" || phase === "join" || phase === "room" || phase === "end") return;
      showWin(seat, "The other player left.", true);
    });
  };

  const hostRoom = () => {
    if (!window.Peer) {
      notice = "Multiplayer could not load. Refresh and try again.";
      phase = "online";
      render();
      return;
    }
    dropNet();
    const code = roomCode();
    mode = "online";
    seat = 0;
    net.role = "host";
    net.code = code;
    phase = "room";
    notice = "Connecting...";
    const peer = new window.Peer(`unfairgames-bs-${code}`, peerOptions);
    net.peer = peer;
    render();
    peer.on("open", () => {
      if (net.peer !== peer) return;
      notice = "";
      render();
    });
    peer.on("connection", (conn) => {
      if (net.peer !== peer || net.conn) {
        conn.close();
        return;
      }
      bindConn(conn);
      conn.on("open", () => beginOnlineMatch());
    });
    peer.on("error", (err) => {
      if (net.peer !== peer) return;
      if (phase === "place" || phase === "battle" || phase === "end" || phase === "again") return;
      if (err && err.type === "unavailable-id") {
        try { peer.destroy(); } catch (error) { /* retry */ }
        if (net.peer === peer) net.peer = null;
        hostRoom();
        return;
      }
      notice = "Could not open a room.";
      phase = "online";
      render();
    });
  };

  const joinRoom = (raw) => {
    const code = String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    if (!window.Peer) {
      notice = "Multiplayer could not load. Refresh and try again.";
      phase = "online";
      render();
      return;
    }
    if (code.length < 4) {
      notice = "Enter the 4-letter code from the host.";
      phase = "join";
      render();
      return;
    }
    dropNet();
    mode = "online";
    seat = 1;
    net.role = "guest";
    net.code = code;
    phase = "join";
    notice = "Connecting...";
    const peer = new window.Peer(peerOptions);
    net.peer = peer;
    render();
    peer.on("open", () => {
      if (net.peer !== peer) return;
      const conn = peer.connect(`unfairgames-bs-${code}`);
      bindConn(conn);
      conn.on("open", () => beginOnlineMatch());
    });
    peer.on("error", () => {
      if (net.peer !== peer) return;
      if (phase === "place" || phase === "battle" || phase === "end" || phase === "again") return;
      notice = "Could not find that room.";
      phase = "join";
      render();
    });
  };

  const showOnline = () => {
    dropNet();
    mode = "online";
    phase = "online";
    notice = "";
    busy = false;
    render();
  };

  const startMatch = (nextMode) => {
    clearTimeout(timer);
    hush();
    clearLoot();
    clearFx();
    mode = nextMode;
    players = [createPlayer(), createPlayer()];
    if (mode === "bot") botPlace(players[1]);
    placer = 0;
    current = 0;
    rot = "h";
    selected = "carrier";
    weapon = null;
    notice = "";
    winner = -1;
    busy = false;
    hover = null;
    phase = "place";
    render();
  };

  const previewCells = () => {
    if (!hover || busy) return [];
    if (phase === "place" && hover.board === "ocean") {
      const spec = specOf(selected);
      if (!spec) return [];
      const cells = footprint(hover.x, hover.y, spec.len, rot);
      if (!cells) {
        const partial = [];
        for (let i = 0; i < spec.len; i += 1) {
          const x = hover.x + (rot === "h" ? i : 0);
          const y = hover.y + (rot === "v" ? i : 0);
          if (x >= 0 && y >= 0 && x < 10 && y < 10) partial.push({ x, y, ok: false });
        }
        return partial;
      }
      const ok = canPlace(players[placer], cells);
      return cells.map((cell, index) => ({ ...cell, ok, bow: index === 0 }));
    }
    if (phase === "battle" && yourTurn() && weapon === "buoy" && hover.board === "ocean") {
      const player = players[current];
      const blocked = shipAt(player, hover.x, hover.y)
        || player.ocean[hover.y][hover.x]
        || player.buoys.some((cell) => cell.x === hover.x && cell.y === hover.y);
      return [{ x: hover.x, y: hover.y, ok: !blocked }];
    }
    if (phase === "battle" && yourTurn() && weapon === "patch" && hover.board === "ocean") {
      const player = players[current];
      const ship = shipAt(player, hover.x, hover.y);
      const ok = !!(ship && ship.hits < ship.len && player.ocean[hover.y][hover.x] === "hit");
      return [{ x: hover.x, y: hover.y, ok }];
    }
    if (phase === "battle" && yourTurn() && weapon === "missile" && hover.board === "attack") {
      const origin = { x: Math.min(hover.x, 7), y: Math.min(hover.y, 7) };
      const cells = [];
      for (let dy = 0; dy < 3; dy += 1) {
        for (let dx = 0; dx < 3; dx += 1) cells.push({ x: origin.x + dx, y: origin.y + dy, ok: true });
      }
      return cells;
    }
    if (phase === "battle" && yourTurn() && weapon === "mine" && hover.board === "attack") {
      const origin = { x: Math.min(hover.x, 8), y: Math.min(hover.y, 8) };
      const cells = [];
      for (let dy = 0; dy < 2; dy += 1) {
        for (let dx = 0; dx < 2; dx += 1) cells.push({ x: origin.x + dx, y: origin.y + dy, ok: true });
      }
      return cells;
    }
    if (phase === "battle" && yourTurn() && weapon === "torpedo" && hover.line) {
      const cells = [];
      for (let step = 0; step < 10; step += 1) {
        cells.push({
          x: hover.line.axis === "col" ? hover.line.index : step,
          y: hover.line.axis === "row" ? hover.line.index : step,
          line: true,
        });
      }
      return cells;
    }
    return [];
  };

  const applyPreview = () => {
    ui.querySelectorAll(".bs-cell").forEach((cell) => cell.classList.remove("is-preview", "is-bad", "is-line", "is-bow"));
    const board = phase === "place" || weapon === "buoy" || weapon === "patch" ? "ocean" : "attack";
    const cells = previewCells();
    cells.forEach((cell) => {
      const el = ui.querySelector(`.bs-cell[data-board="${board}"][data-x="${cell.x}"][data-y="${cell.y}"]`);
      if (!el) return;
      if (cell.line) el.classList.add("is-line");
      else el.classList.add(cell.ok ? "is-preview" : "is-bad");
      if (cell.bow) el.classList.add("is-bow");
    });
    ui.querySelectorAll(".bs-hull.is-ghost").forEach((el) => el.remove());
    if (phase === "place" && cells.length) {
      const spec = specOf(selected);
      const ocean = ui.querySelector('.bs-board[data-kind="ocean"]');
      if (spec && ocean) {
        const ok = cells.every((cell) => cell.ok !== false);
        ocean.insertAdjacentHTML("beforeend", hullMarkup(spec, cells, ok ? "ghost" : "bad"));
      }
    }
  };

  const peg = (kind) => (kind === "hit"
    ? `<i class="bs-peg"></i>`
    : kind === "miss"
      ? `<i class="bs-dot"></i>`
      : "");

  const buoyMark = () => `<svg class="bs-buoy" viewBox="0 0 32 42" aria-hidden="true"><path d="M16 1.5 V13" stroke="#f7fbff" stroke-width="1.6" stroke-linecap="round"/><path d="M16 3.2 H25.5 L16 11.2 Z" fill="#ff2ea6"/><ellipse cx="16" cy="22" rx="11" ry="8.2" fill="#ffc14a"/><ellipse cx="16" cy="22" rx="11" ry="8.2" fill="none" stroke="#5c3206" stroke-width="1.3"/><path d="M5.5 22 H26.5" stroke="#5c3206" stroke-width="1.7"/><ellipse cx="16" cy="18.6" rx="6.2" ry="2.3" fill="#fff6d2" opacity=".7"/><path d="M16 30.2 V35" stroke="#9fdfff" stroke-width="1.4"/><path d="M7 36.5 Q16 41 25 36.5" fill="none" stroke="#9fdfff" stroke-width="1.5" stroke-linecap="round"/></svg>`;

  const mineMark = () => `<svg viewBox="0 0 48 48" aria-hidden="true"><defs><radialGradient id="bs-orb-live" cx="36%" cy="32%" r="70%"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#c5d0d8"/><stop offset="1" stop-color="#3c4750"/></radialGradient></defs><circle cx="24" cy="26" r="11" fill="url(#bs-orb-live)" stroke="#12181e" stroke-width="1"/><g fill="#eef3f7" stroke="#141b22" stroke-width="1"><circle cx="24" cy="8" r="2.5"/><circle cx="24" cy="44" r="2.5"/><circle cx="7" cy="26" r="2.5"/><circle cx="41" cy="26" r="2.5"/><circle cx="12" cy="14" r="2.1"/><circle cx="36" cy="14" r="2.1"/><circle cx="12" cy="38" r="2.1"/><circle cx="36" cy="38" r="2.1"/></g></svg>`;

  const shipBody = (id, scars) => {
    const boot = `<path d="M48 44 H198 C218 44 228 50 228 56 H46 Z" fill="#07080c" opacity=".82"/>`;
    const shine = `<path d="M58 13 H150 C168 13 174 17 174 22 H52 Z" fill="#f4f7fb" opacity=".28"/>`;
    const hulls = {
      carrier: `<polygon points="6,42 42,24 42,58" fill="currentColor"/><path d="M36 24 H198 C224 24 234 32 234 42 C234 54 220 60 198 60 H36 Z" fill="currentColor"/><path d="M42 46 H192 C212 46 222 51 222 56 H42 Z" fill="#07080c" opacity=".82"/><path d="M22 12 H214 C228 12 234 16 234 21 V28 H12 L22 12 Z" fill="#d2d8e0"/><path d="M40 19 H204" stroke="#1c2128" stroke-width="1.15" opacity=".5"/><path d="M64 14 V26 M102 14 V26 M140 14 V26 M178 14 V26" stroke="#1c2128" stroke-width=".75" opacity=".4"/>`,
      battleship: `<polygon points="2,36 54,10 54,62" fill="currentColor"/><path d="M46 10 H196 C224 10 236 22 236 36 C236 50 224 62 196 62 H46 Z" fill="currentColor"/>${boot}${shine}<path d="M78 36 H210" stroke="#0c0e12" stroke-width="1.2" opacity=".4"/>`,
      cruiser: `<polygon points="0,36 58,14 58,58" fill="currentColor"/><path d="M50 14 H198 C226 14 236 24 236 36 C236 48 226 58 198 58 H50 Z" fill="currentColor"/>${boot}${shine}<path d="M84 36 H208" stroke="#0c0e12" stroke-width="1" opacity=".35"/>`,
      submarine: `<path d="M22 36 C22 18 70 10 120 10 C188 10 230 18 230 36 C230 54 188 62 120 62 C70 62 22 54 22 36 Z" fill="currentColor"/><path d="M40 36 C40 26 78 20 120 20 C170 20 206 26 206 36 C206 46 170 52 120 52 C78 52 40 46 40 36 Z" fill="#0c1014" opacity=".45"/><path d="M70 18 H146 C160 18 166 22 166 28 H64 Z" fill="#d5dbe3" opacity=".22"/><circle cx="34" cy="36" r="2.2" fill="#9aa3ad"/>`,
      destroyer: `<polygon points="0,36 62,16 62,56" fill="currentColor"/><path d="M52 16 H200 C224 16 234 25 234 36 C234 47 224 56 200 56 H52 Z" fill="currentColor"/>${boot}${shine}`,
    };
    const fittings = {
      carrier: `<i class="bs-pad" style="left:32%"></i><i class="bs-pad" style="left:46%"></i><i class="bs-pad" style="left:58%"></i><i class="bs-isle"></i>`,
      battleship: `<i class="bs-gun" style="left:34%"></i><i class="bs-gun is-big" style="left:52%"></i><i class="bs-gun" style="left:70%"></i><i class="bs-stack" style="left:84%"></i>`,
      cruiser: `<i class="bs-gun" style="left:40%"></i><i class="bs-stack" style="left:56%"></i><i class="bs-gun" style="left:72%"></i>`,
      submarine: `<i class="bs-sail"></i>`,
      destroyer: `<i class="bs-gun" style="left:44%"></i><i class="bs-stack" style="left:66%"></i>`,
    };
    return `<span class="bs-shape"><svg viewBox="0 0 240 72" preserveAspectRatio="none" aria-hidden="true">${hulls[id]}</svg>${fittings[id] || ""}${scars || ""}</span>`;
  };

  const hullMarkup = (ship, cells, mode, shots) => {
    if (!cells.length) return "";
    const horizontal = cells.length < 2 || cells[0].y === cells[1].y;
    const cls = ["bs-hull", `is-${ship.id}`, horizontal ? "is-h" : "is-v", mode ? "is-ghost" : "", mode === "bad" ? "is-bad" : ""].filter(Boolean).join(" ");
    const color = mode === "bad" ? "#ff5d6c" : ship.color;
    const scars = shots ? cells.map((cell, index) => {
      if (shots[cell.y][cell.x] !== "hit") return "";
      const along = ((index + 0.5) / cells.length) * 100;
      return `<i class="bs-scar" style="left:${along}%"></i>`;
    }).join("") : "";
    return `<i class="${cls}" style="--hx:${cells[0].x};--hy:${cells[0].y};--len:${cells.length};--ship:${color}">${shipBody(ship.id, scars)}</i>`;
  };

  const boardHtml = (kind, viewer, foe) => {
    const attack = kind === "attack";
    let html = `<div class="bs-board" data-kind="${kind}"><span class="bs-corner"></span>`;
    for (let x = 0; x < 10; x += 1) {
      if (attack && weapon === "torpedo" && yourTurn()) {
        html += `<button type="button" class="bs-head" data-act="line" data-axis="col" data-i="${x}">${COLS[x]}</button>`;
      } else html += `<span class="bs-head">${COLS[x]}</span>`;
    }
    for (let y = 0; y < 10; y += 1) {
      if (attack && weapon === "torpedo" && yourTurn()) {
        html += `<button type="button" class="bs-head" data-act="line" data-axis="row" data-i="${y}">${y + 1}</button>`;
      } else html += `<span class="bs-head">${y + 1}</span>`;
      for (let x = 0; x < 10; x += 1) {
        const key = `${x},${y}`;
        const classes = ["bs-cell"];
        let mark = "";
        let label = `${COLS[x]}${y + 1}`;
        if (!attack) {
          const ship = shipAt(viewer, x, y);
          if (ship) {
            classes.push("is-ship");
            label = `${ship.name} ${label}`;
          }
          const shot = viewer.ocean[y][x];
          if (shot) classes.push(shot === "hit" ? "is-hit" : "is-miss");
          if ((viewer.incoming || []).includes(key)) classes.push("is-fresh");
          if ((viewer.buoys || []).some((cell) => cell.x === x && cell.y === y)) {
            classes.push("is-decoy");
            label += " decoy buoy";
          }
          mark = ship && shot === "hit" ? "" : peg(shot);
          if (classes.includes("is-decoy")) mark += buoyMark();
          const style = ship ? ` style="--ship:${ship.color}"` : "";
          if (phase === "place") {
            html += `<button type="button" class="${classes.join(" ")}" data-act="drop" data-board="ocean" data-x="${x}" data-y="${y}"${style} aria-label="${esc(label)}">${mark}</button>`;
          } else if (weapon === "buoy" && yourTurn()) {
            html += `<button type="button" class="${classes.join(" ")}" data-act="buoy" data-board="ocean" data-x="${x}" data-y="${y}"${style} aria-label="${esc(label)}">${mark}</button>`;
          } else if (weapon === "patch" && yourTurn()) {
            html += `<button type="button" class="${classes.join(" ")}" data-act="patch" data-board="ocean" data-x="${x}" data-y="${y}"${style} aria-label="${esc(label)}">${mark}</button>`;
          } else {
            html += `<div class="${classes.join(" ")}" data-board="ocean" data-x="${x}" data-y="${y}"${style} aria-label="${esc(label)}">${mark}</div>`;
          }
        } else {
          const shot = viewer.attack[y][x];
          const sealed = shot === "sealed";
          const shown = sealed ? null : shot;
          const wreck = viewer.wrecks.find((ship) => ship.cells.some((cell) => cell.x === x && cell.y === y));
          if (wreck) classes.push("is-ship", "is-wreck");
          if (sealed) classes.push("is-sealed");
          if (shown) classes.push(shown === "hit" ? "is-hit" : "is-miss");
          if (viewer.radar && viewer.radar.cells.some((cell) => cell.x === x && cell.y === y)) {
            classes.push("is-radar");
            if (viewer.radar.decoy) classes.push("is-decoy");
          }
          if (viewer.mine && viewer.mine.some((cell) => cell.x === x && cell.y === y)) classes.push("is-armed");
          if (viewer.missile && viewer.missile.cells.some((cell) => cell.x === x && cell.y === y)) classes.push("is-inbound");
          if (viewer.flash.includes(key)) classes.push("is-fresh");
          mark = sealed ? `<i class="bs-mend"></i>` : peg(shown);
          if (viewer.missile && viewer.missile.x + 1 === x && viewer.missile.y + 1 === y) mark += `<i class="bs-cross"></i>`;
          if (classes.includes("is-decoy")) {
            mark += buoyMark();
            label += " decoy buoy";
          }
          if (sealed) label += " patched, shoot again";
          else if (shown) label += shown === "hit" ? " hit" : " miss";
          if (wreck && shown === "hit") mark = "";
          const style = wreck ? ` style="--ship:${wreck.color}"` : "";
          const clickable = yourTurn() && (!weapon || weapon === "mine" || weapon === "missile" || weapon === "buoy" || weapon === "patch");
          if (clickable) {
            html += `<button type="button" class="${classes.join(" ")}" data-act="cell" data-board="attack" data-x="${x}" data-y="${y}"${style} aria-label="${esc(label)}">${mark}</button>`;
          } else {
            html += `<div class="${classes.join(" ")}" data-board="attack" data-x="${x}" data-y="${y}"${style} aria-label="${esc(label)}">${mark}</div>`;
          }
        }
      }
    }
    if (!attack) html += viewer.ships.map((ship) => hullMarkup(ship, ship.cells, "", viewer.ocean)).join("");
    else html += viewer.wrecks.map((ship) => hullMarkup(ship, ship.cells, "", viewer.attack)).join("");
    if (attack && viewer.mine && viewer.mine.length) {
      const origin = viewer.mine[0];
      html += `<i class="bs-ordnance" style="--mx:${origin.x};--my:${origin.y}">${mineMark()}</i>`;
    }
    html += "</div>";
    return html;
  };

  const pips = (len, color) => `<span class="bs-pips">${Array.from({ length: len }, () => `<i style="background:${color}"></i>`).join("")}</span>`;

  const sideHtml = () => {
    if (phase === "place") {
      const player = players[placer];
      const ships = FLEET.map((spec) => {
        const placed = player.ships.some((ship) => ship.id === spec.id);
        return `<button type="button" class="bs-pick${selected === spec.id && !placed ? " is-on" : ""}${placed ? " is-sunk" : ""}" data-act="pick" data-id="${spec.id}" ${placed ? "disabled" : ""}>
          <strong>${spec.name}</strong>
          ${pips(spec.len, spec.color)}
        </button>`;
      }).join("");
      return `<aside class="bs-side">
        <h3>Your ships</h3>
        <div class="bs-list">${ships}</div>
        <button type="button" class="bs-go" data-act="rotate">Rotate</button>
        <p class="bs-hint">The highlight is the whole ship. Green fits. Red does not. R rotates.</p>
      </aside>`;
    }
    const foe = players[1 - viewIndex()];
    const me = players[viewIndex()];
    const naming = weapon === "radar" && yourTurn() && me.cd.radar === 0;
    const ships = FLEET.map((spec) => {
      const ship = foe.ships.find((item) => item.id === spec.id);
      const sunk = me.wrecks.some((wreck) => wreck.id === spec.id) || !!(ship && ship.hits >= ship.len);
      if (naming && !sunk) {
        return `<button type="button" class="bs-pick" data-act="target" data-id="${spec.id}">
          <strong>${spec.name}</strong>
          ${pips(spec.len, spec.color)}
        </button>`;
      }
      return `<div class="bs-pick${sunk ? " is-sunk" : ""}">
        <strong>${esc(spec.name)}</strong>
        <span>${sunk ? "Sunk" : "Afloat"}</span>
        ${pips(spec.len, spec.color)}
      </div>`;
    }).join("");
    return `<aside class="bs-side">
      <h3>${naming ? "Name a ship" : "Their fleet"}</h3>
      <div class="bs-list">${ships}</div>
      <p class="bs-hint">${naming ? "The radar paints a 3×3 that hides part of that ship." : "The carrier offers three cards. A cruiser or destroyer gives a sea mine. A missile is rare."}</p>
    </aside>`;
  };

  const cdText = (player, key) => {
    const left = player.cd[key];
    if (left <= 0) return "Ready";
    const shown = Math.min(left, CD[key]);
    return shown === 1 ? "1 turn" : `${shown} turns`;
  };

  const gear = {
    radar: `<svg class="bs-gear" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="bs-plate-r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e7f0f7"/><stop offset="0.5" stop-color="#7d92a4"/><stop offset="1" stop-color="#1c2833"/></linearGradient>
        <radialGradient id="bs-glass-r" cx="42%" cy="38%" r="62%"><stop offset="0" stop-color="#1d4d68"/><stop offset="1" stop-color="#07131c"/></radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#bs-plate-r)"/>
      <circle cx="32" cy="32" r="23" fill="url(#bs-glass-r)" stroke="#b9f3ff" stroke-width="1.4"/>
      <circle cx="32" cy="32" r="15" fill="none" stroke="#2ee7ff" stroke-opacity=".45"/>
      <circle cx="32" cy="32" r="8" fill="none" stroke="#2ee7ff" stroke-opacity=".8"/>
      <g class="bs-sweep"><path d="M32 32 L32 9 A23 23 0 0 1 52 22 Z" fill="#2ee7ff" fill-opacity=".42"/></g>
      <circle cx="32" cy="32" r="2.4" fill="#f4fbff"/>
    </svg>`,
    torpedo: `<svg class="bs-gear" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="bs-tube" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c5d4e0"/><stop offset="0.4" stop-color="#5d7386"/><stop offset="1" stop-color="#1a242e"/></linearGradient>
        <linearGradient id="bs-fish" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8fdfff"/><stop offset="1" stop-color="#f4fbff"/></linearGradient>
      </defs>
      <rect x="4" y="20" width="36" height="24" rx="5" fill="url(#bs-tube)"/>
      <rect x="8" y="24" width="24" height="4" rx="2" fill="#f4fbff" opacity=".55"/>
      <rect x="8" y="40" width="22" height="2" rx="1" fill="#0d1620" opacity=".45"/>
      <polygon points="40,16 60,32 40,48" fill="url(#bs-fish)"/>
      <path d="M44 18 L54 26 L44 26 Z" fill="#ff2ea6"/>
      <path d="M44 46 L54 38 L44 38 Z" fill="#ff2ea6"/>
      <circle cx="14" cy="32" r="2" fill="#d7e4ee"/>
      <circle cx="22" cy="32" r="2" fill="#d7e4ee"/>
    </svg>`,
    mine: `<svg class="bs-gear" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <radialGradient id="bs-orb" cx="38%" cy="34%" r="68%"><stop offset="0" stop-color="#f2f6f8"/><stop offset="0.45" stop-color="#8b98a3"/><stop offset="1" stop-color="#2a333b"/></radialGradient>
      </defs>
      <circle cx="32" cy="34" r="15" fill="url(#bs-orb)" stroke="#10181f" stroke-width="1"/>
      <circle cx="26" cy="28" r="4" fill="#fff" opacity=".4"/>
      <g fill="#d5dee6" stroke="#121a22" stroke-width="1">
        <circle cx="32" cy="12" r="3"/><circle cx="32" cy="56" r="3"/>
        <circle cx="12" cy="34" r="3"/><circle cx="52" cy="34" r="3"/>
        <circle cx="17" cy="19" r="2.6"/><circle cx="47" cy="19" r="2.6"/>
        <circle cx="17" cy="49" r="2.6"/><circle cx="47" cy="49" r="2.6"/>
      </g>
    </svg>`,
    buoy: `<svg class="bs-gear" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="bs-float" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7a8"/><stop offset="0.5" stop-color="#ffb020"/><stop offset="1" stop-color="#8a4e08"/></linearGradient>
      </defs>
      <path d="M32 8 L36 20 H28 Z" fill="#f4fbff"/>
      <circle cx="32" cy="34" r="14" fill="url(#bs-float)" stroke="#3a2408" stroke-width="1.4"/>
      <path d="M20 34 H44" stroke="#3a2408" stroke-width="2"/>
      <circle cx="32" cy="34" r="3" fill="#fff6d8"/>
      <path d="M18 50 Q32 58 46 50" fill="none" stroke="#9fdfff" stroke-width="2"/>
    </svg>`,
    patch: `<svg class="bs-gear" viewBox="0 0 64 64" aria-hidden="true">
      <rect x="30" y="24" width="5" height="30" rx="1.6" fill="#d5dee6"/>
      <rect x="12" y="12" width="40" height="16" rx="3" fill="#8ea0ae" stroke="#12181e" stroke-width="1.4"/>
      <rect x="15" y="15" width="34" height="4" rx="1.2" fill="#f4f7fb" opacity=".75"/>
    </svg>`,
    missile: `<svg class="bs-gear" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="bs-rocket-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4fbff"/><stop offset="1" stop-color="#6d7f90"/></linearGradient>
      </defs>
      <polygon points="32,6 42,22 22,22" fill="#ff5a36"/>
      <rect x="22" y="20" width="20" height="26" rx="8" fill="url(#bs-rocket-body)"/>
      <circle cx="32" cy="30" r="3.2" fill="#7fd4ff"/>
      <polygon points="22,32 12,46 22,42" fill="#9aa8b5"/>
      <polygon points="42,32 52,46 42,42" fill="#9aa8b5"/>
      <polygon points="26,46 32,60 38,46" fill="#ffb020"/>
      <polygon points="28,46 32,56 36,46" fill="#fff6d2"/>
    </svg>`,
  };

  const chargeText = (player, id) => {
    if (id === "radar") return player.cd.radar <= 0 ? "Ready" : `Back in ${cdText(player, id)}`;
    const held = player.charges[id] || 0;
    if (id === "mine" && player.mine) return held ? `Armed · ${held} left` : "Armed";
    if (id === "missile" && player.missile) {
      const left = player.missile.left;
      const when = left === 1 ? "Arrives in 1 turn" : `Arrives in ${left} turns`;
      return held ? `${when} · ${held} left` : when;
    }
    if (held <= 0) return "Empty";
    return held === 1 ? "1 use" : `${held} uses`;
  };

  const weaponsHtml = (player) => {
    const items = [
      ["radar", "Radar", "Name a ship. A 3×3 stays through your next turn."],
      ["torpedo", "Torpedo", "One line from the left or the top. Stops at the first ship."],
      ["mine", "Sea mine", "Arm a 2×2. It explodes on your next turn."],
      ["buoy", "Decoy buoy", "1×1 on your water. 50% chance to catch their radar."],
      ["patch", "Patch", "Repair one hit. That square no longer counts until they shoot it again."],
      ["missile", "Missile", "A 3×3 that lands two turns after you launch it."],
    ];
    const popped = player.fresh;
    player.fresh = "";
    return `<section class="bs-deck" aria-label="Warship weapons">
      <p class="bs-deck-name">Weapons deck</p>
      <div class="bs-weapons">${items.map(([id, title, copy]) => {
        const ready = stocked(player, id);
        const on = weapon === id;
        return `<button type="button" class="bs-weapon is-${id}${on ? " is-on" : ""}${popped === id ? " is-grant" : ""}" data-act="weapon" data-id="${id}" ${ready && yourTurn() ? "" : "disabled"}>
          <span class="bs-mount">${gear[id]}</span>
          <strong>${title}</strong>
          <span class="bs-blurb">${copy}</span>
          <em><i class="bs-lamp"></i>${chargeText(player, id)}</em>
        </button>`;
      }).join("")}</div>
    </section>`;
  };

  const shell = (title, body, footer) => `
    <div class="bs-shell ${phase === "battle" && current !== viewIndex() ? "is-them" : "is-you"}" style="--preview:${specOf(selected) ? specOf(selected).color : "#2ee7ff"}">
      <header class="bs-top">
        <button type="button" class="bs-back" data-act="${phase === "menu" ? "close" : "menu"}">Back</button>
        <div>
          <p class="bs-kicker">Battleships</p>
          <h2>${esc(title)}</h2>
        </div>
        <p class="bs-note" aria-live="polite">${esc(notice)}</p>
      </header>
      <div class="bs-stage ${phase === "battle" ? "is-fight" : ""}">${body}</div>
      <footer class="bs-bar">${footer || ""}</footer>
    </div>`;

  const render = () => {
    if (phase === "menu") {
      ui.innerHTML = `
        <section class="bs-panel">
          <button type="button" class="bs-back" data-act="close">Back</button>
          <p class="bs-kicker">Battleships</p>
          <h2>Find the fleet</h2>
          <p class="bs-copy">Five ships. One shot, or one weapon. Sink a ship to draw a card. Hit a ship and you go again. Online, your fleet stays on your screen.</p>
          <div class="bs-actions">
            <button type="button" class="bs-go" data-act="bot">Versus bot</button>
            <button type="button" class="bs-go bs-ghost" data-act="hotseat">Two players</button>
            <button type="button" class="bs-go" data-act="online">Online</button>
          </div>
        </section>`;
      return;
    }
    if (phase === "online") {
      ui.innerHTML = `
        <section class="bs-panel">
          <button type="button" class="bs-back" data-act="menu">Back</button>
          <p class="bs-kicker">Online</p>
          <h2>Play a friend</h2>
          <p class="bs-copy">One player hosts and shares a code. The other joins. You each place your own fleet, and only your screen knows where those ships are.</p>
          <p class="bs-copy">${esc(notice)}</p>
          <div class="bs-actions">
            <button type="button" class="bs-go" data-act="host">Host</button>
            <button type="button" class="bs-go bs-ghost" data-act="join-mode">Join</button>
          </div>
        </section>`;
      return;
    }
    if (phase === "join") {
      ui.innerHTML = `
        <section class="bs-panel">
          <button type="button" class="bs-back" data-act="online">Back</button>
          <p class="bs-kicker">Join</p>
          <h2>Enter the code</h2>
          <p class="bs-copy">${esc(notice || "Ask the host for the 4-letter code.")}</p>
          <form data-join>
            <input class="bs-code" maxlength="4" autocomplete="off" spellcheck="false" placeholder="CODE" aria-label="Room code">
            <button class="bs-go" type="submit">Join</button>
          </form>
        </section>`;
      return;
    }
    if (phase === "room") {
      ui.innerHTML = `
        <section class="bs-panel">
          <button type="button" class="bs-back" data-act="online">Back</button>
          <p class="bs-kicker">Room</p>
          <h2>Share this code</h2>
          <p class="bs-code">${esc(net.code)}</p>
          <p class="bs-copy">${esc(notice || "You are player 1. The other player joins with this code.")}</p>
        </section>`;
      return;
    }
    if (phase === "again") {
      ui.innerHTML = `
        <section class="bs-panel">
          <button type="button" class="bs-back" data-act="menu">Back</button>
          <p class="bs-kicker">Rematch</p>
          <h2>Waiting</h2>
          <p class="bs-copy">${esc(notice || "Waiting for the rival to rematch.")}</p>
        </section>`;
      return;
    }
    if (phase === "eyes") {
      ui.innerHTML = `
        <section class="bs-eyes">
          <p class="bs-kicker">${esc(notice)}</p>
          <h2>${esc(eyesCopy)}</h2>
          ${eyesCopy === "Close your eyes" ? "" : `<p class="bs-copy">Close your eyes.</p>`}
          <button type="button" class="bs-go" data-act="eyes">OK</button>
        </section>`;
      return;
    }
    if (phase === "end") {
      const yours = endKind === "disconnect" || (mode === "online" ? winner === seat : (mode !== "bot" || winner === 0));
      const title = endKind === "disconnect" ? "Player disconnected" : (yours ? "Good job" : "Fleet lost");
      const copy = endKind === "disconnect"
        ? "The other player left."
        : (yours ? "Every enemy ship is under the water." : "Every one of your ships is under the water.");
      ui.innerHTML = `
        <section class="bs-panel bs-end">
          <p class="bs-kicker">${esc(notice)}</p>
          <h2>${esc(title)}</h2>
          <p class="bs-copy">${esc(copy)}</p>
          <div class="bs-actions">
            <button type="button" class="bs-go" data-act="rematch">Rematch</button>
            <button type="button" class="bs-go bs-ghost" data-act="menu">Menu</button>
          </div>
        </section>`;
      return;
    }
    const viewer = players[viewIndex()];
    const foe = players[1 - viewIndex()];
    if (phase === "place") {
      const title = mode === "online" && selfReady
        ? "Waiting for the other fleet"
        : `${nameOf(placer)} · place your fleet`;
      const foot = mode === "online"
        ? "You both place at the same time. Your ships stay on this screen."
        : "Click a ship on the right, then the square where its bow sits.";
      ui.innerHTML = shell(
        title,
        `<div><p class="bs-caption">Your ships</p><p class="bs-sub">${selfReady ? "Waiting for their ships." : "Drop the bow on the water."}</p>${boardHtml("ocean", players[placer], null)}</div>${sideHtml()}`,
        `<p class="bs-foot">${foot}</p>`,
      );
      applyPreview();
      return;
    }
    const title = `${turnName(current)} turn`;
    const ownBoard = weapon === "buoy" || weapon === "patch";
    const hint = weapon === "torpedo"
      ? "Pick a letter to fire down from the top, or a number to fire from the left."
      : weapon === "mine"
        ? "Click the attack board. The 2×2 mine explodes on your next turn."
        : weapon === "missile"
          ? "Click the attack board. The 3×3 missile arrives two turns later."
        : weapon === "buoy"
          ? "Click an empty square on your ships. The buoy does not draw a card."
        : weapon === "patch"
          ? "Click a hit on your ships. The hammer seals that hole."
        : weapon === "radar"
          ? "Pick one of their ships on the right."
          : "Click the attack board to fire. Sink a ship to draw a card. A missile is rare.";
    const ownSub = weapon === "buoy"
      ? "Click open water on this board to drop the buoy."
      : weapon === "patch"
        ? "Click a hit on this board. The hammer shows the repair."
        : "Their shots land on this board.";
    const foeSub = weapon === "buoy"
      ? "The decoy does not go on this board."
      : weapon === "patch"
        ? "Patch a hole on your ships, not over here."
        : weapon === "missile"
          ? "Click a square. The blast covers a 3×3."
          : "Click a square to fire. A hit lets you go again.";
    ui.innerHTML = shell(
      title,
      `<div class="bs-pair">
        <div class="${ownBoard ? "is-aim" : ""}">
          <p class="bs-caption">Your ships</p>
          <p class="bs-sub">${ownSub}</p>
          ${boardHtml("ocean", viewer, foe)}
          <p class="bs-turn${current === viewIndex() ? "" : " is-next"}">${esc(boardTurn())}</p>
        </div>
        <div class="${ownBoard ? "is-dim" : ""}">
          <p class="bs-caption">Enemy waters</p>
          <p class="bs-sub">${foeSub}</p>
          ${boardHtml("attack", viewer, foe)}
          <p class="bs-turn${current === viewIndex() ? "" : " is-next"}">${esc(boardTurn())}</p>
        </div>
      </div>${sideHtml()}`,
      `<div class="bs-key"><span><i class="bs-peg"></i>Hit</span><span><i class="bs-dot"></i>Miss</span><span class="is-sealed"><i class="bs-mend"></i>Patched</span><span class="is-radar">Radar</span><span class="is-armed">Mine</span><span class="is-inbound">Missile</span><span class="is-decoy">${buoyMark()}Decoy</span></div><p class="bs-foot">${hint}</p>${weaponsHtml(viewer)}`,
    );
    applyPreview();
    armBoom();
    armImpact();
  };

  const onAct = (act, el) => {
    if (root.hidden) return;
    if (act !== "close" && act !== "menu" && busy && act !== "eyes") return;
    if (act === "close") {
      close();
      return;
    }
    if (act === "menu") {
      clearTimeout(timer);
      dropNet();
      hush();
      clearLoot();
      clearFx();
      busy = false;
      weapon = null;
      mode = "bot";
      phase = "menu";
      render();
      return;
    }
    if (act === "online") {
      showOnline();
      return;
    }
    if (act === "host") {
      hostRoom();
      return;
    }
    if (act === "join-mode") {
      dropNet();
      mode = "online";
      phase = "join";
      notice = "";
      render();
      return;
    }
    if (act === "bot" || act === "hotseat") {
      dropNet();
      startMatch(act);
      return;
    }
    if (act === "rematch") {
      if (mode === "online") {
        if (endKind === "disconnect" || !net.conn || !net.conn.open) {
          showOnline();
          return;
        }
        wantAgain = true;
        send({ t: "again" });
        if (foeAgain) beginOnlineMatch();
        else {
          phase = "again";
          notice = "Waiting for the rival to rematch.";
          render();
        }
        return;
      }
      startMatch(mode);
      return;
    }
    if (act === "eyes") {
      const next = eyesNext;
      eyesNext = null;
      if (next) next();
      return;
    }
    if (act === "rotate") {
      rotate();
      return;
    }
    if (phase === "place" && act === "pick") {
      const id = el.dataset.id;
      if (remaining(players[placer]).some((ship) => ship.id === id)) {
        selected = id;
        render();
      }
      return;
    }
    if (phase === "place" && act === "drop") {
      tryPlace(Number(el.dataset.x), Number(el.dataset.y));
      return;
    }
    if (phase === "place") return;
    if (!yourTurn()) return;
    if (act === "weapon") {
      const id = el.dataset.id;
      if (!stocked(players[current], id)) return;
      weapon = weapon === id ? null : id;
      notice = "";
      render();
      return;
    }
    if (act === "target") {
      useRadar(el.dataset.id);
      return;
    }
    if (act === "line") {
      if (weapon !== "torpedo") return;
      useTorpedo(el.dataset.axis, Number(el.dataset.i));
      return;
    }
    if (act === "cell") {
      const x = Number(el.dataset.x);
      const y = Number(el.dataset.y);
      if (weapon === "mine") useMine(x, y);
      else if (weapon === "missile") useMissile(x, y);
      else if (weapon === "buoy") {
        notice = "Drop the decoy on your ships, on open water.";
        tone(120, 0.05, "square");
        render();
      } else if (weapon === "patch") {
        notice = "Patch a hit on your ships.";
        tone(120, 0.05, "square");
        render();
      } else if (!weapon) useShot(x, y);
      return;
    }
    if (act === "buoy") {
      if (weapon !== "buoy") return;
      useBuoy(Number(el.dataset.x), Number(el.dataset.y));
      return;
    }
    if (act === "patch") {
      if (weapon !== "patch") return;
      usePatch(Number(el.dataset.x), Number(el.dataset.y));
    }
  };

  ui.addEventListener("click", (event) => {
    const el = event.target.closest("[data-act]");
    if (!el) return;
    onAct(el.dataset.act, el);
  });

  ui.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-join]");
    if (!form) return;
    event.preventDefault();
    const input = form.querySelector("input");
    joinRoom(input ? input.value : "");
  });

  ui.addEventListener("pointerover", (event) => {
    const head = event.target.closest("[data-axis]");
    const cell = event.target.closest(".bs-cell");
    if (head) hover = { line: { axis: head.dataset.axis, index: Number(head.dataset.i) } };
    else if (cell) hover = { x: Number(cell.dataset.x), y: Number(cell.dataset.y), board: cell.dataset.board };
    else return;
    applyPreview();
  });

  ui.addEventListener("pointerout", (event) => {
    const from = event.target.closest && (event.target.closest(".bs-cell") || event.target.closest("[data-axis]"));
    if (!from) return;
    const next = event.relatedTarget;
    if (!next || !ui.contains(next) || (!next.closest?.(".bs-cell") && !next.closest?.("[data-axis]"))) {
      hover = null;
      applyPreview();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (root.hidden) return;
    if ((event.key === "r" || event.key === "R") && phase === "place") {
      event.preventDefault();
      rotate();
    }
    if ((event.key === "Enter" || event.key === " ") && phase === "eyes") {
      event.preventDefault();
      const next = eyesNext;
      eyesNext = null;
      if (next) next();
    }
  });

  const close = () => {
    clearTimeout(timer);
    dropNet();
    hush();
    clearLoot();
    clearFx();
    busy = false;
    root.hidden = true;
    document.body.style.overflow = "";
    phase = "menu";
  };

  const open = () => {
    root.hidden = false;
    document.body.style.overflow = "hidden";
    showMenu();
  };

  const showMenu = () => {
    clearTimeout(timer);
    hush();
    clearLoot();
    clearFx();
    busy = false;
    weapon = null;
    phase = "menu";
    notice = "";
    render();
  };

  openButton.addEventListener("click", open);
})();
