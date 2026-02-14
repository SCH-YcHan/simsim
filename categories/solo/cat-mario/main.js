(() => {
  "use strict";

  const TILE = 32;
  const VIEW_W = 30;
  const VIEW_H = 18;
  const CHUNK_W = 60;

  const CANVAS_W = VIEW_W * TILE;
  const CANVAS_H = VIEW_H * TILE;
  const COYOTE_MS = 120;
  const JUMP_BUFFER_MS = 120;
  const RESPAWN_DELAY_MS = 220;

  const LS_DEATHS = "catMarioDeaths";
  const LS_BEST = "catMarioBestMs";
  const LS_SOUND = "catMarioSound";

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const key = (tx, ty) => `${tx},${ty}`;

  const LEVELS = [
    {
      id: "L1",
      name: "Level 1: Welcome to Pain (300 tiles)",
      chunkWidth: CHUNK_W,
      height: 18,
      chunks: [
        { id: "A", map: [
          "............................................................",
          "............................................................",
          "............................................................",
          ".....^.................^.................^.................^",
          "............................................................",
          ".............#..............#..............#................",
          ".............#..............#..............#................",
          ".............#..===.........#..............#..===...........",
          ".............#..............#..............#................",
          ".............#..............#..............#................",
          "..........1..#...........2..#..............#................",
          ".............#....~~~~~.....#...........~~~~~...............",
          ".............#..............#..............#................",
          "........======........======#.........======........======..",
          "..S..........#..............#..............#................",
          "##########^^^^^^########~~########^^^^^^##########~~########",
          "^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^",
          "^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^"
        ]},
        { id: "B", map: [
          "............................................................",
          "............................................................",
          "............................................................",
          "......^.................^.................^.................",
          "............................................................",
          "...............#..............#..............#..............",
          "...............#..............#..............#..............",
          "...............#...===........#..............#...===........",
          "...............#..............#..............#..............",
          "...............#..............#..............#..............",
          "............3..#..............#.........4....#..............",
          "...............#........~~~~~.#..............#~~~~~.........",
          "...............#..............#..............#..............",
          "............======........======..........======........====",
          "...............#..............#..............#..............",
          "#############^^^^^^##########~~######^^^^^^############~~###",
          "^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^",
          "^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^"
        ]},
        { id: "C", map: [
          "............................................................",
          "............................................................",
          "............................................................",
          ".......^.................^.................^................",
          "............................................................",
          ".................#..............#..............#............",
          ".................#..............#..............#............",
          ".................#....===.......#..............#....===.....",
          ".................#..............#..............#............",
          ".................#..............#..............#............",
          "...............5.#..............#............6.#............",
          ".................#............~~~~~............#....~~~~~...",
          ".................#..............#..............#............",
          "======..........======........======..........======........",
          ".................#............C.#..............#............",
          "##~~############^^^^^^############~~####^^^^^^##############",
          "^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^",
          "^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^"
        ]},
        { id: "D", map: [
          "............................................................",
          "............................................................",
          "............................................................",
          ".....^.................^.................^.................^",
          "............................................................",
          "...................#..............#..............#..........",
          "...................#..............#..............#..........",
          "...................#.....===......#..............#.....===..",
          "...................#..............#..............#..........",
          "...................#..............#..............#..........",
          "...................#7.............#..............#8.........",
          "...................#..............#.~~~~~........#........~~",
          "...................#..............#..............#..........",
          "....======.........#======........======.........#======....",
          "...................#..............#..............#..........",
          "#######~~##########^^^^^^##############~~##^^^^^^###########",
          "^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^",
          "^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^"
        ]},
        { id: "E", map: [
          "............................................................",
          "............................................................",
          "............................................................",
          "......^.................^.................^.................",
          "............................................................",
          ".....................#..............#..............#........",
          ".....................#..............#..............#........",
          ".....................#......===.....#..............#......==",
          ".....................#..............#..............#........",
          ".....................#..............#..............#........",
          "..................9..#..............#..............#........",
          "....~~~~~............#..............#.....~~~~~....#........",
          ".....................#..............#..............#........",
          "........======.......#..======......#.======.......#..======",
          ".....................#..............#..............#.....G..",
          "############~~########^^^^^^################~~^^^^^^########",
          "^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^",
          "^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^"
        ]}
      ],
      legend: {
        ".": { empty: true },
        "#": { solid: true },
        "^": { solid: true, hazard: true },
        "=": { solid: true, platform: true },
        "~": { solid: false, fake: true },
        "S": { spawn: true, empty: true },
        "C": { checkpoint: true, empty: true },
        "G": { goal: true, empty: true },
        "1": { marker: "1", empty: true },
        "2": { marker: "2", empty: true },
        "3": { marker: "3", empty: true },
        "4": { marker: "4", empty: true },
        "5": { marker: "5", empty: true },
        "6": { marker: "6", empty: true },
        "7": { marker: "7", empty: true },
        "8": { marker: "8", empty: true },
        "9": { marker: "9", empty: true }
      },
      triggers: []
    }
  ];

  function buildMapFromChunks(level) {
    const h = level.height;
    const cw = level.chunkWidth;
    const cLen = level.chunks.length;
    for (const chunk of level.chunks) {
      if (!Array.isArray(chunk.map) || chunk.map.length !== h) {
        throw new Error(`Chunk ${chunk.id}: expected ${h} rows, got ${chunk.map ? chunk.map.length : "null"}`);
      }
      chunk.map.forEach((row, y) => {
        if (row.length !== cw) {
          throw new Error(`Chunk ${chunk.id} row ${y}: expected width ${cw}, got ${row.length}`);
        }
      });
    }

    const full = [];
    for (let y = 0; y < h; y += 1) {
      let row = "";
      for (let ci = 0; ci < cLen; ci += 1) row += level.chunks[ci].map[y];
      const expected = cw * cLen;
      if (row.length !== expected) {
        throw new Error(`Merged row ${y}: expected width ${expected}, got ${row.length}`);
      }
      full.push(row);
    }
    return full;
  }

  function loadLevel(rawLevel) {
    const mapRows = buildMapFromChunks(rawLevel);
    const height = rawLevel.height;
    const width = mapRows[0].length;
    const tiles = Array.from({ length: height }, () => Array(width));
    const markerPos = {};
    let spawn = null;
    let checkpoint = null;
    let goal = null;

    for (let ty = 0; ty < height; ty += 1) {
      for (let tx = 0; tx < width; tx += 1) {
        const ch = mapRows[ty][tx];
        const def = rawLevel.legend[ch] || rawLevel.legend["."];
        const tile = {
          ch,
          solid: !!def.solid,
          hazard: !!def.hazard,
          fake: !!def.fake,
          spawn: !!def.spawn,
          checkpoint: !!def.checkpoint,
          goal: !!def.goal,
          marker: def.marker || null
        };
        tiles[ty][tx] = tile;
        if (tile.spawn) spawn = { tx, ty };
        if (tile.checkpoint) checkpoint = { tx, ty };
        if (tile.goal) goal = { tx, ty };
        if (tile.marker) markerPos[tile.marker] = { tx, ty };
      }
    }

    if (!spawn) throw new Error("Level parse error: missing spawn(S)");
    if (!goal) throw new Error("Level parse error: missing goal(G)");

    return {
      id: rawLevel.id,
      name: rawLevel.name,
      width,
      height,
      worldW: width * TILE,
      worldH: height * TILE,
      rows: mapRows,
      tiles,
      spawn,
      checkpoint,
      goal,
      markerPos
    };
  }

  function getMarkerRect(markerPos, marker, markerRect) {
    const m = markerPos[marker];
    if (!m) return null;
    const baseX = m.tx * TILE;
    const baseY = m.ty * TILE;
    const r = markerRect || { ox: 0, oy: 0, w: TILE, h: TILE };
    return { x: baseX + (r.ox || 0), y: baseY + (r.oy || 0), w: r.w || TILE, h: r.h || TILE };
  }

  function rectHit(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const hudDeaths = document.getElementById("hudDeaths");
  const hudTime = document.getElementById("hudTime");
  const hudLevel = document.getElementById("hudLevel");
  const hudBest = document.getElementById("hudBest");
  const soundBtn = document.getElementById("soundBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayDesc = document.getElementById("overlayDesc");
  const overlayResume = document.getElementById("overlayResume");
  const overlayRestart = document.getElementById("overlayRestart");

  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;

  const level = loadLevel(LEVELS[0]);
  hudLevel.textContent = level.id;

  const state = {
    level,
    paused: false,
    debug: false,
    goalEnabled: false,
    cleared: false,
    checkpointReached: false,
    markerPos: level.markerPos,
    respawnTile: { ...level.spawn },
    deaths: Number(localStorage.getItem(LS_DEATHS) || 0),
    bestMs: Number(localStorage.getItem(LS_BEST) || 0),
    soundOn: localStorage.getItem(LS_SOUND) !== "0",
    attemptStartMs: performance.now(),
    runMs: 0,
    now: performance.now(),
    toasts: [],
    deathPending: false,
    deathAt: 0,
    jumpPressedAt: -9999,
    jumpHeld: false,
    coyoteUntil: 0,
    jumpBufferUntil: 0,
    reverseUntil: 0,
    joltUntil: 0,
    joltStrength: 0,
    input: { left: false, right: false, jump: false },
    scheduler: [],
    triggerStates: new Map(),
    tileOverrides: new Map(),
    spikes: [],
    fallingBlocks: [],
    fakeCollectibles: [],
    fakeGoals: [],
    invisibleBlocks: [],
    camera: { x: 0, y: 0 }
  };

  const player = {
    x: level.spawn.tx * TILE + 5,
    y: level.spawn.ty * TILE + (TILE - 30),
    w: 22,
    h: 30,
    vx: 0,
    vy: 0,
    onGround: false,
    lastGrounded: performance.now(),
    jumpHoldMs: 0,
    justLanded: false,
    landedTiles: []
  };

  hudDeaths.textContent = String(state.deaths);
  hudBest.textContent = state.bestMs > 0 ? `${(state.bestMs / 1000).toFixed(2)}s` : "-";
  soundBtn.textContent = `Sound: ${state.soundOn ? "ON" : "OFF"}`;

  function beep(freq, duration, type, volume = 0.05) {
    if (!state.soundOn) return;
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  let audioCtx = null;

  const SFX = {
    jump: () => beep(520, 0.08, "square", 0.04),
    death: () => { beep(160, 0.12, "sawtooth", 0.06); setTimeout(() => beep(90, 0.12, "triangle", 0.05), 60); },
    trap: () => beep(240, 0.06, "square", 0.04),
    clear: () => { beep(520, 0.09, "triangle", 0.05); setTimeout(() => beep(660, 0.1, "triangle", 0.05), 80); }
  };

  function showToast(text, durationMs = 1200) {
    state.toasts.push({ text, until: state.now + durationMs });
  }

  function getBaseTile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= level.width || ty >= level.height) return null;
    return level.tiles[ty][tx];
  }

  function getTileInfo(tx, ty) {
    const base = getBaseTile(tx, ty);
    if (!base) return { solid: true, hazard: false, fake: false };
    const ov = state.tileOverrides.get(key(tx, ty));
    if (!ov) return { solid: base.solid, hazard: base.hazard, fake: base.fake };
    return {
      solid: ov.solid ?? base.solid,
      hazard: ov.hazard ?? base.hazard,
      fake: ov.fake ?? base.fake,
      invisible: !!ov.invisible
    };
  }

  function rectIntersectsSolidTile(rect) {
    const minTx = Math.floor(rect.x / TILE);
    const maxTx = Math.floor((rect.x + rect.w - 1) / TILE);
    const minTy = Math.floor(rect.y / TILE);
    const maxTy = Math.floor((rect.y + rect.h - 1) / TILE);
    for (let ty = minTy; ty <= maxTy; ty += 1) {
      for (let tx = minTx; tx <= maxTx; tx += 1) {
        if (getTileInfo(tx, ty).solid) return true;
      }
    }
    for (const b of state.invisibleBlocks) {
      if (!b.active) continue;
      if (rectHit(rect, b)) return true;
    }
    for (const d of state.fallingBlocks) {
      if (!d.active) continue;
      if (rectHit(rect, d)) return true;
    }
    return false;
  }

  function collectGroundTiles(rect) {
    const y = rect.y + rect.h + 1;
    const minTx = Math.floor(rect.x / TILE);
    const maxTx = Math.floor((rect.x + rect.w - 1) / TILE);
    const ty = Math.floor(y / TILE);
    const out = [];
    for (let tx = minTx; tx <= maxTx; tx += 1) {
      if (getTileInfo(tx, ty).solid) out.push({ tx, ty });
    }
    return out;
  }

  function tryKill(reason) {
    if (state.deathPending || state.cleared) return;
    state.deathPending = true;
    state.deathAt = state.now;
    state.deaths += 1;
    localStorage.setItem(LS_DEATHS, String(state.deaths));
    hudDeaths.textContent = String(state.deaths);
    showToast(reason || "You died", 700);
    SFX.death();
    onDeathReset();
  }

  function setPlayerAtSpawn(tilePos) {
    player.x = tilePos.tx * TILE + 5;
    player.y = tilePos.ty * TILE + (TILE - player.h);
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;
    player.justLanded = false;
    state.attemptStartMs = state.now;
  }

  function fullRestart() {
    state.goalEnabled = false;
    state.cleared = false;
    state.deathPending = false;
    state.checkpointReached = false;
    state.respawnTile = { ...level.spawn };
    state.scheduler = [];
    state.tileOverrides.clear();
    state.spikes = [];
    state.fallingBlocks = [];
    state.fakeCollectibles = [];
    state.fakeGoals = [];
    state.invisibleBlocks = [];
    state.reverseUntil = 0;
    state.joltUntil = 0;
    state.toasts = [];
    for (const st of state.triggerStates.values()) {
      st.fired = false;
      st.inside = false;
      st.condPrev = false;
    }
    setPlayerAtSpawn(level.spawn);
    hideOverlay();
  }

  function onDeathReset() {
    const resettable = new Set();
    for (const t of level.triggers) {
      if (t.resetOnDeath && !t.once) resettable.add(t.id);
    }

    state.scheduler = state.scheduler.filter((e) => !resettable.has(e.triggerId));
    state.spikes = state.spikes.filter((e) => !(resettable.has(e.source) && !e.persistent));
    state.fallingBlocks = state.fallingBlocks.filter((e) => !(resettable.has(e.source) && !e.persistent));
    state.fakeCollectibles = state.fakeCollectibles.filter((e) => !(resettable.has(e.source) && !e.persistent));
    state.fakeGoals = state.fakeGoals.filter((e) => !(resettable.has(e.source) && !e.persistent));
    state.invisibleBlocks = state.invisibleBlocks.filter((e) => !(resettable.has(e.source) && !e.persistent));

    for (const [k, ov] of state.tileOverrides.entries()) {
      if (resettable.has(ov.source) && !ov.persistent) state.tileOverrides.delete(k);
    }

    for (const t of level.triggers) {
      const st = state.triggerStates.get(t.id);
      if (!st) continue;
      if (t.resetOnDeath && !t.once) {
        st.fired = false;
        st.inside = false;
        st.condPrev = false;
      }
    }
  }

  function applyAction(trigger, action, params) {
    const persistent = !!trigger.once;
    const source = trigger.id;

    switch (action) {
      case "spawnSpikes": {
        const p = params || {};
        const len = p.length || 1;
        const at = p.at || { tx: 0, ty: 0 };
        const pop = clamp(p.popDelayMs || 0, 0, 220);
        for (let i = 0; i < len; i += 1) {
          const tx = at.tx + (p.dir === "left" || p.dir === "right" ? 0 : i);
          const ty = at.ty + (p.dir === "left" || p.dir === "right" ? i : 0);
          state.spikes.push({
            x: tx * TILE,
            y: ty * TILE,
            w: TILE,
            h: TILE,
            dir: p.dir || "up",
            activeAt: state.now + pop,
            source,
            persistent
          });
        }
        SFX.trap();
        break;
      }
      case "collapseTiles": {
        const delay = clamp(params.delayMs || 0, 0, 500);
        const tiles = params.tiles || [];
        state.scheduler.push({
          at: state.now + delay,
          triggerId: source,
          persistent,
          action: "__collapseCommit",
          params: { tiles }
        });
        break;
      }
      case "__collapseCommit": {
        const tiles = params.tiles || [];
        for (const t of tiles) {
          state.tileOverrides.set(key(t.tx, t.ty), { solid: false, hazard: false, source, persistent });
        }
        SFX.trap();
        break;
      }
      case "dropBlock": {
        const from = params.from || { tx: 0, ty: 0 };
        const size = params.size || { w: 1, h: 1 };
        state.fallingBlocks.push({
          x: from.tx * TILE,
          y: from.ty * TILE,
          w: size.w * TILE,
          h: size.h * TILE,
          vx: 0,
          vy: 0,
          lethal: params.lethal !== false,
          stopOnGround: params.stopOnGround !== false,
          active: true,
          source,
          persistent
        });
        SFX.trap();
        break;
      }
      case "toggleWall": {
        const solid = params.solid !== false;
        for (const t of params.tiles || []) {
          state.tileOverrides.set(key(t.tx, t.ty), { solid, hazard: false, source, persistent });
        }
        SFX.trap();
        break;
      }
      case "fakeCollectible": {
        const at = params.at;
        state.fakeCollectibles.push({
          x: at.tx * TILE + TILE / 2,
          y: at.ty * TILE + TILE / 2,
          r: params.radiusPx || 12,
          source,
          persistent,
          active: true
        });
        SFX.trap();
        break;
      }
      case "fakeGoal": {
        const at = params.at;
        state.fakeGoals.push({
          x: at.tx * TILE,
          y: at.ty * TILE,
          w: TILE,
          h: TILE,
          message: params.message || "lol",
          lethal: params.lethal !== false,
          source,
          persistent,
          active: true
        });
        break;
      }
      case "enableGoal": {
        state.goalEnabled = !!params.enabled;
        showToast(state.goalEnabled ? "Goal unlocked" : "Goal locked", 900);
        SFX.trap();
        break;
      }
      case "reverseControls": {
        const dur = clamp(params.durationMs || 700, 100, 900);
        state.reverseUntil = Math.max(state.reverseUntil, state.now + dur);
        showToast("Controls reversed", 700);
        SFX.trap();
        break;
      }
      case "cameraJolt": {
        state.joltStrength = params.strength === "small" ? 6 : 10;
        state.joltUntil = state.now + (params.durationMs || 140);
        break;
      }
      case "showToast": {
        showToast(params.text || "trap", params.durationMs || 1000);
        break;
      }
      case "invisibleBlock": {
        const at = params.at;
        state.invisibleBlocks.push({
          x: at.tx * TILE,
          y: at.ty * TILE,
          w: (params.w || 1) * TILE,
          h: (params.h || 1) * TILE,
          active: true,
          source,
          persistent
        });
        break;
      }
      default:
        console.warn("Unknown action", action, params);
    }
  }

  function queueTrigger(trigger) {
    const st = state.triggerStates.get(trigger.id);
    if (trigger.once && st.fired) return;

    st.fired = true;
    for (const step of trigger.script || []) {
      state.scheduler.push({
        at: state.now + (step.t || 0),
        triggerId: trigger.id,
        persistent: !!trigger.once,
        action: step.action,
        params: step.params || {}
      });
    }
  }

  function evaluateCondition(trigger) {
    switch (trigger.condition) {
      case "playerTxGte":
        return Math.floor((player.x + player.w * 0.5) / TILE) >= trigger.conditionValue;
      case "playerYlt":
        return player.y < trigger.conditionValue;
      case "checkpointReached":
        return state.checkpointReached;
      default:
        return false;
    }
  }

  function updateTriggers() {
    const pRect = { x: player.x, y: player.y, w: player.w, h: player.h };

    for (const trigger of level.triggers) {
      const st = state.triggerStates.get(trigger.id);
      if (trigger.once && st.fired) continue;

      if (trigger.kind === "zone") {
        let rect = trigger.rect;
        if (!rect && trigger.marker) rect = getMarkerRect(state.markerPos, trigger.marker, trigger.markerRect);
        if (!rect) continue;
        const inside = rectHit(pRect, rect);
        if (inside && !st.inside) queueTrigger(trigger);
        st.inside = inside;
      } else if (trigger.kind === "step") {
        if (!player.justLanded) continue;
        let tiles = trigger.stepTiles;
        if ((!tiles || tiles.length === 0) && trigger.stepMarker) {
          const m = state.markerPos[trigger.stepMarker];
          if (m) {
            const found = findNearestSolidBelow(m.tx, m.ty);
            if (found) {
              tiles = [found];
              trigger.stepTiles = tiles;
            }
          }
        }
        if (!tiles) continue;
        let hit = false;
        for (const lt of player.landedTiles) {
          if (tiles.some((t) => t.tx === lt.tx && t.ty === lt.ty)) {
            hit = true;
            break;
          }
        }
        if (hit) queueTrigger(trigger);
      } else if (trigger.kind === "condition") {
        const cur = evaluateCondition(trigger);
        if (cur && !st.condPrev) queueTrigger(trigger);
        st.condPrev = cur;
      }
    }
  }

  function processScheduler() {
    if (state.scheduler.length === 0) return;
    state.scheduler.sort((a, b) => a.at - b.at);
    while (state.scheduler.length && state.scheduler[0].at <= state.now) {
      const e = state.scheduler.shift();
      const trigger = level.triggers.find((t) => t.id === e.triggerId) || { id: e.triggerId, once: e.persistent };
      applyAction(trigger, e.action, e.params);
    }
  }

  function findNearestSolidBelow(tx, ty) {
    for (let y = ty + 1; y < level.height; y += 1) {
      if (getTileInfo(tx, y).solid) return { tx, ty: y };
    }
    return null;
  }

  function resolveHorizontal(dt) {
    const nextX = player.x + player.vx * dt;
    const test = { x: nextX, y: player.y, w: player.w, h: player.h };
    if (!rectIntersectsSolidTile(test)) {
      player.x = nextX;
      return;
    }

    const dir = Math.sign(player.vx);
    if (dir > 0) {
      const tx = Math.floor((test.x + test.w - 1) / TILE);
      player.x = tx * TILE - player.w;
    } else if (dir < 0) {
      const tx = Math.floor(test.x / TILE);
      player.x = (tx + 1) * TILE;
    }
    player.vx = 0;
  }

  function resolveVertical(dt) {
    player.justLanded = false;
    player.landedTiles = [];

    const nextY = player.y + player.vy * dt;
    const test = { x: player.x, y: nextY, w: player.w, h: player.h };
    if (!rectIntersectsSolidTile(test)) {
      player.y = nextY;
      player.onGround = false;
      return;
    }

    if (player.vy > 0) {
      const ty = Math.floor((test.y + test.h - 1) / TILE);
      player.y = ty * TILE - player.h;
      player.vy = 0;
      if (!player.onGround) {
        player.justLanded = true;
        player.landedTiles = collectGroundTiles(player);
      }
      player.onGround = true;
      player.lastGrounded = state.now;
      state.coyoteUntil = state.now + COYOTE_MS;
      return;
    }

    if (player.vy < 0) {
      const ty = Math.floor(test.y / TILE);
      player.y = (ty + 1) * TILE;
      player.vy = 0;
      return;
    }
  }

  function isHazardTouchingPlayer() {
    const rect = { x: player.x, y: player.y, w: player.w, h: player.h };

    const minTx = Math.floor(rect.x / TILE);
    const maxTx = Math.floor((rect.x + rect.w - 1) / TILE);
    const minTy = Math.floor(rect.y / TILE);
    const maxTy = Math.floor((rect.y + rect.h - 1) / TILE);
    for (let ty = minTy; ty <= maxTy; ty += 1) {
      for (let tx = minTx; tx <= maxTx; tx += 1) {
        if (getTileInfo(tx, ty).hazard) return true;
      }
    }

    for (const sp of state.spikes) {
      if (state.now < sp.activeAt) continue;
      if (rectHit(rect, sp)) return true;
    }

    for (const fb of state.fallingBlocks) {
      if (!fb.active || !fb.lethal) continue;
      if (rectHit(rect, fb)) return true;
    }

    for (const c of state.fakeCollectibles) {
      if (!c.active) continue;
      const cx = clamp(player.x + player.w * 0.5, c.x - c.r, c.x + c.r);
      const cy = clamp(player.y + player.h * 0.5, c.y - c.r, c.y + c.r);
      const dx = cx - c.x;
      const dy = cy - c.y;
      if ((dx * dx + dy * dy) <= c.r * c.r) return true;
    }

    for (const fg of state.fakeGoals) {
      if (fg.active && rectHit(rect, fg)) {
        if (fg.message) showToast(fg.message, 700);
        return fg.lethal;
      }
    }

    if (player.y > level.worldH + 120) return true;
    return false;
  }

  function updateFallingBlocks(dt) {
    for (const b of state.fallingBlocks) {
      if (!b.active) continue;
      b.vy += 2300 * dt;
      const ny = b.y + b.vy * dt;
      const test = { x: b.x, y: ny, w: b.w, h: b.h };
      if (b.stopOnGround && rectIntersectsSolidTile(test)) {
        b.vy = 0;
      } else {
        b.y = ny;
      }
    }
  }

  function updateCheckpointAndGoal() {
    const centerTx = Math.floor((player.x + player.w * 0.5) / TILE);
    const footTy = Math.floor((player.y + player.h * 0.8) / TILE);
    const t = getBaseTile(centerTx, footTy);
    if (t && t.checkpoint && !state.checkpointReached) {
      state.checkpointReached = true;
      state.respawnTile = { tx: centerTx, ty: footTy };
      showToast("Checkpoint saved", 900);
      const st = state.triggerStates.get("TRAP_15");
      if (st && !st.fired) queueTrigger(level.triggers.find((tr) => tr.id === "TRAP_15"));
    }

    if (state.goalEnabled) {
      const gx = level.goal.tx * TILE;
      const gy = level.goal.ty * TILE;
      if (rectHit({ x: player.x, y: player.y, w: player.w, h: player.h }, { x: gx, y: gy, w: TILE, h: TILE })) {
        clearLevel();
      }
    }
  }

  function clearLevel() {
    if (state.cleared) return;
    state.cleared = true;
    const clearMs = state.runMs;
    if (clearMs > 0 && (!state.bestMs || clearMs < state.bestMs)) {
      state.bestMs = clearMs;
      localStorage.setItem(LS_BEST, String(Math.floor(clearMs)));
      hudBest.textContent = `${(state.bestMs / 1000).toFixed(2)}s`;
    }
    SFX.clear();
    showOverlay("CLEARED!", "R to retry / Next (locked)");
  }

  function updatePlayer(dt) {
    let dir = 0;
    if (state.input.left) dir -= 1;
    if (state.input.right) dir += 1;

    const reversed = state.now < state.reverseUntil;
    if (reversed) dir *= -1;

    const maxSpeed = 240;
    const acc = player.onGround ? 2000 : 1450;
    const drag = player.onGround ? 2500 : 1200;
    const target = dir * maxSpeed;

    if (Math.abs(target - player.vx) < 1) player.vx = target;
    else {
      const a = target === 0 ? drag : acc;
      if (player.vx < target) player.vx = Math.min(target, player.vx + a * dt);
      if (player.vx > target) player.vx = Math.max(target, player.vx - a * dt);
    }

    if (player.onGround) state.coyoteUntil = state.now + COYOTE_MS;

    if (state.input.jump) {
      state.jumpBufferUntil = state.now + JUMP_BUFFER_MS;
      if (!state.jumpHeld) {
        state.jumpHeld = true;
        player.jumpHoldMs = 0;
      }
    } else {
      state.jumpHeld = false;
      player.jumpHoldMs = 999;
    }

    const canJump = state.now <= state.coyoteUntil;
    if (state.now <= state.jumpBufferUntil && canJump && !state.deathPending) {
      player.vy = -610;
      player.onGround = false;
      state.jumpBufferUntil = -1;
      state.coyoteUntil = -1;
      player.jumpHoldMs = 0;
      SFX.jump();
    }

    if (state.input.jump && player.vy < 0 && player.jumpHoldMs < 170) {
      player.vy -= 850 * dt;
      player.jumpHoldMs += dt * 1000;
    }

    player.vy += 1850 * dt;
    if (player.vy > 1100) player.vy = 1100;

    resolveHorizontal(dt);
    resolveVertical(dt);
  }

  function updateCamera(dt) {
    const cx = player.x + player.w * 0.5 - CANVAS_W * 0.5;
    const cy = player.y + player.h * 0.5 - CANVAS_H * 0.5;
    const targetX = clamp(cx, 0, level.worldW - CANVAS_W);
    const targetY = clamp(cy, 0, level.worldH - CANVAS_H);
    state.camera.x += (targetX - state.camera.x) * (1 - Math.exp(-8 * dt));
    state.camera.y += (targetY - state.camera.y) * (1 - Math.exp(-8 * dt));
  }

  function showOverlay(title, desc) {
    overlayTitle.textContent = title;
    overlayDesc.textContent = desc;
    overlay.classList.remove("hidden");
  }

  function hideOverlay() {
    overlay.classList.add("hidden");
  }

  function setPaused(v) {
    if (state.cleared) return;
    state.paused = v;
    if (v) showOverlay("Paused", "Esc 또는 Pause 버튼으로 재개");
    else hideOverlay();
  }

  function drawTile(tx, ty, tileInfo, baseCh) {
    const x = tx * TILE;
    const y = ty * TILE;

    if (tileInfo.solid) {
      if (tileInfo.hazard || baseCh === "^") {
        ctx.fillStyle = "#3a0f16";
      } else {
        ctx.fillStyle = baseCh === "=" ? "#2f3f67" : "#1d2946";
      }
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);

      if (tileInfo.hazard || baseCh === "^") {
        ctx.fillStyle = "#ff5e6a";
        ctx.beginPath();
        ctx.moveTo(x + 4, y + TILE - 4);
        ctx.lineTo(x + TILE * 0.5, y + 5);
        ctx.lineTo(x + TILE - 4, y + TILE - 4);
        ctx.closePath();
        ctx.fill();
      }
    } else if (baseCh === "~") {
      ctx.fillStyle = "rgba(120, 170, 255, 0.2)";
      ctx.fillRect(x + 6, y + TILE * 0.5, TILE - 12, 8);
    }

    if (baseCh === "G") {
      ctx.fillStyle = state.goalEnabled ? "#67ffaf" : "#444f68";
      ctx.fillRect(x + 6, y + 5, TILE - 12, TILE - 10);
    }
    if (baseCh === "C") {
      ctx.fillStyle = state.checkpointReached ? "#69f0ff" : "#3e8ea0";
      ctx.fillRect(x + 9, y + 7, TILE - 18, TILE - 14);
    }
  }

  function drawPlayer() {
    const x = player.x;
    const y = player.y;
    ctx.fillStyle = "#ffcf79";
    ctx.fillRect(x, y + 6, player.w, player.h - 6);
    ctx.fillStyle = "#ffbb54";
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 8);
    ctx.lineTo(x + 8, y);
    ctx.lineTo(x + 11, y + 8);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + player.w - 4, y + 8);
    ctx.lineTo(x + player.w - 8, y);
    ctx.lineTo(x + player.w - 11, y + 8);
    ctx.fill();
    ctx.fillStyle = "#222";
    ctx.fillRect(x + 5, y + 14, 3, 3);
    ctx.fillRect(x + player.w - 8, y + 14, 3, 3);
  }

  function render() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.fillStyle = "#081125";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    let shakeX = 0;
    let shakeY = 0;
    if (state.now < state.joltUntil) {
      const t = (state.joltUntil - state.now) / 160;
      const amp = state.joltStrength * t;
      shakeX = (Math.random() * 2 - 1) * amp;
      shakeY = (Math.random() * 2 - 1) * amp;
    }

    ctx.save();
    ctx.translate(-state.camera.x + shakeX, -state.camera.y + shakeY);

    const minTx = Math.max(0, Math.floor(state.camera.x / TILE) - 2);
    const maxTx = Math.min(level.width - 1, Math.floor((state.camera.x + CANVAS_W) / TILE) + 2);
    const minTy = Math.max(0, Math.floor(state.camera.y / TILE) - 2);
    const maxTy = Math.min(level.height - 1, Math.floor((state.camera.y + CANVAS_H) / TILE) + 2);

    for (let ty = minTy; ty <= maxTy; ty += 1) {
      for (let tx = minTx; tx <= maxTx; tx += 1) {
        const base = getBaseTile(tx, ty);
        const info = getTileInfo(tx, ty);
        drawTile(tx, ty, info, base.ch);
      }
    }

    for (const sp of state.spikes) {
      if (state.now < sp.activeAt) continue;
      ctx.fillStyle = "#ff5e6a";
      ctx.beginPath();
      if (sp.dir === "up") {
        ctx.moveTo(sp.x + 3, sp.y + TILE - 3);
        ctx.lineTo(sp.x + TILE * 0.5, sp.y + 3);
        ctx.lineTo(sp.x + TILE - 3, sp.y + TILE - 3);
      } else if (sp.dir === "down") {
        ctx.moveTo(sp.x + 3, sp.y + 3);
        ctx.lineTo(sp.x + TILE * 0.5, sp.y + TILE - 3);
        ctx.lineTo(sp.x + TILE - 3, sp.y + 3);
      } else if (sp.dir === "left") {
        ctx.moveTo(sp.x + TILE - 3, sp.y + 3);
        ctx.lineTo(sp.x + 3, sp.y + TILE * 0.5);
        ctx.lineTo(sp.x + TILE - 3, sp.y + TILE - 3);
      } else {
        ctx.moveTo(sp.x + 3, sp.y + 3);
        ctx.lineTo(sp.x + TILE - 3, sp.y + TILE * 0.5);
        ctx.lineTo(sp.x + 3, sp.y + TILE - 3);
      }
      ctx.closePath();
      ctx.fill();
    }

    for (const b of state.fallingBlocks) {
      if (!b.active) continue;
      ctx.fillStyle = "#6f86c8";
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
    }

    for (const c of state.fakeCollectibles) {
      if (!c.active) continue;
      ctx.fillStyle = "#ffd866";
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const fg of state.fakeGoals) {
      if (!fg.active) continue;
      ctx.fillStyle = "#ff8a8a";
      ctx.fillRect(fg.x + 6, fg.y + 5, fg.w - 12, fg.h - 10);
    }

    drawPlayer();

    if (state.debug) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#65f2ff";
      ctx.strokeRect(player.x + 0.5, player.y + 0.5, player.w - 1, player.h - 1);

      for (let ty = minTy; ty <= maxTy; ty += 1) {
        for (let tx = minTx; tx <= maxTx; tx += 1) {
          const info = getTileInfo(tx, ty);
          const x = tx * TILE;
          const y = ty * TILE;
          if (info.solid) {
            ctx.strokeStyle = "rgba(120,200,255,0.3)";
            ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
          }
          if (info.hazard) {
            ctx.fillStyle = "rgba(255,70,70,0.22)";
            ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
          }
          if (info.fake) {
            ctx.strokeStyle = "rgba(255,255,255,0.35)";
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
            ctx.setLineDash([]);
          }
        }
      }

      ctx.fillStyle = "#7fffae";
      ctx.font = "12px Pretendard, sans-serif";
      for (const [id, pos] of Object.entries(state.markerPos)) {
        ctx.fillText(id, pos.tx * TILE + 10, pos.ty * TILE + 14);
      }

      for (const trig of level.triggers) {
        let r = trig.rect;
        if (!r && trig.marker) r = getMarkerRect(state.markerPos, trig.marker, trig.markerRect);
        if (!r) continue;
        ctx.strokeStyle = "rgba(255, 220, 120, 0.7)";
        ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
        ctx.fillStyle = "rgba(255, 220, 120, 0.9)";
        ctx.fillText(trig.id, r.x + 2, r.y + 12);
      }

      for (const ib of state.invisibleBlocks) {
        ctx.strokeStyle = "rgba(255, 120, 255, 0.75)";
        ctx.strokeRect(ib.x + 0.5, ib.y + 0.5, ib.w - 1, ib.h - 1);
      }
    }

    ctx.restore();

    state.toasts = state.toasts.filter((t) => t.until > state.now);
    if (state.toasts.length) {
      const t = state.toasts[0];
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(20, 20, Math.max(220, t.text.length * 12), 34);
      ctx.fillStyle = "#fff";
      ctx.font = "18px Pretendard, sans-serif";
      ctx.fillText(t.text, 30, 43);
    }
  }

  function updateHud() {
    if (!state.paused) {
      state.runMs = state.now - state.attemptStartMs;
    }
    hudTime.textContent = (Math.max(0, state.runMs) / 1000).toFixed(2);
    hudBest.textContent = state.bestMs > 0 ? `${(state.bestMs / 1000).toFixed(2)}s` : "-";
  }

  function tick(ts) {
    const prev = state.now;
    state.now = ts;
    let dt = (ts - prev) / 1000;
    dt = clamp(dt, 0, 0.033);

    if (state.paused) {
      render();
      requestAnimationFrame(tick);
      return;
    }

    if (state.deathPending) {
      if (state.now - state.deathAt >= RESPAWN_DELAY_MS) {
        state.deathPending = false;
        setPlayerAtSpawn(state.respawnTile);
      }
      updateCamera(dt);
      updateHud();
      render();
      requestAnimationFrame(tick);
      return;
    }

    if (!state.cleared) {
      updatePlayer(dt);
      updateFallingBlocks(dt);
      updateCheckpointAndGoal();
      updateTriggers();
      processScheduler();

      if (isHazardTouchingPlayer()) {
        tryKill("Oops");
      }
    }

    updateCamera(dt);
    updateHud();
    render();
    requestAnimationFrame(tick);
  }

  function triggerAtMarker(id, marker, markerRect, script, extra = {}) {
    return {
      id,
      kind: "zone",
      marker,
      markerRect,
      once: !!extra.once,
      resetOnDeath: extra.resetOnDeath !== false,
      script
    };
  }

  function zoneAtTx(id, tx, script) {
    return {
      id,
      kind: "zone",
      once: false,
      resetOnDeath: true,
      rect: { x: tx * TILE, y: 0, w: TILE, h: level.worldH },
      script
    };
  }

  function m(id) {
    const p = state.markerPos[id];
    return p ? { tx: p.tx, ty: p.ty } : { tx: 0, ty: 0 };
  }

  function buildTriggers() {
    const goalTx = level.goal.tx;
    return [
      triggerAtMarker("TRAP_01", "1", { ox: -20, oy: -16, w: 90, h: 72 }, [
        { t: 0, action: "showToast", params: { text: "첫 함정" } },
        { t: 0, action: "spawnSpikes", params: { at: { tx: m("1").tx + 1, ty: 14 }, dir: "up", length: 3, popDelayMs: 120 } }
      ]),
      {
        id: "TRAP_02",
        kind: "step",
        stepMarker: "2",
        once: false,
        resetOnDeath: true,
        script: [
          { t: 280, action: "collapseTiles", params: { delayMs: 0, tiles: [
            { tx: m("2").tx - 2, ty: 13 },
            { tx: m("2").tx - 1, ty: 13 },
            { tx: m("2").tx, ty: 13 },
            { tx: m("2").tx + 1, ty: 13 }
          ] } }
        ]
      },
      triggerAtMarker("TRAP_03", "3", { ox: -20, oy: -20, w: 96, h: 84 }, [
        { t: 120, action: "dropBlock", params: { from: { tx: m("3").tx + 1, ty: 3 }, size: { w: 1, h: 1 }, lethal: true, stopOnGround: true } }
      ]),
      triggerAtMarker("TRAP_04", "4", { ox: -8, oy: -8, w: 60, h: 56 }, [
        { t: 0, action: "fakeCollectible", params: { at: { tx: m("4").tx + 1, ty: m("4").ty - 1 }, radiusPx: 12 } }
      ], { once: true, resetOnDeath: false }),
      triggerAtMarker("TRAP_05", "5", { ox: -12, oy: -10, w: 60, h: 80 }, [
        { t: 0, action: "toggleWall", params: { solid: true, tiles: [
          { tx: m("5").tx + 3, ty: 13 },
          { tx: m("5").tx + 3, ty: 12 },
          { tx: m("5").tx + 3, ty: 11 }
        ] } },
        { t: 0, action: "showToast", params: { text: "길이 바뀌었다" } }
      ], { once: true, resetOnDeath: false }),
      triggerAtMarker("TRAP_06", "6", { ox: -14, oy: -12, w: 72, h: 72 }, [
        { t: 0, action: "reverseControls", params: { durationMs: 860 } }
      ]),
      triggerAtMarker("TRAP_07", "7", { ox: -6, oy: -8, w: 56, h: 56 }, [
        { t: 0, action: "fakeGoal", params: { at: { tx: m("7").tx + 1, ty: m("7").ty - 1 }, message: "ㅋㅋ", lethal: true } }
      ], { once: true, resetOnDeath: false }),
      triggerAtMarker("TRAP_08", "8", { ox: -8, oy: -12, w: 64, h: 72 }, [
        { t: 0, action: "enableGoal", params: { enabled: true } },
        { t: 0, action: "showToast", params: { text: "진짜 골인 활성화" } }
      ], { once: true, resetOnDeath: false }),
      triggerAtMarker("TRAP_09", "9", { ox: -16, oy: -12, w: 72, h: 72 }, [
        { t: 0, action: "cameraJolt", params: { strength: "small", durationMs: 180 } },
        { t: 120, action: "collapseTiles", params: { delayMs: 0, tiles: [
          { tx: level.goal.tx - 2, ty: level.goal.ty + 1 },
          { tx: level.goal.tx - 1, ty: level.goal.ty + 1 }
        ] } },
        { t: 160, action: "dropBlock", params: { from: { tx: level.goal.tx - 1, ty: level.goal.ty - 3 }, size: { w: 1, h: 1 }, lethal: true, stopOnGround: true } }
      ]),
      {
        id: "TRAP_10",
        kind: "condition",
        condition: "playerTxGte",
        conditionValue: goalTx - 6,
        once: false,
        resetOnDeath: true,
        script: [
          { t: 0, action: "spawnSpikes", params: { at: { tx: goalTx - 4, ty: level.goal.ty + 1 }, dir: "up", length: 3, popDelayMs: 0 } }
        ]
      },
      triggerAtMarker("TRAP_11", "1", { ox: 80, oy: -120, w: 110, h: 80 }, [
        { t: 0, action: "spawnSpikes", params: { at: { tx: m("1").tx + 3, ty: m("1").ty - 3 }, dir: "down", length: 2, popDelayMs: 40 } }
      ]),
      triggerAtMarker("TRAP_12", "3", { ox: 14, oy: -60, w: 88, h: 56 }, [
        { t: 0, action: "invisibleBlock", params: { at: { tx: m("3").tx + 2, ty: m("3").ty - 2 }, w: 1, h: 1 } }
      ]),
      triggerAtMarker("TRAP_13", "4", { ox: -26, oy: -30, w: 130, h: 72 }, [
        { t: 150, action: "spawnSpikes", params: { at: { tx: m("4").tx - 1, ty: 13 }, dir: "up", length: 2, popDelayMs: 0 } }
      ]),
      triggerAtMarker("TRAP_14", "5", { ox: 72, oy: -12, w: 90, h: 72 }, [
        { t: 0, action: "toggleWall", params: { solid: true, tiles: [
          { tx: m("5").tx + 5, ty: 10 },
          { tx: m("5").tx + 6, ty: 10 }
        ] } },
        { t: 80, action: "spawnSpikes", params: { at: { tx: m("5").tx + 5, ty: 9 }, dir: "down", length: 2, popDelayMs: 0 } }
      ]),
      {
        id: "TRAP_15",
        kind: "condition",
        condition: "checkpointReached",
        once: true,
        resetOnDeath: false,
        script: [
          { t: 0, action: "showToast", params: { text: "체크포인트 저장", durationMs: 1000 } }
        ]
      },

      zoneAtTx("TRAP_16", 18, [
        { t: 0, action: "spawnSpikes", params: { at: { tx: 20, ty: 14 }, dir: "up", length: 2, popDelayMs: 80 } }
      ]),
      zoneAtTx("TRAP_17", 35, [
        { t: 110, action: "dropBlock", params: { from: { tx: 36, ty: 4 }, size: { w: 1, h: 1 }, lethal: true, stopOnGround: true } }
      ]),
      zoneAtTx("TRAP_18", 52, [
        { t: 0, action: "collapseTiles", params: { delayMs: 120, tiles: [{ tx: 53, ty: 13 }, { tx: 54, ty: 13 }] } }
      ]),
      zoneAtTx("TRAP_19", 78, [
        { t: 0, action: "reverseControls", params: { durationMs: 520 } }
      ]),
      zoneAtTx("TRAP_20", 96, [
        { t: 0, action: "spawnSpikes", params: { at: { tx: 98, ty: 14 }, dir: "up", length: 3, popDelayMs: 120 } }
      ]),
      zoneAtTx("TRAP_21", 128, [
        { t: 100, action: "dropBlock", params: { from: { tx: 128, ty: 2 }, size: { w: 1, h: 2 }, lethal: true, stopOnGround: true } }
      ]),
      zoneAtTx("TRAP_22", 150, [
        { t: 0, action: "cameraJolt", params: { strength: "small", durationMs: 140 } },
        { t: 110, action: "collapseTiles", params: { delayMs: 0, tiles: [{ tx: 151, ty: 13 }, { tx: 152, ty: 13 }] } }
      ]),
      zoneAtTx("TRAP_23", 176, [
        { t: 0, action: "spawnSpikes", params: { at: { tx: 176, ty: 10 }, dir: "down", length: 2, popDelayMs: 80 } }
      ]),
      zoneAtTx("TRAP_24", 205, [
        { t: 0, action: "toggleWall", params: { solid: true, tiles: [{ tx: 207, ty: 12 }, { tx: 207, ty: 13 }] } }
      ]),
      zoneAtTx("TRAP_25", 232, [
        { t: 0, action: "fakeCollectible", params: { at: { tx: 233, ty: 12 }, radiusPx: 11 } }
      ]),
      zoneAtTx("TRAP_26", 260, [
        { t: 90, action: "spawnSpikes", params: { at: { tx: 261, ty: 14 }, dir: "up", length: 2, popDelayMs: 0 } }
      ]),
      zoneAtTx("TRAP_27", 284, [
        { t: 0, action: "dropBlock", params: { from: { tx: 286, ty: 4 }, size: { w: 1, h: 1 }, lethal: true, stopOnGround: true } }
      ])
    ];
  }

  level.triggers = buildTriggers();
  for (const tr of level.triggers) {
    state.triggerStates.set(tr.id, { fired: false, inside: false, condPrev: false });
  }

  const keyMap = {
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    ArrowUp: "jump",
    KeyW: "jump",
    Space: "jump"
  };

  window.addEventListener("keydown", (e) => {
    if (e.repeat && (e.code === "KeyR" || e.code === "Escape" || e.code === "KeyD")) return;

    if (e.code === "KeyD") {
      if (e.shiftKey) {
        state.debug = !state.debug;
        showToast(`Debug ${state.debug ? "ON" : "OFF"}`, 700);
      } else {
        state.input.right = true;
      }
      e.preventDefault();
      return;
    }

    if (e.code in keyMap) {
      state.input[keyMap[e.code]] = true;
      e.preventDefault();
    }

    if (e.code === "KeyR") {
      fullRestart();
      e.preventDefault();
    }
    if (e.code === "Escape") {
      setPaused(!state.paused);
      e.preventDefault();
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "KeyD") {
      state.input.right = false;
      e.preventDefault();
      return;
    }
    if (e.code in keyMap) {
      state.input[keyMap[e.code]] = false;
      e.preventDefault();
    }
  });

  function bindTouchButton(btn, inputName) {
    const on = (ev) => {
      ev.preventDefault();
      state.input[inputName] = true;
    };
    const off = (ev) => {
      ev.preventDefault();
      state.input[inputName] = false;
    };
    btn.addEventListener("pointerdown", on);
    btn.addEventListener("pointerup", off);
    btn.addEventListener("pointercancel", off);
    btn.addEventListener("pointerleave", off);
  }

  document.querySelectorAll("[data-touch]").forEach((btn) => {
    bindTouchButton(btn, btn.dataset.touch);
  });

  soundBtn.addEventListener("click", () => {
    state.soundOn = !state.soundOn;
    localStorage.setItem(LS_SOUND, state.soundOn ? "1" : "0");
    soundBtn.textContent = `Sound: ${state.soundOn ? "ON" : "OFF"}`;
    if (state.soundOn) SFX.jump();
  });

  pauseBtn.addEventListener("click", () => setPaused(!state.paused));
  overlayResume.addEventListener("click", () => setPaused(false));
  overlayRestart.addEventListener("click", () => fullRestart());

  requestAnimationFrame((t) => {
    state.now = t;
    state.attemptStartMs = t;
    requestAnimationFrame(tick);
  });
})();
