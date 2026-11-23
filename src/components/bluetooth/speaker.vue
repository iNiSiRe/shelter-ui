<script setup>
  import {computed, onUnmounted, reactive, ref} from "vue";
  import Device from "@/components/Device.vue";
  import Toggle from "@/components/controls/Toggle.vue";
  import List from "@/components/properties/List.vue";
  import Item from "@/components/properties/Item.vue";
  import Section from "@/components/properties/Section.vue";
  import {registry as Registry} from "@/registry";

  const props = defineProps({
    item: Object,
    device: Object
  });

  const p = computed(() => props.device.properties);
  const connected = computed(() => p.value.connected === true);
  const connecting = computed(() => p.value.connecting === true);

  const tileStatus = computed(() => {
    if (music.value) {
      if (music.value.state === 'waiting') {
        return 'Готую колонку…';
      }
      return `${music.value.state === 'paused' ? 'Пауза' : 'Грає'} · ${nowTrack.value?.title ?? 'трек'}`;
    }
    if (current.value) {
      return p.value.songStartedAt ? `Грає · ${current.value.title}` : 'Готую мелодію…';
    }
    if (connecting.value) {
      return 'Підключаю…';
    }
    if (!connected.value) {
      return 'Не підключена';
    }
    // The charge matters more on the tile than the volume, which sits at the top of the sheet.
    if (Number.isFinite(p.value.battery)) {
      return `Підключена · заряд ${p.value.battery}%`;
    }
    return Number.isFinite(p.value.volume) ? `Підключена · ${p.value.volume}%` : 'Підключена';
  });

  // ---------- Device calls: the link, the volume ----------

  const busy = ref(false);
  const failed = ref(null);

  const call = async (method, params = {}) => {
    busy.value = true;
    failed.value = null;
    try {
      const result = await Registry.call(props.device.id, method, params);
      if (result.code !== 0) {
        failed.value = result.data?.error ?? 'модуль колонки не відповів';
      }
    } catch {
      failed.value = 'модуль колонки не відповів';
    } finally {
      busy.value = false;
    }
  };

  const connect = () => call('connect');
  const toggle = () => connected.value ? call('disconnect') : connect();
  const problem = computed(() => failed.value ?? p.value.error ?? null);

  const dragVolume = ref(null);
  const setVolume = async (volume) => {
    await call('setVolume', {volume});
    dragVolume.value = null;
  };
  // At the top of the sheet whenever the speaker can be turned up or down.
  const hasVolume = computed(() => connected.value && Number.isFinite(p.value.volume));
  const shownVolume = computed(() => dragVolume.value ?? p.value.volume);

  // ---------- The keyboard ----------

  // ---------- Tunes: five minutes each, played by the Pi on its own ----------

  const songs = computed(() => Array.isArray(p.value.songs) ? p.value.songs : []);
  const current = computed(() => songs.value.find(song => song.id === p.value.song) ?? null);

  // Ticks while the card lives, so a tune's time moves on screen.
  const now = ref(Date.now());
  const ticker = setInterval(() => now.value = Date.now(), 1000);
  onUnmounted(() => clearInterval(ticker));

  const clock = (ms) => {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  };
  const elapsed = computed(() => p.value.songStartedAt
    ? Math.min(current.value?.duration ?? 0, Math.max(0, now.value - p.value.songStartedAt)) : 0);
  const progress = computed(() => current.value?.duration ? elapsed.value / current.value.duration : 0);

  const play = (id) => call('play', {song: id});
  const stopSong = () => call('stop');

  // ---------- My music: files uploaded from here, played by the Pi ----------

  const tracks = computed(() => Array.isArray(p.value.tracks) ? p.value.tracks : []);
  // {id, state: waiting | playing | paused, offset, startedAt} or null
  const music = computed(() => p.value.track ?? null);
  const nowTrack = computed(() => tracks.value.find(track => track.id === music.value?.id) ?? null);
  const musicOn = computed(() => music.value !== null && music.value.state !== 'paused');

  // [ms] Where the track is: the Pi tells when its 0:00 sounded, the card counts on from there.
  const position = computed(() => {
    const m = music.value;
    if (!m || !nowTrack.value) {
      return 0;
    }
    const at = m.state === 'playing' && m.startedAt ? now.value - m.startedAt : m.offset;
    return Math.min(nowTrack.value.duration, Math.max(0, at));
  });
  const dragPosition = ref(null);
  const shownPosition = computed(() => dragPosition.value ?? position.value);

  const playTrack = (track) => {
    if (track.id !== music.value?.id) {
      return call('playTrack', {id: track.id});
    }
    return call(music.value.state === 'paused' ? 'resumeTrack' : 'pauseTrack');
  };
  const playPause = () => call(musicOn.value ? 'pauseTrack' : 'resumeTrack');

  // As on a phone: repeat goes off → all → one, shuffle on or off; the Pi keeps both.
  const repeatMode = computed(() => p.value.repeat ?? 'off');
  const shuffleOn = computed(() => p.value.shuffle === true);
  const NEXT_REPEAT = {off: 'all', all: 'one', one: 'off'};
  const REPEAT_LABELS = {off: 'Повтор вимкнено', all: 'Повтор усіх треків', one: 'Повтор цього треку'};
  const cycleRepeat = () => call('setPlayMode', {repeat: NEXT_REPEAT[repeatMode.value] ?? 'off'});
  const toggleShuffle = () => call('setPlayMode', {shuffle: !shuffleOn.value});
  const playAll = (shuffle) => call('playAll', {shuffle});
  const seek = async (at) => {
    await call('seekTrack', {at});
    dragPosition.value = null;
  };

  // Delete as on an iPhone: «Змінити», a red minus, then the red «Видалити».
  const editing = ref(false);
  const armed = ref(null);
  const toggleEditing = () => {
    editing.value = !editing.value;
    armed.value = null;
  };
  const removeTrack = async (track) => {
    armed.value = null;
    await call('deleteTrack', {id: track.id});
    if (tracks.value.length <= 1) {
      editing.value = false;
    }
  };

  const size = (bytes) => {
    if (!Number.isFinite(bytes)) {
      return '';
    }
    if (bytes >= 1024 ** 3) {
      return `${String(Math.round(bytes / 1024 ** 3 * 10) / 10).replace('.', ',')} ГБ`;
    }
    const mb = bytes / 1024 ** 2;
    return `${String(mb < 10 ? Math.round(mb * 10) / 10 : Math.round(mb)).replace('.', ',')} МБ`;
  };
  const usage = computed(() => {
    const library = p.value.library;
    return library ? `Зайнято ${size(library.used)} з ${size(library.limit)}.` : '';
  });

  // ---------- Uploads: one file at a time, straight to the Pi's port beside the keys ----------

  const fileInput = ref(null);
  // {key, file, name, size, state: queued | sending | processing | done | failed, progress, error}
  const uploads = ref([]);
  let uploadKey = 0;
  let pumping = false;

  const uploadUrl = (name) => {
    const host = new URL(Registry.baseUrl).hostname;
    return `http://${host}:${p.value.keysPort ?? 9091}/tracks?name=${encodeURIComponent(name)}`;
  };

  const pickFiles = () => fileInput.value?.click();

  const onFiles = (event) => {
    // An album picked at once goes in by its numbers: «2 …» before «10 …».
    const files = [...(event.target.files ?? [])]
      .sort((a, b) => a.name.localeCompare(b.name, 'uk', {numeric: true}));
    event.target.value = '';
    for (const file of files) {
      uploads.value.push({key: ++uploadKey, file, name: file.name, size: file.size, state: 'queued', progress: 0, error: null});
    }
    pump();
  };

  const sendFile = (item) => new Promise(resolve => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl(item.name));
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        item.progress = event.loaded / event.total;
      }
    };
    // All of it is on the Pi: it reads the file and measures its loudness now.
    xhr.upload.onload = () => {
      item.progress = 1;
      item.state = 'processing';
    };
    xhr.onload = () => {
      let body = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // Not the module's answer.
      }
      resolve(xhr.status === 200 ? null : body?.error ?? `Pi відповів ${xhr.status}`);
    };
    xhr.onerror = () => resolve("зв'язок із Pi обірвався");
    xhr.send(item.file);
  });

  const pump = async () => {
    if (pumping) {
      return;
    }
    pumping = true;
    try {
      for (let item = uploads.value.find(u => u.state === 'queued'); item; item = uploads.value.find(u => u.state === 'queued')) {
        const library = p.value.library;
        let error = null;
        if (library && item.size > library.fileLimit) {
          error = `файл більший за ${size(library.fileLimit)}`;
        } else if (library && library.used + item.size > library.limit) {
          error = 'місце для музики закінчилось: видаліть щось зі списку';
        } else {
          item.state = 'sending';
          error = await sendFile(item);
        }
        item.state = error ? 'failed' : 'done';
        item.error = error;
      }
    } finally {
      pumping = false;
    }
    setTimeout(() => uploads.value = uploads.value.filter(u => u.state !== 'done'), 1500);
  };

  const dismiss = (item) => uploads.value = uploads.value.filter(u => u !== item);

  const uploadStatus = (item) => {
    switch (item.state) {
      case 'queued':
        return 'У черзі';
      case 'sending':
        return `Завантажую · ${Math.floor(item.progress * 100)}%`;
      case 'processing':
        return 'Вирівнюю гучність…';
      case 'done':
        return 'Додано';
      default:
        return item.error;
    }
  };

  // The lower row's octave; the upper row is the next one. C4 is MIDI 60, as on a MIDI keyboard.
  const MIN_OCTAVE = 2;
  const MAX_OCTAVE = 6;
  const clampOctave = value => Math.min(MAX_OCTAVE, Math.max(MIN_OCTAVE, value));
  const stored = (() => {
    try {
      return parseInt(localStorage.getItem('speaker.octave') ?? '', 10);
    } catch {
      return NaN;
    }
  })();
  const octave = ref(clampOctave(Number.isFinite(stored) ? stored : 4));

  const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const noteName = note => `${NAMES[note % 12]}${Math.floor(note / 12) - 1}`;
  const base = o => 12 * (o + 1);

  // An octave as seven white keys, with the black ones placed over the gaps, each nudged a little
  // off centre, as on a real keyboard.
  const WHITE = [0, 2, 4, 5, 7, 9, 11];
  const BLACK = [
    {step: 1, at: 1, nudge: -0.08},
    {step: 3, at: 2, nudge: 0.08},
    {step: 6, at: 4, nudge: -0.1},
    {step: 8, at: 5, nudge: 0},
    {step: 10, at: 6, nudge: 0.1},
  ];
  const BLACK_WIDTH = 8.6; // [% of the row]
  const blackLeft = key => `${((key.at + key.nudge) / 7) * 100 - BLACK_WIDTH / 2}%`;

  // The higher octave on top, as an organ's upper manual.
  const rows = computed(() => [octave.value + 1, octave.value].map(o => ({octave: o, base: base(o)})));
  const range = computed(() => `${noteName(base(octave.value))}–${noteName(base(octave.value) + 23)}`);

  // ---------- Notes ----------

  // How many fingers and keys hold each note: it goes off when the last one lets go.
  const holders = new Map();
  const down = reactive(new Set());
  const lastNote = ref(null);
  const pedal = ref(false);

  const press = (note, velocity) => {
    const count = holders.get(note) ?? 0;
    holders.set(note, count + 1);
    if (count === 0) {
      down.add(note);
      lastNote.value = note;
      send({t: 'on', n: note, v: Math.round(velocity * 100) / 100});
    }
  };

  const release = (note) => {
    const count = holders.get(note) ?? 0;
    if (count > 1) {
      holders.set(note, count - 1);
    } else if (count === 1) {
      holders.delete(note);
      down.delete(note);
      send({t: 'off', n: note});
    }
  };

  const pointers = new Map();
  const keysDown = new Map();

  const releaseAll = () => {
    for (const note of [...holders.keys()]) {
      holders.set(note, 1);
      release(note);
    }
    pointers.clear();
    keysDown.clear();
  };

  const setPedal = (value) => {
    pedal.value = value;
    send({t: 'pedal', on: value});
  };

  const shiftOctave = (delta) => {
    const next = clampOctave(octave.value + delta);
    if (next === octave.value) {
      return;
    }
    releaseAll();
    octave.value = next;
    try {
      localStorage.setItem('speaker.octave', `${next}`);
    } catch {
      // A private window: the octave is just not remembered.
    }
  };

  // ---------- The socket to the module ----------

  // closed: no socket · offline | connecting | ready: what the module says about the speaker.
  const status = ref('closed');
  const ready = computed(() => status.value === 'ready');

  let socket = null;
  let retry = null;
  let open = false;

  const keysUrl = () => {
    const host = new URL(Registry.baseUrl).hostname;
    return `ws://${host}:${p.value.keysPort ?? 9091}/keys`;
  };

  const send = (message) => {
    if (socket?.readyState !== WebSocket.OPEN) {
      return false;
    }
    socket.send(JSON.stringify(message));
    return true;
  };

  const openSocket = () => {
    if (!open || socket) {
      return;
    }
    const s = new WebSocket(keysUrl());
    socket = s;
    s.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.t === 'state') {
          status.value = message.status;
        }
      } catch {
        // Not ours.
      }
    };
    s.onclose = () => {
      if (socket !== s) {
        return;
      }
      socket = null;
      status.value = 'closed';
      releaseAll();
      if (open) {
        retry = setTimeout(openSocket, 1500);
      }
    };
    s.onerror = () => undefined;
  };

  const closeSocket = () => {
    clearTimeout(retry);
    retry = null;
    const s = socket;
    socket = null;
    status.value = 'closed';
    if (s) {
      if (s.readyState === WebSocket.OPEN) {
        s.send(JSON.stringify({t: 'panic'}));
      }
      s.close();
    }
  };

  // ---------- Touch and mouse: several fingers, slides across the keys ----------

  // The key under a point, and how hard: nearer the front edge is louder, as on a real key.
  const hit = (x, y) => {
    const key = document.elementFromPoint(x, y)?.closest?.('[data-note]');
    if (!key) {
      return null;
    }
    const box = key.getBoundingClientRect();
    const depth = Math.min(1, Math.max(0, (y - box.top) / box.height));
    return {note: parseInt(key.dataset.note, 10), velocity: 0.35 + 0.65 * depth};
  };

  const onPointerDown = (event) => {
    if (!ready.value) {
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const key = hit(event.clientX, event.clientY);
    pointers.set(event.pointerId, key?.note ?? null);
    if (key) {
      press(key.note, key.velocity);
    }
  };

  const onPointerMove = (event) => {
    if (!pointers.has(event.pointerId)) {
      return;
    }
    const key = hit(event.clientX, event.clientY);
    const current = pointers.get(event.pointerId);
    if ((key?.note ?? null) === current) {
      return;
    }
    if (current !== null) {
      release(current);
    }
    pointers.set(event.pointerId, key?.note ?? null);
    if (key) {
      press(key.note, key.velocity);
    }
  };

  const onPointerUp = (event) => {
    if (!pointers.has(event.pointerId)) {
      return;
    }
    const current = pointers.get(event.pointerId);
    pointers.delete(event.pointerId);
    if (current !== null) {
      release(current);
    }
  };

  // ---------- A computer's keyboard, as trackers lay it out ----------

  // Z-row: the lower octave (black keys on the row above); Q-row: the upper one.
  const LOWER = {KeyZ: 0, KeyS: 1, KeyX: 2, KeyD: 3, KeyC: 4, KeyV: 5, KeyG: 6, KeyB: 7, KeyH: 8, KeyN: 9, KeyJ: 10, KeyM: 11, Comma: 12};
  const UPPER = {KeyQ: 0, Digit2: 1, KeyW: 2, Digit3: 3, KeyE: 4, KeyR: 5, Digit5: 6, KeyT: 7, Digit6: 8, KeyY: 9, Digit7: 10, KeyU: 11, KeyI: 12};

  const onKeyDown = (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }
    if (event.code === 'Space') {
      event.preventDefault();
      if (!event.repeat) {
        setPedal(true);
      }
      return;
    }
    if (event.code === 'Minus' || event.code === 'Equal') {
      event.preventDefault();
      shiftOctave(event.code === 'Minus' ? -1 : 1);
      return;
    }
    const lower = event.code in LOWER;
    const step = lower ? LOWER[event.code] : UPPER[event.code];
    if (step === undefined) {
      return;
    }
    event.preventDefault();
    if (event.repeat || keysDown.has(event.code) || !ready.value) {
      return;
    }
    const note = base(lower ? octave.value : octave.value + 1) + step;
    keysDown.set(event.code, note);
    press(note, 0.8);
  };

  const onKeyUp = (event) => {
    if (event.code === 'Space') {
      setPedal(false);
      return;
    }
    const note = keysDown.get(event.code);
    if (note !== undefined) {
      keysDown.delete(event.code);
      release(note);
    }
  };

  // A key let go in another window never comes back as a keyup.
  const onBlur = () => releaseAll();

  // iOS freezes a page in the background: let go of everything and reconnect on return.
  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      openSocket();
    } else {
      releaseAll();
      closeSocket();
    }
  };

  // ---------- The sheet ----------

  const onOpen = () => {
    open = true;
    openSocket();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
  };

  const onClose = () => {
    open = false;
    releaseAll();
    if (pedal.value) {
      setPedal(false);
    }
    closeSocket();
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    document.removeEventListener('visibilitychange', onVisibility);
  };

  onUnmounted(() => {
    if (open) {
      onClose();
    }
  });

  const lcd = computed(() => {
    if (current.value) {
      return `▶ ${clock(elapsed.value)} · ${current.value.title}`;
    }
    const parts = ['Орган', range.value];
    if (lastNote.value !== null) {
      parts.push(`♪ ${noteName(lastNote.value)}`);
    }
    return parts.join(' · ');
  });
