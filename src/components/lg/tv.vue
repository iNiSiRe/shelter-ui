<script setup>
  import Device from "@/components/Device.vue";
  import Toggle from "@/components/controls/Toggle.vue";
  import List from "@/components/properties/List.vue";
  import Section from "@/components/properties/Section.vue";
  import {registry as Registry} from "@/registry";
  import {computed, onBeforeUnmount, onMounted, ref} from "vue";

  const props = defineProps({
    item: Object,
    device: Object
  });

  let ongoingTouches = [];
  let startX = undefined;
  let startY = undefined;
  let clientX = undefined;
  let clientY = undefined;
  let lastDeltaY = 0;
  let lastDeltaX = 0;
  let interval = undefined;

  const canvas = ref(null)

  onMounted(() => {
    canvas.value.addEventListener('touchstart', handleStart);
    canvas.value.addEventListener('touchend', handleEnd);
    canvas.value.addEventListener('touchcancel', handleCancel);
    canvas.value.addEventListener('touchmove', handleMove);
  })
  
  onBeforeUnmount(() => {
    canvas.value.removeEventListener('touchstart', handleStart)
    canvas.value.removeEventListener('touchend', handleEnd)
    canvas.value.removeEventListener('touchcancel', handleCancel)
    canvas.value.removeEventListener('touchmove', handleMove)
  })

  const handleStart = (evt) => {
    evt.preventDefault();
    const touches = evt.changedTouches;

    clientX = startX = evt.touches[0].clientX;
    clientY = startY = evt.touches[0].clientY;

    for (let i = 0; i < touches.length; i++) {
      ongoingTouches.push(copyTouch(touches[i]));
    }
  };

  const copyTouch = ({identifier, pageX, pageY}) => {
    return {identifier, pageX, pageY};
  };

  const ongoingTouchIndexById = (idToFind) => {
    for (let i = 0; i < ongoingTouches.length; i++) {
      const id = ongoingTouches[i].identifier;

      if (id === idToFind) {
        return i;
      }
    }
    return -1;
  }

  const button = (name) => {
    const payload = {
      name: name
    }

    const message =
        Object.keys(payload)
            .reduce(function (acc, k) {
              return acc.concat([k + ':' + payload[k]]);
            }, ['type:' + 'button'])
            .join('\n') + '\n\n';

    if (special?.readyState === WebSocket.OPEN) {
      special.send(message)
    }
  };

  const move = (dx, dy) => {
    const payload = {
      dx: dx,
      dy: dy,
      drag: 0,
    }
    const message =
        Object.keys(payload)
            .reduce(function (acc, k) {
              return acc.concat([k + ':' + payload[k]]);
            }, ['type:' + 'move'])
            .join('\n') + '\n\n';

    if (special?.readyState === WebSocket.OPEN) {
      special.send(message)
    }
  }

  const handleMove = (evt) => {
    evt.preventDefault();

    const touches = evt.changedTouches;

    for (let i = 0; i < touches.length; i++) {
      const idx = ongoingTouchIndexById(touches[i].identifier);

      if (idx >= 0) {
        const deltaX = Math.round((touches[i].clientX - clientX))
        const deltaY = Math.round((touches[i].clientY - clientY))

        clientX = touches[i].clientX;
        clientY = touches[i].clientY;

        if ((deltaX !== 0 && lastDeltaX !== deltaX) || (deltaY !== 0 && lastDeltaY !== deltaY)) {
          move(deltaX, deltaY)
        }

        ongoingTouches.splice(idx, 1, copyTouch(touches[i]));  // swap in the new touch record
      } else {
        console.log('can\'t figure out which touch to continue');
      }
    }
  };

  const handleEnd = (evt) => {
    evt.preventDefault();

    lastDeltaY = 0;
    lastDeltaX = 0;

    const touches = evt.changedTouches;

    if (evt.changedTouches[0].clientX - startX === 0 && evt.changedTouches[0].clientY - startY === 0) {
      click()
    }

    for (let i = 0; i < touches.length; i++) {
      let idx = ongoingTouchIndexById(touches[i].identifier);
      if (idx >= 0) {
        ongoingTouches.splice(idx, 1);  // remove it; we're done
      } else {
        console.log('can\'t figure out which touch to end');
      }
    }
  };

  const handleCancel = (evt) => {
    evt.preventDefault();
    const touches = evt.changedTouches;

    for (let i = 0; i < touches.length; i++) {
      let idx = ongoingTouchIndexById(touches[i].identifier);
      ongoingTouches.splice(idx, 1);
    }
  };

  const click = () => {
    const payload = {}
    const message =
        Object.keys(payload)
            .reduce(function (acc, k) {
              return acc.concat([k + ':' + payload[k]]);
            }, ['type:' + 'click'])
            .join('\n') + '\n\n';

    if (special?.readyState === WebSocket.OPEN) {
      special.send(message)
    }
  };
  
  const scroll = (dx, dy) => {
    const payload = {
      dx: dx,
      dy: dy,
    }
    const message =
        Object.keys(payload)
            .reduce(function (acc, k) {
              return acc.concat([k + ':' + payload[k]]);
            }, ['type:' + 'scroll'])
            .join('\n') + '\n\n';

    if (special?.readyState === WebSocket.OPEN) {
      special.send(message)
    }
  };

  const foregroundAppInfo = computed(() => {
    return props.device.properties.listLaunchPoints.find(point => point.id === props.device.properties.foregroundApp)
  });

  // if (props.device.properties.socketPath) {
  const special = new WebSocket('ws://127.0.0.1:9090/pointer');

  special.onopen = function () {
    console.log("Special Соединение установлено.");
  };

  special.onclose = function (event) {
    if (event.wasClean) {
      console.log('Special Соединение закрыто чисто');
    } else {
      console.log('Special Обрыв соединения'); // например, "убит" процесс сервера
    }
    console.log('Special Код: ' + event.code + ' причина: ' + event.reason);
  };

  special.onmessage = function (event) {
    console.log("Special Получены данные " + event.data);
  };

  special.onerror = function (error) {
    console.log("Special Ошибка " + error.message);
  };
  // }

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
      <div class="flex flex-row place-items-center gap-2">
        <img style="height: 20px" :src="foregroundAppInfo?.icon" alt="icon">
        <span class="flex flex-row place-items-center gap-2">{{ foregroundAppInfo?.title }} | <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="height: 20px;enable-background:new 0 0 512 512" xml:space="preserve"><g><linearGradient id="a" x1="12" x2="12" y1="2" y2="22" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#00bcd4"></stop><stop offset="1" stop-color="#1976d2"></stop></linearGradient><path fill="url(#a)" d="M18.36 19.36a1 1 0 0 1-.705-1.71C19.167 16.148 20 14.142 20 12s-.833-4.148-2.345-5.65a1 1 0 0 1 1.41-1.42C20.958 6.813 22 9.323 22 12s-1.042 5.188-2.935 7.07a.998.998 0 0 1-.705.29zm-2.127-3.12C17.356 15.13 18 13.586 18 12s-.644-3.13-1.767-4.24a1 1 0 0 0-1.406 1.421C15.572 9.918 16 10.946 16 12s-.428 2.082-1.173 2.819a1 1 0 1 0 1.406 1.422zm-3.85 5.684A1 1 0 0 0 13 21V3a1 1 0 0 0-1.707-.707L6.586 7H4c-1.103 0-2 .897-2 2v6c0 1.103.897 2 2 2h2.586l4.707 4.707a1 1 0 0 0 1.09.217zM7 9a1 1 0 0 0 .707-.293L11 5.414v13.172l-3.293-3.293A1 1 0 0 0 7 15H4V9z" opacity="1" data-original="url(#a)"></path></g></svg> {{ device.properties.volume }}</span>
      </div>
    </template>

    <template #action>
      <Toggle
          v-on:click="Registry.call(device.id, device.properties.enabled ? 'disable' : 'enable')"
          :value="device.properties.enabled"></Toggle>
    </template>

    <template #extended>
      <Section>
        <List>
