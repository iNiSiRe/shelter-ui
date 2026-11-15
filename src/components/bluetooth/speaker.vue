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
    if (current.value) {
      return p.value.songStartedAt ? `Грає · ${current.value.title}` : 'Готую мелодію…';
    }
    if (connecting.value) {
      return 'Підключаю…';
    }
    if (!connected.value) {
      return 'Не підключена';
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
          <li v-if="connected && Number.isFinite(p.volume)" class="field-row !block">
            <span class="field-label">Гучність</span>
            <div class="sp-level">
              <input type="range" min="0" max="100" step="1" aria-label="Гучність"
                     :value="dragVolume ?? p.volume"
                     @input="dragVolume = $event.target.valueAsNumber"
                     @change="setVolume($event.target.valueAsNumber)">
              <span class="sp-level-value">{{ dragVolume ?? p.volume }}%</span>
            </div>
          </li>
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
  .sp-level {
    @apply mt-2 flex items-center gap-3;
  }
  .sp-level input {
    @apply h-1.5 flex-1 cursor-pointer;
    accent-color: rgb(var(--accent-rgb));
  }
  .sp-level-value {
    @apply w-11 text-right text-[15px] tabular-nums;
    color: var(--ink-2);
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
  .sp-btn:disabled {
    @apply opacity-40;
  }
  .sp-apply {
    background: rgb(var(--accent-rgb) / 0.22);
    color: rgb(var(--accent-rgb));
  }
</style>