</script>

<template>
  <Device accent="violet" :active="connected" @open="onOpen" @close="onClose">
    <template #icon>
      <svg viewBox="0 0 24 24" fill="none" stroke="#bf5af2" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="3" width="11" height="18" rx="3"/><circle cx="10" cy="14.5" r="3"/><path d="M10 7.5h.01" stroke-width="2.4"/><path d="M18.5 9.5a4 4 0 0 1 0 5M20.5 7.5a7 7 0 0 1 0 9" stroke="#d99bf7"/></svg>
    </template>

    <template #title>
      {{ item.name }}
    </template>

    <template #status>
      <span>{{ tileStatus }}</span>
    </template>

    <template #action>
      <Toggle :value="connected || connecting" :disabled="connecting || busy" @click="toggle"></Toggle>
    </template>

    <template #extended>
      <Section v-if="nowTrack || hasVolume">
        <div class="sp-now">
          <template v-if="nowTrack">
          <div class="flex items-start gap-3">
            <div class="min-w-0 flex-1">
              <p class="sp-now-title">{{ nowTrack.title }}</p>
              <p class="sp-now-artist">{{ music.state === 'waiting' ? 'Готую колонку…' : nowTrack.artist ?? 'Моя музика' }}</p>
            </div>
            <button type="button" class="sp-close" aria-label="Зупинити музику" :disabled="busy" @click="stopSong">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" class="h-3.5 w-3.5"><path d="M7 7l10 10M17 7L7 17"/></svg>
            </button>
          </div>

          <input type="range" class="sp-scrub" min="0" :max="nowTrack.duration" step="1000" aria-label="Позиція в треку"
                 :value="shownPosition" :style="{'--fill': `${nowTrack.duration ? shownPosition / nowTrack.duration * 100 : 0}%`}"
                 @input="dragPosition = $event.target.valueAsNumber"
                 @change="seek($event.target.valueAsNumber)">
          <div class="sp-times">
            <span>{{ clock(shownPosition) }}</span>
            <span>−{{ clock(nowTrack.duration - shownPosition) }}</span>
          </div>

          <div class="sp-transport">
            <button type="button" class="sp-mode" :class="{'is-on': shuffleOn}" :aria-pressed="shuffleOn"
                    :aria-label="shuffleOn ? 'Перемішування увімкнено' : 'Перемішування вимкнено'" :disabled="busy" @click="toggleShuffle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M3 7h3.2c1.9 0 3.1.9 4.1 2.6l2.9 4.8c1 1.7 2.2 2.6 4.1 2.6H20M3 17h3.2c1.3 0 2.3-.4 3.1-1.2M14.6 8.2c.8-.8 1.8-1.2 3.1-1.2H20M17.5 4.5 20 7l-2.5 2.5M17.5 14.5 20 17l-2.5 2.5"/></svg>
            </button>
            <button type="button" class="sp-skip" aria-label="Попередній трек" :disabled="busy" @click="call('previousTrack')">
              <svg viewBox="0 0 24 24" fill="currentColor" class="h-6 w-6"><rect x="4" y="5" width="2.6" height="14" rx="1"/><path d="M19.5 6.2v11.6a1 1 0 0 1-1.55.83L9.6 13.03a1.2 1.2 0 0 1 0-2.06l8.35-5.6a1 1 0 0 1 1.55.83z"/></svg>
            </button>
            <button type="button" class="sp-main" :aria-label="musicOn ? 'Пауза' : 'Грати'" :disabled="busy" @click="playPause">
              <span v-if="music.state === 'waiting'" class="kb-spinner sp-main-spinner"></span>
              <svg v-else-if="musicOn" viewBox="0 0 24 24" fill="currentColor" class="h-7 w-7"><rect x="6" y="5" width="4.2" height="14" rx="1.2"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.2"/></svg>
              <svg v-else viewBox="0 0 24 24" fill="currentColor" class="ml-1 h-7 w-7"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>
            </button>
            <button type="button" class="sp-skip" aria-label="Наступний трек" :disabled="busy" @click="call('nextTrack')">
              <svg viewBox="0 0 24 24" fill="currentColor" class="h-6 w-6"><rect x="17.4" y="5" width="2.6" height="14" rx="1"/><path d="M4.5 6.2v11.6a1 1 0 0 0 1.55.83l8.35-5.6a1.2 1.2 0 0 0 0-2.06L6.05 5.37A1 1 0 0 0 4.5 6.2z"/></svg>
            </button>
            <button type="button" class="sp-mode" :class="{'is-on': repeatMode !== 'off'}" :aria-pressed="repeatMode !== 'off'"
                    :aria-label="REPEAT_LABELS[repeatMode]" :title="REPEAT_LABELS[repeatMode]" :disabled="busy" @click="cycleRepeat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M4 11.5V10a3.5 3.5 0 0 1 3.5-3.5H19.5M16.5 3.5l3 3-3 3M20 12.5V14a3.5 3.5 0 0 1-3.5 3.5H4.5M7.5 20.5l-3-3 3-3"/></svg>
              <span v-if="repeatMode === 'one'" class="sp-mode-one">1</span>
            </button>
          </div>
          </template>

          <div v-if="hasVolume" class="sp-volume" :class="{'mt-2': nowTrack}">
            <svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4 flex-none" aria-hidden="true"><path d="M4 9.5h3.2L11.6 5.6A.9.9 0 0 1 13 6.3v11.4a.9.9 0 0 1-1.4.7L7.2 14.5H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1z"/></svg>
            <input type="range" class="sp-scrub !mt-0" min="0" max="100" step="1" aria-label="Гучність"
                   :value="shownVolume" :style="{'--fill': `${shownVolume}%`}"
                   @input="dragVolume = $event.target.valueAsNumber"
                   @change="setVolume($event.target.valueAsNumber)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" class="h-[18px] w-[18px] flex-none" aria-hidden="true"><path d="M3.5 9.5h3.2L11 5.7a.8.8 0 0 1 1.3.6v11.4a.8.8 0 0 1-1.3.6l-4.3-3.8H3.5z" fill="currentColor" stroke="none"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18.3 6.6a7.6 7.6 0 0 1 0 10.8"/></svg>
            <span class="sp-volume-value">{{ shownVolume }}%</span>
          </div>
        </div>
      </Section>

      <Section>
        <div class="kb" @contextmenu.prevent>
          <div class="kb-top">
            <div class="kb-lcd" aria-live="polite">{{ lcd }}</div>
            <button type="button" class="kb-btn" aria-label="Октава нижче" :disabled="octave <= MIN_OCTAVE" @click="shiftOctave(-1)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" class="h-4 w-4"><path d="M6 12h12"/></svg>
            </button>
            <button type="button" class="kb-btn" aria-label="Октава вище" :disabled="octave >= MAX_OCTAVE" @click="shiftOctave(1)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" class="h-4 w-4"><path d="M6 12h12M12 6v12"/></svg>
            </button>
            <button type="button" class="kb-btn kb-pedal" :class="{'is-on': pedal}" :aria-pressed="pedal" @click="setPedal(!pedal)">Педаль</button>
          </div>

          <div class="kb-keys" :class="{'is-idle': !ready}"
               @pointerdown="onPointerDown" @pointermove="onPointerMove"
               @pointerup="onPointerUp" @pointercancel="onPointerUp" @lostpointercapture="onPointerUp">
            <div v-for="row in rows" :key="row.octave" class="kb-octave">
              <div v-for="step in WHITE" :key="step" class="kb-white" :class="{'is-down': down.has(row.base + step)}" :data-note="row.base + step">
                <span v-if="step === 0" class="kb-label">{{ noteName(row.base) }}</span>
              </div>
              <div v-for="key in BLACK" :key="key.step" class="kb-black" :class="{'is-down': down.has(row.base + key.step)}"
                   :data-note="row.base + key.step" :style="{left: blackLeft(key), width: `${BLACK_WIDTH}%`}"></div>
            </div>

            <div v-if="!ready" class="kb-cover">
              <template v-if="status === 'connecting' || connecting">
                <span class="kb-spinner"></span>
                <p class="kb-cover-text">Готую колонку…</p>
              </template>
              <template v-else-if="status === 'offline' || (status === 'closed' && !connected)">
                <p class="kb-cover-text">Колонка не підключена</p>
                <button type="button" class="ctl-btn kb-connect" :disabled="busy" @click="connect">Підключити</button>
              </template>
              <template v-else>
                <span class="kb-spinner"></span>
                <p class="kb-cover-text">З'єднуюсь із Pi…</p>
              </template>
            </div>
          </div>
        </div>

        <p v-if="problem" class="sp-note !text-[#ff6961]">{{ problem }}</p>
        <p class="sp-note">
          Грає Pi через Bluetooth, тому звук запізнюється приблизно на 0,2 с.
          <span class="sp-desktop">З клавіатури комп'ютера: Z…M — нижня октава, Q…U — верхня, пробіл — педаль, − / = — октава.</span>
        </p>
      </Section>

      <Section>
        <div class="sp-head">
          <h3 class="section-title !mb-0">Моя музика</h3>
          <button v-if="tracks.length" type="button" class="sp-edit" @click="toggleEditing">{{ editing ? 'Готово' : 'Змінити' }}</button>
        </div>

        <div v-if="tracks.length && !editing" class="sp-playall">
          <button type="button" class="ctl-btn sp-pill" :disabled="busy" @click="playAll(false)">
            <svg viewBox="0 0 24 24" fill="currentColor" class="mr-1.5 h-4 w-4"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>
            Грати все
          </button>
          <button type="button" class="ctl-btn sp-pill" :disabled="busy" @click="playAll(true)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="mr-1.5 h-4 w-4"><path d="M3 7h3.2c1.9 0 3.1.9 4.1 2.6l2.9 4.8c1 1.7 2.2 2.6 4.1 2.6H20M3 17h3.2c1.3 0 2.3-.4 3.1-1.2M14.6 8.2c.8-.8 1.8-1.2 3.1-1.2H20M17.5 4.5 20 7l-2.5 2.5M17.5 14.5 20 17l-2.5 2.5"/></svg>
            Перемішати
          </button>
        </div>

        <ul v-if="tracks.length" role="list" class="field-list">
          <li v-for="track in tracks" :key="track.id" class="field-row sp-track" :class="{'is-editing': editing}"
              @click="editing ? null : playTrack(track)">
            <button v-if="editing" type="button" class="sp-minus" :aria-label="`Видалити «${track.title}»?`" @click.stop="armed = armed === track.id ? null : track.id">
              <svg viewBox="0 0 24 24" class="h-[22px] w-[22px]"><circle cx="12" cy="12" r="10" fill="#ff453a"/><path d="M7.5 12h9" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>
            </button>
            <div class="min-w-0 flex-1">
              <p class="truncate" :class="{'sp-song-on': music?.id === track.id}">{{ track.title }}</p>
              <p class="truncate text-[13px] text-[color:var(--ink-3)]">
                {{ [track.artist, clock(track.duration)].filter(Boolean).join(' · ') }}
              </p>
            </div>
            <button v-if="editing && armed === track.id" type="button" class="sp-delete" :disabled="busy" @click.stop="removeTrack(track)">Видалити</button>
            <template v-else-if="!editing">
              <span v-if="music?.id === track.id && music.state === 'playing'" class="sp-bars" aria-label="Грає"><i></i><i></i><i></i></span>
              <button v-else type="button" class="sp-play" :class="{'is-on': music?.id === track.id}" :aria-label="`Грати «${track.title}»`" :disabled="busy" @click.stop="playTrack(track)">
                <svg viewBox="0 0 24 24" fill="currentColor" class="ml-0.5 h-4 w-4"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>
              </button>
            </template>
          </li>
        </ul>
        <p v-else class="sp-empty">Тут поки порожньо. Додайте свої треки з телефона чи комп'ютера, і Pi гратиме їх на колонці.</p>

        <ul v-if="uploads.length" role="list" class="field-list mt-3">
          <li v-for="item in uploads" :key="item.key" class="field-row !block">
            <div class="flex items-center gap-3">
              <div class="min-w-0 flex-1">
                <p class="truncate text-[15px]">{{ item.name }}</p>
                <p class="text-[13px]" :class="item.state === 'failed' ? 'text-[#ff6961]' : 'truncate text-[color:var(--ink-3)]'">{{ uploadStatus(item) }}</p>
              </div>
              <span v-if="item.state === 'processing'" class="kb-spinner sp-row-spinner"></span>
              <button v-if="item.state === 'failed'" type="button" class="sp-close" aria-label="Прибрати" @click="dismiss(item)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" class="h-3.5 w-3.5"><path d="M7 7l10 10M17 7L7 17"/></svg>
              </button>
            </div>
            <div v-if="item.state === 'sending' || item.state === 'processing'" class="sp-progress">
              <div class="sp-progress-fill" :style="{width: `${item.progress * 100}%`}"></div>
            </div>
          </li>
        </ul>

        <div class="mt-3">
          <button type="button" class="ctl-btn sp-btn sp-apply" @click="pickFiles">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" class="mr-1.5 h-4 w-4"><path d="M12 5v14M5 12h14"/></svg>
            Додати треки
          </button>
          <input ref="fileInput" type="file" multiple class="hidden"
                 accept="audio/*,.mp3,.m4a,.aac,.flac,.ogg,.oga,.opus,.wav,.aif,.aiff" @change="onFiles">
          <p class="sp-note">
            {{ usage }} Найкраще MP3 або M4A; FLAC, OGG, Opus і WAV теж підійдуть, до {{ size(p.library?.fileLimit ?? 314572800) }} на файл.
            Гучність треків Pi вирівнює сам.
          </p>
        </div>
      </Section>

      <Section name="Мелодії">
        <ul role="list" class="field-list">
          <li v-for="song in songs" :key="song.id" class="field-row">
            <div class="min-w-0 flex-1">
              <p class="truncate" :class="{'sp-song-on': current?.id === song.id}">{{ song.title }}</p>
              <p class="truncate text-[13px] text-[color:var(--ink-3)]">
                {{ song.author }} · {{ current?.id === song.id && p.songStartedAt ? `${clock(elapsed)} / ${clock(song.duration)}` : clock(song.duration) }}
              </p>
              <div v-if="current?.id === song.id" class="sp-progress">
                <div class="sp-progress-fill" :style="{width: `${progress * 100}%`}"></div>
              </div>
            </div>
            <button v-if="current?.id === song.id" type="button" class="sp-play is-on" aria-label="Зупинити" :disabled="busy" @click="stopSong">
              <svg viewBox="0 0 24 24" fill="currentColor" class="h-3.5 w-3.5"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
            </button>
            <button v-else type="button" class="sp-play" :aria-label="`Грати «${song.title}»`" :disabled="busy" @click="play(song.id)">
              <svg viewBox="0 0 24 24" fill="currentColor" class="ml-0.5 h-4 w-4"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>
            </button>
          </li>
        </ul>
        <p v-if="current && !p.songStartedAt" class="sp-note">Готую колонку, мелодія почнеться за кілька секунд.</p>
        <p v-else class="sp-note">Мелодію грає сам Pi: аркуш можна закрити, вона дограє до кінця.</p>
      </Section>

      <Section name="Колонка">
        <List>
          <Item label="Стан">
            <span class="pill" :class="connected ? 'pill-accent' : connecting ? '' : 'pill-muted'">
              <span class="pill-dot"></span>{{ connecting ? 'Підключаю…' : connected ? 'Підключена' : 'Не підключена' }}
            </span>
          </Item>
          <Item v-if="Number.isFinite(p.battery)" label="Батарея">
            {{ p.battery }}%
          </Item>
          <Item v-if="p.name" label="Пристрій">
            {{ p.name }}
          </Item>
        </List>

        <div class="mt-3">
          <button v-if="connected" type="button" class="ctl-btn sp-btn" :disabled="busy" @click="call('disconnect')">Відключити</button>
          <button v-else type="button" class="ctl-btn sp-btn sp-apply" :disabled="busy || connecting" @click="connect">
            {{ connecting ? 'Підключаю…' : 'Підключити' }}
          </button>
          <p v-if="connected" class="sp-note">Відключіть, щоб колонка була вільна для телефона.</p>
        </div>
      </Section>
    </template>
  </Device>