<!--          <Item label="Volume">-->
<!--            <CounterInput v-on:update:value="value => Bus.execute(device.id, 'setVolume', {value: value})" v-model:value="device.properties.volume" :min="0" :max="99"></CounterInput>-->
<!--          </Item>-->
<!--          <Item label="Last update">-->
<!--            <LastUpdate :timestamp="device.properties.updatedAt"></LastUpdate>-->
<!--          </item>-->
          <div class="flex gap-1">
            <div class="max-w-xs flex flex-col rounded-lg shadow-sm flex-grow">
              <button @click.self="Registry.call(device.id, 'volumeUp')" type="button" class="flex justify-center py-3 px-4 items-center gap-x-2 rounded-t-md text-sm font-medium focus:z-10 border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800 dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600">
                +
              </button>
              <button @click.self="Registry.call(device.id, 'volumeDown')" type="button" class="flex justify-center py-3 px-4 items-center gap-x-2 rounded-b-md text-sm font-medium focus:z-10 border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800 dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600">
                -
              </button>
            </div>
            <div class="max-w-xs flex flex-col rounded-lg shadow-sm">
              <button @click.self="Registry.call(device.id, 'play')" type="button" class="flex justify-center py-3 px-4 items-center gap-x-2 rounded-t-md text-sm font-medium focus:z-10 border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800 dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600">
                Play
              </button>
              <button @click.self="Registry.call(device.id, 'pause')" type="button" class="flex justify-center py-3 px-4 items-center gap-x-2 rounded-b-md text-sm font-medium focus:z-10 border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800 dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600">
                Pause
              </button>
            </div>
            <div class="max-w-xs flex flex-col rounded-lg shadow-sm">
              <button @click.self="Registry.call(device.id, 'openApp', {value: 'com.webos.app.photovideo'})" type="button" class="flex justify-center py-3 px-4 items-center gap-x-2 rounded-t-md text-sm font-medium focus:z-10 border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800 dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600">
                Gallery
              </button>
              <button @click.self="Registry.call(device.id, 'toggleMute')" type="button" class="flex justify-center py-3 px-4 items-center gap-x-2 rounded-b-md text-sm font-medium focus:z-10 border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800 dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600">
                {{ device.properties.muted ? 'Unmute' : 'Mute' }}
              </button>
            </div>
            <div class="max-w-xs flex flex-col rounded-lg shadow-sm">
              <button @click.self="button('HOME')" type="button" class="flex flex-grow justify-center py-3 px-4 items-center gap-x-2 rounded-t-md rounded-b-md text-sm font-medium focus:z-10 border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800 dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600">
                Home
              </button>
            </div>
          </div>
          <div>
          <div class="flex flex-grow gap-1">
            <button @click.self="button('BACK')" type="button" class="w-1 flex justify-center flex-grow py-3 px-4 items-center gap-x-2 rounded-t-md rounded-b-md text-sm font-medium focus:z-10 border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800 dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600">
              Back
            </button>
            <button @click.self="button('MENU')" type="button" class="w-1 flex justify-center flex-grow py-3 px-4 items-center gap-x-2 rounded-t-md rounded-b-md text-sm font-medium focus:z-10 border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800 dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600">
              Settings
            </button>
          </div>
          </div>
          <div ref="canvas" style="min-height: 300px; height: 300px; width: 100%; background: grey; margin-top: 10px;"></div>
          <div class="flex justify-center">
            <svg style="width: 75%;" class="" viewBox="-5 -5 150 150" preserveAspectRatio="xMidYMin">
              <defs>
              </defs>
              <path @click="button('UP')"
                    d="M 20.143 20.608 C 46.708 -5.699 89.622 -5.373 115.857 20.608 L 68 68 L 20.143 20.608"
                    fill="rgba(255,255,255,0.8)" style="stroke: #273134;"></path>
              <path @click="button('DOWN')"
                    d="M 20.143 87.607 C 46.708 61.301 89.622 61.626 115.857 87.607 L 68 135 L 20.143 87.607"
                    fill="rgba(255,255,255,0.8)" style="stroke: #273134;"
                    transform="matrix(-1, 0, 0, -1, 136.000004, 202.999184)"></path>
              <path @click="button('RIGHT')"
                    d="M 53.643 54.108 C 80.208 27.801 123.121 28.126 149.356 54.108 L 101.5 101.5 L 53.643 54.108"
                    fill="rgba(255,255,255,0.8)" style="stroke: #273134;"
                    transform="matrix(0, 1, -1, 0, 169.499218, -33.499783)"></path>
              <path @click="button('LEFT')"
                    d="M -13.356 54.108 C 13.209 27.801 56.122 28.126 82.357 54.108 L 34.5 101.5 L -13.356 54.108"
                    fill="rgba(255,255,255,0.8)" style="stroke: #273134;"
                    transform="matrix(0, -1, 1, 0, -33.499215, 102.50022)"></path>
              <ellipse @click="button('ENTER')"
                       style="stroke: #273134; stroke-width: 2px; paint-order: fill; fill: #273134;" cx="68"
                       cy="68"
                       rx="24" ry="24"></ellipse>

              <polyline @click="button('RIGHT')" style="stroke: #273134; fill: none;"
                        points="117.881 63.062 109.974 64.636 108.56 73.232 108.56 73.232"
                        transform="matrix(-0.731353, 0.681999, -0.681999, -0.731353, 242.500846, 40.770254)"></polyline>
              <polyline @click="button('LEFT')" style="stroke: #273134; fill: none;"
                        points="27.881 63.062 19.974 64.636 18.56 73.232 18.56 73.232"
                        transform="matrix(0.731353, -0.681999, 0.681999, 0.731353, -40.238072, 34.143839)"></polyline>
              <polyline @click="button('UP')" style="stroke: #273134; fill: none;"
                        points="71.881 16.062 63.974 17.636 62.56 26.232 62.56 26.232"
                        transform="matrix(0.681999, 0.731353, -0.731353, 0.681999, 36.842109, -42.437153)"></polyline>
              <polyline @click="button('DOWN')" style="stroke: #273134; fill: none;"
                        points="71.881 111.062 63.974 112.636 62.56 121.232 62.56 121.232"
                        transform="matrix(-0.681999, -0.731353, 0.731353, -0.681999, 28.120345, 244.521058)"></polyline>

            </svg>
          </div>
          <div class="flex flex-wrap justify-center">
            <div @click="Registry.call(device.id, 'openApp', {value: listLaunchPoint.id})" :key="listLaunchPoint.id" style="max-width: 90px"
                 v-for="listLaunchPoint in device.properties.listLaunchPoints"
                 class="m-2 border-1 border-dark flex-grow flex flex-col justify-center items-center flex-wrap">
              <img :src="listLaunchPoint.icon" :alt="listLaunchPoint.id" height="50" width="50">
              <span class="text-center" style="font-size: 10px">{{ listLaunchPoint.title }}</span>
            </div>
          </div>
        </List>
      </Section>
    </template>
  </Device>
</template>

<style scoped>

</style>