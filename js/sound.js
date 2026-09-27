/* ケロちゃん ぴよぴよポン — sound effects and music, synthesised with Web Audio
   (no audio files, so the game stays tiny and works offline). */
var Sound = (function () {
  'use strict';
  var ac = null, master, sfxBus, musicBus, noiseBuf;
  var on = { sfx: true, music: true };
  var MUSIC_VOL = 0.2;

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
    sfxBus = ac.createGain(); sfxBus.gain.value = on.sfx ? 0.8 : 0; sfxBus.connect(master);
    musicBus = ac.createGain(); musicBus.gain.value = on.music ? MUSIC_VOL : 0; musicBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    if (music.want) startMusic();
  }

  function ready() { return ac && ac.state === 'running'; }

  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  // o: { f, f2, type, vol, a, d, when, bus, at }
  function tone(o) {
    if (!ac) return;
    var t = (o.at || ac.currentTime) + (o.when || 0), a = o.a || 0.008, d = o.d || 0.2;
    var osc = ac.createOscillator(), g = ac.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + a + d);
    env(g, t, a, o.vol || 0.3, d);
    osc.connect(g); g.connect(o.bus || sfxBus);
    osc.start(t); osc.stop(t + a + d + 0.05);
  }

  // o: { type, f, f2, q, vol, a, d, when, bus, at }
  function noise(o) {
    if (!ac) return;
    var t = (o.at || ac.currentTime) + (o.when || 0), a = o.a || 0.004, d = o.d || 0.1;
    var src = ac.createBufferSource(); src.buffer = noiseBuf;
    var flt = ac.createBiquadFilter(); flt.type = o.type || 'bandpass';
    flt.frequency.setValueAtTime(o.f || 1000, t);
    if (o.f2) flt.frequency.exponentialRampToValueAtTime(o.f2, t + a + d);
    flt.Q.value = o.q || 1;
    var g = ac.createGain(); env(g, t, a, o.vol || 0.3, d);
    src.connect(flt); flt.connect(g); g.connect(o.bus || sfxBus);
    src.start(t, Math.random() * 0.5); src.stop(t + a + d + 0.05);
  }

  function semi(f, n) { return f * Math.pow(2, n / 12); }

  // "ぴよっ": a quick chirp up and down
  function peep(f, vol, when) {
    tone({ f: f, f2: f * 1.4, type: 'sine', vol: vol, d: 0.05, when: when });
    tone({ f: f * 1.4, f2: f * 1.15, type: 'sine', vol: vol * 0.8, d: 0.06, when: (when || 0) + 0.055 });
  }

  var fx = {
    shoot: function () {
      tone({ f: 300, f2: 820, type: 'sine', vol: 0.24, d: 0.12 });
      noise({ type: 'bandpass', f: 1300, q: 1.5, vol: 0.12, d: 0.06 });
    },
    bounce: function () { tone({ f: 1300, f2: 950, type: 'triangle', vol: 0.08, d: 0.05 }); },
    stick: function () {
      tone({ f: 560, f2: 340, type: 'triangle', vol: 0.15, d: 0.07 });
      noise({ type: 'lowpass', f: 900, vol: 0.18, d: 0.05 });
    },
    // one egg hatching; i = its place in the wave, so a big group sounds like a rising chorus
    crack: function (i) {
      noise({ type: 'highpass', f: 3200, vol: 0.18, d: 0.035 });
      peep(semi(1500, Math.min(14, i * 1.4)), 0.11, 0.03);
    },
    drop: function () { tone({ f: 1100, f2: 380, type: 'triangle', vol: 0.12, d: 0.42 }); },
    land: function (i) {
      noise({ type: 'lowpass', f: 800, vol: 0.18, d: 0.05 });
      peep(semi(1700, (i % 5) * 2), 0.08, 0.05);
    },
    bomb: function () {
      noise({ type: 'lowpass', f: 1400, f2: 90, vol: 0.75, a: 0.005, d: 0.6 });
      tone({ f: 150, f2: 40, type: 'sine', vol: 0.5, d: 0.5 });
    },
    bolt: function () {
      noise({ type: 'bandpass', f: 2600, q: 0.8, vol: 0.45, d: 0.25 });
      tone({ f: 900, f2: 120, type: 'square', vol: 0.06, d: 0.25 });
      tone({ f: 1500, f2: 220, type: 'sawtooth', vol: 0.035, d: 0.3, when: 0.05 });
    },
    rainbow: function () {
      [0, 4, 7, 12, 16].forEach(function (s, i) { tone({ f: semi(1046.5, s), type: 'sine', vol: 0.1, d: 0.16, when: i * 0.045 }); });
    },
    crumble: function () { noise({ type: 'lowpass', f: 500, vol: 0.3, d: 0.18 }); },
    special: function () {
      [0, 7, 12].forEach(function (s, i) { tone({ f: semi(1318.5, s), type: 'triangle', vol: 0.09, d: 0.14, when: i * 0.06 }); });
    },
    swap: function () {
      tone({ f: 620, f2: 940, type: 'triangle', vol: 0.12, d: 0.07 });
      tone({ f: 940, f2: 620, type: 'triangle', vol: 0.1, d: 0.07, when: 0.07 });
    },
    alarm: function () {
      tone({ f: 880, type: 'square', vol: 0.06, d: 0.09 });
      tone({ f: 660, type: 'square', vol: 0.06, d: 0.09, when: 0.12 });
    },
    safe: function () {
      tone({ f: 523.25, f2: 784, type: 'triangle', vol: 0.14, d: 0.2 });
      peep(1900, 0.08, 0.12);
    },
    praise: function (n) {
      var base = Math.min(7, n || 0);
      [0, 4, 7, 12].forEach(function (s, i) { tone({ f: semi(784, base + s), type: 'triangle', vol: 0.12, d: 0.14, when: i * 0.07 }); });
    },
    peep: function () { peep(1800 + Math.random() * 400, 0.1); },
    click: function () { tone({ f: 880, f2: 1320, type: 'triangle', vol: 0.14, d: 0.06 }); },
    win: function () {
      [0, 4, 7, 12].forEach(function (s, i) { tone({ f: semi(523.25, s), type: 'triangle', vol: 0.2, d: 0.2, when: 0.2 + i * 0.11 }); });
      [0, 4, 7].forEach(function (s) { tone({ f: semi(1046.5, s), type: 'triangle', vol: 0.1, d: 0.6, when: 0.65 }); });
      for (var i = 0; i < 4; i++) peep(1700 + i * 180, 0.07, 0.9 + i * 0.12);
    },
    lose: function () {
      tone({ f: 440, f2: 370, type: 'triangle', vol: 0.18, d: 0.22 });
      tone({ f: 370, f2: 262, type: 'triangle', vol: 0.18, d: 0.4, when: 0.26 });
    },
    resultStar: function (i) {
      tone({ f: semi(784, i * 4), type: 'triangle', vol: 0.2, d: 0.25 });
      tone({ f: semi(1568, i * 4), type: 'sine', vol: 0.08, d: 0.35 });
    },
    starLost: function () { tone({ f: 660, f2: 440, type: 'triangle', vol: 0.1, d: 0.18 }); },
    fanfare: function () {
      var seq = [0, 4, 7, 12, 7, 12, 16];
      seq.forEach(function (s, i) { tone({ f: semi(523.25, s), type: 'triangle', vol: 0.18, d: 0.18, when: i * 0.12 }); });
      [0, 4, 7, 12].forEach(function (s) { tone({ f: semi(523.25, s), type: 'triangle', vol: 0.09, d: 0.9, when: seq.length * 0.12 }); });
    }
  };

  function play(name, arg) {
    if (!ac || !on.sfx || !fx[name]) return;
    try { fx[name](arg); } catch (e) { /* audio is best-effort */ }
  }

  // ---------------------------------------------------------------- music
  // Eighth-note grid; "-" holds the previous note, "." is a rest. Bass is in quarter notes.
  var SONG = {
    bpm: 120,
    lead: ('G4 B4 D5 B4 G4 B4 D5 - E5 D5 C5 B4 A4 - . . F#4 A4 D5 A4 F#4 A4 D5 - E5 D5 C5 A4 B4 - . . ' +
           'G4 B4 D5 B4 G4 B4 D5 - G5 F#5 E5 D5 E5 - C5 . B4 C5 D5 E5 D5 C5 B4 A4 G4 - D4 - G4 - . . ' +
           'C5 - E5 - G5 - E5 . D5 - B4 - G4 - . . C5 - E5 - G5 - A5 . G5 - F#5 - D5 - . . ' +
           'E5 E5 D5 D5 C5 C5 B4 . A4 B4 C5 D5 E5 - . . D5 B4 G4 B4 A4 F#4 D4 F#4 G4 - - - . . . .').split(' '),
    bass: ('G3 D4 G3 D4 C3 G3 A2 E3 D3 A3 D3 A3 C3 G3 D3 A3 ' +
           'G3 D4 G3 D4 E3 B3 C3 G3 G3 D4 D3 A3 G3 D4 G3 . ' +
           'C3 G3 C3 G3 G3 D4 G3 D4 C3 G3 A2 E3 D3 A3 D3 A3 ' +
           'C3 G3 G3 D4 A2 E3 C3 G3 G3 D4 D3 A3 G3 D4 G3 .').split(' ')
  };
  var NOTE = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
  function freq(n) {
    var m = /^([A-G])(#?)(\d)$/.exec(n);
    if (!m) return 0;
    return 440 * Math.pow(2, (NOTE[m[1]] + (m[2] ? 1 : 0) + (parseInt(m[3], 10) - 4) * 12) / 12);
  }

  var music = { want: false, timer: null, next: 0, step: 0, key: 0 };

  function scheduleMusic() {
    if (!ac) return;
    var eighth = 60 / SONG.bpm / 2, k = music.key;
    while (music.next < ac.currentTime + 0.25) {
      var s = music.step, t = music.next, n = SONG.lead[s];
      if (n !== '-' && n !== '.') {
        var len = 1;
        while (SONG.lead[(s + len) % SONG.lead.length] === '-') len++;
        tone({ f: semi(freq(n), k), type: 'triangle', vol: 0.3, a: 0.01, d: Math.min(0.9, eighth * len * 0.95), at: t, bus: musicBus });
        tone({ f: semi(freq(n), k + 12), type: 'sine', vol: 0.04, a: 0.01, d: eighth * 0.8, at: t, bus: musicBus });
      }
      if (s % 2 === 0) {
        var b = SONG.bass[(s / 2) % SONG.bass.length];
        if (b !== '.') tone({ f: semi(freq(b), k), type: 'sine', vol: 0.42, a: 0.01, d: eighth * 1.7, at: t, bus: musicBus });
      } else {
        noise({ type: 'highpass', f: 7000, vol: 0.05, d: 0.03, at: t, bus: musicBus });
      }
      music.next += eighth;
      music.step = (s + 1) % SONG.lead.length;
    }
  }

  function startMusic() {
    music.want = true;
    if (!ac || music.timer) return;
    music.next = ac.currentTime + 0.1;
    music.step = 0;
    music.timer = setInterval(scheduleMusic, 60);
  }

  function stopMusic() {
    music.want = false;
    if (music.timer) { clearInterval(music.timer); music.timer = null; }
  }

  function setKey(k) { music.key = k; }

  function set(kind, value) {
    on[kind] = value;
    if (!ac) return;
    var now = ac.currentTime;
    if (kind === 'sfx') sfxBus.gain.setTargetAtTime(value ? 0.8 : 0, now, 0.02);
    if (kind === 'music') musicBus.gain.setTargetAtTime(value ? MUSIC_VOL : 0, now, 0.05);
  }

  function suspend() { if (ac && ac.state === 'running') ac.suspend(); }
  function resume() { if (ac && ac.state === 'suspended') ac.resume(); }

  return { init: init, ready: ready, play: play, set: set, startMusic: startMusic, stopMusic: stopMusic, setKey: setKey, suspend: suspend, resume: resume };
}());
