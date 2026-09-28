(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const canvas = $('#field');
  const ctx = canvas.getContext('2d', { alpha: false });
  const enter = $('#entry');
  const instrument = $('#instrument');
  const enterBtn = $('#enterBtn');
  const muteBtn = $('#muteBtn');
  const motionBtn = $('#motionBtn');
  const locateBtn = $('#locateBtn');
  const nowBtn = $('#nowBtn');
  const slider = $('#timeSlider');
  const toastEl = $('#toast');

  const DEFAULT = { lat: 33.5902, lon: 130.4017, label: 'FUKUOKA' };
  const state = {
    width: 0, height: 0, dpr: 1,
    particles: [], pointer: { x: 0, y: 0, active: false, vx: 0, vy: 0 },
    tilt: { x: 0, y: 0 }, motionEnabled: false,
    weather: null, hourIndex: 0, audioOn: false,
    hue: 194, turbulence: .18,
  };

  const WX = {
    0: 'CLEAR / OPEN SKY', 1: 'MOSTLY CLEAR', 2: 'PARTLY CLOUDY', 3: 'OVERCAST',
    45: 'FOG / LOW VISIBILITY', 48: 'RIME FOG', 51: 'LIGHT DRIZZLE', 53: 'DRIZZLE',
    55: 'DENSE DRIZZLE', 56: 'FREEZING DRIZZLE', 57: 'DENSE FREEZING DRIZZLE',
    61: 'LIGHT RAIN', 63: 'RAIN', 65: 'HEAVY RAIN', 66: 'FREEZING RAIN', 67: 'HEAVY FREEZING RAIN',
    71: 'LIGHT SNOW', 73: 'SNOW', 75: 'HEAVY SNOW', 77: 'SNOW GRAINS',
    80: 'RAIN SHOWERS', 81: 'RAIN SHOWERS', 82: 'VIOLENT SHOWERS',
    85: 'SNOW SHOWERS', 86: 'HEAVY SNOW SHOWERS', 95: 'THUNDERSTORM', 96: 'THUNDER + HAIL', 99: 'HEAVY THUNDER + HAIL'
  };

  function resize() {
    state.dpr = Math.min(devicePixelRatio || 1, 2);
    state.width = innerWidth; state.height = innerHeight;
    canvas.width = Math.floor(state.width * state.dpr);
    canvas.height = Math.floor(state.height * state.dpr);
    canvas.style.width = state.width + 'px'; canvas.style.height = state.height + 'px';
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    const count = Math.min(900, Math.max(260, Math.floor(state.width * state.height / 2200)));
    state.particles = Array.from({ length: count }, makeParticle);
  }

  function makeParticle() {
    return {
      x: Math.random() * state.width,
      y: Math.random() * state.height,
      px: 0, py: 0,
      life: Math.random() * 160 + 80,
      age: Math.random() * 100,
      speed: .35 + Math.random() * .9,
      seed: Math.random() * 1000
    };
  }

  function noise2(x, y, t) {
    return Math.sin(x * .004 + Math.cos(y * .003 + t * .00017) * 2.1 + t * .00011)
      + Math.cos(y * .005 - x * .0017 - t * .00013);
  }

  function currentSample() {
    if (!state.weather) return { wind: 8, humidity: 65, pressure: 1012, rain: 0, code: 2, temp: 22, dir: 180 };
    const h = state.weather.hourly;
    const i = Math.min(state.hourIndex, h.time.length - 1);
    return {
      wind: h.wind_speed_10m[i] ?? state.weather.current.wind_speed_10m ?? 8,
      humidity: h.relative_humidity_2m[i] ?? state.weather.current.relative_humidity_2m ?? 65,
      pressure: h.surface_pressure[i] ?? state.weather.current.surface_pressure ?? 1012,
      rain: h.precipitation[i] ?? state.weather.current.precipitation ?? 0,
      code: h.weather_code[i] ?? state.weather.current.weather_code ?? 2,
      temp: h.temperature_2m[i] ?? state.weather.current.temperature_2m ?? 22,
      dir: h.wind_direction_10m[i] ?? state.weather.current.wind_direction_10m ?? 180,
    };
  }

  function draw(t) {
    const s = currentSample();
    const rainy = Math.min(1, s.rain / 5);
    const windForce = Math.min(2.8, .38 + s.wind / 24);
    const dir = (s.dir - 90) * Math.PI / 180;
    const baseX = Math.cos(dir) * windForce + state.tilt.x * .9;
    const baseY = Math.sin(dir) * windForce + state.tilt.y * .5;
    state.turbulence = .11 + (s.humidity / 100) * .19 + rainy * .38;

    ctx.fillStyle = `hsla(${210 + (state.hue - 194) * .1}, 16%, 3%, ${rainy > .45 ? .2 : .12})`;
    ctx.fillRect(0, 0, state.width, state.height);

    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = rainy > .35 ? .85 : .55;

    for (const p of state.particles) {
      p.px = p.x; p.py = p.y;
      const n = noise2(p.x + p.seed, p.y, t) * state.turbulence;
      let vx = baseX + Math.cos(n * 3.1) * p.speed;
      let vy = baseY + Math.sin(n * 2.7) * p.speed;

      if (state.pointer.active) {
        const dx = p.x - state.pointer.x, dy = p.y - state.pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 34000 && d2 > 8) {
          const q = (1 - d2 / 34000) * 3.2;
          vx += (-dy / Math.sqrt(d2)) * q + state.pointer.vx * .035;
          vy += (dx / Math.sqrt(d2)) * q + state.pointer.vy * .035;
        }
      }

      p.x += vx; p.y += vy; p.age++;
      if (p.x < -20 || p.x > state.width + 20 || p.y < -20 || p.y > state.height + 20 || p.age > p.life) {
        Object.assign(p, makeParticle(), { x: Math.random() < .5 ? 0 : state.width, y: Math.random() * state.height, age: 0 });
      }

      const alpha = .05 + (s.humidity / 100) * .08 + rainy * .07;
      ctx.strokeStyle = `hsla(${state.hue}, 60%, 72%, ${alpha})`;
      ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(draw);
  }

  class WeatherAudio {
    constructor() { this.ctx = null; this.master = null; this.nodes = []; this.noise = null; this.panner = null; }
    async start() {
      if (!this.ctx) this.build();
      if (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted') await this.ctx.resume();
      this.master.gain.setTargetAtTime(.18, this.ctx.currentTime, .5);
      state.audioOn = true; muteBtn.textContent = 'SOUND ON'; this.update(currentSample());
    }
    build() {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0;
      this.panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      const destination = this.panner || this.master;
      if (this.panner) { this.master.connect(this.panner); this.panner.connect(this.ctx.destination); }
      else this.master.connect(this.ctx.destination);

      const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 950; filter.Q.value = .7; filter.connect(this.master);
      [55, 82.5, 110, 164.81].forEach((f, i) => {
        const osc = this.ctx.createOscillator(); const g = this.ctx.createGain();
        osc.type = i === 0 ? 'sine' : (i === 3 ? 'triangle' : 'sine'); osc.frequency.value = f; g.gain.value = i === 0 ? .055 : .018;
        osc.connect(g); g.connect(filter); osc.start(); this.nodes.push({ osc, g });
      });
      const len = this.ctx.sampleRate * 2; const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate); const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const nf = this.ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 1200; nf.Q.value = .5;
      const ng = this.ctx.createGain(); ng.gain.value = .003; src.connect(nf); nf.connect(ng); ng.connect(this.master); src.start();
      this.noise = { src, nf, ng, filter };
    }
    update(s) {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const pressureDetune = Math.max(-28, Math.min(28, (s.pressure - 1013) * .7));
      const wet = Math.min(1, s.rain / 4);
      const humid = s.humidity / 100;
      const ratios = [1, 1.5, 2, s.code >= 95 ? 2.28 : 2.5];
      this.nodes.forEach((n, i) => {
        const root = 48 + (s.temp + 5) * .38;
        n.osc.frequency.setTargetAtTime(root * ratios[i], now, 2.2);
        n.osc.detune.setTargetAtTime(pressureDetune + (i - 1.5) * humid * 5, now, 1.8);
        n.g.gain.setTargetAtTime((i === 0 ? .045 : .013) * (1 + humid * .55), now, 1.4);
      });
      this.noise.ng.gain.setTargetAtTime(.002 + wet * .052 + Math.min(.02, s.wind / 1600), now, .8);
      this.noise.nf.frequency.setTargetAtTime(500 + s.wind * 48 + s.humidity * 6, now, 1.5);
      this.noise.filter.frequency.setTargetAtTime(540 + (100 - s.humidity) * 16 + s.temp * 7, now, 1.4);
      if (this.panner) this.panner.pan.setTargetAtTime(Math.max(-1, Math.min(1, state.tilt.x)), now, .12);
    }
    pulse(x = .5) {
      if (!this.ctx || !state.audioOn) return;
      const o = this.ctx.createOscillator(); const g = this.ctx.createGain(); const now = this.ctx.currentTime;
      const s = currentSample(); o.type = 'sine'; o.frequency.value = 180 + (1 - x) * 260 + s.wind * 2;
      g.gain.setValueAtTime(.0001, now); g.gain.exponentialRampToValueAtTime(.07, now + .02); g.gain.exponentialRampToValueAtTime(.0001, now + .75);
      o.connect(g); g.connect(this.master); o.start(now); o.stop(now + .8);
    }
    toggle() {
      if (!this.ctx || !state.audioOn) return this.start();
      const target = this.master.gain.value > .01 ? 0 : .18;
      this.master.gain.setTargetAtTime(target, this.ctx.currentTime, .2); state.audioOn = target > 0; muteBtn.textContent = state.audioOn ? 'SOUND ON' : 'SOUND OFF';
    }
  }
  const audio = new WeatherAudio();

  function weatherHue(code, temp) {
    if (code >= 95) return 282;
    if (code >= 71) return 202;
    if (code >= 51) return 211;
    if (code >= 45) return 185;
    return temp > 27 ? 28 : temp < 8 ? 196 : 194;
  }

  function updateUI() {
    const s = currentSample();
    state.hue = weatherHue(s.code, s.temp);
    document.documentElement.style.setProperty('--accent', `${state.hue} 74% 74%`);
    $('#temp').textContent = Math.round(s.temp);
    $('#wind').textContent = Number(s.wind).toFixed(1);
    $('#humidity').textContent = Math.round(s.humidity);
    $('#pressure').textContent = Math.round(s.pressure);
    $('#rain').textContent = Number(s.rain).toFixed(1);
    $('#weatherText').textContent = WX[s.code] || `WEATHER CODE ${s.code}`;
    if (state.weather) {
      const dt = new Date(state.weather.hourly.time[state.hourIndex]);
      $('#timeLabel').textContent = state.hourIndex === 0 ? 'NOW' : new Intl.DateTimeFormat('ja-JP', { hour:'2-digit', minute:'2-digit', weekday:'short' }).format(dt);
      $('#orb').style.transform = `rotate(${s.dir}deg) scale(${1 + Math.min(.12, s.wind / 200)})`;
    }
    audio.update(s);
  }

  async function loadWeather(lat = DEFAULT.lat, lon = DEFAULT.lon, label = DEFAULT.label) {
    $('#status').textContent = 'READING ATMOSPHERE…';
    try {
      const params = new URLSearchParams({
        latitude: lat, longitude: lon,
        current: 'temperature_2m,relative_humidity_2m,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m',
        hourly: 'temperature_2m,relative_humidity_2m,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m',
        forecast_days: '2', timezone: 'auto', wind_speed_unit: 'kmh'
      });
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
      if (!r.ok) throw new Error(`weather ${r.status}`);
      const raw = await r.json();
      const now = new Date(raw.current.time).getTime();
      let idx = raw.hourly.time.findIndex(t => new Date(t).getTime() >= now);
      if (idx < 0) idx = 0;
      const end = Math.min(idx + 24, raw.hourly.time.length);
      const hourly = {}; Object.keys(raw.hourly).forEach(k => hourly[k] = raw.hourly[k].slice(idx, end));
      state.weather = { ...raw, hourly }; state.hourIndex = 0; slider.value = 0;
      $('#placeLabel').textContent = `${label} · LIVE`;
      $('#status').textContent = 'LIVE DATA · OPEN-METEO';
      updateUI();
    } catch (e) {
      $('#status').textContent = 'ATMOSPHERE OFFLINE · SYNTHETIC MODE';
      showToast('live data unavailable — synthetic air engaged');
      state.weather = null; updateUI();
    }
  }

  function showToast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(showToast.t); showToast.t = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  async function enableMotion() {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const p = await DeviceOrientationEvent.requestPermission(); if (p !== 'granted') throw new Error('denied');
      }
      window.addEventListener('deviceorientation', (e) => {
        state.tilt.x += (((e.gamma || 0) / 45) - state.tilt.x) * .08;
        state.tilt.y += (((e.beta || 0) / 70) - state.tilt.y) * .08;
        audio.update(currentSample());
      }, { passive: true });
      state.motionEnabled = true; motionBtn.textContent = 'TILT ACTIVE'; showToast('motion field connected');
    } catch { showToast('tilt permission was not granted'); }
  }

  function useMyAir() {
    if (!navigator.geolocation) return showToast('geolocation unavailable');
    locateBtn.textContent = 'LOCATING…';
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { locateBtn.textContent = 'USING MY AIR'; loadWeather(coords.latitude, coords.longitude, 'LOCAL AIR'); },
      () => { locateBtn.textContent = 'USE MY AIR'; showToast('location permission was not granted'); },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }

  function pointerMove(e) {
    const p = e.touches ? e.touches[0] : e;
    const nx = p.clientX, ny = p.clientY;
    state.pointer.vx = nx - state.pointer.x; state.pointer.vy = ny - state.pointer.y;
    state.pointer.x = nx; state.pointer.y = ny; state.pointer.active = true;
  }
  function isControlTarget(e) { return !!e.target.closest?.('button, input, a'); }
  window.addEventListener('pointerdown', (e) => {
    if (isControlTarget(e) || enter.hidden === false) return;
    pointerMove(e); audio.pulse(e.clientX / innerWidth);
  }, { passive: true });
  window.addEventListener('pointermove', (e) => {
    if (state.pointer.active && !isControlTarget(e)) pointerMove(e);
  }, { passive: true });
  window.addEventListener('pointerup', () => state.pointer.active = false, { passive: true });
  window.addEventListener('pointercancel', () => state.pointer.active = false, { passive: true });

  slider.addEventListener('input', () => { state.hourIndex = Number(slider.value); updateUI(); });
  nowBtn.addEventListener('click', () => { slider.value = 0; state.hourIndex = 0; updateUI(); });
  motionBtn.addEventListener('click', enableMotion);
  locateBtn.addEventListener('click', useMyAir);
  muteBtn.addEventListener('click', () => audio.toggle());
  enterBtn.addEventListener('click', async () => {
    await audio.start();
    enter.hidden = true; instrument.hidden = false;
    await loadWeather();
  });

  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && audio.ctx && audio.ctx.state === 'interrupted') audio.ctx.resume(); });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(() => {});
  resize(); requestAnimationFrame(draw);
})();
