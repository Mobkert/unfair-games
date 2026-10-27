(() => {
  const openButton = document.querySelector("#open-rebound");
  const root = document.querySelector("#rebound");
  const canvas = document.querySelector("#rebound-canvas");
  const ui = document.querySelector("#rebound-root");
  if (!openButton || !root || !canvas || !ui) return;

  const ctx = canvas.getContext("2d");
  const LW = 1280;
  const LH = 720;
  const CX = 640;
  const CY = 286;
  const STADIUM = 228;
  const BEY = 24;

  const TOPS = [
    { id: "scorch", name: "Scorch", type: "attack", blurb: "Fire spikes for 7 seconds.", atk: 8, def: 3, sta: 4, spd: 8 },
    { id: "steed", name: "Steed", type: "stamina", blurb: "A rush of speed for 7 seconds.", atk: 5, def: 5, sta: 9, spd: 5 },
    { id: "chelonian", name: "Chelonian", type: "defense", blurb: "A circle that shrugs off hits.", atk: 4, def: 9, sta: 5, spd: 3 },
    { id: "fulcrum", name: "Fulcrum", type: "balance", blurb: "Even stats. No special yet.", atk: 6, def: 6, sta: 6, spd: 6 },
    { id: "wraith", name: "Wraith", type: "balance", blurb: "Blinks through the other top.", atk: 6, def: 4, sta: 5, spd: 8 },
    { id: "lodestone", name: "Lodestone", type: "stamina", blurb: "Yanks the other top in.", atk: 4, def: 6, sta: 8, spd: 4 },
    { id: "echo", name: "Echo", type: "defense", blurb: "Sends damage back.", atk: 5, def: 9, sta: 6, spd: 3 },
    { id: "nova", name: "Nova", type: "attack", blurb: "Blasts shockwaves.", atk: 9, def: 3, sta: 4, spd: 7 },
    { id: "leech", name: "Leech", type: "balance", blurb: "Steals health and spin.", atk: 7, def: 5, sta: 7, spd: 5 },
    { id: "rime", name: "Rime", type: "defense", blurb: "Freezes the other top.", atk: 4, def: 8, sta: 6, spd: 4 },
    { id: "jester", name: "Jester", type: "balance", blurb: "Swaps places, then flings.", atk: 6, def: 5, sta: 6, spd: 6 },
    { id: "titan", name: "Titan", type: "attack", blurb: "Grows huge and hits heavy.", atk: 8, def: 6, sta: 4, spd: 3 },
    { id: "burrow", name: "Burrow", type: "stamina", blurb: "Plants mines in the bowl.", atk: 5, def: 5, sta: 8, spd: 4 },
    { id: "bolt", name: "Bolt", type: "attack", blurb: "Dashes through in a lightning line.", atk: 8, def: 3, sta: 4, spd: 9 },
  ];

  const SHIELDS = [
    { id: "slab", name: "Slab", blurb: "Heavy plate.", atk: 0, def: 2, sta: 1, spd: -2 },
    { id: "feather", name: "Feather", blurb: "Light and quick.", atk: 1, def: -1, sta: -1, spd: 2 },
    { id: "band", name: "Band", blurb: "A long spin.", atk: 0, def: 1, sta: 2, spd: 0 },
    { id: "core", name: "Core", blurb: "A little of everything.", atk: 1, def: 1, sta: 1, spd: 1 },
    { id: "razor", name: "Razor", blurb: "Sharp contact.", atk: 2, def: -1, sta: 0, spd: 1 },
    { id: "aegis", name: "Aegis", blurb: "A thick guard.", atk: -1, def: 3, sta: 0, spd: -1 },
    { id: "wing", name: "Wing", blurb: "Fast, thin metal.", atk: 1, def: 0, sta: -2, spd: 2 },
    { id: "anchor", name: "Anchor", blurb: "Sits and lasts.", atk: 0, def: 2, sta: 2, spd: -2 },
    { id: "thorn", name: "Thorn", blurb: "Hits harder.", atk: 3, def: -1, sta: -1, spd: 0 },
    { id: "halo", name: "Halo", blurb: "Smooth all round.", atk: 1, def: 1, sta: 1, spd: 0 },
  ];

  const TIPS = [
    { id: "pin", name: "Pin", blurb: "Slow and planted.", atk: 0, def: 2, sta: 1, spd: -2 },
    { id: "rush", name: "Rush", blurb: "Charges the bowl.", atk: 1, def: 0, sta: -2, spd: 3 },
    { id: "glide", name: "Glide", blurb: "Keeps its spin.", atk: 0, def: 1, sta: 3, spd: -1 },
    { id: "even", name: "Even", blurb: "No lean.", atk: 1, def: 1, sta: 1, spd: 1 },
    { id: "flash", name: "Flash", blurb: "The fastest tip.", atk: 2, def: -1, sta: -2, spd: 3 },
    { id: "loop", name: "Loop", blurb: "Circles the middle.", atk: 0, def: 2, sta: 2, spd: -2 },
    { id: "drift", name: "Drift", blurb: "A long, lazy spin.", atk: 0, def: 0, sta: 3, spd: -2 },
    { id: "saw", name: "Saw", blurb: "Bites on contact.", atk: 2, def: -1, sta: -1, spd: 2 },
    { id: "rest", name: "Rest", blurb: "Stays up.", atk: 0, def: 1, sta: 2, spd: -1 },
    { id: "press", name: "Press", blurb: "Heavy on the floor.", atk: -1, def: 3, sta: 0, spd: -1 },
  ];

  const TYPE_COLOR = {
    attack: "#ff5a36",
    defense: "#3d8bff",
    stamina: "#3dffb0",
    balance: "#d5e6ff",
  };

  const findPart = (list, id) => list.find((part) => part.id === id) || list[0];

  const compile = (pick) => {
    const top = findPart(TOPS, pick.top);
    const shield = findPart(SHIELDS, pick.shield);
    const tip = findPart(TIPS, pick.tip);
    const atk = Math.max(1, top.atk + shield.atk + tip.atk);
    const def = Math.max(1, top.def + shield.def + tip.def);
    const sta = Math.max(1, top.sta + shield.sta + tip.sta);
    const spd = Math.max(1, top.spd + shield.spd + tip.spd);
    const spread = Math.max(atk, def, sta) - Math.min(atk, def, sta);
    let shape = "balance";
    if (spread >= 3) {
      shape = atk >= def && atk >= sta ? "attack" : def >= sta ? "defense" : "stamina";
    }
    return {
      top,
      shield,
      tip,
      atk,
      def,
      sta,
      spd,
      shape,
      hp: Math.round(140 + def * 16),
      dmg: Math.round(7 + atk * 1.45),
      move: 0.95 + spd * 0.09,
      drain: 3.6 / (0.85 + sta * 0.16),
    };
  };

  let view = "menu";
  let mode = "hotseat";
  let builder = 0;
  let pick = { top: "scorch", shield: "core", tip: "even" };
  let builds = [null, null];
  let points = [0, 0];
  let launchPower = [null, null];
  let launchIndex = 0;
  let botWait = 0;
  let beys = [];
  let roundLive = false;
  let banner = null;
  let ready = [false, false];
  let cardT = 0;
  let matchWinner = -1;
  let seat = 0;
  let tap = { ability: false, qte: false };
  let simTick = 0;
  let simAcc = 0;
  let inputs = [{}, {}];
  let rngState = 1;
  const net = { role: null, peer: null, conn: null, code: "", seed: 1, lag: 0 };
  const hold = { cont: [false, false], rematch: [false, false] };
  const peerOptions = { host: "0.peerjs.com", port: 443, path: "/", secure: true };
  const codeChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const DELAY = 8;
  const STEP = 1 / 60;
  let shards = [];
  let motes = [];
  let waves = [];
  let mines = [];
  let arena = "bowl";
  let roads = [];
  let clash = null;
  let shake = 0;
  let hitStop = 0;
  let flash = 0;
  let heartAt = 0;
  let bed = null;
  let noiseBuf = null;
  let clock = 0;
  let last = 0;
  let raf = 0;
  let audio = null;
  let pointer = { x: 0, y: 0, down: false };

  const noise = () => {
    if (noiseBuf || !audio) return noiseBuf;
    noiseBuf = audio.createBuffer(1, Math.floor(audio.sampleRate * 0.4), audio.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    return noiseBuf;
  };

  const tone = (freq, dur, type, gain) => {
    if (!audio) return;
    const t = audio.currentTime;
    const osc = audio.createOscillator();
    const air = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type;
    air.type = type === "square" ? "triangle" : "sine";
    osc.frequency.setValueAtTime(Math.max(48, freq * 1.35), t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.62), t + dur);
    air.frequency.setValueAtTime(Math.max(40, freq), t);
    air.detune.value = 11;
    amp.gain.setValueAtTime(Math.max(0.0001, gain), t);
    amp.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(amp);
    air.connect(amp);
    amp.connect(audio.destination);
    osc.start(t);
    air.start(t);
    osc.stop(t + dur);
    air.stop(t + dur);
  };

  const impact = (power) => {
    if (!audio) return;
    const t = audio.currentTime;
    const punch = Math.max(0.15, Math.min(1, power));
    const ping = audio.createOscillator();
    const amp = audio.createGain();
    ping.type = "triangle";
    ping.frequency.setValueAtTime(420 + punch * 860, t);
    ping.frequency.exponentialRampToValueAtTime(90, t + 0.14);
    amp.gain.setValueAtTime(0.03 + punch * 0.05, t);
    amp.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    ping.connect(amp);
    amp.connect(audio.destination);
    ping.start(t);
    ping.stop(t + 0.16);
    const crack = audio.createBufferSource();
    crack.buffer = noise();
    const band = audio.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 900 + punch * 1800;
    const crackAmp = audio.createGain();
    crackAmp.gain.setValueAtTime(0.03 + punch * 0.07, t);
    crackAmp.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    crack.connect(band);
    band.connect(crackAmp);
    crackAmp.connect(audio.destination);
    crack.start(t);
    crack.stop(t + 0.08);
    tone(54 + punch * 36, 0.12, "sine", 0.035 + punch * 0.02);
  };

  const stopBed = () => {
    if (!bed || !audio) return;
    const t = audio.currentTime;
    bed.amp.gain.cancelScheduledValues(t);
    bed.amp.gain.setValueAtTime(Math.max(0.0001, bed.amp.gain.value), t);
    bed.amp.gain.linearRampToValueAtTime(0.0001, t + 0.15);
    bed.osc.stop(t + 0.16);
    bed.air.stop(t + 0.16);
    bed = null;
  };

  const updateBed = () => {
    if (!audio) return;
    if (root.hidden || view !== "fight" || !roundLive || beys.length < 2) {
      stopBed();
      return;
    }
    if (!bed) {
      const osc = audio.createOscillator();
      const air = audio.createOscillator();
      const filter = audio.createBiquadFilter();
      const amp = audio.createGain();
      osc.type = "sawtooth";
      air.type = "triangle";
      osc.frequency.value = 62;
      air.frequency.value = 124;
      filter.type = "lowpass";
      filter.frequency.value = 420;
      amp.gain.value = 0.0001;
      osc.connect(filter);
      air.connect(filter);
      filter.connect(amp);
      amp.connect(audio.destination);
      osc.start();
      air.start();
      bed = { osc, air, filter, amp };
    }
    const speed = (beys[0].speed + beys[1].speed) * 0.5;
    const low = Math.min(beys[0].speed, beys[1].speed);
    const t = audio.currentTime;
    bed.osc.frequency.setTargetAtTime(46 + speed * 1.5, t, 0.08);
    bed.air.frequency.setTargetAtTime(92 + speed * 3.1, t, 0.08);
    bed.filter.frequency.setTargetAtTime(240 + speed * 9, t, 0.12);
    bed.amp.gain.setTargetAtTime(low < 26 ? 0.03 : 0.012, t, 0.1);
    if (low < 24 && low > 0 && t >= heartAt) {
      heartAt = t + 0.82;
      tone(62, 0.06, "sine", 0.055);
      const thump = audio.createOscillator();
      const amp = audio.createGain();
      thump.type = "sine";
      thump.frequency.setValueAtTime(44, t + 0.16);
      amp.gain.setValueAtTime(0.0001, t);
      amp.gain.setValueAtTime(0.05, t + 0.16);
      amp.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      thump.connect(amp);
      amp.connect(audio.destination);
      thump.start(t + 0.16);
      thump.stop(t + 0.32);
    }
  };

  const sparkBurst = (x, y, color, power) => {
    const count = 7 + Math.floor(power * 14);
    if (motes.length > 110) motes.splice(0, count);
    for (let i = 0; i < count; i += 1) {
      const ang = rand() * Math.PI * 2;
      const sp = 70 + rand() * 460 * (0.35 + power);
      motes.push({
        x,
        y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: 0.16 + rand() * 0.24,
        color,
        kind: "spark",
        r: 1.3 + rand() * 1.8,
      });
    }
  };

  const armAudio = () => {
    if (!audio) audio = new AudioContext();
    if (audio.state === "suspended") audio.resume();
  };

  const rand = () => {
    rngState = (Math.imul(rngState, 1664525) + 1013904223) >>> 0;
    return rngState / 4294967296;
  };

  const send = (msg) => {
    if (net.conn && net.conn.open) net.conn.send(msg);
  };

  const dropNet = () => {
    const conn = net.conn;
    const peer = net.peer;
    net.conn = null;
    net.peer = null;
    net.role = null;
    net.code = "";
    try { if (conn) conn.close(); } catch (error) { /* already closed */ }
    try { if (peer) peer.destroy(); } catch (error) { /* already closed */ }
  };

  const showWait = (title, copy) => {
    view = "wait";
    ui.innerHTML = `
      <section class="rb-panel">
        <button class="rb-back" type="button" data-action="mode">Back</button>
        <p class="rb-kicker">Online</p>
        <h2>${title}</h2>
        <p class="rb-copy">${copy}</p>
      </section>`;
  };

  const bothBuilds = () => {
    if (!builds[0] || !builds[1]) return;
    points = [0, 0];
    if (seat === 0) showArenas();
    else showWait("Arena", "The host is choosing the arena.");
  };

  const finishCont = () => {
    if (!hold.cont[0] || !hold.cont[1]) return;
    hold.cont = [false, false];
    continueRound();
  };

  const finishRematch = () => {
    if (!hold.rematch[0] || !hold.rematch[1]) return;
    hold.rematch = [false, false];
    points = [0, 0];
    showVersus();
  };

  const tryStartFight = () => {
    if (seat !== 0 || view === "fight") return;
    if (launchPower[0] == null || launchPower[1] == null) return;
    net.seed = (Math.random() * 0xffffffff) >>> 0;
    send({ t: "go", seed: net.seed, p0: launchPower[0], p1: launchPower[1] });
    beginFight();
  };

  const onNet = (msg) => {
    if (!msg) return;
    if (msg.t === "build") {
      builds[1 - seat] = compile({ top: msg.top, shield: msg.shield, tip: msg.tip });
      bothBuilds();
      return;
    }
    if (msg.t === "arena" && seat === 1) {
      arena = msg.id;
      roads = makeRoads();
      showVersus();
      return;
    }
    if (msg.t === "ready") {
      ready[1 - seat] = true;
      return;
    }
    if (msg.t === "launch") {
      launchPower[1 - seat] = msg.power;
      if (seat === 0) tryStartFight();
      return;
    }
    if (msg.t === "go" && seat === 1) {
      net.seed = msg.seed;
      launchPower = [msg.p0, msg.p1];
      beginFight();
      return;
    }
    if (msg.t === "in") {
      inputs[1 - seat][msg.tick] = { ability: !!msg.ability, qte: !!msg.qte };
      return;
    }
    if (msg.t === "cont") {
      hold.cont[1 - seat] = true;
      finishCont();
      return;
    }
    if (msg.t === "rematch") {
      hold.rematch[1 - seat] = true;
      finishRematch();
    }
  };

  const bindConn = (conn) => {
    net.conn = conn;
    conn.on("data", onNet);
    conn.on("close", () => {
      if (net.conn !== conn) return;
      dropNet();
      mode = "hotseat";
      showWait("Disconnected", "The other player left.");
    });
  };

  const roomCode = () => {
    let code = "";
    for (let i = 0; i < 4; i += 1) code += codeChars[Math.floor(Math.random() * codeChars.length)];
    return code;
  };

  const hostRoom = () => {
    if (!window.Peer) {
      showWait("Online", "Multiplayer could not load. Refresh and try again.");
      return;
    }
    dropNet();
    const code = roomCode();
    mode = "online";
    seat = 0;
    net.role = "host";
    net.code = code;
    const peer = new window.Peer(`unfairgames-rb-${code}`, peerOptions);
    net.peer = peer;
    showWait("Opening", "Connecting...");
    peer.on("open", () => {
      if (net.peer !== peer) return;
      ui.innerHTML = `
        <section class="rb-panel">
          <button class="rb-back" type="button" data-action="mode">Back</button>
          <p class="rb-kicker">Room</p>
          <h2>Share this code</h2>
          <p class="rb-code">${code}</p>
          <p class="rb-copy">You are player 1. The other player joins with this code.</p>
        </section>`;
    });
    peer.on("connection", (conn) => {
      if (net.peer !== peer || net.conn) {
        conn.close();
        return;
      }
      bindConn(conn);
      conn.on("open", () => {
        builds = [null, null];
        points = [0, 0];
        pick = { top: "scorch", shield: "core", tip: "even" };
        builder = 0;
        showBuild();
      });
    });
    peer.on("error", (err) => {
      if (net.peer !== peer) return;
      if (err && err.type === "unavailable-id") {
        try { peer.destroy(); } catch (error) { /* retry */ }
        if (net.peer === peer) net.peer = null;
        hostRoom();
        return;
      }
      showWait("Online", "Could not open a room.");
    });
  };

  const joinRoom = (raw) => {
    const code = String(raw || "").trim().toUpperCase();
    if (!window.Peer) {
      showWait("Online", "Multiplayer could not load. Refresh and try again.");
      return;
    }
    if (code.length < 4) {
      showWait("Join", "Enter the 4-letter code from the host.");
      return;
    }
    dropNet();
    mode = "online";
    seat = 1;
    net.role = "guest";
    net.code = code;
    const peer = new window.Peer(peerOptions);
    net.peer = peer;
    showWait("Join", "Connecting...");
    peer.on("open", () => {
      if (net.peer !== peer) return;
      const conn = peer.connect(`unfairgames-rb-${code}`);
      bindConn(conn);
      conn.on("open", () => {
        builds = [null, null];
        points = [0, 0];
        pick = { top: "steed", shield: "band", tip: "glide" };
        builder = 1;
        showBuild();
      });
    });
    peer.on("error", () => {
      if (net.peer !== peer) return;
      showWait("Join", "Could not find that room.");
    });
  };

  const showOnline = () => {
    view = "online";
    ui.innerHTML = `
      <section class="rb-panel">
        <button class="rb-back" type="button" data-action="mode">Back</button>
        <p class="rb-kicker">Online</p>
        <h2>Play a friend</h2>
        <p class="rb-copy">One player hosts and shares a code. The other joins. You are each a different top.</p>
        <div class="rb-actions">
          <button class="rb-go" type="button" data-action="host">Host</button>
          <button class="rb-go rb-ghost" type="button" data-action="join-mode">Join</button>
        </div>
      </section>`;
  };

  const showJoin = () => {
    view = "join";
    ui.innerHTML = `
      <section class="rb-panel">
        <button class="rb-back" type="button" data-action="online">Back</button>
        <p class="rb-kicker">Join</p>
        <h2>Enter the code</h2>
        <form data-join>
          <p class="rb-copy"><input class="rb-code" maxlength="4" autocomplete="off" placeholder="CODE" aria-label="Room code"></p>
          <button class="rb-go" type="submit">Join</button>
        </form>
      </section>`;
  };

  const pumpInput = () => {
    if (mode !== "online" || view !== "fight" || !roundLive) return;
    const tick = simTick + DELAY;
    if (inputs[seat][tick]) return;
    inputs[seat][tick] = { ability: tap.ability, qte: tap.qte };
    tap.ability = false;
    tap.qte = false;
    send({ t: "in", tick, ability: inputs[seat][tick].ability, qte: inputs[seat][tick].qte });
  };

  const fit = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = root.clientWidth || 1;
    const h = root.clientHeight || 1;
    const bw = Math.floor(w * dpr);
    const bh = Math.floor(h * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    const s = Math.min(w / LW, h / LH);
    return { dpr, w, h, s, ox: (w - LW * s) / 2, oy: (h - LH * s) / 2 };
  };

  const worldPoint = (event) => {
    const box = fit();
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left - box.ox) / box.s,
      y: (event.clientY - rect.top - box.oy) / box.s,
    };
  };

  const nameOf = (index) => (index === 1 && mode === "bot" ? "Bot" : `Player ${index + 1}`);

  const card = (group, part, selected) => `
    <button class="rb-part ${selected ? "is-on" : ""}" type="button" data-group="${group}" data-id="${part.id}">
      <strong>${part.name}</strong>
      <span>${part.blurb}</span>
    </button>`;

  const column = (title, group, list, selected) => `
    <div class="rb-col">
      <h3>${title}</h3>
      <button class="rb-roll" type="button" data-roll="${group}">Random</button>
      <div class="rb-list">
        ${list.map((part) => card(group, part, part.id === selected)).join("")}
      </div>
    </div>`;

  const showMenu = () => {
    view = "menu";
    ui.innerHTML = `
      <section class="rb-panel">
        <button class="rb-back" type="button" data-action="close">Back</button>
        <p class="rb-kicker">Rebound</p>
        <h2>Enter the bowl</h2>
        <p class="rb-copy">Build a top from a layer, a shield, and a tip. Launch it. First to 3 points.</p>
        <div class="rb-actions">
          <button class="rb-go" type="button" data-action="mode">Local</button>
        </div>
      </section>`;
  };

  const showMode = () => {
    view = "mode";
    ui.innerHTML = `
      <section class="rb-panel">
        <button class="rb-back" type="button" data-action="menu">Back</button>
        <p class="rb-kicker">Local</p>
        <h2>Who is spinning?</h2>
        <div class="rb-actions">
          <button class="rb-go" type="button" data-action="hotseat">Two players</button>
          <button class="rb-go rb-ghost" type="button" data-action="bot">Versus bot</button>
          <button class="rb-go rb-ghost" type="button" data-action="online">Online</button>
        </div>
      </section>`;
  };

  const readout = (built) => `${built.top.name} · ${built.top.type} · shape ${built.shape} · HP ${built.hp} · DMG ${built.dmg}`;

  const showBuild = () => {
    view = "build";
    const built = compile(pick);
    ui.innerHTML = `
      <section class="rb-panel rb-wide">
        <button class="rb-back" type="button" data-action="mode">Back</button>
        <p class="rb-kicker">${nameOf(builder)}</p>
        <h2>Construct</h2>
        <div class="rb-build">
          ${column("Top", "top", TOPS, pick.top)}
          ${column("Shield", "shield", SHIELDS, pick.shield)}
          ${column("Tip", "tip", TIPS, pick.tip)}
          <div class="rb-stage">
            <canvas id="rb-preview" width="280" height="250"></canvas>
            <canvas id="rb-radar" width="280" height="210"></canvas>
            <p class="rb-readout">${readout(built)}</p>
            <button class="rb-go" type="button" data-action="lock">Lock in</button>
          </div>
        </div>
      </section>`;
    paintBuild();
  };

  const ARENAS = [
    { id: "bowl", name: "Bowl", blurb: "The round stadium you have now." },
    { id: "wide", name: "Wide Bowl", blurb: "The same bowl, bigger, with knockout pockets." },
    { id: "roundbox", name: "Round Box", blurb: "Corner roads boost you out and launch you back through the middle." },
    { id: "peanut", name: "Peanut", blurb: "A small cup with wall roads into a bigger tilted cup." },
    { id: "open", name: "Open Field", blurb: "A huge bowl with no walls. Leave it and you fall out." },
    { id: "oval", name: "Oval", blurb: "Wide roads from the top and bottom sweep out to the sides." },
    { id: "under", name: "Arc", blurb: "A road from the top swings out to the right. One from the bottom swings out to the left." },
  ];

  const showArenas = () => {
    view = "arena";
    ui.innerHTML = `
      <section class="rb-panel rb-wide">
        <button class="rb-back" type="button" data-action="mode">Back</button>
        <p class="rb-kicker">Rebound</p>
        <h2>Choose the arena</h2>
        <div class="rb-arenas">
          ${ARENAS.map((item) => `
            <button class="rb-arena" type="button" data-arena="${item.id}">
              <canvas width="320" height="180" data-preview="${item.id}"></canvas>
              <strong>${item.name}</strong>
              <span>${item.blurb}</span>
            </button>`).join("")}
        </div>
      </section>`;
    ui.querySelectorAll("[data-preview]").forEach((preview) => {
      const g = preview.getContext("2d");
      const previous = arena;
      const previousRoads = roads;
      arena = preview.dataset.preview;
      roads = makeRoads();
      g.setTransform(preview.width / LW, 0, 0, preview.height / LH, 0, 0);
      g.fillStyle = "#07111f";
      g.fillRect(0, 0, LW, LH);
      drawBowl(g);
      arena = previous;
      roads = previousRoads;
    });
  };

  const paintBuild = () => {
    const preview = ui.querySelector("#rb-preview");
    const radar = ui.querySelector("#rb-radar");
    const note = ui.querySelector(".rb-readout");
    if (!preview || !radar) return;
    const built = compile(pick);
    if (note) note.textContent = readout(built);
    const pctx = preview.getContext("2d");
    pctx.clearRect(0, 0, preview.width, preview.height);
    pctx.save();
    pctx.translate(140, 128);
    drawTop(pctx, built, clock * 2.2, null, 78);
    pctx.restore();
    drawRadar(radar.getContext("2d"), radar.width, radar.height, built);
  };

  const drawRadar = (rctx, w, h, built) => {
    rctx.clearRect(0, 0, w, h);
    const cx = w * 0.5;
    const cy = h * 0.56;
    const radius = 62;
    const stats = [built.atk, built.spd, built.def, built.sta];
    const labels = ["ATK", "SPD", "DEF", "STA"];
    rctx.strokeStyle = "rgba(125, 176, 255, 0.35)";
    rctx.lineWidth = 1;
    for (let ring = 1; ring <= 4; ring += 1) {
      rctx.beginPath();
      for (let i = 0; i < 4; i += 1) {
        const ang = -Math.PI / 2 + i * (Math.PI / 2);
        const rr = radius * (ring / 4);
        const x = cx + Math.cos(ang) * rr;
        const y = cy + Math.sin(ang) * rr;
        if (i === 0) rctx.moveTo(x, y);
        else rctx.lineTo(x, y);
      }
      rctx.closePath();
      rctx.stroke();
    }
    rctx.beginPath();
    stats.forEach((value, i) => {
      const ang = -Math.PI / 2 + i * (Math.PI / 2);
      const rr = radius * Math.min(1.15, value / 10);
      const x = cx + Math.cos(ang) * rr;
      const y = cy + Math.sin(ang) * rr;
      if (i === 0) rctx.moveTo(x, y);
      else rctx.lineTo(x, y);
    });
    rctx.closePath();
    rctx.fillStyle = "rgba(61, 139, 255, 0.35)";
    rctx.strokeStyle = "#9fd0ff";
    rctx.lineWidth = 2;
    rctx.fill();
    rctx.stroke();
    rctx.fillStyle = "#d7e7ff";
    rctx.font = "700 13px Rajdhani, sans-serif";
    rctx.textAlign = "center";
    labels.forEach((label, i) => {
      const ang = -Math.PI / 2 + i * (Math.PI / 2);
      rctx.fillText(label, cx + Math.cos(ang) * (radius + 16), cy + Math.sin(ang) * (radius + 16) + 4);
    });
  };

  const field = () => {
    if (arena === "wide") return { kind: "circle", x: 640, y: 320, r: 270, walls: true, pockets: true };
    if (arena === "open") return { kind: "circle", x: 640, y: 300, r: 400, walls: false, pockets: false };
    if (arena === "roundbox") return { kind: "roundbox", x: 640, y: 270, hw: 400, hh: 198, cr: 92 };
    if (arena === "oval") return { kind: "oval", x: 640, y: 270, rx: 420, ry: 178 };
    if (arena === "peanut") return { kind: "peanut", small: { x: 460, y: 418, r: 128 }, big: { x: 760, y: 265, r: 245 } };
    if (arena === "under") return { kind: "circle", x: CX, y: CY, r: STADIUM, walls: true, pockets: false };
    return { kind: "circle", x: CX, y: CY, r: STADIUM, walls: true, pockets: false };
  };

  const arenaCenter = () => {
    const f = field();
    if (f.kind === "peanut") return { x: f.big.x, y: f.big.y, span: f.big.r };
    if (f.kind === "roundbox") return { x: f.x, y: f.y, span: (f.hw + f.hh) * 0.45 };
    if (f.kind === "oval") return { x: f.x, y: f.y, span: (f.rx + f.ry) * 0.35 };
    return { x: f.x, y: f.y, span: f.r };
  };

  const slopePoint = (x, y) => {
    const f = field();
    if (f.kind !== "peanut") return arenaCenter();
    const ds = Math.hypot(x - f.small.x, y - f.small.y) / f.small.r;
    const db = Math.hypot(x - f.big.x, y - f.big.y) / f.big.r;
    if (ds < db) return { x: f.small.x, y: f.small.y + f.small.r * 0.7, span: f.small.r };
    return { x: f.big.x, y: f.big.y, span: f.big.r };
  };

  const curve = (start, control, end, n) => {
    const points = [];
    for (let i = 0; i <= n; i += 1) {
      const t = i / n;
      const u = 1 - t;
      points.push({
        x: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
        y: u * u * start.y + 2 * u * t * control.y + t * t * end.y,
      });
    }
    return points;
  };

  const packRoad = (id, points, enter, under) => {
    let total = 0;
    const seg = [0];
    for (let i = 1; i < points.length; i += 1) {
      total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      seg.push(total);
    }
    return { id, points, seg, total, enter, width: 36, under: !!under };
  };

  const makeRoads = () => {
    const f = field();
    if (f.kind === "roundbox") {
      const specs = [
        { id: "tl", ang: Math.PI * 1.25, ox: -1, oy: -1, endY: -52 },
        { id: "tr", ang: -Math.PI * 0.25, ox: 1, oy: -1, endY: -52 },
        { id: "br", ang: Math.PI * 0.25, ox: 1, oy: 1, endY: 52 },
        { id: "bl", ang: Math.PI * 0.75, ox: -1, oy: 1, endY: 52 },
      ];
      return specs.map((spec) => {
        const cx = f.x + spec.ox * (f.hw - f.cr);
        const cy = f.y + spec.oy * (f.hh - f.cr);
        const start = { x: cx + Math.cos(spec.ang) * f.cr, y: cy + Math.sin(spec.ang) * f.cr };
        const end = { x: f.x + spec.ox * f.hw, y: f.y + spec.endY };
        const control = { x: f.x + spec.ox * (f.hw + 170), y: f.y + spec.oy * (f.hh + 140) };
        return packRoad(spec.id, curve(start, control, end, 24), 110);
      });
    }
    if (f.kind === "peanut") {
      const s = f.small;
      const b = f.big;
      const on = (cup, ang) => ({ x: cup.x + Math.cos(ang) * cup.r, y: cup.y + Math.sin(ang) * cup.r });
      const fromSmall = [-1, 1].map((shift) => {
        const start = on(s, shift < 0 ? Math.PI / 2 + 0.5 : Math.PI / 2 - 0.5);
        const end = on(b, shift < 0 ? Math.PI : 0);
        const control = shift < 0
          ? { x: 70, y: 520 }
          : { x: 1180, y: 560 };
        return packRoad(shift < 0 ? "pea-a" : "pea-b", curve(start, control, end, 32), 120);
      });
      const start = on(b, -0.7);
      const end = on(s, -Math.PI / 2);
      const back = curve(start, { x: (start.x + end.x) * 0.5, y: Math.min(start.y, end.y) - 230 }, end, 28);
      return fromSmall.concat(packRoad("pea-back", back, 100));
    }
    if (f.kind === "oval") {
      const rim = (ang) => ({ x: f.x + Math.cos(ang) * f.rx, y: f.y + Math.sin(ang) * f.ry });
      return [
        { id: "oval-top", start: -Math.PI / 2, end: Math.PI, control: { x: -220, y: -20 } },
        { id: "oval-bottom", start: Math.PI / 2, end: 0, control: { x: 1440, y: 900 } },
      ].map((road) => packRoad(road.id, curve(rim(road.start), road.control, rim(road.end), 36), 140));
    }
    if (arena === "under") {
      const rim = (ang) => ({ x: f.x + Math.cos(ang) * f.r, y: f.y + Math.sin(ang) * f.r });
      return [
        { id: "arc-top", start: -Math.PI / 2, end: 0, control: { x: 1480, y: 40 } },
        { id: "arc-bottom", start: Math.PI / 2, end: Math.PI, control: { x: -200, y: 860 } },
      ].map((road) => packRoad(road.id, curve(rim(road.start), road.control, rim(road.end), 36), 140));
    }
    return [];
  };

  const spawnSpot = (index) => {
    const f = field();
    if (f.kind === "peanut") {
      const cup = index === 0 ? f.small : f.big;
      return { x: cup.x, y: cup.y };
    }
    if (f.kind === "roundbox") return { x: f.x + (index === 0 ? -1 : 1) * f.hw * 0.42, y: f.y };
    if (f.kind === "oval") return { x: f.x + (index === 0 ? -1 : 1) * f.rx * 0.38, y: f.y };
    const side = index === 0 ? Math.PI : 0;
    const reach = f.r * (arena === "open" ? 0.22 : 0.55);
    return { x: f.x + Math.cos(side) * reach, y: f.y + Math.sin(side) * reach };
  };

  const startLaunch = () => {
    launchPower = [null, null];
    launchIndex = 0;
    botWait = 0.55 + Math.random() * 0.7;
    banner = null;
    hold.cont = [false, false];
    if (mode === "online") launchIndex = seat;
    shards = [];
    waves = [];
    mines = [];
    view = "launch";
    ui.innerHTML = `<button class="rb-back rb-float" type="button" data-action="mode">Back</button>`;
  };

  const spawnBey = (index, power, built, human) => {
    const spot = spawnSpot(index);
    const dir = rand() * Math.PI * 2;
    const mag = (240 + power * 520) * built.move;
    return {
      i: index,
      x: spot.x,
      y: spot.y,
      vx: Math.cos(dir) * mag,
      vy: Math.sin(dir) * mag,
      ang: rand() * Math.PI * 2,
      speed: 78 + power * 22,
      hp: built.hp,
      maxHp: built.hp,
      meter: 0,
      ability: null,
      abilityT: 0,
      hitCd: 0,
      spikeCd: 0,
      pulse: 0,
      dashT: 0,
      rail: null,
      railDist: 0,
      railCd: 0,
      under: false,
      out: false,
      human,
      built,
    };
  };

  const beginFight = () => {
    if (view === "fight" && roundLive) return;
    if (mode === "online") {
      rngState = net.seed >>> 0 || 1;
      simTick = 0;
      simAcc = 0;
      inputs = [{}, {}];
      tap = { ability: false, qte: false };
      for (let i = 0; i < DELAY; i += 1) {
        inputs[0][i] = { ability: false, qte: false };
        inputs[1][i] = { ability: false, qte: false };
      }
    }
    beys = [0, 1].map((index) => spawnBey(
      index,
      launchPower[index],
      builds[index],
      mode === "online" || mode === "hotseat" || index === 0,
    ));
    roundLive = true;
    banner = null;
    view = "fight";
    ui.innerHTML = `<button class="rb-back rb-float" type="button" data-action="mode">Back</button>`;
    tone(220, 0.08, "square", 0.04);
  };

  const award = (index, amount, title) => {
    if (!roundLive) return;
    points[index] += amount;
    roundLive = false;
    banner = {
      title,
      detail: `${nameOf(index)} +${amount}`,
      who: index,
      win: points[index] >= 3 ? index : -1,
      t: 0,
    };
    tone(amount > 1 ? 520 : 340, 0.18, "triangle", 0.05);
  };

  const burstBey = (target, attacker) => {
    target.out = true;
    target.hp = 0;
    for (let i = 0; i < 12; i += 1) {
      const ang = target.ang + i * ((Math.PI * 2) / 12);
      shards.push({
        x: target.x,
        y: target.y,
        vx: Math.cos(ang) * (180 + (i % 4) * 70),
        vy: Math.sin(ang) * (180 + (i % 4) * 70),
        ang,
        life: 1.15,
        color: TYPE_COLOR[target.built.top.type],
      });
    }
    sparkBurst(target.x, target.y, "#fff4e8", 1);
    waves.push({ x: target.x, y: target.y, t: 0, dur: 0.46, color: "#fff" });
    waves.push({ x: target.x, y: target.y, t: 0, dur: 0.62, color: TYPE_COLOR[target.built.top.type] });
    shake = Math.max(shake, 16);
    flash = Math.max(flash, 1);
    hitStop = Math.max(hitStop, 0.07);
    impact(1);
    award(attacker.i, 2, "BURST FINISH");
  };

  const useAbility = (bey) => {
    if (!roundLive || bey.out || bey.ability || bey.meter < 100) return;
    if (bey.built.top.id === "fulcrum") return;
    bey.meter = 0;
    bey.ability = bey.built.top.id;
    bey.abilityT = 7;
    if (bey.ability === "chelonian") {
      bey.rail = null;
      bey.under = false;
    }
    if (bey.ability === "steed") bey.speed = Math.min(100, bey.speed + 50);
    if (bey.ability === "nova") bey.pulse = 0.12;
    if (bey.ability === "wraith") blinkWraith(bey);
    if (bey.ability === "jester") {
      swapTops(bey);
      bey.pulse = 1.65;
    }
    if (bey.ability === "burrow") {
      plantMine(bey);
      bey.pulse = 1.35;
    }
    if (bey.ability === "bolt") {
      startDash(bey);
      bey.pulse = 1.15;
    }
    shake = Math.max(shake, 6);
    const pitch = { scorch: 180, wraith: 90, lodestone: 250, echo: 620, nova: 140, leech: 300, steed: 420, rime: 520, jester: 360, titan: 110, burrow: 200, bolt: 880 }[bey.ability] || 420;
    tone(pitch, 0.16, "sawtooth", 0.04);
  };

  const blinkWraith = (bey) => {
    const other = beys[1 - bey.i];
    let dx = other.x - bey.x;
    let dy = other.y - bey.y;
    let dist = Math.hypot(dx, dy);
    if (dist < 8) {
      const ang = rand() * Math.PI * 2;
      dx = Math.cos(ang);
      dy = Math.sin(ang);
      dist = 1;
    }
    motes.push({ x: bey.x, y: bey.y, life: 0.5, color: "#c4b5fd" });
    let x = other.x + (dx / dist) * (BEY * 3.2);
    let y = other.y + (dy / dist) * (BEY * 3.2);
    bey.x = x;
    bey.y = y;
    const span = Math.hypot(other.x - x, other.y - y) || 1;
    const mag = Math.max(280, Math.hypot(bey.vx, bey.vy));
    bey.vx = ((other.x - x) / span) * mag;
    bey.vy = ((other.y - y) / span) * mag;
  };

  const bodyR = (bey) => (bey && bey.ability === "titan" ? BEY * 1.72 : BEY);

  const isChilled = (bey) => beys.some((other) => other && other !== bey && !other.out && other.ability === "rime");

  const swapTops = (bey) => {
    const other = beys[1 - bey.i];
    if (!other || other.out) return;
    const x = bey.x;
    const y = bey.y;
    const vx = bey.vx;
    const vy = bey.vy;
    bey.x = other.x;
    bey.y = other.y;
    bey.vx = other.vx;
    bey.vy = other.vy;
    other.x = x;
    other.y = y;
    other.vx = vx;
    other.vy = vy;
    motes.push({ x: bey.x, y: bey.y, life: 0.35, color: "#f9a8d4" });
    motes.push({ x: other.x, y: other.y, life: 0.35, color: "#fde047" });
    tone(360, 0.08, "square", 0.04);
  };

  const plantMine = (bey) => {
    const owned = mines.filter((mine) => mine.owner === bey.i && mine.life > 0).length;
    if (owned >= 4) return;
    mines.push({ x: bey.x, y: bey.y, owner: bey.i, life: 7.5, r: 18, arm: 0.32 });
    tone(190, 0.06, "triangle", 0.035);
  };

  const startDash = (bey) => {
    const other = beys[1 - bey.i];
    const dx = other.x - bey.x;
    const dy = other.y - bey.y;
    const dist = Math.hypot(dx, dy) || 1;
    bey.vx = (dx / dist) * 1100;
    bey.vy = (dy / dist) * 1100;
    bey.dashT = 0.18;
    tone(880, 0.05, "square", 0.04);
  };

  const hitDamage = (target, attacker, scale) => {
    let dmg = attacker.built.dmg * scale;
    dmg *= 1 - Math.min(0.4, Math.max(0, target.built.def - 4) * 0.045);
    if (target.ability === "chelonian") dmg *= 0.25;
    if (attacker.ability === "scorch") dmg *= 1.55;
    if (attacker.ability === "leech") dmg *= 1.15;
    if (attacker.ability === "titan") dmg *= 1.35;
    if (attacker.dashT > 0) dmg *= 1.75;
    return Math.max(3, dmg);
  };

  const hurt = (target, attacker, scale) => {
    if (!roundLive || target.out || attacker.out) return 0;
    const dmg = hitDamage(target, attacker, scale);
    target.hp -= dmg;
    target.speed = Math.max(0, target.speed - 2.5);
    attacker.meter = Math.min(100, attacker.meter + 18);
    if (attacker.ability === "leech") {
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + dmg * 0.55);
      const steal = Math.min(8, target.speed);
      target.speed -= steal;
      attacker.speed = Math.min(100, attacker.speed + steal * 0.75);
      motes.push({ x: target.x, y: target.y, life: 0.22, color: "#fb7185" });
    }
    if (target.ability === "echo") {
      attacker.hp -= dmg * 0.6;
      attacker.speed = Math.max(0, attacker.speed - 1.4);
      motes.push({ x: attacker.x, y: attacker.y, life: 0.22, color: "#e2e8f0" });
    }
    shake = Math.max(shake, 4);
    tone(160 + Math.min(240, dmg * 8), 0.04, "square", 0.03);
    return dmg;
  };

  const finishClash = (a, b) => {
    if (!roundLive) return;
    if (a.hp <= 0 && b.hp <= 0) {
      a.out = true;
      b.out = true;
      roundLive = false;
      banner = { title: "DOUBLE BURST", detail: "No points", who: -1, win: -1, t: 0 };
      return;
    }
    if (b.hp <= 0) burstBey(b, a);
    else if (a.hp <= 0) burstBey(a, b);
  };

  const ringOut = (bey) => {
    if (bey.out || !roundLive) return;
    bey.out = true;
    bey.vx = 0;
    bey.vy = 0;
    bey.rail = null;
    award(1 - bey.i, 1, "RING-OUT FINISH");
  };

  const wallBounce = (bey, nx, ny) => {
    const vn = bey.vx * nx + bey.vy * ny;
    if (vn <= 0) return;
    const bounce = bey.ability === "steed" ? 1.05 : 0.84;
    bey.vx -= (1 + bounce) * vn * nx;
    bey.vy -= (1 + bounce) * vn * ny;
    const tx = -ny;
    const ty = nx;
    const slide = bey.vx * tx + bey.vy * ty;
    const want = (bey.i === 0 ? 1 : -1) * Math.min(160, Math.abs(slide) * 0.45 + bey.speed * 0.55);
    const steer = bey.built.top.type === "defense" ? 0.55 : 0.34;
    bey.vx += tx * (want - slide) * steer;
    bey.vy += ty * (want - slide) * steer;
    if (bey.ability === "steed") {
      bey.speed = Math.min(100, bey.speed + 7);
      const mag = Math.hypot(bey.vx, bey.vy) || 1;
      bey.vx = (bey.vx / mag) * (mag + 70);
      bey.vy = (bey.vy / mag) * (mag + 70);
      motes.push({ x: bey.x, y: bey.y, life: 0.25, color: "#9fffe0" });
    } else {
      bey.speed = Math.max(0, bey.speed - 2);
      bey.vx *= 0.98;
      bey.vy *= 0.98;
    }
    if (vn > 160 && clock - (bey.wallSnd || 0) > 0.09) {
      bey.wallSnd = clock;
      sparkBurst(bey.x, bey.y, "#d6e8ff", Math.min(1, vn / 900));
      waves.push({ x: bey.x, y: bey.y, t: 0, dur: 0.18, color: "#9ec4ff" });
      shake = Math.max(shake, Math.min(8, vn / 180));
      impact(Math.min(0.55, vn / 1200));
    }
  };

  const roadPoint = (road, dist) => {
    const d = Math.max(0, Math.min(road.total - 0.01, dist));
    let i = 1;
    while (i < road.seg.length - 1 && road.seg[i] < d) i += 1;
    const a = road.points[i - 1];
    const b = road.points[i];
    const span = road.seg[i] - road.seg[i - 1] || 1;
    const t = (d - road.seg[i - 1]) / span;
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      tx: (b.x - a.x) / span,
      ty: (b.y - a.y) / span,
    };
  };

  const entranceDist = (x, y, road) => {
    let best = 1e9;
    let along = 0;
    for (let i = 1; i < road.points.length; i += 1) {
      if (road.seg[i - 1] > road.enter) break;
      const a = road.points[i - 1];
      const b = road.points[i];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const l2 = dx * dx + dy * dy || 1;
      let t = ((x - a.x) * dx + (y - a.y) * dy) / l2;
      const maxT = Math.min(1, (road.enter - road.seg[i - 1]) / Math.sqrt(l2));
      t = Math.max(0, Math.min(maxT, t));
      const px = a.x + dx * t;
      const py = a.y + dy * t;
      const dist = Math.hypot(x - px, y - py);
      if (dist < best) {
        best = dist;
        along = road.seg[i - 1] + Math.sqrt(l2) * t;
      }
    }
    return { dist: best, along };
  };

  const grabRail = (bey) => {
    if (bey.rail || bey.out || bey.railCd > 0) return;
    roads.forEach((road) => {
      if (bey.rail) return;
      const hit = entranceDist(bey.x, bey.y, road);
      if (hit.dist > road.width) return;
      bey.rail = road.id;
      bey.railDist = hit.along;
      bey.speed = Math.min(100, bey.speed + 16);
      tone(540, 0.05, "square", 0.03);
    });
  };

  const rideRail = (bey, dt) => {
    const road = roads.find((item) => item.id === bey.rail);
    if (!road) {
      bey.rail = null;
      bey.under = false;
      return;
    }
    const pace = 860 * (bey.ability === "steed" ? 1.25 : 1);
    bey.railDist += pace * dt;
    if (bey.railDist >= road.total) {
      const end = roadPoint(road, road.total - 0.02);
      bey.x = end.x;
      bey.y = end.y;
      if (road.under) {
        const home = field();
        const dx = home.x - end.x;
        const dy = home.y - end.y;
        const span = Math.hypot(dx, dy) || 1;
        const ix = dx / span;
        const iy = dy / span;
        const side = road.id === "up" || road.id === "left" ? 1 : -1;
        const vx = ix + (-iy * side) * 1.35;
        const vy = iy + (ix * side) * 1.35;
        const mag = Math.hypot(vx, vy) || 1;
        bey.vx = (vx / mag) * 860;
        bey.vy = (vy / mag) * 860;
      } else {
        bey.vx = end.tx * 920;
        bey.vy = end.ty * 920;
      }
      bey.rail = null;
      bey.under = false;
      bey.railCd = 0.55;
      tone(680, 0.06, "sawtooth", 0.04);
      return;
    }
    const pos = roadPoint(road, bey.railDist);
    bey.x = pos.x;
    bey.y = pos.y;
    bey.vx = pos.tx * pace;
    bey.vy = pos.ty * pace;
    if (road.under) {
      const home = field();
      bey.under = Math.hypot(pos.x - home.x, pos.y - home.y) < home.r - 52;
    }
    if (!bey.under && rand() < 0.5) motes.push({ x: bey.x, y: bey.y, life: 0.16, color: "#d6e8ff" });
  };

  const keepInside = (bey) => {
    const f = field();
    if (f.pockets) {
      const caught = [0, 1, 2].some((i) => {
        const ang = -Math.PI / 2 + i * ((Math.PI * 2) / 3);
        const px = f.x + Math.cos(ang) * (f.r - 8);
        const py = f.y + Math.sin(ang) * (f.r - 8);
        return Math.hypot(bey.x - px, bey.y - py) < 36 * 0.62;
      });
      if (caught) {
        ringOut(bey);
        return;
      }
    }
    if (f.kind === "circle") {
      const dx = bey.x - f.x;
      const dy = bey.y - f.y;
      const dist = Math.hypot(dx, dy) || 1;
      const limit = f.r - bodyR(bey);
      if (dist <= limit) return;
      const nx = dx / dist;
      const ny = dy / dist;
      if (!f.walls) {
        ringOut(bey);
        return;
      }
      bey.x = f.x + nx * limit;
      bey.y = f.y + ny * limit;
      wallBounce(bey, nx, ny);
      return;
    }
    if (f.kind === "roundbox") {
      const sd = (px, py) => {
        const x = Math.abs(px - f.x) - (f.hw - f.cr);
        const y = Math.abs(py - f.y) - (f.hh - f.cr);
        return Math.min(Math.max(x, y), 0) + Math.hypot(Math.max(x, 0), Math.max(y, 0)) - f.cr;
      };
      const d = sd(bey.x, bey.y);
      if (d <= -bodyR(bey)) return;
      const e = 1.4;
      let nx = sd(bey.x + e, bey.y) - sd(bey.x - e, bey.y);
      let ny = sd(bey.x, bey.y + e) - sd(bey.x, bey.y - e);
      const n = Math.hypot(nx, ny) || 1;
      nx /= n;
      ny /= n;
      bey.x -= nx * (d + bodyR(bey));
      bey.y -= ny * (d + bodyR(bey));
      wallBounce(bey, nx, ny);
      return;
    }
    if (f.kind === "oval") {
      const px = (bey.x - f.x) / f.rx;
      const py = (bey.y - f.y) / f.ry;
      const e = Math.hypot(px, py) || 1;
      const limit = 1 - bodyR(bey) / Math.min(f.rx, f.ry);
      if (e <= limit) return;
      const nx = (bey.x - f.x) / (f.rx * f.rx);
      const ny = (bey.y - f.y) / (f.ry * f.ry);
      const n = Math.hypot(nx, ny) || 1;
      bey.x = f.x + (bey.x - f.x) * (limit / e);
      bey.y = f.y + (bey.y - f.y) * (limit / e);
      wallBounce(bey, nx / n, ny / n);
      return;
    }
    const cups = [f.small, f.big].map((cup) => {
      const dx = bey.x - cup.x;
      const dy = bey.y - cup.y;
      const dist = Math.hypot(dx, dy) || 1;
      return { cup, dist, over: dist - (cup.r - bodyR(bey)), nx: dx / dist, ny: dy / dist };
    });
    if (cups[0].over <= 0 || cups[1].over <= 0) return;
    const hit = cups[0].over < cups[1].over ? cups[0] : cups[1];
    bey.x = hit.cup.x + hit.nx * (hit.cup.r - bodyR(bey));
    bey.y = hit.cup.y + hit.ny * (hit.cup.r - bodyR(bey));
    wallBounce(bey, hit.nx, hit.ny);
  };

  const moveBey = (bey, dt) => {
    if (bey.out) return;
    bey.railCd = Math.max(0, bey.railCd - dt);
    bey.clashCd = Math.max(0, (bey.clashCd || 0) - dt);
    bey.hitCd = Math.max(0, bey.hitCd - dt);
    bey.spikeCd = Math.max(0, bey.spikeCd - dt);
    if (bey.ability) {
      bey.abilityT -= dt;
      if (bey.abilityT <= 0) {
        bey.ability = null;
        bey.dashT = 0;
      }
    }
    bey.meter = Math.min(100, bey.meter + 7 * dt);
    if (!bey.human && bey.meter >= 100 && !bey.ability && bey.built.top.id !== "fulcrum") {
      const other = beys[1 - bey.i];
      const dist = Math.hypot(other.x - bey.x, other.y - bey.y);
      if (bey.built.top.id === "chelonian" || dist < 210 || bey.speed < 42) useAbility(bey);
    }
    if (bey.ability === "chelonian") {
      const home = arenaCenter();
      const dx = home.x - bey.x;
      const dy = home.y - bey.y;
      const dist = Math.hypot(dx, dy) || 1;
      const step = Math.min(dist, 460 * dt * (isChilled(bey) ? 0.34 : 1));
      bey.x += (dx / dist) * step;
      bey.y += (dy / dist) * step;
      bey.vx *= 0.86;
      bey.vy *= 0.86;
      bey.speed = Math.max(0, bey.speed - bey.built.drain * dt * 0.45 * (isChilled(bey) ? 1.9 : 1));
    } else if (bey.rail) {
      rideRail(bey, dt);
    } else {
      const chill = isChilled(bey);
      bey.speed = Math.max(0, bey.speed - bey.built.drain * dt * (bey.ability === "steed" ? 0.72 : 1) * (chill ? 1.9 : 1));
      if (bey.dashT > 0) {
        bey.dashT -= dt;
        if (rand() < 0.75) motes.push({ x: bey.x, y: bey.y, life: 0.18, color: "#fde047" });
        bey.x += bey.vx * dt;
        bey.y += bey.vy * dt;
        grabRail(bey);
      } else {
        const pullTo = slopePoint(bey.x, bey.y);
        const dx = pullTo.x - bey.x;
        const dy = pullTo.y - bey.y;
        const dist = Math.hypot(dx, dy) || 1;
        const slope = Math.min(1, dist / pullTo.span);
        const base = bey.built.top.type === "stamina" ? 420 : bey.built.top.type === "defense" ? 330 : bey.built.top.type === "attack" ? 190 : 280;
        const pull = base * (0.4 + slope * 1.7);
        bey.vx += (dx / dist) * pull * dt;
        bey.vy += (dy / dist) * pull * dt;
        const mag = Math.hypot(bey.vx, bey.vy) || 1;
        const cruise = (140 + bey.built.move * 250) * (bey.speed / 100) * (bey.ability === "steed" ? 1.8 : 1) * (bey.ability === "titan" ? 0.72 : 1) * (chill ? 0.34 : 1);
        const next = mag + (cruise - mag) * Math.min(1, dt * 0.72);
        const dirX = bey.vx / mag;
        const dirY = bey.vy / mag;
        const spin = (bey.i === 0 ? 1 : -1);
        const grip = bey.built.top.type === "attack" ? 1.5 : bey.built.top.type === "stamina" ? 0.62 : bey.built.top.type === "defense" ? 0.84 : 1;
        const curve = spin * bey.speed * 3.1 * grip * (chill ? 0.4 : 1);
        bey.vx = dirX * next + (-dirY) * curve * dt;
        bey.vy = dirY * next + dirX * curve * dt;
        bey.x += bey.vx * dt;
        bey.y += bey.vy * dt;
        grabRail(bey);
      }
    }
    bey.ang += bey.speed * dt * 0.42;
    if (bey.out || bey.rail) return;
    keepInside(bey);
    if (bey.speed <= 0 && roundLive) {
      bey.out = true;
      bey.speed = 0;
      const other = beys[1 - bey.i];
      if (!other.out && other.speed > 0) award(other.i, 1, "SURVIVOR FINISH");
      else if (other.out && roundLive) {
        roundLive = false;
        banner = { title: "BOTH STOPPED", detail: "No points", who: -1, win: -1, t: 0 };
      }
    }
  };

  const tugPowers = (bey, dt) => {
    if (bey.out || !bey.ability || !roundLive) return;
    const other = beys[1 - bey.i];
    if (!other || other.out || other.rail || other.under) return;
    const dx = other.x - bey.x;
    const dy = other.y - bey.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (bey.ability === "wraith") {
      if (rand() < 0.45) motes.push({ x: bey.x, y: bey.y, life: 0.16, color: "#c4b5fd" });
      if (dist < bodyR(bey) + bodyR(other) + 6) {
        const take = Math.min(other.speed, 22 * dt);
        other.speed -= take;
        bey.speed = Math.min(100, bey.speed + take);
      }
    }
    if (bey.ability === "lodestone") {
      const step = Math.min(dist, 260 * dt);
      other.x -= (dx / dist) * step;
      other.y -= (dy / dist) * step;
      other.vx -= (dx / dist) * 900 * dt;
      other.vy -= (dy / dist) * 900 * dt;
      if (rand() < 0.35) motes.push({ x: (bey.x + other.x) * 0.5, y: (bey.y + other.y) * 0.5, life: 0.16, color: "#7dd3fc" });
    }
  };

  const novaPulse = (bey, dt) => {
    if (bey.ability !== "nova" || bey.out || !roundLive) return;
    bey.pulse -= dt;
    if (bey.pulse > 0) return;
    bey.pulse = 1.15;
    waves.push({ x: bey.x, y: bey.y, t: 0, dur: 0.42 });
    shake = Math.max(shake, 7);
    tone(120, 0.08, "sawtooth", 0.04);
    const other = beys[1 - bey.i];
    if (other.out) return;
    const dx = other.x - bey.x;
    const dy = other.y - bey.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist > 158) return;
    hurt(other, bey, 0.48);
    other.vx += (dx / dist) * 560;
    other.vy += (dy / dist) * 560;
    finishClash(bey, other);
  };

  const specialsTick = (bey, dt) => {
    if (!bey.ability || bey.out || !roundLive) return;
    if (bey.ability !== "jester" && bey.ability !== "burrow" && bey.ability !== "bolt") return;
    bey.pulse -= dt;
    if (bey.pulse > 0) return;
    if (bey.ability === "jester") {
      swapTops(bey);
      bey.pulse = 1.65;
    } else if (bey.ability === "burrow") {
      plantMine(bey);
      bey.pulse = 1.35;
    } else if (bey.ability === "bolt") {
      startDash(bey);
      bey.pulse = 1.15;
    }
  };

  const tickMines = (dt) => {
    for (let i = mines.length - 1; i >= 0; i -= 1) {
      const mine = mines[i];
      mine.life -= dt;
      mine.arm = Math.max(0, mine.arm - dt);
      if (mine.life <= 0) {
        mines.splice(i, 1);
        continue;
      }
      if (mine.arm > 0 || !roundLive) continue;
      const owner = beys[mine.owner];
      if (!owner || owner.out) continue;
      beys.forEach((bey) => {
        if (!roundLive || mine.life <= 0 || bey.out || bey.i === mine.owner) return;
        if (Math.hypot(bey.x - mine.x, bey.y - mine.y) > mine.r + bodyR(bey)) return;
        const dx = bey.x - mine.x;
        const dy = bey.y - mine.y;
        const dist = Math.hypot(dx, dy) || 1;
        hurt(bey, owner, 0.62);
        bey.vx += (dx / dist) * 680;
        bey.vy += (dy / dist) * 680;
        mine.life = 0;
        waves.push({ x: mine.x, y: mine.y, t: 0, dur: 0.32, color: "#fbbf24" });
        shake = Math.max(shake, 8);
        finishClash(owner, bey);
      });
    }
  };

  const scorchSpikes = (bey, dt) => {
    if (bey.ability !== "scorch" || bey.out || !roundLive) return;
    const other = beys[1 - bey.i];
    if (other.out) return;
    for (let i = 0; i < 3; i += 1) {
      const ang = bey.ang + i * ((Math.PI * 2) / 3);
      const sx = bey.x + Math.cos(ang) * (bodyR(bey) + 18);
      const sy = bey.y + Math.sin(ang) * (bodyR(bey) + 18);
      if (Math.hypot(sx - other.x, sy - other.y) < bodyR(other) + 10 && bey.spikeCd <= 0) {
        bey.spikeCd = 0.24;
        hurt(other, bey, 0.42);
        finishClash(bey, other);
        if (!roundLive) return;
      }
    }
    if (dt) motes.push({ x: bey.x, y: bey.y, life: 0.18, color: "#ffb088" });
  };

  const massOf = (bey) => {
    let mass = 0.82 + bey.built.def * 0.07;
    if (bey.built.top.type === "attack") mass *= 0.84;
    if (bey.built.top.type === "defense") mass *= 1.3;
    if (bey.ability === "titan") mass *= 1.75;
    if (bey.ability === "lodestone") mass *= 1.22;
    return mass;
  };

  const collide = () => {
    const a = beys[0];
    const b = beys[1];
    if (!a || !b || a.out || b.out || a.under || b.under || !roundLive) return;
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    let dist = Math.hypot(dx, dy) || 1;
    const reach = bodyR(a) + bodyR(b);
    if (dist >= reach) return;
    if (a.ability === "wraith" || b.ability === "wraith") return;
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = reach - dist;
    const ma = massOf(a);
    const mb = massOf(b);
    const share = mb / (ma + mb);
    a.x -= nx * overlap * share;
    a.y -= ny * overlap * share;
    b.x += nx * overlap * (1 - share);
    b.y += ny * overlap * (1 - share);
    const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    const quickA = Math.hypot(a.vx, a.vy);
    const quickB = Math.hypot(b.vx, b.vy);
    const paceA = quickA + a.speed * 3.2;
    const paceB = quickB + b.speed * 3.2;
    if (!clash && rel > 240 && Math.max(paceA, paceB) > 520 && Math.min(paceA, paceB) > 180 && !a.clashCd && !b.clashCd && !a.rail && !b.rail) {
      startClash(a, b, nx, ny, paceA, paceB);
      return;
    }
    if (rel > 0) {
      const e = 0.8;
      const j = ((1 + e) * rel) / (1 / ma + 1 / mb);
      let pushA = j / ma;
      let pushB = j / mb;
      if (b.ability === "scorch") pushA *= 1.28;
      if (a.ability === "scorch") pushB *= 1.28;
      if (b.dashT > 0) pushA *= 1.7;
      if (a.dashT > 0) pushB *= 1.7;
      if (a.ability === "echo") pushA *= 0.45;
      if (b.ability === "echo") pushB *= 0.45;
      a.vx -= nx * pushA;
      a.vy -= ny * pushA;
      b.vx += nx * pushB;
      b.vy += ny * pushB;
      const tx = -ny;
      const ty = nx;
      const slide = (a.vx - b.vx) * tx + (a.vy - b.vy) * ty;
      const grip = Math.max(-rel * 0.42, Math.min(rel * 0.42, slide * 0.36));
      a.vx -= tx * (grip / ma);
      a.vy -= ty * (grip / ma);
      b.vx += tx * (grip / mb);
      b.vy += ty * (grip / mb);
      const bite = Math.min(5, rel * 0.008);
      if (a.speed >= b.speed) {
        a.speed = Math.min(100, a.speed + bite * 0.3);
        b.speed = Math.max(0, b.speed - bite);
      } else {
        b.speed = Math.min(100, b.speed + bite * 0.3);
        a.speed = Math.max(0, a.speed - bite);
      }
    }
    if (a.hitCd > 0) return;
    a.hitCd = 0.36;
    b.hitCd = 0.36;
    hurt(b, a, 0.62 + a.speed / 150);
    hurt(a, b, 0.62 + b.speed / 150);
    if (a.ability === "jester") fling(b);
    if (b.ability === "jester") fling(a);
    if (rel > 50) {
      const power = Math.min(1, rel / 720);
      const mx = (a.x + b.x) * 0.5;
      const my = (a.y + b.y) * 0.5;
      sparkBurst(mx, my, "#f4f8ff", power);
      waves.push({ x: mx, y: my, t: 0, dur: 0.2 + power * 0.18, color: "#f7fbff" });
      waves.push({ x: mx, y: my, t: 0, dur: 0.32 + power * 0.16, color: TYPE_COLOR[a.built.top.type] });
      shake = Math.max(shake, 5 + power * 9);
      flash = Math.max(flash, power);
      hitStop = Math.max(hitStop, power > 0.4 ? 0.055 : 0.028);
      impact(power);
    }
    finishClash(a, b);
  };

  const fling = (bey) => {
    const ang = rand() * Math.PI * 2;
    bey.vx += Math.cos(ang) * 480;
    bey.vy += Math.sin(ang) * 480;
    motes.push({ x: bey.x, y: bey.y, life: 0.28, color: "#f472b6" });
  };

  const step = (dt) => {
    if (view === "launch" && mode === "bot" && launchIndex === 1 && launchPower[1] == null) {
      botWait -= dt;
      if (botWait <= 0) {
        launchPower[1] = 0.62 + Math.random() * 0.28;
        beginFight();
      }
    }
    if (view !== "fight" || !roundLive) return;
    moveBey(beys[0], dt);
    if (roundLive) moveBey(beys[1], dt);
    if (roundLive) {
      tugPowers(beys[0], dt);
      if (roundLive) tugPowers(beys[1], dt);
    }
    if (roundLive) {
      scorchSpikes(beys[0], dt);
      if (roundLive) scorchSpikes(beys[1], dt);
    }
    if (roundLive) {
      novaPulse(beys[0], dt);
      if (roundLive) novaPulse(beys[1], dt);
    }
    if (roundLive) {
      specialsTick(beys[0], dt);
      if (roundLive) specialsTick(beys[1], dt);
    }
    if (roundLive) collide();
    if (roundLive) tickMines(dt);
    tickFx(dt);
  };

  const QTE_AT = 0.42;
  const QTE_DUR = 1.35;
  const QTE_HALF = 0.08;

  const clashNeedle = () => (clash.t - QTE_AT) / QTE_DUR;

  const clashHalf = (mine, other) => {
    const lead = mine / Math.max(1, other);
    if (lead >= 1) return Math.min(0.2, QTE_HALF * (1 + (lead - 1) * 2.2));
    return Math.max(0.04, QTE_HALF * Math.max(0.5, lead));
  };

  const startClash = (a, b, nx, ny, paceA, paceB) => {
    const mx = (a.x + b.x) * 0.5;
    const my = (a.y + b.y) * 0.5;
    a.x = mx - nx * bodyR(a);
    a.y = my - ny * bodyR(a);
    b.x = mx + nx * bodyR(b);
    b.y = my + ny * bodyR(b);
    a.vx = 0;
    a.vy = 0;
    b.vx = 0;
    b.vy = 0;
    a.rail = null;
    b.rail = null;
    const zone = 0.3 + rand() * 0.4;
    const half = [clashHalf(paceA, paceB), clashHalf(paceB, paceA)];
    const botHalf = half[1];
    const slipped = rand() > 0.28 + botHalf * 2.4;
    const slip = slipped
      ? (rand() < 0.5 ? -1 : 1) * (botHalf + 0.05 + rand() * 0.12)
      : (rand() - 0.5) * botHalf * 0.8;
    clash = {
      x: mx,
      y: my,
      nx,
      ny,
      t: 0,
      zoom: 0,
      buzz: 0,
      zone,
      half,
      botAt: Math.max(0.05, Math.min(0.95, zone + slip)),
      pressed: [false, false],
      hit: [false, false],
      hold: null,
      call: "",
    };
    hitStop = 0;
    shake = 12;
    flash = 0.85;
    impact(0.9);
    tone(62, 0.2, "sine", 0.05);
  };

  const pressClash = (index) => {
    if (!clash || clash.hold != null || clash.pressed[index]) return;
    const needle = clashNeedle();
    if (needle < 0 || needle > 1) return;
    clash.pressed[index] = true;
    clash.hit[index] = Math.abs(needle - clash.zone) <= clash.half[index];
    tone(clash.hit[index] ? 720 : 120, 0.07, "square", 0.045);
    if (clash.pressed[0] && clash.pressed[1]) {
      clash.call = clash.hit[0] && clash.hit[1] ? "EVEN" : clash.hit[0] || clash.hit[1] ? "BREAK" : "SLIP";
      clash.hold = 0.28;
    }
  };

  const releaseClash = () => {
    const a = beys[0];
    const b = beys[1];
    const okA = clash.hit[0];
    const okB = clash.hit[1];
    if (okA && okB) {
      hurt(b, a, 0.95);
      hurt(a, b, 0.95);
    } else if (okA) hurt(b, a, 5.2);
    else if (okB) hurt(a, b, 5.2);
    else {
      hurt(b, a, 0.4);
      hurt(a, b, 0.4);
    }
    finishClash(a, b);
    const push = okA === okB ? 560 : 240;
    const lose = 1040;
    if (!a.out) {
      const kick = okB && !okA ? lose : push;
      a.vx = -clash.nx * kick;
      a.vy = -clash.ny * kick;
      a.hitCd = 0.55;
      a.clashCd = 2.6;
    }
    if (!b.out) {
      const kick = okA && !okB ? lose : push;
      b.vx = clash.nx * kick;
      b.vy = clash.ny * kick;
      b.hitCd = 0.55;
      b.clashCd = 2.6;
    }
    sparkBurst(clash.x, clash.y, "#f7fbff", 1);
    waves.push({ x: clash.x, y: clash.y, t: 0, dur: 0.4, color: "#ffffff" });
    shake = 16;
    flash = 1;
    impact(okA === okB ? 0.7 : 1);
    clash = null;
  };

  const tickClash = (dt) => {
    const a = beys[0];
    const b = beys[1];
    if (!a || !b || a.out || b.out || !roundLive) {
      clash = null;
      return;
    }
    clash.t += dt;
    clash.zoom = Math.min(1, clash.t / 0.34);
    const rush = Math.min(1, Math.max(0, (clash.t - 0.2) / 1.3));
    a.ang += dt * (12 + rush * rush * 62);
    b.ang -= dt * (12 + rush * rush * 62);
    a.x = clash.x - clash.nx * bodyR(a);
    a.y = clash.y - clash.ny * bodyR(a);
    b.x = clash.x + clash.nx * bodyR(b);
    b.y = clash.y + clash.ny * bodyR(b);
    a.vx = 0;
    a.vy = 0;
    b.vx = 0;
    b.vy = 0;
    if (rand() < 0.55 + rush * 0.4) {
      const ang = rand() * Math.PI * 2;
      const sp = 90 + rush * 560;
      motes.push({
        x: clash.x + Math.cos(ang) * 8,
        y: clash.y + Math.sin(ang) * 8,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: 0.12 + rand() * 0.16,
        color: rand() < 0.4 ? "#ffffff" : "#9fd0ff",
        kind: "spark",
        r: 1.2 + rand() * 1.7,
      });
    }
    clash.buzz -= dt;
    if (clash.buzz <= 0) {
      clash.buzz = Math.max(0.045, 0.12 - rush * 0.07);
      tone(80 + rush * 460, 0.05, "sawtooth", 0.02 + rush * 0.03);
    }
    shake = Math.max(shake, 3 + rush * 7);
    const needle = clashNeedle();
    if (mode === "bot" && !clash.pressed[1] && needle >= clash.botAt && needle <= 1) pressClash(1);
    if (clash.hold != null) {
      clash.hold -= dt;
      if (clash.hold <= 0) releaseClash();
      else tickFx(dt);
      return;
    }
    if (needle > 1) {
      clash.call = clash.hit[0] && clash.hit[1] ? "EVEN" : clash.hit[0] || clash.hit[1] ? "BREAK" : "SLIP";
      clash.hold = 0.28;
    }
    tickFx(dt);
  };

  const tickFx = (dt) => {
    for (let i = motes.length - 1; i >= 0; i -= 1) {
      const mote = motes[i];
      mote.life -= dt;
      mote.x += (mote.vx || 0) * dt;
      mote.y += (mote.vy || 0) * dt;
      if (mote.vx) {
        mote.vx *= 0.9;
        mote.vy *= 0.9;
      }
      if (mote.life <= 0) motes.splice(i, 1);
    }
    for (let i = waves.length - 1; i >= 0; i -= 1) {
      waves[i].t += dt;
      if (waves[i].t >= waves[i].dur) waves.splice(i, 1);
    }
    for (let i = shards.length - 1; i >= 0; i -= 1) {
      shards[i].life -= dt;
      shards[i].x += shards[i].vx * dt;
      shards[i].y += shards[i].vy * dt;
      if (shards[i].life <= 0) shards.splice(i, 1);
    }
  };

  const drawRoads = (g) => {
    const f = field();
    const origin = f.kind === "peanut"
      ? { x: (f.small.x + f.big.x) * 0.5, y: (f.small.y + f.big.y) * 0.5, r: f.big.r + f.small.r }
      : f.kind === "oval"
        ? { x: f.x, y: f.y, r: f.rx }
        : { x: f.x, y: f.y, r: f.hw || f.r };
    const half = 24;
    roads.forEach((road) => {
      const left = [];
      const right = [];
      road.points.forEach((point, index) => {
        const prev = road.points[Math.max(0, index - 1)];
        const next = road.points[Math.min(road.points.length - 1, index + 1)];
        let tx = next.x - prev.x;
        let ty = next.y - prev.y;
        const len = Math.hypot(tx, ty) || 1;
        tx /= len;
        ty /= len;
        left.push({ x: point.x - ty * half, y: point.y + tx * half });
        right.push({ x: point.x + ty * half, y: point.y - tx * half });
      });
      const trace = () => {
        g.beginPath();
        left.forEach((point, index) => (index ? g.lineTo(point.x, point.y) : g.moveTo(point.x, point.y)));
        for (let index = right.length - 1; index >= 0; index -= 1) g.lineTo(right[index].x, right[index].y);
        g.closePath();
      };
      trace();
      const bowl = g.createRadialGradient(origin.x, origin.y, 30, origin.x, origin.y, origin.r);
      bowl.addColorStop(0, "#12305f");
      bowl.addColorStop(0.72, "#0a1c3a");
      bowl.addColorStop(1, "#07111f");
      g.fillStyle = bowl;
      g.fill();
      g.save();
      trace();
      g.clip();
      g.strokeStyle = "rgba(159, 208, 255, 0.16)";
      g.lineWidth = 2;
      for (let ring = 1; ring <= 6; ring += 1) {
        g.beginPath();
        g.arc(origin.x, origin.y, origin.r * (ring / 4.6), 0, Math.PI * 2);
        g.stroke();
      }
      g.restore();
      trace();
      g.strokeStyle = "#8eb7ff";
      g.lineWidth = 8;
      g.stroke();
    });
  };

  const drawBowl = (g = ctx) => {
    const f = field();
    const paintCircle = (x, y, r, wall, lean) => {
      const fy = y + (lean || 0);
      const bowl = g.createRadialGradient(x, fy, 24, x, y, r);
      bowl.addColorStop(0, "#12305f");
      bowl.addColorStop(0.72, "#0a1c3a");
      bowl.addColorStop(1, "#07111f");
      g.fillStyle = bowl;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      const shine = g.createRadialGradient(x - r * 0.28, fy - r * 0.32, 10, x, y, r);
      shine.addColorStop(0, "rgba(198, 224, 255, 0.22)");
      shine.addColorStop(0.45, "rgba(70, 120, 190, 0.05)");
      shine.addColorStop(1, "rgba(0, 0, 0, 0)");
      g.fillStyle = shine;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      g.save();
      g.beginPath();
      g.arc(x, y, Math.max(8, r - 10), 0, Math.PI * 2);
      g.clip();
      g.strokeStyle = "rgba(159, 208, 255, 0.16)";
      g.lineWidth = 2;
      for (let ring = 1; ring <= 4; ring += 1) {
        g.beginPath();
        g.arc(x, fy, r * (ring / 4.6), 0, Math.PI * 2);
        g.stroke();
      }
      g.restore();
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      if (wall) {
        g.strokeStyle = "#8eb7ff";
        g.lineWidth = 8;
        g.stroke();
      } else {
        g.setLineDash([12, 14]);
        g.strokeStyle = "rgba(142, 183, 255, 0.45)";
        g.lineWidth = 3;
        g.stroke();
        g.setLineDash([]);
      }
    };
    if (f.kind === "circle") {
      paintCircle(f.x, f.y, f.r, f.walls);
      if (f.pockets) {
        [0, 1, 2].forEach((i) => {
          const ang = -Math.PI / 2 + i * ((Math.PI * 2) / 3);
          const px = f.x + Math.cos(ang) * (f.r - 8);
          const py = f.y + Math.sin(ang) * (f.r - 8);
          const hole = g.createRadialGradient(px, py, 4, px, py, 36);
          hole.addColorStop(0, "#02060d");
          hole.addColorStop(1, "#0b1728");
          g.fillStyle = hole;
          g.beginPath();
          g.arc(px, py, 36, 0, Math.PI * 2);
          g.fill();
          g.strokeStyle = "rgba(180, 210, 255, 0.7)";
          g.lineWidth = 3;
          g.stroke();
        });
      }
      if (arena === "under") drawRoads(g);
      return;
    }
    if (f.kind === "roundbox") {
      const x = f.x - f.hw;
      const y = f.y - f.hh;
      const w = f.hw * 2;
      const h = f.hh * 2;
      const trace = () => {
        g.beginPath();
        g.moveTo(x + f.cr, y);
        g.arcTo(x + w, y, x + w, y + h, f.cr);
        g.arcTo(x + w, y + h, x, y + h, f.cr);
        g.arcTo(x, y + h, x, y, f.cr);
        g.arcTo(x, y, x + w, y, f.cr);
        g.closePath();
      };
      const bowl = g.createLinearGradient(x, y, x, y + h);
      bowl.addColorStop(0, "#12305f");
      bowl.addColorStop(1, "#07111f");
      trace();
      g.fillStyle = bowl;
      g.fill();
      g.strokeStyle = "#8eb7ff";
      g.lineWidth = 8;
      g.stroke();
      drawRoads(g);
      return;
    }
    if (f.kind === "oval") {
      const bowl = g.createRadialGradient(f.x, f.y, 20, f.x, f.y, f.rx);
      bowl.addColorStop(0, "#12305f");
      bowl.addColorStop(1, "#07111f");
      g.beginPath();
      g.ellipse(f.x, f.y, f.rx, f.ry, 0, 0, Math.PI * 2);
      g.fillStyle = bowl;
      g.fill();
      g.strokeStyle = "#8eb7ff";
      g.lineWidth = 8;
      g.stroke();
      drawRoads(g);
      return;
    }
    paintCircle(f.small.x, f.small.y, f.small.r, true, f.small.r * 0.48);
    paintCircle(f.big.x, f.big.y, f.big.r, true);
    drawRoads(g);
  };

  const RINGS = {
    scorch: { hi: "#fff1e4", mid: "#ff6a2c", low: "#4a1208", n: 3, reach: 1.1, style: "fang" },
    steed: { hi: "#f3fff9", mid: "#5dffe0", low: "#0c3a2c", n: 4, reach: 1.05, style: "wing" },
    chelonian: { hi: "#e7f1ff", mid: "#6aa4ff", low: "#102444", n: 6, reach: 1.0, style: "plate" },
    fulcrum: { hi: "#f7fbff", mid: "#c5d4ee", low: "#243044", n: 6, reach: 1.02, style: "crown" },
    wraith: { hi: "#f3e8ff", mid: "#b79bff", low: "#2a1848", n: 3, reach: 1.08, style: "hook" },
    lodestone: { hi: "#e7f7ff", mid: "#7dd3fc", low: "#0c2a3a", n: 2, reach: 1.06, style: "pole" },
    echo: { hi: "#f8fafc", mid: "#d5dee8", low: "#334155", n: 4, reach: 1.04, style: "chevron" },
    nova: { hi: "#fff4ec", mid: "#ff8a4a", low: "#4a1d0c", n: 10, reach: 1.08, style: "ray" },
    leech: { hi: "#ffe4ea", mid: "#fb7185", low: "#4a1020", n: 3, reach: 1.07, style: "barb" },
    rime: { hi: "#f0fbff", mid: "#bae6fd", low: "#0c3048", n: 6, reach: 1.04, style: "crystal" },
    jester: { hi: "#ffe4f3", mid: "#f472b6", low: "#4a1840", n: 4, reach: 1.08, style: "diamond" },
    titan: { hi: "#fff6d8", mid: "#fbbf24", low: "#4a3208", n: 5, reach: 1.1, style: "plate" },
    burrow: { hi: "#fff6d6", mid: "#e8b84a", low: "#3a2a08", n: 3, reach: 1.04, style: "bit" },
    bolt: { hi: "#fffce8", mid: "#fde047", low: "#4a4008", n: 5, reach: 1.1, style: "spark" },
  };

  const traceBlade = (g, style, radius, reach) => {
    const tip = radius * reach;
    g.beginPath();
    if (style === "fang") {
      g.moveTo(radius * 0.62, -radius * 0.14);
      g.quadraticCurveTo(radius * 0.92, -radius * 0.32, tip, 0);
      g.quadraticCurveTo(radius * 0.9, radius * 0.2, radius * 0.62, radius * 0.1);
    } else if (style === "wing") {
      g.moveTo(radius * 0.6, -radius * 0.06);
      g.quadraticCurveTo(radius * 0.98, -radius * 0.36, tip, -radius * 0.02);
      g.quadraticCurveTo(radius * 0.84, radius * 0.1, radius * 0.62, radius * 0.1);
    } else if (style === "plate") {
      g.moveTo(radius * 0.68, -radius * 0.24);
      g.lineTo(tip, -radius * 0.16);
      g.lineTo(tip, radius * 0.16);
      g.lineTo(radius * 0.68, radius * 0.24);
    } else if (style === "hook") {
      g.moveTo(radius * 0.64, -radius * 0.22);
      g.quadraticCurveTo(tip, -radius * 0.04, radius * 0.96, radius * 0.24);
      g.quadraticCurveTo(radius * 0.8, 0, radius * 0.64, radius * 0.08);
    } else if (style === "pole") {
      g.moveTo(radius * 0.6, -radius * 0.32);
      g.lineTo(tip, -radius * 0.24);
      g.lineTo(tip * 0.94, 0);
      g.lineTo(tip, radius * 0.24);
      g.lineTo(radius * 0.6, radius * 0.32);
    } else if (style === "chevron") {
      g.moveTo(radius * 0.58, -radius * 0.18);
      g.lineTo(tip, 0);
      g.lineTo(radius * 0.58, radius * 0.18);
      g.lineTo(radius * 0.74, 0);
    } else if (style === "ray") {
      g.moveTo(radius * 0.74, -radius * 0.055);
      g.lineTo(tip, 0);
      g.lineTo(radius * 0.74, radius * 0.055);
    } else if (style === "barb") {
      g.moveTo(radius * 0.64, 0);
      g.quadraticCurveTo(radius * 0.88, -radius * 0.3, tip, -radius * 0.02);
      g.quadraticCurveTo(radius * 0.9, radius * 0.1, radius * 0.66, radius * 0.08);
    } else if (style === "crystal") {
      g.moveTo(radius * 0.66, -radius * 0.16);
      g.lineTo(radius * 0.86, -radius * 0.1);
      g.lineTo(tip, 0);
      g.lineTo(radius * 0.86, radius * 0.1);
      g.lineTo(radius * 0.66, radius * 0.16);
    } else if (style === "diamond") {
      g.moveTo(radius * 0.6, 0);
      g.lineTo(radius * 0.84, -radius * 0.22);
      g.lineTo(tip, 0);
      g.lineTo(radius * 0.84, radius * 0.22);
    } else if (style === "bit") {
      g.moveTo(radius * 0.64, -radius * 0.22);
      g.lineTo(tip, 0);
      g.lineTo(radius * 0.64, radius * 0.22);
    } else if (style === "spark") {
      g.moveTo(radius * 0.64, -radius * 0.06);
      g.lineTo(radius * 0.82, -radius * 0.18);
      g.lineTo(radius * 0.76, -radius * 0.02);
      g.lineTo(tip, -radius * 0.1);
      g.lineTo(radius * 0.9, radius * 0.1);
      g.lineTo(radius * 0.7, radius * 0.05);
    } else {
      g.moveTo(radius * 0.7, -radius * 0.12);
      g.lineTo(radius * 0.88, -radius * 0.04);
      g.lineTo(tip, 0);
      g.lineTo(radius * 0.88, radius * 0.04);
      g.lineTo(radius * 0.7, radius * 0.12);
    }
    g.closePath();
  };

  const paintRing = (g, id, radius) => {
    const ring = RINGS[id] || RINGS.fulcrum;
    const shell = g.createRadialGradient(-radius * 0.28, -radius * 0.34, radius * 0.08, 0, 0, radius);
    shell.addColorStop(0, ring.hi);
    shell.addColorStop(0.46, ring.mid);
    shell.addColorStop(1, ring.low);
    g.beginPath();
    g.arc(0, 0, radius * 0.9, 0, Math.PI * 2);
    g.fillStyle = shell;
    g.fill();
    g.lineWidth = 1.5;
    g.strokeStyle = ring.low;
    g.stroke();
    for (let i = 0; i < ring.n; i += 1) {
      g.save();
      g.rotate((i / ring.n) * Math.PI * 2);
      g.translate(radius * 0.035, radius * 0.04);
      traceBlade(g, ring.style, radius, ring.reach);
      g.fillStyle = "rgba(0,0,0,0.4)";
      g.fill();
      g.restore();
    }
    for (let i = 0; i < ring.n; i += 1) {
      g.save();
      g.rotate((i / ring.n) * Math.PI * 2);
      traceBlade(g, ring.style, radius, ring.reach);
      const metal = g.createLinearGradient(radius * 0.5, -radius * 0.3, radius * ring.reach, radius * 0.25);
      metal.addColorStop(0, ring.hi);
      metal.addColorStop(0.42, ring.mid);
      metal.addColorStop(1, ring.low);
      g.fillStyle = metal;
      g.fill();
      g.strokeStyle = "rgba(255,255,255,0.82)";
      g.lineWidth = 1.1;
      g.stroke();
      g.restore();
    }
    g.beginPath();
    g.arc(0, 0, radius * 0.8, -0.9, 0.45);
    g.strokeStyle = "rgba(255,255,255,0.7)";
    g.lineWidth = 1.6;
    g.stroke();
  };

  const drawTop = (g, built, ang, ability, radius) => {
    const color = TYPE_COLOR[built.top.type];
    g.save();
    g.rotate(ang);
    g.fillStyle = "rgba(0,0,0,0.35)";
    g.beginPath();
    g.ellipse(4, 8, radius * 0.82, radius * 0.28, 0, 0, Math.PI * 2);
    g.fill();
    if (ability === "chelonian") {
      g.strokeStyle = "rgba(180, 220, 255, 0.95)";
      g.lineWidth = 4;
      g.beginPath();
      g.arc(0, 0, radius + 16, 0, Math.PI * 2);
      g.stroke();
      g.strokeStyle = "rgba(61, 139, 255, 0.55)";
      g.lineWidth = 10;
      g.beginPath();
      g.arc(0, 0, radius + 8, 0, Math.PI * 2);
      g.stroke();
    }
    paintRing(g, built.top.id, radius);
    const face = g.createRadialGradient(-radius * 0.22, -radius * 0.26, 2, 0, 0, radius * 0.7);
    face.addColorStop(0, "#ffffff");
    face.addColorStop(0.38, color);
    face.addColorStop(1, "#101722");
    g.beginPath();
    g.arc(0, 0, radius * 0.68, 0, Math.PI * 2);
    g.fillStyle = face;
    g.fill();
    g.strokeStyle = "rgba(255,255,255,0.55)";
    g.lineWidth = 1.4;
    g.beginPath();
    g.arc(0, 0, radius * 0.78, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = "rgba(8, 12, 20, 0.45)";
    g.beginPath();
    g.arc(0, 0, radius * 0.52, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.arc(0, 0, radius * 0.36, 0, Math.PI * 2);
    g.stroke();
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + 0.4;
      const px = Math.cos(a) * radius * 0.78;
      const py = Math.sin(a) * radius * 0.78;
      g.beginPath();
      g.arc(px, py, Math.max(1.4, radius * 0.06), 0, Math.PI * 2);
      g.fillStyle = "#f4f8ff";
      g.fill();
      g.strokeStyle = "#1b2433";
      g.lineWidth = 0.8;
      g.stroke();
      g.beginPath();
      g.arc(px - radius * 0.015, py - radius * 0.015, Math.max(0.6, radius * 0.02), 0, Math.PI * 2);
      g.fillStyle = "rgba(20, 28, 42, 0.55)";
      g.fill();
    }
    g.fillStyle = "rgba(7, 17, 31, 0.72)";
    g.save();
    if (built.top.id === "scorch") {
      for (let i = 0; i < 3; i += 1) {
        g.rotate((Math.PI * 2) / 3);
        g.beginPath();
        g.moveTo(radius * 0.2, 0);
        g.quadraticCurveTo(radius * 0.7, -radius * 0.45, radius * 0.95, 0);
        g.quadraticCurveTo(radius * 0.7, radius * 0.45, radius * 0.2, 0);
        g.fill();
      }
    } else if (built.top.id === "steed") {
      g.strokeStyle = "rgba(7, 17, 31, 0.7)";
      g.lineWidth = 3;
      for (let i = 0; i < 4; i += 1) {
        g.rotate(Math.PI / 2);
        g.beginPath();
        g.moveTo(radius * 0.18, 0);
        g.lineTo(radius * 0.72, 0);
        g.stroke();
      }
    } else if (built.top.id === "chelonian") {
      g.strokeStyle = "rgba(226, 240, 255, 0.8)";
      g.lineWidth = 2;
      for (let i = 0; i < 6; i += 1) {
        g.rotate(Math.PI / 3);
        g.beginPath();
        g.arc(0, 0, radius * 0.48, 0.2, 0.9);
        g.stroke();
      }
    } else if (built.top.id === "wraith") {
      g.fillStyle = "rgba(196, 181, 253, 0.9)";
      for (let i = 0; i < 3; i += 1) {
        g.rotate((Math.PI * 2) / 3);
        g.beginPath();
        g.arc(radius * 0.28, 0, radius * 0.34, 0.4, Math.PI - 0.2);
        g.fill();
      }
    } else if (built.top.id === "lodestone") {
      g.strokeStyle = "rgba(125, 211, 252, 0.95)";
      g.lineWidth = 4;
      g.beginPath();
      g.arc(0, 0, radius * 0.46, 0.6, Math.PI * 2 - 0.6);
      g.stroke();
      g.fillStyle = "rgba(125, 211, 252, 0.95)";
      g.beginPath();
      g.arc(-radius * 0.16, radius * 0.34, radius * 0.12, 0, Math.PI * 2);
      g.arc(radius * 0.16, radius * 0.34, radius * 0.12, 0, Math.PI * 2);
      g.fill();
    } else if (built.top.id === "echo") {
      g.strokeStyle = "rgba(226, 232, 240, 0.9)";
      g.lineWidth = 3;
      for (let i = 0; i < 4; i += 1) {
        g.rotate(Math.PI / 2);
        g.beginPath();
        g.moveTo(radius * 0.2, -radius * 0.16);
        g.lineTo(radius * 0.62, 0);
        g.lineTo(radius * 0.2, radius * 0.16);
        g.stroke();
      }
    } else if (built.top.id === "nova") {
      g.strokeStyle = "rgba(255, 138, 74, 0.95)";
      g.lineWidth = 3;
      for (let i = 0; i < 8; i += 1) {
        g.rotate(Math.PI / 4);
        g.beginPath();
        g.moveTo(radius * 0.22, 0);
        g.lineTo(radius * 0.7, 0);
        g.stroke();
      }
    } else if (built.top.id === "leech") {
      g.fillStyle = "rgba(251, 113, 133, 0.95)";
      for (let i = 0; i < 3; i += 1) {
        g.rotate((Math.PI * 2) / 3);
        g.beginPath();
        g.moveTo(radius * 0.16, 0);
        g.quadraticCurveTo(radius * 0.55, -radius * 0.22, radius * 0.72, 0);
        g.quadraticCurveTo(radius * 0.55, radius * 0.22, radius * 0.16, 0);
        g.fill();
      }
    } else if (built.top.id === "rime") {
      g.strokeStyle = "rgba(186, 230, 253, 0.95)";
      g.lineWidth = 2;
      for (let i = 0; i < 6; i += 1) {
        g.rotate(Math.PI / 3);
        g.beginPath();
        g.moveTo(radius * 0.16, 0);
        g.lineTo(radius * 0.62, 0);
        g.moveTo(radius * 0.4, -radius * 0.12);
        g.lineTo(radius * 0.4, radius * 0.12);
        g.stroke();
      }
    } else if (built.top.id === "jester") {
      g.fillStyle = "rgba(244, 114, 182, 0.95)";
      g.beginPath();
      g.moveTo(0, -radius * 0.62);
      g.lineTo(radius * 0.28, 0);
      g.lineTo(0, radius * 0.62);
      g.lineTo(-radius * 0.28, 0);
      g.fill();
    } else if (built.top.id === "titan") {
      g.strokeStyle = "rgba(251, 191, 36, 0.95)";
      g.lineWidth = 5;
      g.beginPath();
      g.arc(0, 0, radius * 0.5, 0, Math.PI * 2);
      g.stroke();
    } else if (built.top.id === "burrow") {
      g.fillStyle = "rgba(251, 191, 36, 0.95)";
      for (let i = 0; i < 3; i += 1) {
        g.rotate((Math.PI * 2) / 3);
        g.beginPath();
        g.moveTo(radius * 0.18, 0);
        g.lineTo(radius * 0.7, radius * 0.16);
        g.lineTo(radius * 0.7, -radius * 0.16);
        g.fill();
      }
    } else if (built.top.id === "bolt") {
      g.strokeStyle = "rgba(253, 224, 71, 0.95)";
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(-radius * 0.1, -radius * 0.62);
      g.lineTo(radius * 0.22, -radius * 0.08);
      g.lineTo(-radius * 0.05, -radius * 0.08);
      g.lineTo(radius * 0.12, radius * 0.62);
      g.stroke();
    } else {
      g.strokeStyle = "rgba(7, 17, 31, 0.65)";
      g.lineWidth = 2;
      g.strokeRect(-radius * 0.28, -radius * 0.28, radius * 0.56, radius * 0.56);
    }
    g.restore();
    const hub = g.createRadialGradient(-radius * 0.06, -radius * 0.07, 1, 0, 0, radius * 0.24);
    hub.addColorStop(0, "#ffffff");
    hub.addColorStop(0.5, color);
    hub.addColorStop(1, "#0c121c");
    g.beginPath();
    g.arc(0, 0, radius * 0.26, 0, Math.PI * 2);
    g.fillStyle = "#e7eef8";
    g.fill();
    g.lineWidth = 1.6;
    g.strokeStyle = "#1b2433";
    g.stroke();
    g.beginPath();
    g.arc(0, 0, radius * 0.16, 0, Math.PI * 2);
    g.fillStyle = hub;
    g.fill();
    g.strokeStyle = "rgba(255,255,255,0.9)";
    g.lineWidth = 1.3;
    g.beginPath();
    g.moveTo(-radius * 0.07, 0);
    g.lineTo(radius * 0.07, 0);
    g.moveTo(0, -radius * 0.07);
    g.lineTo(0, radius * 0.07);
    g.stroke();
    if (ability === "scorch") {
      g.strokeStyle = "#ffb088";
      g.lineWidth = 3;
      for (let i = 0; i < 3; i += 1) {
        const a = i * ((Math.PI * 2) / 3);
        g.beginPath();
        g.arc(0, 0, radius + 16, a - 0.45, a + 0.2);
        g.stroke();
      }
    } else if (ability === "wraith") {
      g.strokeStyle = "rgba(196, 181, 253, 0.9)";
      g.lineWidth = 3;
      g.setLineDash([5, 5]);
      g.beginPath();
      g.arc(0, 0, radius + 12, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
    } else if (ability === "lodestone") {
      g.strokeStyle = "rgba(125, 211, 252, 0.9)";
      g.lineWidth = 3;
      g.beginPath();
      g.arc(0, 0, radius + 14, clock * 3, clock * 3 + 1.2);
      g.stroke();
    } else if (ability === "echo") {
      g.strokeStyle = "rgba(226, 232, 240, 0.95)";
      g.lineWidth = 4;
      g.beginPath();
      g.arc(0, 0, radius + 12, 0, Math.PI * 2);
      g.stroke();
    } else if (ability === "nova") {
      g.strokeStyle = "#ff8a4a";
      g.lineWidth = 3;
      g.beginPath();
      g.arc(0, 0, radius + 8 + Math.sin(clock * 14) * 4, 0, Math.PI * 2);
      g.stroke();
    } else if (ability === "leech") {
      g.strokeStyle = "#fb7185";
      g.lineWidth = 3;
      g.beginPath();
      g.arc(0, 0, radius + 10, 0, Math.PI * 2);
      g.stroke();
    } else if (ability === "rime") {
      g.strokeStyle = "#bae6fd";
      g.lineWidth = 3;
      g.beginPath();
      g.arc(0, 0, radius + 12, 0, Math.PI * 2);
      g.stroke();
    } else if (ability === "jester") {
      g.fillStyle = "#f472b6";
      g.rotate(clock * 6);
      g.beginPath();
      g.moveTo(0, -(radius + 14));
      g.lineTo(8, 0);
      g.lineTo(0, radius + 14);
      g.lineTo(-8, 0);
      g.fill();
    } else if (ability === "titan") {
      g.strokeStyle = "#fbbf24";
      g.lineWidth = 5;
      g.beginPath();
      g.arc(0, 0, radius + 8, 0, Math.PI * 2);
      g.stroke();
    } else if (ability === "burrow") {
      g.strokeStyle = "#fbbf24";
      g.lineWidth = 3;
      g.setLineDash([4, 4]);
      g.beginPath();
      g.arc(0, 0, radius + 12, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
    } else if (ability === "bolt") {
      g.strokeStyle = "#fde047";
      g.lineWidth = 3;
      g.beginPath();
      g.arc(0, 0, radius + 10 + Math.sin(clock * 20) * 3, 0, Math.PI * 2);
      g.stroke();
    }
    g.save();
    g.globalCompositeOperation = "lighter";
    g.strokeStyle = "rgba(255, 255, 255, 0.72)";
    g.lineWidth = 2;
    g.beginPath();
    g.arc(0, 0, radius * 0.7, -1.05, 0.35);
    g.stroke();
    g.fillStyle = "rgba(255, 255, 255, 0.42)";
    g.beginPath();
    g.arc(-radius * 0.22, -radius * 0.24, Math.max(2, radius * 0.13), 0, Math.PI * 2);
    g.fill();
    g.restore();
    g.restore();
  };

  const drawBar = (x, y, w, value, color, label) => {
    ctx.fillStyle = "rgba(8, 16, 32, 0.8)";
    ctx.fillRect(x, y, w, 12);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * Math.max(0, Math.min(1, value)), 12);
    ctx.strokeStyle = "rgba(190, 216, 255, 0.7)";
    ctx.strokeRect(x, y, w, 12);
    ctx.fillStyle = "#d7e7ff";
    ctx.font = "700 13px Rajdhani, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(label, x, y - 4);
  };

  const drawHud = () => {
    ctx.fillStyle = "#e7f1ff";
    ctx.font = "800 22px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${points[0]}  —  ${points[1]}`, CX, 42);
    ctx.font = "600 14px Rajdhani, sans-serif";
    ctx.fillStyle = "#9fb6d8";
    ctx.fillText("FIRST TO 3", CX, 62);
    if (mode === "online" && net.lag > 0.35) {
      ctx.fillStyle = "#ffb0aa";
      ctx.fillText("WAITING", CX, 86);
    }
    beys.forEach((bey) => {
      const left = bey.i === 0;
      const x = left ? 48 : LW - 308;
      ctx.fillStyle = TYPE_COLOR[bey.built.top.type];
      ctx.font = "800 18px Orbitron, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(nameOf(bey.i), x, 548);
      ctx.font = "600 14px Rajdhani, sans-serif";
      ctx.fillStyle = "#9fb6d8";
      ctx.fillText(bey.built.top.id === "fulcrum" ? "No special" : (bey.human ? (mode === "online" ? (bey.i === seat ? "E ability" : "Rival") : (bey.i === 0 ? "E ability" : "F ability")) : "Auto"), x + 150, 548);
      drawBar(x, 566, 250, bey.speed / 100, "#3d8bff", "Speed");
      drawBar(x, 598, 250, bey.hp / bey.maxHp, "#3dffb0", "Health");
      drawBar(x, 630, 250, bey.meter / 100, "#ff4d4d", "Ability");
    });
  };

  const drawLaunch = () => {
    const x = 0.5 + 0.5 * Math.sin(clock * 11);
    ctx.fillStyle = "#e7f1ff";
    ctx.font = "800 28px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${nameOf(launchIndex)} launch`, CX, 78);
    ctx.font = "600 18px Rajdhani, sans-serif";
    ctx.fillStyle = "#9fb6d8";
    ctx.fillText(mode === "online" && launchPower[seat] != null ? "Waiting for the other launch" : "Click while the marker is on the bar", CX, 108);
    const barX = 250;
    const barY = 620;
    const barW = 780;
    const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    grad.addColorStop(0, "#ff3b30");
    grad.addColorStop(1, "#1fbf75");
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, barW, 28);
    ctx.strokeStyle = "#e7f1ff";
    ctx.strokeRect(barX, barY, barW, 28);
    const mark = barX + x * barW;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(mark, barY - 16);
    ctx.lineTo(mark - 9, barY - 2);
    ctx.lineTo(mark + 9, barY - 2);
    ctx.fill();
    ctx.font = "700 16px Rajdhani, sans-serif";
    ctx.fillStyle = "#ffb0aa";
    ctx.textAlign = "left";
    ctx.fillText("FASTER", barX, barY - 10);
    ctx.fillStyle = "#b6f3d2";
    ctx.textAlign = "right";
    ctx.fillText("SLOWER", barX + barW, barY - 10);
    return x;
  };

  const showVersus = () => {
    ready = [false, false];
    cardT = 0;
    banner = null;
    view = "versus";
    ui.innerHTML = `<button class="rb-back rb-float" type="button" data-action="mode">Back</button>`;
    tone(180, 0.12, "triangle", 0.04);
  };

  const sidePaint = (index) => (index === 0
    ? { edge: "#2ee7ff", wash: "rgba(6, 28, 52, 0.94)", ink: "#e9fbff" }
    : { edge: "#ff2ea6", wash: "rgba(48, 8, 28, 0.94)", ink: "#ffe6f4" });

  const slant = (x, y, w, h, cut) => {
    ctx.beginPath();
    if (cut >= 0) {
      ctx.moveTo(x + cut, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w - cut, y + h);
      ctx.lineTo(x, y + h);
    } else {
      const c = -cut;
      ctx.moveTo(x, y);
      ctx.lineTo(x + w - c, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x + c, y + h);
    }
    ctx.closePath();
  };

  const versusEase = () => 1 - (1 - Math.min(1, cardT / 0.42)) ** 3;

  const versusOrigin = (index) => (index === 0 ? -520 + versusEase() * 560 : 1280 - versusEase() * 580);

  const drawStatRows = (built, x, y) => {
    [["ATK", built.atk], ["DEF", built.def], ["STA", built.sta], ["SPD", built.spd]].forEach((row, i) => {
      const yy = y + i * 24;
      ctx.font = "700 14px Rajdhani, sans-serif";
      ctx.textAlign = "left";
      ctx.fillStyle = "#d7e7ff";
      ctx.fillText(row[0], x, yy);
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      ctx.fillRect(x + 42, yy - 11, 110, 9);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + 42, yy - 11, 110 * Math.min(1, row[1] / 16), 9);
    });
  };

  const drawVersus = () => {
    ctx.fillStyle = "rgba(2, 6, 14, 0.78)";
    ctx.fillRect(0, 0, LW, LH);
    [0, 1].forEach((index) => {
      const built = builds[index];
      if (!built) return;
      const paint = sidePaint(index);
      const x = versusOrigin(index);
      const cut = index === 0 ? 46 : -46;
      slant(x, 54, 500, 560, cut);
      ctx.fillStyle = paint.wash;
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = paint.edge;
      ctx.stroke();
      ctx.save();
      ctx.translate(x + 250, 230);
      drawTop(ctx, built, clock * 1.8, null, 78);
      ctx.restore();
      ctx.textAlign = "left";
      ctx.fillStyle = paint.ink;
      ctx.font = "800 32px Orbitron, sans-serif";
      ctx.fillText(nameOf(index), x + 48, 400);
      ctx.font = "700 18px Rajdhani, sans-serif";
      ctx.fillStyle = paint.edge;
      ctx.fillText(built.top.name, x + 48, 432);
      ctx.fillStyle = "#d7e7ff";
      ctx.fillText(`${built.shield.name}  ·  ${built.tip.name}`, x + 48, 456);
      ctx.font = "600 15px Rajdhani, sans-serif";
      ctx.fillText(`HP ${built.hp}`, x + 300, 432);
      drawStatRows(built, x + 48, 492);
      const box = { x: x + 78, y: 548, w: 230, h: 52 };
      slant(box.x, box.y, box.w, box.h, index === 0 ? 14 : -14);
      ctx.fillStyle = ready[index] ? paint.edge : "rgba(0,0,0,0.35)";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = paint.edge;
      ctx.stroke();
      ctx.fillStyle = ready[index] ? "#071018" : "#ffffff";
      ctx.font = "800 20px Orbitron, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(ready[index] ? "READY" : index === 1 && mode === "bot" ? "BOT" : "READY?", box.x + box.w * 0.5, box.y + 34);
    });
    const pop = 1.35 - versusEase() * 0.35;
    ctx.save();
    ctx.translate(CX, 300);
    ctx.rotate(-0.18);
    ctx.scale(pop, pop);
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 78px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("VS", 0, 0);
    ctx.restore();
    ctx.textBaseline = "alphabetic";
  };

  const drawRoundCard = () => {
    const t = banner.t || 0;
    const open = 1 - (1 - Math.min(1, t / 0.28)) ** 3;
    ctx.fillStyle = `rgba(2, 6, 14, ${0.62 * open})`;
    ctx.fillRect(0, 0, LW, LH);
    const tabY = LH + 40 - open * 390;
    const who = banner.who;
    const paint = who >= 0 ? sidePaint(who) : { edge: "#d5e6ff", wash: "rgba(10, 16, 32, 0.95)", ink: "#ffffff" };
    slant(150, tabY, 980, 320, who === 1 ? -40 : 40);
    ctx.fillStyle = paint.wash;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = paint.edge;
    ctx.stroke();
    if (who >= 0 && builds[who]) {
      const fall = Math.min(1, Math.max(0, (t - 0.1) / 0.38));
      const drop = 1 - (1 - fall) ** 3;
      const y = -110 + drop * (tabY + 260);
      const wobble = fall > 0.94 ? Math.sin(t * 28) * 5 * Math.max(0, 1 - (t - 0.48) * 3) : 0;
      ctx.save();
      ctx.translate(who === 1 ? 980 : 310, y + wobble);
      drawTop(ctx, builds[who], clock * (fall > 0.9 ? 2 : 9), null, 76);
      ctx.restore();
    }
    ctx.textAlign = "left";
    ctx.fillStyle = paint.ink;
    ctx.font = "800 46px Orbitron, sans-serif";
    ctx.fillText(who >= 0 ? nameOf(who) : banner.title, who === 1 ? 230 : 470, tabY + 120);
    ctx.font = "700 28px Rajdhani, sans-serif";
    ctx.fillStyle = paint.edge;
    ctx.fillText(who >= 0 ? banner.title : banner.detail, who === 1 ? 230 : 470, tabY + 168);
    ctx.fillStyle = "#d7e7ff";
    ctx.font = "700 22px Rajdhani, sans-serif";
    ctx.fillText(`${points[0]}   —   ${points[1]}`, who === 1 ? 230 : 470, tabY + 214);
    ctx.fillText(mode === "online" && hold.cont[seat] ? "WAITING" : "CLICK", who === 1 ? 230 : 470, tabY + 258);
  };

  const drawMatchCard = () => {
    const ease = 1 - (1 - Math.min(1, cardT / 0.4)) ** 3;
    ctx.fillStyle = "rgba(2, 6, 14, 0.84)";
    ctx.fillRect(0, 0, LW, LH);
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 36px Orbitron, sans-serif";
    ctx.fillText(matchWinner >= 0 ? `${nameOf(matchWinner)} WINS` : "MATCH", CX, 58);
    [0, 1].forEach((index) => {
      const built = builds[index];
      if (!built) return;
      const paint = sidePaint(index);
      const x = index === 0 ? -460 + ease * 500 : 1240 - ease * 500;
      slant(x, 88, 460, 500, index === 0 ? 36 : -36);
      ctx.fillStyle = paint.wash;
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = paint.edge;
      ctx.stroke();
      ctx.save();
      ctx.translate(x + 230, 230);
      drawTop(ctx, built, clock * 1.4, null, 64);
      ctx.restore();
      ctx.textAlign = "left";
      ctx.fillStyle = paint.ink;
      ctx.font = "800 26px Orbitron, sans-serif";
      ctx.fillText(nameOf(index), x + 36, 360);
      ctx.font = "700 16px Rajdhani, sans-serif";
      ctx.fillStyle = paint.edge;
      ctx.fillText(`${built.top.name}  ·  ${built.shield.name}  ·  ${built.tip.name}`, x + 36, 388);
      drawStatRows(built, x + 36, 424);
      ctx.font = "800 28px Orbitron, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(String(points[index]), x + 300, 470);
    });
    ctx.textAlign = "center";
    ctx.font = "800 64px Orbitron, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`${points[0]}  ${points[1]}`, CX, 250);
    ctx.font = "700 18px Rajdhani, sans-serif";
    ctx.fillStyle = "#9fd0ff";
    ctx.fillText("POINTS", CX, 286);
  };

  const draw = () => {
    const box = fit();
    ctx.setTransform(box.dpr, 0, 0, box.dpr, 0, 0);
    ctx.clearRect(0, 0, box.w, box.h);
    const bg = ctx.createLinearGradient(0, 0, 0, box.h);
    bg.addColorStop(0, "#07111f");
    bg.addColorStop(1, "#03070f");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, box.w, box.h);
    ctx.save();
    ctx.translate(box.ox, box.oy);
    ctx.scale(box.s, box.s);
    ctx.save();
    if (shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }
    ctx.save();
    if (clash) {
      const z = 1 + clash.zoom * 1.9;
      ctx.translate(CX, 330);
      ctx.scale(z, z);
      ctx.translate(-clash.x, -clash.y);
    }
    drawBowl();
    if (clash) {
      const heat = Math.min(1, clash.t / 1.4);
      const glow = ctx.createRadialGradient(clash.x, clash.y, 4, clash.x, clash.y, 40 + heat * 30);
      glow.addColorStop(0, `rgba(255,255,255,${0.35 + heat * 0.45})`);
      glow.addColorStop(0.45, `rgba(130, 196, 255, ${0.28 + heat * 0.35})`);
      glow.addColorStop(1, "rgba(80, 150, 255, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(clash.x, clash.y, 46 + heat * 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${0.28 + heat * 0.6})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(clash.x, clash.y, 74 - heat * 40, 0, Math.PI * 2);
      ctx.stroke();
    }
    mines.forEach((mine) => {
      ctx.save();
      ctx.translate(mine.x, mine.y);
      ctx.rotate(clock * 2);
      ctx.fillStyle = mine.arm > 0 ? "rgba(251, 191, 36, 0.45)" : "#fbbf24";
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const ang = i * (Math.PI / 3);
        const r = i % 2 === 0 ? mine.r : mine.r * 0.42;
        const x = Math.cos(ang) * r;
        const y = Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
    if (view === "fight" || view === "launch") {
      beys.forEach((bey) => {
        if (bey.out || bey.under) return;
        bey.trail = bey.trail || [];
        const last = bey.trail[bey.trail.length - 1];
        if (!last || Math.hypot(bey.x - last.x, bey.y - last.y) > 10) {
          bey.trail.push({ x: bey.x, y: bey.y, ang: bey.ang });
          if (bey.trail.length > 5) bey.trail.shift();
        }
        bey.trail.forEach((ghost, index) => {
          ctx.save();
          ctx.globalAlpha = ((index + 1) / bey.trail.length) * 0.2;
          ctx.translate(ghost.x, ghost.y);
          drawTop(ctx, bey.built, ghost.ang, null, bodyR(bey));
          ctx.restore();
        });
        const mag = Math.hypot(bey.vx, bey.vy);
        if (view === "fight" && mag > 260) {
          const ang = Math.atan2(bey.vy, bey.vx);
          ctx.strokeStyle = "rgba(232, 244, 255, 0.5)";
          ctx.lineWidth = 1.5;
          for (let i = 0; i < 5; i += 1) {
            const off = (i - 2) * 8;
            const ox = Math.cos(ang + Math.PI / 2) * off;
            const oy = Math.sin(ang + Math.PI / 2) * off;
            const len = 18 + mag * 0.035;
            ctx.beginPath();
            ctx.moveTo(bey.x + ox - Math.cos(ang) * (bodyR(bey) + 8), bey.y + oy - Math.sin(ang) * (bodyR(bey) + 8));
            ctx.lineTo(bey.x + ox - Math.cos(ang) * (bodyR(bey) + 8 + len), bey.y + oy - Math.sin(ang) * (bodyR(bey) + 8 + len));
            ctx.stroke();
          }
        }
        if (view === "fight" && bey.speed < 26) {
          ctx.strokeStyle = `rgba(255, 64, 90, ${0.4 + Math.sin(clock * 11) * 0.28})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(bey.x, bey.y, bodyR(bey) + 12 + Math.sin(clock * 11) * 4, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.save();
        ctx.translate(bey.x, bey.y);
        ctx.shadowColor = TYPE_COLOR[bey.built.top.type];
        ctx.shadowBlur = 18;
        if (bey.ability === "wraith") ctx.globalAlpha = 0.62;
        drawTop(ctx, bey.built, bey.ang, bey.ability, bodyR(bey));
        ctx.shadowBlur = 0;
        if (isChilled(bey)) {
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "rgba(186, 230, 253, 0.95)";
          ctx.lineWidth = 2;
          for (let i = 0; i < 6; i += 1) {
            const ang = i * (Math.PI / 3) + clock;
            ctx.beginPath();
            ctx.moveTo(Math.cos(ang) * (bodyR(bey) + 4), Math.sin(ang) * (bodyR(bey) + 4));
            ctx.lineTo(Math.cos(ang) * (bodyR(bey) + 16), Math.sin(ang) * (bodyR(bey) + 16));
            ctx.stroke();
          }
        }
        ctx.restore();
      });
    beys.forEach((bey) => {
      if (bey.out || (bey.ability !== "lodestone" && bey.ability !== "leech")) return;
      const other = beys[1 - bey.i];
      if (!other || other.out) return;
      const dist = Math.hypot(other.x - bey.x, other.y - bey.y);
      if (bey.ability === "leech" && dist > 260) return;
      ctx.strokeStyle = bey.ability === "leech" ? "rgba(251, 113, 133, 0.85)" : "rgba(125, 211, 252, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bey.x, bey.y);
      ctx.lineTo(other.x, other.y);
      ctx.stroke();
    });
    waves.forEach((wave) => {
      const p = wave.t / wave.dur;
      ctx.globalAlpha = (1 - p) * 0.9;
      ctx.strokeStyle = wave.color || "#ff8a4a";
      ctx.lineWidth = 2 + (1 - p) * 7;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, 12 + p * 150, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = (1 - p) * 0.45;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, 8 + p * 78, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
    }
    motes.forEach((mote) => {
      const alpha = Math.max(0, mote.kind === "spark" ? mote.life * 3.2 : mote.life * 4);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = mote.color;
      ctx.fillStyle = mote.color;
      if (mote.kind === "spark") {
        ctx.lineWidth = mote.r || 2;
        ctx.beginPath();
        ctx.moveTo(mote.x, mote.y);
        ctx.lineTo(mote.x - (mote.vx || 0) * 0.035, mote.y - (mote.vy || 0) * 0.035);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(mote.x, mote.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
    shards.forEach((shard) => {
      ctx.save();
      ctx.translate(shard.x, shard.y);
      ctx.rotate(shard.ang);
      ctx.globalAlpha = Math.max(0, shard.life);
      ctx.fillStyle = shard.color;
      ctx.fillRect(-10, -6, 20, 12);
      ctx.restore();
      ctx.globalAlpha = 1;
    });
    ctx.restore();
    if (view === "fight") {
      const low = beys.some((bey) => !bey.out && (bey.speed < 26 || bey.hp < bey.maxHp * 0.3));
      const vig = ctx.createRadialGradient(CX, 300, 150, CX, 300, 680);
      vig.addColorStop(0, "rgba(0, 0, 0, 0)");
      vig.addColorStop(1, low ? `rgba(64, 0, 16, ${0.34 + Math.sin(clock * 6) * 0.1})` : "rgba(0, 0, 0, 0.3)");
      ctx.fillStyle = vig;
      ctx.fillRect(-30, -30, LW + 60, LH + 60);
      if (flash > 0.04) {
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.32, flash * 0.26)})`;
        ctx.fillRect(-30, -30, LW + 60, LH + 60);
      }
    }
    if (clash) drawClashUi();
    ctx.restore();
    if (view === "versus") drawVersus();
    else if (view === "end") drawMatchCard();
    else {
      if (view === "launch") drawLaunch();
      if (view === "fight" && !clash && !banner) drawHud();
      if (banner && view === "fight") drawRoundCard();
    }
    ctx.restore();
  };

  const drawClashUi = () => {
    const bar = 58 * clash.zoom;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, LW, bar);
    ctx.fillRect(0, LH - bar, LW, bar);
    const x = CX;
    const y = 330;
    const needle = clashNeedle();
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(6, 10, 22, 0.82)";
    ctx.beginPath();
    ctx.arc(0, 0, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 12;
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.beginPath();
    ctx.arc(0, 0, 64, 0, Math.PI * 2);
    ctx.stroke();
    if (needle >= 0 && needle <= 1) {
      [0, 1].forEach((index) => {
        const span = clash.half[index];
        const a0 = -Math.PI / 2 + (clash.zone - span) * Math.PI * 2;
        const a1 = -Math.PI / 2 + (clash.zone + span) * Math.PI * 2;
        ctx.strokeStyle = index === 0 ? "#8eb7ff" : "#ff9ec8";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(0, 0, index === 0 ? 72 : 58, a0, a1);
        ctx.stroke();
      });
      const na = -Math.PI / 2 + needle * Math.PI * 2;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(na) * 40, Math.sin(na) * 40);
      ctx.lineTo(Math.cos(na) * 84, Math.sin(na) * 84);
      ctx.stroke();
    }
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#8eb7ff";
    ctx.beginPath();
    ctx.arc(0, 0, 46, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "800 22px Orbitron, sans-serif";
    ctx.fillText(mode === "bot" || mode === "online" ? "E" : "E  F", 0, clash.call ? -6 : 0);
    if (clash.call) {
      ctx.font = "700 13px Rajdhani, sans-serif";
      ctx.fillStyle = clash.call === "BREAK" ? "#ff8a8a" : clash.call === "EVEN" ? "#9fffe0" : "#d5e6ff";
      ctx.fillText(clash.call, 0, 16);
    }
    ctx.restore();
    ctx.font = "700 16px Rajdhani, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#d7e7ff";
    ctx.fillText(needle < 0 ? "LOCK IN" : needle > 1 || clash.call ? "" : "HIT YOUR ARC", CX, y - 96);
    [0, 1].forEach((index) => {
      const label = mode === "online" ? (index === seat ? "YOU" : "RIVAL") : mode === "bot" && index === 1 ? "BOT" : index === 0 ? "P1" : "P2";
      const state = !clash.pressed[index] ? "..." : clash.hit[index] ? "HIT" : "MISS";
      ctx.fillStyle = !clash.pressed[index] ? "#9fb6d8" : clash.hit[index] ? "#3dffb0" : "#ff6b6b";
      ctx.fillText(`${label} ${state}`, CX + (index === 0 ? -70 : 70), y + 96);
    });
  };

  const frame = (now) => {
    raf = window.requestAnimationFrame(frame);
    const dt = Math.min(0.033, last ? (now - last) / 1000 : 0.016);
    last = now;
    if (root.hidden) {
      stopBed();
      return;
    }
    clock += dt;
    if (view === "versus" || view === "end") cardT += dt;
    if (banner) banner.t = (banner.t || 0) + dt;
    if (view === "versus" && mode === "bot" && cardT > 0.55) ready[1] = true;
    if (view === "versus" && ready[0] && ready[1] && cardT > 0.4) startLaunch();
    shake *= Math.exp(-dt * 5.5);
    flash = Math.max(0, flash - dt * 2.6);
    if (view === "build") paintBuild();
    if (mode === "online" && view === "fight" && roundLive) {
      simAcc += dt;
      pumpInput();
      let guard = 0;
      while (guard < 3 && simAcc >= STEP && inputs[0][simTick] && inputs[1][simTick]) {
        const mine = inputs[0][simTick];
        const theirs = inputs[1][simTick];
        if (mine.ability) useAbility(beys[0]);
        if (theirs.ability) useAbility(beys[1]);
        if (mine.qte) pressClash(0);
        if (theirs.qte) pressClash(1);
        if (clash) tickClash(STEP);
        else step(STEP);
        simTick += 1;
        simAcc -= STEP;
        guard += 1;
        net.lag = 0;
        pumpInput();
      }
      if (!(inputs[0][simTick] && inputs[1][simTick])) net.lag += dt;
    } else if (clash) tickClash(dt);
    else {
      let sim = dt;
      if (hitStop > 0) {
        const held = Math.min(hitStop, sim);
        hitStop -= held;
        sim -= held;
      }
      if (sim > 0) step(sim);
    }
    updateBed();
    draw();
  };

  const lockLaunch = () => {
    if (view !== "launch" || banner) return;
    if (mode === "online") {
      if (launchPower[seat] != null) return;
      const marker = 0.5 + 0.5 * Math.sin(clock * 11);
      launchPower[seat] = 1 - marker;
      tone(280, 0.06, "square", 0.04);
      send({ t: "launch", power: launchPower[seat] });
      if (seat === 0) tryStartFight();
      return;
    }
    if (launchPower[launchIndex] != null) return;
    const marker = 0.5 + 0.5 * Math.sin(clock * 11);
    launchPower[launchIndex] = 1 - marker;
    tone(280, 0.06, "square", 0.04);
    if (launchIndex === 0) {
      launchIndex = 1;
      botWait = 0.45 + Math.random() * 0.55;
      if (mode === "hotseat") return;
    }
    if (launchPower[0] != null && launchPower[1] != null) beginFight();
  };

  const continueRound = () => {
    if (!banner) return;
    if (banner.win >= 0) {
      matchWinner = banner.win;
      cardT = 0;
      view = "end";
      ui.innerHTML = `
        <div class="rb-endbar">
          <button class="rb-go" type="button" data-action="rematch">Rematch</button>
          <button class="rb-go rb-ghost" type="button" data-action="menu">Menu</button>
        </div>`;
      banner = null;
      return;
    }
    banner = null;
    startLaunch();
  };

  ui.addEventListener("click", (event) => {
    const arenaPick = event.target.closest("[data-arena]");
    if (arenaPick && view === "arena") {
      arena = arenaPick.dataset.arena;
      roads = makeRoads();
      armAudio();
      if (mode === "online") send({ t: "arena", id: arena });
      showVersus();
      return;
    }
    const roll = event.target.closest("[data-roll]");
    if (roll) {
      const group = roll.dataset.roll;
      const list = group === "shield" ? SHIELDS : group === "tip" ? TIPS : TOPS;
      const pool = list.filter((part) => part.id !== pick[group]);
      pick[group] = pool[Math.floor(Math.random() * pool.length)].id;
      showBuild();
      return;
    }
    const part = event.target.closest("[data-group]");
    if (part) {
      pick[part.dataset.group] = part.dataset.id;
      showBuild();
      return;
    }
    const button = event.target.closest("[data-action]");
    if (!button) return;
    armAudio();
    const action = button.dataset.action;
    if (action === "close") close();
    else if (action === "menu") {
      dropNet();
      mode = "hotseat";
      showMenu();
    }
    else if (action === "mode") {
      dropNet();
      if (mode === "online") mode = "hotseat";
      showMode();
    }
    else if (action === "hotseat" || action === "bot") {
      dropNet();
      mode = action;
      seat = 0;
      builder = 0;
      builds = [null, null];
      points = [0, 0];
      pick = { top: "scorch", shield: "core", tip: "even" };
      showBuild();
    } else if (action === "online") showOnline();
    else if (action === "host") hostRoom();
    else if (action === "join-mode") showJoin();
    else if (action === "lock") {
      builds[builder] = compile(pick);
      if (mode === "online") {
        send({ t: "build", top: pick.top, shield: pick.shield, tip: pick.tip });
        showWait("Locked", "Waiting for the other top.");
        bothBuilds();
      } else if (mode === "hotseat" && builder === 0) {
        builder = 1;
        pick = { top: "steed", shield: "band", tip: "glide" };
        showBuild();
      } else {
        if (mode === "bot") {
          builds[1] = compile({
            top: TOPS.filter((top) => top.id !== "fulcrum")[Math.floor(Math.random() * (TOPS.length - 1))].id,
            shield: SHIELDS[Math.floor(Math.random() * SHIELDS.length)].id,
            tip: TIPS[Math.floor(Math.random() * TIPS.length)].id,
          });
        }
        points = [0, 0];
        showArenas();
      }
    } else if (action === "rematch") {
      if (mode === "online") {
        if (!hold.rematch[seat]) {
          hold.rematch[seat] = true;
          send({ t: "rematch" });
          button.textContent = "Waiting";
          finishRematch();
        }
      } else {
        points = [0, 0];
        showVersus();
      }
    }
  });

  ui.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-join]");
    if (!form) return;
    event.preventDefault();
    armAudio();
    joinRoom(form.querySelector("input").value);
  });

  canvas.addEventListener("pointerdown", (event) => {
    armAudio();
    pointer = worldPoint(event);
    if (view === "versus") {
      [0, 1].forEach((index) => {
        if (mode === "online" && index !== seat) return;
        if (mode === "bot" && index === 1) return;
        const x = versusOrigin(index) + 78;
        if (pointer.x >= x && pointer.x <= x + 230 && pointer.y >= 548 && pointer.y <= 600 && !ready[index]) {
          ready[index] = true;
          tone(620, 0.06, "square", 0.04);
          if (mode === "online") send({ t: "ready" });
        }
      });
      return;
    }
    if (clash && view === "fight") {
      const dx = pointer.x - CX;
      const dy = pointer.y - 330;
      if (Math.hypot(dx, dy) < 84) {
        if (mode === "online") tap.qte = true;
        else if (!clash.pressed[0]) pressClash(0);
        else if (mode === "hotseat") pressClash(1);
      }
      return;
    }
    if (view === "launch") lockLaunch();
    else if (view === "fight" && banner) {
      if (mode !== "online") continueRound();
      else if (!hold.cont[seat]) {
        hold.cont[seat] = true;
        send({ t: "cont" });
        finishCont();
      }
    }
  });

  window.addEventListener("keydown", (event) => {
    if (root.hidden) return;
    if (view === "fight" && roundLive) {
      if (mode === "online") {
        if (event.key === "e" || event.key === "E") {
          if (clash) tap.qte = true;
          else tap.ability = true;
        }
        return;
      }
      if (clash) {
        if (event.key === "e" || event.key === "E") pressClash(0);
        if ((event.key === "f" || event.key === "F") && mode === "hotseat") pressClash(1);
        return;
      }
      if (event.key === "e" || event.key === "E") useAbility(beys[0]);
      if ((event.key === "f" || event.key === "F") && mode === "hotseat") useAbility(beys[1]);
    }
  });

  const close = () => {
    dropNet();
    root.hidden = true;
    document.body.style.overflow = "";
    view = "menu";
  };

  const open = () => {
    root.hidden = false;
    document.body.style.overflow = "hidden";
    points = [0, 0];
    beys = [];
    showMenu();
    if (!raf) raf = window.requestAnimationFrame(frame);
  };

  openButton.addEventListener("click", open);
})();