</template>

<style scoped>
  /* ---------- The controller: a dark MIDI keyboard with a display, pads and two manuals ---------- */
  .kb {
    @apply relative rounded-[22px] p-3;
    background: linear-gradient(180deg, #26262e 0%, #16161b 100%);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), inset 0 0 0 1px rgba(255, 255, 255, 0.04), 0 22px 44px -26px rgba(0, 0, 0, 0.9);
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
  }
  .kb-top {
    @apply flex items-center gap-1.5;
  }
  .kb-lcd {
    @apply min-w-0 flex-1 truncate rounded-[10px] px-2.5 py-[7px] text-[12px] uppercase;
    font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    letter-spacing: 0.06em;
    background: #0d0b12;
    color: rgb(var(--accent-rgb));
    box-shadow: inset 0 0 0 1px rgb(var(--accent-rgb) / 0.16), inset 0 0 18px rgb(var(--accent-rgb) / 0.08);
    text-shadow: 0 0 8px rgb(var(--accent-rgb) / 0.45);
  }
  .kb-btn {
    @apply grid h-[31px] min-w-[34px] flex-none place-items-center rounded-[9px] px-2 text-[12px] font-semibold transition duration-150 active:scale-95;
    background: linear-gradient(180deg, #3a3a44, #2a2a32);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 2px 0 rgba(0, 0, 0, 0.5);
    color: var(--ink);
  }
  .kb-btn:disabled {
    @apply opacity-40;
  }
  .kb-btn.is-on {
    background: rgb(var(--accent-rgb));
    color: #0a0a0d;
    box-shadow: 0 0 14px rgb(var(--accent-rgb) / 0.5);
  }
  .kb-keys {
    @apply relative mt-3;
    touch-action: none;
  }
  .kb-octave {
    @apply relative flex overflow-hidden rounded-b-[10px] pt-[4px];
    height: clamp(108px, 19vh, 168px);
    /* The red felt strip under the keys' back ends. */
    background: linear-gradient(180deg, #6b1d2a 0, #6b1d2a 4px, #0b0b0e 4px);
  }
  .kb-octave + .kb-octave {
    @apply mt-2;
  }
  .kb-white {
    @apply relative flex-1 rounded-b-[9px];
    margin: 0 1px;
    background: linear-gradient(180deg, #e9e9ee 0%, #ffffff 55%, #f1f1f4 100%);
    box-shadow: inset 0 -6px 0 #d1d1d8, inset 0 0 0 1px rgba(0, 0, 0, 0.06);
    transition: transform 60ms ease, background 60ms ease;
  }
  .kb-white.is-down {
    background: linear-gradient(180deg, rgb(var(--accent-rgb) / 0.42), rgb(var(--accent-rgb) / 0.2)), #f2eefa;
    box-shadow: inset 0 -2px 0 #c9c3d6, inset 0 0 0 1px rgba(0, 0, 0, 0.06);
    transform: translateY(2px);
  }
  .kb-black {
    @apply absolute z-10 rounded-b-[6px];
    top: 4px;
    height: 60%;
    background: linear-gradient(180deg, #3b3b44 0%, #15151a 80%, #0a0a0c 100%);
    box-shadow: inset 0 -5px 0 #000, inset 1px 0 0 rgba(255, 255, 255, 0.08), inset -1px 0 0 rgba(255, 255, 255, 0.04), 0 3px 5px rgba(0, 0, 0, 0.55);
    transition: height 60ms ease, background 60ms ease;
  }
  .kb-black.is-down {
    height: 59%;
    background: linear-gradient(180deg, rgb(var(--accent-rgb)) 0%, rgb(var(--accent-rgb) / 0.55) 100%);
    box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.5), 0 0 16px rgb(var(--accent-rgb) / 0.65);
  }
  .kb-label {
    @apply pointer-events-none absolute inset-x-0 bottom-[10px] text-center text-[10px] font-semibold;
    color: #8e8e96;
  }
  .kb-keys.is-idle .kb-octave {
    filter: saturate(0.4) brightness(0.55);
  }
  .kb-cover {
    @apply absolute inset-0 z-20 flex flex-col items-center justify-center gap-2.5 rounded-[12px] px-6 text-center;
    background: rgba(12, 12, 16, 0.55);
    -webkit-backdrop-filter: blur(2px);
    backdrop-filter: blur(2px);
  }
  .kb-cover-text {
    @apply text-[15px] font-semibold;
    color: var(--ink);
  }
  .kb-connect {
    @apply px-5 py-2.5 text-[15px] font-semibold;
    background: rgb(var(--accent-rgb));
    color: #0a0a0d;
  }
  .kb-connect:hover {
    background: rgb(var(--accent-rgb) / 0.85);
  }
  .kb-connect:disabled {
    @apply opacity-50;
  }
  .kb-spinner {
    @apply h-6 w-6 rounded-full;
    border: 2.5px solid rgba(255, 255, 255, 0.18);
    border-top-color: rgb(var(--accent-rgb));
    animation: kb-spin 0.8s linear infinite;
  }
  @keyframes kb-spin {
    to { transform: rotate(360deg); }
  }

  /* ---------- Below the controller ---------- */
  .sp-note {
    @apply mt-2 px-1 text-[13px] leading-[1.4];
    color: var(--ink-3);
  }
  /* The computer-keys hint is for a mouse and a keyboard only. */
  .sp-desktop {
    display: none;
  }
  @media (hover: hover) and (pointer: fine) {
    .sp-desktop {
      display: inline;
    }
  }
  .sp-song-on {
    color: rgb(var(--accent-rgb));
    font-weight: 600;
  }
  .sp-progress {
    @apply mt-1.5 h-1 overflow-hidden rounded-full;
    background: rgba(255, 255, 255, 0.1);
  }
  .sp-progress-fill {
    @apply h-full rounded-full;
    background: rgb(var(--accent-rgb));
    transition: width 1s linear;
  }
  .sp-play {
    @apply grid h-9 w-9 flex-none place-items-center rounded-full transition duration-150 active:scale-90;
    background: rgb(var(--accent-rgb) / 0.2);
    color: rgb(var(--accent-rgb));
  }
  .sp-play.is-on {
    background: rgb(var(--accent-rgb));
    color: #0a0a0d;
    box-shadow: 0 0 14px rgb(var(--accent-rgb) / 0.45);
  }
  .sp-play:disabled {
    @apply opacity-40;
  }
  .sp-btn {
    @apply w-full px-3 py-3 text-[15px] font-semibold;
  }

  /* ---------- Now playing ---------- */
  .sp-now {
    @apply rounded-[14px] px-4 pb-3 pt-3.5;
    background: var(--group);
  }
  .sp-now-title {
    @apply truncate text-[17px] font-semibold;
    color: var(--ink);
  }
  .sp-now-artist {
    @apply truncate text-[15px];
    color: var(--ink-2);
  }
  .sp-close {
    @apply grid h-7 w-7 flex-none place-items-center rounded-full transition duration-150 active:scale-90;
    background: rgba(255, 255, 255, 0.1);
    color: var(--ink-2);
  }
  .sp-close:disabled {
    @apply opacity-40;
  }
  .sp-scrub {
    @apply mt-4 block h-5 w-full cursor-pointer appearance-none bg-transparent;
  }
  .sp-scrub::-webkit-slider-runnable-track {
    @apply h-1 rounded-full;
    background: linear-gradient(90deg, rgb(var(--accent-rgb)) var(--fill), rgba(255, 255, 255, 0.16) var(--fill));
  }
  .sp-scrub::-moz-range-track {
    @apply h-1 rounded-full;
    background: linear-gradient(90deg, rgb(var(--accent-rgb)) var(--fill), rgba(255, 255, 255, 0.16) var(--fill));
  }
  .sp-scrub::-webkit-slider-thumb {
    @apply -mt-[5px] h-3.5 w-3.5 appearance-none rounded-full;
    background: #fff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
  }
  .sp-scrub::-moz-range-thumb {
    @apply h-3.5 w-3.5 rounded-full border-0;
    background: #fff;
  }
  .sp-times {
    @apply mt-0.5 flex justify-between text-[12px] tabular-nums;
    color: var(--ink-3);
  }
  .sp-transport {
    @apply mt-1 flex items-center justify-between px-1;
  }
  .sp-volume {
    @apply flex items-center gap-2.5;
    color: var(--ink-3);
  }
  .sp-volume-value {
    @apply w-10 flex-none text-right text-[13px] tabular-nums;
    color: var(--ink-2);
  }
  .sp-mode {
    @apply relative grid h-9 w-9 place-items-center rounded-full transition duration-150 active:scale-90;
    color: var(--ink-3);
  }
  .sp-mode.is-on {
    background: rgb(var(--accent-rgb) / 0.18);
    color: rgb(var(--accent-rgb));
  }
  .sp-mode:disabled {
    @apply opacity-50;
  }
  .sp-mode-one {
    @apply absolute right-0 top-0 grid h-[15px] min-w-[15px] place-items-center rounded-full px-[3px] text-[10px] font-bold leading-none;
    background: rgb(var(--accent-rgb));
    color: #0a0a0d;
  }
  .sp-playall {
    @apply mb-2 grid grid-cols-2 gap-2;
  }
  .sp-pill {
    @apply px-3 py-2.5 text-[15px] font-semibold;
    background: var(--group);
    color: rgb(var(--accent-rgb));
  }
  .sp-pill:disabled {
    @apply opacity-50;
  }
  .sp-skip {
    @apply grid h-11 w-11 place-items-center rounded-full transition duration-150 active:scale-90;
    color: var(--ink);
  }
  .sp-main {
    @apply grid h-14 w-14 place-items-center rounded-full transition duration-150 active:scale-90;
    background: rgb(var(--accent-rgb));
    color: #0a0a0d;
    box-shadow: 0 0 18px rgb(var(--accent-rgb) / 0.4);
  }
  .sp-skip:disabled, .sp-main:disabled {
    @apply opacity-50;
  }
  .sp-main-spinner {
    border-color: rgba(0, 0, 0, 0.2);
    border-top-color: #0a0a0d;
  }

  /* ---------- My music ---------- */
  .sp-head {
    @apply mb-1.5 flex items-baseline justify-between pr-4;
  }
  .sp-edit {
    @apply text-[15px];
    color: rgb(var(--accent-rgb));
  }
  .sp-track {
    @apply cursor-pointer;
  }
  .sp-track.is-editing {
    @apply cursor-default gap-3;
  }
  .sp-minus {
    @apply -ml-1 flex-none transition duration-150 active:scale-90;
  }
  .sp-delete {
    @apply flex-none rounded-[9px] px-3 py-1.5 text-[14px] font-semibold;
    background: #ff453a;
    color: #fff;
  }
  .sp-delete:disabled {
    @apply opacity-50;
  }
  .sp-bars {
    @apply flex h-9 w-9 flex-none items-end justify-center gap-[3px] pb-[11px];
  }
  .sp-bars i {
    @apply block w-[3px] rounded-full;
    height: 14px;
    background: rgb(var(--accent-rgb));
    transform-origin: bottom;
    animation: sp-bar 0.9s ease-in-out infinite;
  }
  .sp-bars i:nth-child(2) {
    animation-delay: -0.3s;
  }
  .sp-bars i:nth-child(3) {
    animation-delay: -0.6s;
  }
  @keyframes sp-bar {
    0%, 100% { transform: scaleY(0.3); }
    50% { transform: scaleY(1); }
  }
  @media (prefers-reduced-motion: reduce) {
    .sp-bars i {
      animation: none;
      transform: scaleY(0.7);
    }
  }
  .sp-empty {
    @apply rounded-[14px] px-4 py-4 text-[15px] leading-[1.4];
    background: var(--group);
    color: var(--ink-2);
  }
  .sp-row-spinner {
    @apply h-5 w-5 flex-none;
  }
  .sp-btn:disabled {
    @apply opacity-40;
  }
  .sp-apply {
    background: rgb(var(--accent-rgb) / 0.22);
    color: rgb(var(--accent-rgb));
  }
</style>
