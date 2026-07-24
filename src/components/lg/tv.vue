<script setup>
  import Device from "@/components/Device.vue";
  import Toggle from "@/components/controls/Toggle.vue";
  import {registry as Registry} from "@/registry";
  import {computed, onBeforeUnmount, onMounted, ref} from "vue";

  const props = defineProps({
    item: Object,
    device: Object
  });

  const POINTER_URL = 'ws://192.168.0.197:9090/pointer';
  const RECONNECT_INTERVAL = 15000;

  // --- touchpad state ---
  let ongoingTouches = [];
  let startX = 0;
  let startY = 0;
  let clientX = 0;
  let clientY = 0;

  const canvas = ref(null);

  // --- pointer websocket state ---
  let pointerSocket = null;
  let reconnectTimer = null;
  const connecting = ref(false);
  const connected = ref(false);

  // --- power toggle guard ---
  // Locks the power switch briefly after a command so a slow `enabled`
  // state update can't be mistaken for "still off" and toggled back off.
  const powerPending = ref(false);

  const send = (type, payload = {}) => {
    if (pointerSocket?.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = Object.entries(payload)
        .reduce((acc, [key, value]) => acc.concat([`${key}:${value}`]), [`type:${type}`])
        .join('\n') + '\n\n';

    pointerSocket.send(message);
  };

  const button = (name) => send('button', {name});
  const move = (dx, dy) => send('move', {dx, dy, drag: 0});
  const click = () => send('click');
  // eslint-disable-next-line no-unused-vars
  const scroll = (dx, dy) => send('scroll', {dx, dy});

  const copyTouch = ({identifier, pageX, pageY}) => ({identifier, pageX, pageY});

  const ongoingTouchIndexById = (idToFind) =>
      ongoingTouches.findIndex(touch => touch.identifier === idToFind);

  const handleStart = (evt) => {
    evt.preventDefault();

    if (evt.touches.length === 0) {
      return;
    }

    clientX = startX = evt.touches[0].clientX;
    clientY = startY = evt.touches[0].clientY;

    for (const touch of evt.changedTouches) {
      ongoingTouches.push(copyTouch(touch));
    }
  };

  const handleMove = (evt) => {
    evt.preventDefault();

    for (const touch of evt.changedTouches) {
      const idx = ongoingTouchIndexById(touch.identifier);

      if (idx < 0) {
        continue;
      }

      const deltaX = Math.round(touch.clientX - clientX);
      const deltaY = Math.round(touch.clientY - clientY);

      clientX = touch.clientX;
      clientY = touch.clientY;

      if (deltaX !== 0 || deltaY !== 0) {
        move(deltaX, deltaY);
      }

      ongoingTouches.splice(idx, 1, copyTouch(touch)); // swap in the new touch record
    }
  };

  const handleEnd = (evt) => {
    evt.preventDefault();

    const touch = evt.changedTouches[0];
    if (touch && touch.clientX - startX === 0 && touch.clientY - startY === 0) {
      click();
    }

    for (const t of evt.changedTouches) {
      const idx = ongoingTouchIndexById(t.identifier);
      if (idx >= 0) {
        ongoingTouches.splice(idx, 1); // remove it; we're done
      }
    }
  };

  const handleCancel = (evt) => {
    evt.preventDefault();

    for (const touch of evt.changedTouches) {
      const idx = ongoingTouchIndexById(touch.identifier);
      if (idx >= 0) {
        ongoingTouches.splice(idx, 1);
      }
    }
  };

  const foregroundAppInfo = computed(() =>
      props.device.properties.listLaunchPoints?.find(
          point => point.id === props.device.properties.foregroundApp
      )
  );

  const togglePower = async () => {
    if (powerPending.value) {
      return;
    }

    powerPending.value = true;
    const method = props.device.properties.enabled ? 'disable' : 'enable';

    try {
      await Registry.call(props.device.id, method);
    } finally {
      setTimeout(() => {
        powerPending.value = false;
      }, 4000);
    }
  };

  // --- pointer connection lifecycle ---
  const cleanupSocket = () => {
    if (!pointerSocket) {
      return;
    }

    pointerSocket.onopen = null;
    pointerSocket.onclose = null;
    pointerSocket.onmessage = null;
    pointerSocket.onerror = null;

    try {
      pointerSocket.close();
    } catch (e) { /* socket may already be closed */ }

    pointerSocket = null;
  };

  const connect = () => {
    if (connecting.value || connected.value) {
      return;
    }

    connecting.value = true;
    cleanupSocket();

    const socket = new WebSocket(POINTER_URL);
    pointerSocket = socket;

    // Guard every handler so a stale (replaced) socket can't flip our state.
    socket.onopen = () => {
      if (pointerSocket !== socket) return;
      connecting.value = false;
      connected.value = true;
    };

    socket.onclose = () => {
      if (pointerSocket !== socket) return;
      connecting.value = false;
      connected.value = false;
    };

    socket.onerror = () => {
      if (pointerSocket !== socket) return;
      connecting.value = false;
      connected.value = false;
    };
  };

  const disconnect = () => {
    connecting.value = false;
    connected.value = false;
    cleanupSocket();
  };

  const startReconnectLoop = () => {
    stopReconnectLoop();
    reconnectTimer = setInterval(connect, RECONNECT_INTERVAL);
    connect();
  };

  const stopReconnectLoop = () => {
    if (reconnectTimer) {
      clearInterval(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      stopReconnectLoop();
      disconnect();
    } else {
      startReconnectLoop();
    }
  };

  const handleBeforeUnload = () => {
    stopReconnectLoop();
    disconnect();
  };

  onMounted(() => {
    startReconnectLoop();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    canvas.value?.addEventListener('touchstart', handleStart, {passive: false});
    canvas.value?.addEventListener('touchend', handleEnd);
    canvas.value?.addEventListener('touchcancel', handleCancel);
    canvas.value?.addEventListener('touchmove', handleMove, {passive: false});
  });

  onBeforeUnmount(() => {
    stopReconnectLoop();
    disconnect();

    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('beforeunload', handleBeforeUnload);

    canvas.value?.removeEventListener('touchstart', handleStart);
    canvas.value?.removeEventListener('touchend', handleEnd);
    canvas.value?.removeEventListener('touchcancel', handleCancel);
    canvas.value?.removeEventListener('touchmove', handleMove);
  });
</script>

<template>
  <Device>
    <template #icon>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><path d="M55.53 384.447H83v44H55.53z" style="" fill="#89b4c9" data-original="#89b4c9"></path><path d="M55.53 409.657H83v18.79H55.53z" style="" fill="#618baa" data-original="#618baa"></path><path d="M440.14 384.447h27.46v44h-27.46z" style="" fill="#89b4c9" data-original="#89b4c9"></path><path d="M440.14 409.657h27.46v18.79h-27.46z" style="" fill="#618baa" data-original="#618baa"></path><path d="M7.5 70.772h497v322.136H7.5z" style="" fill="#385f82" data-original="#385f82"></path><path d="M7.5 70.77h497v285.99H7.5z" style="" fill="#159bff" data-original="#159bff" class=""></path><path d="M388.92 70.77 102.93 356.76H7.5v-.28L293.21 70.77zM444.819 70.77l-285.99 285.99h-33.315v-.28l285.71-285.71z" style="" fill="#4ad4ff" data-original="#4ad4ff"></path><path d="M113.457 200.958H70.188c-6.659 0-12.057-5.398-12.057-12.057v-43.269c0-6.659 5.398-12.057 12.057-12.057h43.269c6.659 0 12.057 5.398 12.057 12.057v43.269c0 6.659-5.398 12.057-12.057 12.057z" style="" fill="#ffb229" data-original="#ffb229"></path><path d="M226.21 145.63v43.27c0 6.66-5.4 12.06-12.06 12.06h-43.26c-2.25 0-4.36-.62-6.17-1.7a12.03 12.03 0 0 1-5.89-10.36v-43.27c0-6.66 5.4-12.05 12.06-12.05h43.26c4.41 0 8.26 2.36 10.36 5.89 1.08 1.8 1.7 3.91 1.7 6.16z" style="" fill="#4ad4ff" data-original="#4ad4ff"></path><path d="M224.51 139.469c1.08 1.8 1.7 3.91 1.7 6.16v43.27c0 6.66-5.4 12.06-12.06 12.06h-43.26c-2.25 0-4.36-.62-6.17-1.7l59.79-59.79z" style="" fill="#9fedff" data-original="#9fedff"></path><path d="M326.91 145.63v43.27c0 6.66-5.4 12.06-12.06 12.06h-43.27c-3.53 0-6.71-1.52-8.91-3.94a12.035 12.035 0 0 1-3.14-8.12v-43.27c0-6.66 5.39-12.05 12.05-12.05h43.27c3.13 0 5.98 1.19 8.12 3.14a12.01 12.01 0 0 1 3.94 8.91z" style="" fill="#c8c8c8" data-original="#c8c8c8"></path><path d="M326.91 155.08v33.599l-12.28 12.28h-33.6zM322.97 136.719l-60.3 60.3a12.035 12.035 0 0 1-3.14-8.12v-43.27c0-6.66 5.39-12.05 12.05-12.05h43.27c3.13.001 5.98 1.191 8.12 3.14z" style="" fill="#e3e3e3" data-original="#e3e3e3"></path><path d="M125.51 238.48v43.42c0 6.66-5.39 12.06-12.05 12.06H70.19c-.05 0-.11 0-.16-.01-6.59-.08-11.9-5.44-11.9-12.05v-43.27c0-6.66 5.4-12.05 12.06-12.05h43.27c6.61 0 11.97 5.31 12.05 11.9z" style="" fill="#00d8e0" data-original="#00d8e0"></path><path d="m70.03 293.949 55.48-55.47v43.42c0 6.66-5.39 12.06-12.05 12.06H70.19a.718.718 0 0 1-.16-.01z" style="" fill="#7df4f1" data-original="#7df4f1"></path><path d="M226.21 238.63v43.27c0 6.66-5.4 12.06-12.06 12.06h-43.26a12.055 12.055 0 0 1-12.06-12.06v-43.27c0-6.66 5.4-12.05 12.06-12.05h43.26c5.13 0 9.51 3.19 11.25 7.71.52 1.34.81 2.81.81 4.34z" style="" fill="#a6d674" data-original="#a6d674"></path><path d="m225.4 234.29-58.86 58.86a12.055 12.055 0 0 1-7.71-11.25v-43.27c0-6.66 5.4-12.05 12.06-12.05h43.26c5.13 0 9.51 3.19 11.25 7.71zM188.03 293.96l38.18-38.18v26.12c0 6.66-5.4 12.06-12.06 12.06h-26.12z" style="" fill="#c4e57e" data-original="#c4e57e"></path><path d="M326.91 238.63v43.27c0 6.66-5.4 12.06-12.06 12.06h-43.27c-6.66 0-12.05-5.4-12.05-12.06v-43.27c0-6.66 5.39-12.05 12.05-12.05h43.27c6.66 0 12.06 5.389 12.06 12.05z" style="" fill="#fd6568" data-original="#fd6568"></path><path d="M271.58 226.58h17.43l-29.48 29.48v-17.43c0-6.661 5.39-12.05 12.05-12.05z" style="" fill="#ff838f" data-original="#ff838f"></path><path d="M113.457 208.458H70.188c-10.784 0-19.557-8.773-19.557-19.557v-43.269c0-10.784 8.773-19.557 19.557-19.557h43.269c10.784 0 19.557 8.773 19.557 19.557v43.269c0 10.784-8.773 19.557-19.557 19.557zm-43.269-67.383a4.562 4.562 0 0 0-4.557 4.557v43.269a4.562 4.562 0 0 0 4.557 4.557h43.269a4.562 4.562 0 0 0 4.557-4.557v-43.269a4.562 4.562 0 0 0-4.557-4.557H70.188zM214.154 208.458h-43.269c-10.784 0-19.557-8.773-19.557-19.557v-43.269c0-10.784 8.773-19.557 19.557-19.557h43.269c10.784 0 19.557 8.773 19.557 19.557v43.269c0 10.784-8.773 19.557-19.557 19.557zm-43.269-67.383a4.562 4.562 0 0 0-4.557 4.557v43.269a4.562 4.562 0 0 0 4.557 4.557h43.269a4.562 4.562 0 0 0 4.557-4.557v-43.269a4.562 4.562 0 0 0-4.557-4.557h-43.269zM314.852 208.458h-43.269c-10.784 0-19.557-8.773-19.557-19.557v-43.269c0-10.784 8.773-19.557 19.557-19.557h43.269c10.784 0 19.557 8.773 19.557 19.557v43.269c-.001 10.784-8.774 19.557-19.557 19.557zm-43.269-67.383a4.562 4.562 0 0 0-4.557 4.557v43.269a4.562 4.562 0 0 0 4.557 4.557h43.269a4.562 4.562 0 0 0 4.557-4.557v-43.269a4.562 4.562 0 0 0-4.557-4.557h-43.269zM113.457 301.458H70.188c-10.784 0-19.557-8.773-19.557-19.557v-43.269c0-10.784 8.773-19.557 19.557-19.557h43.269c10.784 0 19.557 8.773 19.557 19.557v43.269c0 10.784-8.773 19.557-19.557 19.557zm-43.269-67.383a4.562 4.562 0 0 0-4.557 4.557v43.269a4.562 4.562 0 0 0 4.557 4.557h43.269a4.562 4.562 0 0 0 4.557-4.557v-43.269a4.562 4.562 0 0 0-4.557-4.557H70.188zM214.154 301.458h-43.269c-10.784 0-19.557-8.773-19.557-19.557v-43.269c0-10.784 8.773-19.557 19.557-19.557h43.269c10.784 0 19.557 8.773 19.557 19.557v43.269c0 10.784-8.773 19.557-19.557 19.557zm-43.269-67.383a4.562 4.562 0 0 0-4.557 4.557v43.269a4.562 4.562 0 0 0 4.557 4.557h43.269a4.562 4.562 0 0 0 4.557-4.557v-43.269a4.562 4.562 0 0 0-4.557-4.557h-43.269zM314.852 301.458h-43.269c-10.784 0-19.557-8.773-19.557-19.557v-43.269c0-10.784 8.773-19.557 19.557-19.557h43.269c10.784 0 19.557 8.773 19.557 19.557v43.269c-.001 10.784-8.774 19.557-19.557 19.557zm-43.269-67.383a4.562 4.562 0 0 0-4.557 4.557v43.269a4.562 4.562 0 0 0 4.557 4.557h43.269a4.562 4.562 0 0 0 4.557-4.557v-43.269a4.562 4.562 0 0 0-4.557-4.557h-43.269z" fill="#000000" opacity="1" data-original="#000000" class=""></path><path d="M15 421.654h482v19.573H15z" style="" fill="#89b4c9" data-original="#89b4c9"></path><path d="M504.5 146.587a7.5 7.5 0 0 0-7.5 7.5V349.26H15V78.272h147.911a7.5 7.5 0 0 0 0-15H7.5a7.5 7.5 0 0 0-7.5 7.5v322.136a7.5 7.5 0 0 0 7.5 7.5h40.535v13.746H15a7.5 7.5 0 0 0-7.5 7.5v19.573a7.5 7.5 0 0 0 7.5 7.5h482a7.5 7.5 0 0 0 7.5-7.5v-19.573a7.5 7.5 0 0 0-7.5-7.5h-21.899v-13.746H504.5a7.5 7.5 0 0 0 7.5-7.5V154.087a7.5 7.5 0 0 0-7.5-7.5zM63.035 400.408H75.5v13.746H63.035v-13.746zM90.5 414.154v-13.746h342.136v13.746H90.5zm399 19.574h-467v-4.573h467v4.573zm-29.399-19.574h-12.465v-13.746h12.465v13.746zM15 385.408V364.26h482v21.148H15z" fill="#000000" opacity="1" data-original="#000000" class=""></path><path d="M197.089 78.272h42.822a7.5 7.5 0 0 0 0-15h-42.822a7.5 7.5 0 0 0 0 15zM504.5 63.272H274.089a7.5 7.5 0 0 0 0 15H497v41.637a7.5 7.5 0 0 0 15 0V70.772a7.5 7.5 0 0 0-7.5-7.5zM449.239 226.208a7.499 7.499 0 0 0-.918-10.566c-20.972-17.619-55.095-17.619-76.066 0a7.499 7.499 0 0 0-.918 10.566 7.498 7.498 0 0 0 10.566.918c15.651-13.148 41.118-13.148 56.77 0a7.469 7.469 0 0 0 4.82 1.758 7.488 7.488 0 0 0 5.746-2.676z" fill="#000000" opacity="1" data-original="#000000" class=""></path><path d="M459.611 200.824a7.501 7.501 0 0 0-.918-10.567c-12.99-10.913-30.181-16.923-48.405-16.923-18.225 0-35.415 6.01-48.405 16.924a7.499 7.499 0 0 0 4.828 13.242 7.467 7.467 0 0 0 4.82-1.758c21.37-17.953 56.141-17.954 77.513 0a7.5 7.5 0 0 0 10.567-.918zM438.03 240.957c-15.557-13.068-39.927-13.068-55.484 0a7.5 7.5 0 0 0 9.649 11.485c9.807-8.239 26.379-8.24 36.187 0a7.47 7.47 0 0 0 4.82 1.757 7.5 7.5 0 0 0 4.828-13.242z" fill="#000000" opacity="1" data-original="#000000" class=""></path></g></svg>
    </template>

    <template #title>
      {{ item.name }}
    </template>

    <template #status>
      <span v-if="device.properties.enabled" class="inline-flex items-center gap-1.5">
        <img v-if="foregroundAppInfo" :src="foregroundAppInfo.icon" class="h-4 w-4 rounded" alt="">
        <span class="truncate">{{ foregroundAppInfo?.title || 'Home' }}</span>
        <span class="text-gray-300">•</span>
        <span class="whitespace-nowrap">Vol {{ device.properties.volume }}</span>
      </span>
      <span v-else class="text-gray-400">Standby</span>
    </template>

    <template #action>
      <Toggle
          v-on:click="togglePower"
          :value="device.properties.enabled"></Toggle>
    </template>

    <template #extended>
      <div class="remote -m-4 flex min-h-[100dvh] flex-col gap-4 p-5 text-zinc-200 sm:min-h-0">

        <!-- Header -->
        <div class="pr-10">
          <div class="flex items-center gap-2.5">
            <span class="relative flex h-2.5 w-2.5">
              <span v-if="device.properties.enabled" class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60"></span>
              <span class="relative inline-flex h-2.5 w-2.5 rounded-full" :class="device.properties.enabled ? 'bg-emerald-400' : 'bg-zinc-600'"></span>
            </span>
            <h3 class="truncate text-base font-semibold text-white">{{ item.name }}</h3>
          </div>
          <div class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
            <span class="inline-flex items-center gap-1.5">
              <img v-if="foregroundAppInfo" :src="foregroundAppInfo.icon" class="h-4 w-4 rounded" alt="">
              {{ foregroundAppInfo?.title || (device.properties.enabled ? 'Home' : 'Standby') }}
            </span>
            <span class="text-zinc-700">•</span>
            <span class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5"
                  :class="connected ? 'bg-emerald-500/10 text-emerald-300' : connecting ? 'bg-amber-500/10 text-amber-300' : 'bg-zinc-500/10 text-zinc-400'">
              <span class="h-1.5 w-1.5 rounded-full" :class="connected ? 'bg-emerald-400' : connecting ? 'animate-pulse bg-amber-400' : 'bg-zinc-500'"></span>
              {{ connected ? 'Connected' : connecting ? 'Connecting…' : 'Offline' }}
            </span>
          </div>
        </div>

        <!-- Top actions -->
        <div class="grid grid-cols-4 gap-2">
          <button type="button" @click="togglePower" :disabled="powerPending" class="group flex flex-col items-center gap-1.5 disabled:opacity-60">
            <span class="flex h-12 w-12 items-center justify-center rounded-2xl border transition duration-150 active:scale-95"
                  :class="device.properties.enabled
                    ? 'power-on border-red-400/40 bg-gradient-to-b from-red-500 to-red-600 text-white'
                    : 'border-white/10 bg-white/5 text-zinc-300 group-hover:bg-white/10'">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M12 3v9"/><path d="M6.6 6.6a8 8 0 1 0 10.8 0"/></svg>
            </span>
            <span class="text-[10px] font-medium text-zinc-500">Power</span>
          </button>

          <button type="button" @click="button('HOME')" class="group flex flex-col items-center gap-1.5">
            <span class="keycap">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.2V20h13v-9.8"/></svg>
            </span>
            <span class="text-[10px] font-medium text-zinc-500">Home</span>
          </button>

          <button type="button" @click="button('MENU')" class="group flex flex-col items-center gap-1.5">
            <span class="keycap">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </span>
            <span class="text-[10px] font-medium text-zinc-500">Settings</span>
          </button>

          <button type="button" @click="button('BACK')" class="group flex flex-col items-center gap-1.5">
            <span class="keycap">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg>
            </span>
            <span class="text-[10px] font-medium text-zinc-500">Back</span>
          </button>
        </div>

        <!-- D-pad -->
        <div class="flex justify-center py-1">
          <div class="dpad relative grid aspect-square w-56 max-w-[72%] grid-cols-3 grid-rows-3 place-items-center rounded-full p-2">
            <button type="button" @click="button('UP')" class="dpad-btn col-start-2 row-start-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6"><path d="m6 15 6-6 6 6"/></svg>
            </button>
            <button type="button" @click="button('LEFT')" class="dpad-btn col-start-1 row-start-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6"><path d="m15 6-6 6 6 6"/></svg>
            </button>
            <button type="button" @click="button('ENTER')" class="dpad-ok col-start-2 row-start-2">OK</button>
            <button type="button" @click="button('RIGHT')" class="dpad-btn col-start-3 row-start-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6"><path d="m9 6 6 6-6 6"/></svg>
            </button>
            <button type="button" @click="button('DOWN')" class="dpad-btn col-start-2 row-start-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6"><path d="m6 9 6 6 6-6"/></svg>
            </button>
          </div>
        </div>

        <!-- Touchpad -->
        <div class="flex min-h-[150px] flex-1 flex-col">
          <div ref="canvas" class="touchpad relative flex flex-1 select-none items-center justify-center rounded-3xl" style="touch-action: none;">
            <span class="pointer-events-none flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-600">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              Touchpad
            </span>
          </div>
        </div>

        <!-- Volume rocker -->
        <div class="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-2">
          <button type="button" @click="Registry.call(device.id, 'volumeDown')" class="rbtn h-11 w-11 shrink-0 rounded-xl">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="h-5 w-5"><path d="M5 12h14"/></svg>
          </button>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between text-xs text-zinc-400">
              <span class="inline-flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>
                Volume
              </span>
              <span class="font-semibold text-white">{{ device.properties.muted ? 'Muted' : device.properties.volume }}</span>
            </div>
            <div class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div class="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 transition-all duration-300"
                   :class="{'opacity-30': device.properties.muted}"
                   :style="{ width: Math.max(0, Math.min(100, device.properties.volume)) + '%' }"></div>
            </div>
          </div>
          <button type="button" @click="Registry.call(device.id, 'volumeUp')" class="rbtn h-11 w-11 shrink-0 rounded-xl">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="h-5 w-5"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>

        <!-- Quick actions -->
        <div class="grid grid-cols-4 gap-2">
          <button type="button" @click="Registry.call(device.id, 'toggleMute')" class="rbtn h-12 rounded-2xl"
                  :class="device.properties.muted ? '!border-red-400/30 !bg-red-500/20 text-red-300' : ''">
            <svg v-if="device.properties.muted" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="m22 9-6 6M16 9l6 6"/></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 6a8 8 0 0 1 0 12"/></svg>
          </button>
          <button type="button" @click="Registry.call(device.id, 'play')" class="rbtn h-12 rounded-2xl">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5"><path d="M6 4.5v15a1 1 0 0 0 1.53.85l12-7.5a1 1 0 0 0 0-1.7l-12-7.5A1 1 0 0 0 6 4.5z"/></svg>
          </button>
          <button type="button" @click="Registry.call(device.id, 'pause')" class="rbtn h-12 rounded-2xl">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5"><rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/></svg>
          </button>
          <button type="button" @click="Registry.call(device.id, 'openApp', {value: 'com.webos.app.photovideo'})" class="rbtn h-12 rounded-2xl">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
          </button>
        </div>

        <!-- App launcher -->
        <div v-if="(device.properties.listLaunchPoints || []).length" class="-mx-1">
          <div class="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Apps</div>
          <div class="apps-scroll flex gap-2 overflow-x-auto px-1 pb-1">
            <button type="button" v-for="lp in device.properties.listLaunchPoints" :key="lp.id"
                    @click="Registry.call(device.id, 'openApp', {value: lp.id})"
                    class="flex w-[68px] shrink-0 flex-col items-center gap-1.5 rounded-2xl border p-2 transition active:scale-95"
                    :class="lp.id === device.properties.foregroundApp ? 'border-sky-400/50 bg-sky-400/10' : 'border-white/10 bg-white/5 hover:bg-white/10'">
              <img :src="lp.icon" :alt="lp.title" class="h-10 w-10 rounded-xl object-cover">
              <span class="w-full truncate text-center text-[10px] text-zinc-300">{{ lp.title }}</span>
            </button>
          </div>
        </div>

      </div>
    </template>
  </Device>
</template>

<style scoped>
  .remote {
    background:
      radial-gradient(130% 90% at 50% -10%, rgba(80, 90, 120, 0.28) 0%, rgba(20, 20, 26, 0) 55%),
      linear-gradient(180deg, #17171c 0%, #0d0d11 100%);
  }

  /* Square icon key (Home / Settings / Back) */
  .keycap {
    @apply flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-300 shadow-sm transition duration-150 active:scale-95;
  }
  .group:hover .keycap {
    @apply border-white/20 bg-white/10 text-white;
  }

  /* Generic round/rounded control button */
  .rbtn {
    @apply flex items-center justify-center border border-white/10 bg-white/5 text-zinc-200 shadow-sm transition duration-150 hover:bg-white/10 hover:text-white active:scale-95;
  }

  /* D-pad */
  .dpad {
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: radial-gradient(circle at 50% 34%, #2a2a33 0%, #16161b 70%);
    box-shadow:
      inset 0 2px 6px rgba(0, 0, 0, 0.55),
      inset 0 -2px 4px rgba(255, 255, 255, 0.04),
      0 10px 26px rgba(0, 0, 0, 0.5);
  }
  .dpad-btn {
    @apply flex h-full w-full items-center justify-center rounded-2xl text-zinc-300 transition duration-150 hover:bg-white/10 hover:text-white active:scale-90;
  }
  .dpad-ok {
    height: 100%;
    width: 100%;
    @apply flex items-center justify-center rounded-full text-sm font-semibold tracking-wide text-white transition duration-150 active:scale-95;
    background: radial-gradient(circle at 50% 35%, #2f2f38 0%, #17171c 75%);
    box-shadow:
      0 0 0 1px rgba(56, 189, 248, 0.35),
      0 0 18px rgba(56, 189, 248, 0.32),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }
  .dpad-ok:hover {
    box-shadow:
      0 0 0 1px rgba(56, 189, 248, 0.55),
      0 0 24px rgba(56, 189, 248, 0.45),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  /* Power button glow when the TV is on */
  .power-on {
    box-shadow:
      0 0 0 1px rgba(248, 113, 113, 0.5),
      0 0 22px 1px rgba(239, 68, 68, 0.45);
  }

  /* Touchpad surface */
  .touchpad {
    background-color: #0e0e13;
    background-image: radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px);
    background-size: 16px 16px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.05),
      inset 0 0 44px rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.06);
  }
  .touchpad:active {
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.06),
      inset 0 0 60px rgba(56, 189, 248, 0.12);
  }

  /* Hide the app-row scrollbar */
  .apps-scroll {
    scrollbar-width: none;
  }
  .apps-scroll::-webkit-scrollbar {
    display: none;
  }
</style>
