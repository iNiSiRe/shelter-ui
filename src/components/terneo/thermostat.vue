<script setup>
  import {computed, ref} from "vue";
  import Device from "@/components/Device.vue";
  import Toggle from "@/components/controls/Toggle.vue";
  import List from "@/components/properties/List.vue";
  import Item from "@/components/properties/Item.vue";
  import Section from "@/components/properties/Section.vue";
  import LastUpdate from "@/components/properties/LastUpdate.vue";
  import CounterInput from "@/components/controls/CounterInput.vue";
  import {registry as Registry} from "@/registry";

  const props = defineProps({
    item: Object,
    device: Object
  });

  const state = computed(() => props.device.properties);

  // Everything goes over REST: a verified write to the thermostat takes a couple of
  // seconds, well past the 3 s timeout the websocket bus gives a call.
  const call = (method, params = {}) => Registry.call(props.device.id, method, params);

  const MODE_LABELS = {schedule: 'Schedule', manual: 'Manual', away: 'Away', temporary: 'Temporary'};
  const CONTROL_LABELS = {floor: 'By floor', air: 'By air', extended: 'Extended'};
  const SENSOR_LABELS = ['4.7 kΩ', '6.8 kΩ', '10 kΩ', '12 kΩ', '15 kΩ', '33 kΩ', '47 kΩ'];
  const BLOCKING_LABELS = {none: 'None', cloud: 'Cloud', local: 'Local network', both: 'Cloud + local'};

  const FAULT_LABELS = {
    noFloorSensor: 'No floor sensor',
    floorSensorShortCircuit: 'Floor sensor shorted',
    noAirSensor: 'No air sensor',
    airSensorShortCircuit: 'Air sensor shorted',
    overheat: 'Overheating',
    clockProblem: 'Clock problem',
    noOverheatControl: 'No overheat control',
    zeroCrossingProblem: 'Zero-crossing sensor',
  };

  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const pad = (value) => String(value).padStart(2, '0');

  const temp = (value) => value === null || value === undefined ? '—' : `${value.toFixed(1)}℃`;

  // Both <input type="datetime-local"> and the driver's setAway work in local time.
  const toInput = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

  const formatMoment = (iso) => {
    if (!iso) {
      return '—';
    }

    const date = new Date(iso);
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const awayFrom = ref(toInput(new Date()));
  const awayTo = ref(toInput(new Date(Date.now() + 24 * 3600 * 1000)));

  const startAway = () => call('setAway', {start: awayFrom.value, end: awayTo.value});

  // Schedule mode stays selected during a temporary override — the override sits on top of it.
  const onSchedule = computed(() => state.value.mode === 'schedule' || state.value.mode === 'temporary');

  const scheduleDays = computed(() => DAYS.map((label, day) => ({
    label,
    day,
    periods: state.value.schedule?.[day] ?? [],
  })));

  // --- schedule editing ---
  // One call per day: the device refuses several days in a single request, and the bus
  // gives any call 5 s — one day's write fits comfortably, a whole week would not.
  const selectedDay = ref(0);
  const draft = ref([]);
  const saving = ref('');
  const saveError = ref('');

  const selectDay = (day) => {
    selectedDay.value = day;
    saveError.value = '';
    draft.value = (state.value.schedule?.[day] ?? []).map(period => ({...period}));
  };

  selectDay(0);

  const dirty = computed(() =>
      JSON.stringify(draft.value) !== JSON.stringify(state.value.schedule?.[selectedDay.value] ?? []));

  const addPeriod = () => {
    const last = draft.value[draft.value.length - 1];
    draft.value.push({
      time: last ? '12:00' : '08:00',
      temperature: last ? last.temperature : Math.round((state.value.lowerLimit + state.value.upperLimit) / 2),
    });
  };

  const removePeriod = (index) => draft.value.splice(index, 1);

  const payload = () => draft.value.map(({time, temperature}) => ({time, temperature: Number(temperature)}));

  const saveDay = async () => {
    saving.value = 'day';
    saveError.value = '';

    const result = await call('setSchedule', {day: selectedDay.value, periods: payload()});
    if (result.code !== 0) {
      saveError.value = result.data?.error ?? 'Failed to save';
    }

    saving.value = '';
  };

  const saveWeek = async () => {
    saveError.value = '';
    const periods = payload();

    for (let day = 0; day < DAYS.length; day++) {
      saving.value = `${day + 1}/${DAYS.length}`;

      const result = await call('setSchedule', {day, periods});
      if (result.code !== 0) {
        saveError.value = `${DAYS[day]}: ${result.data?.error ?? 'failed to save'}`;
        break;
      }
    }

    saving.value = '';
  };
</script>

<template>
  <Device accent="amber" :active="state.enabled">
    <template #icon>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><path fill="#ffffff" d="m3.78 289 215.6 182.54 288.84-166.19L276.04 144.6z" opacity="1" data-original="#ffffff" class=""></path><path fill="#b54e08" d="M219.38 475.32a3.78 3.78 0 0 1-2.45-.9L1.34 291.89a3.78 3.78 0 0 1 .66-6.23l272.27-144.4a3.78 3.78 0 0 1 3.93.23l232.17 160.75a3.78 3.78 0 0 1-.27 6.39L221.26 474.82a3.78 3.78 0 0 1-1.88.5zM10.49 289.72l209.3 177.21 281.35-161.88L275.78 149z" opacity="1" data-original="#b54e08"></path><path fill="#ffffff" d="m133.33 398.68 86.05 72.86 171.02-98.4" opacity="1" data-original="#ffffff" class=""></path><path fill="#b54e08" d="M219.38 475.32a3.78 3.78 0 0 1-2.45-.9l-86-72.86a3.78 3.78 0 0 1 4.89-5.77l84 71.14 168.72-97.08a3.78 3.78 0 1 1 3.77 6.56l-171 98.4a3.78 3.78 0 0 1-1.93.51z" opacity="1" data-original="#b54e08"></path><path fill="#ffffff" d="m403.27 365.73 5.16-2.97" opacity="1" data-original="#ffffff" class=""></path><path fill="#b54e08" d="M403.28 369.51a3.78 3.78 0 0 1-1.89-7.06l5.15-3a3.78 3.78 0 1 1 3.77 6.56l-5.16 3a3.76 3.76 0 0 1-1.87.5z" opacity="1" data-original="#b54e08"></path><path fill="#fc7e29" d="M217.77 432.58a26 26 0 0 1-13.11-3.34C185.22 418 71.3 319.28 66.46 315.08a7.13 7.13 0 0 1-.56-10.34 7.82 7.82 0 0 1 10.74-.53C109.31 332.55 197.39 408 212.48 416.69c6.58 3.79 20.48-1.77 27.55-11 5.44-7.11 5.07-13.39-1.08-18.68C215.15 366.55 117 284.22 116 283.39a7.13 7.13 0 0 1-.73-10.32 7.82 7.82 0 0 1 10.73-.71c1 .83 99.18 83.22 123 103.72 12.09 10.39 13.31 25 3.2 38.27-7.88 10.41-21.7 18.23-34.43 18.23z" opacity="1" data-original="#fc7e29"></path><path fill="#b54e08" d="M217.77 436.36a29.63 29.63 0 0 1-15-3.84C183.37 421.34 76.14 328.49 64 317.94a10.91 10.91 0 0 1-.84-15.78 11.65 11.65 0 0 1 16-.8c45.3 39.3 122.08 104.47 135.24 112.05 4.45 2.56 16.46-1.93 22.66-10 5.31-6.94 2.7-10.72-.54-13.51C214 370.52 124 295.05 113.87 286.51l-.26-.22a10.91 10.91 0 0 1-1.1-15.76 11.64 11.64 0 0 1 16-1.06c1 .81 99.27 83.29 123.08 103.75 13.55 11.64 15 28.69 3.74 43.44-9.06 11.78-24.14 19.7-37.56 19.7zM71.56 306.12a4 4 0 0 0-2.89 1.21 3.35 3.35 0 0 0-.93 2.48 3.41 3.41 0 0 0 1.2 2.41C73.77 316.41 187.44 415 206.55 426a22.16 22.16 0 0 0 11.22 2.83c11 0 24-6.88 31.51-16.74 8.9-11.64 7.91-24-2.66-33.1-23.78-20.43-122-102.89-123-103.69a4.06 4.06 0 0 0-5.5.35 3.35 3.35 0 0 0-.89 2.49 3.42 3.42 0 0 0 1.25 2.39l.26.22c10.18 8.54 100.13 84 122.68 103.42 7.73 6.64 8.31 15.11 1.62 23.85-7.53 9.85-23.34 17.23-32.44 12-18.5-10.71-135.25-111.93-136.43-112.95a4 4 0 0 0-2.61-.95z" opacity="1" data-original="#b54e08"></path><path fill="#fc7e29" d="M302.5 383.68a27.55 27.55 0 0 1-13.43-3.32c-21.56-11.88-149-118.5-154.44-123a8.09 8.09 0 0 1-1-11.52 8.38 8.38 0 0 1 11.69-.94c36.55 30.59 135.07 112 151.8 121.23 7.3 4 22.26-2.63 29.65-13.17 5.68-8.11 5.07-15.11-1.81-20.82C298.38 310 188.69 221.26 187.58 220.36a8.09 8.09 0 0 1-1.15-11.5 8.38 8.38 0 0 1 11.67-1.13c1.11.9 110.88 89.74 137.57 111.87 13.52 11.21 15.35 27.54 4.78 42.62-8.52 12.15-23.8 21.46-37.95 21.46z" opacity="1" data-original="#fc7e29"></path><path fill="#b54e08" d="M302.5 387.47a31.23 31.23 0 0 1-15.26-3.79c-21.92-12.08-149.62-118.9-155-123.45a11.88 11.88 0 0 1-1.39-16.89 12.18 12.18 0 0 1 17-1.37C184.26 272.5 282.52 353.71 299 362.78c5 2.77 18.16-2.67 24.73-12 5.82-8.3 2.45-12.77-1.13-15.74-26.14-21.67-132.82-108-137.35-111.69a11.88 11.88 0 0 1-1.71-16.89 12.18 12.18 0 0 1 17-1.65l.2.16c11.39 9.22 112 90.64 137.41 111.74 14.95 12.39 17.09 31.12 5.46 47.71-9.73 13.77-26.23 23.05-41.11 23.05zM140 246.71a4.54 4.54 0 0 0-3.45 1.57 4.31 4.31 0 0 0 .51 6.15c45.76 38.31 136.8 113.23 153.84 122.62a23.76 23.76 0 0 0 11.61 2.85c12.33 0 26.66-8.16 34.85-19.86 9.48-13.52 7.95-27.55-4.1-37.54C307.85 301.44 207.3 220 195.92 210.83l-.19-.16a4.59 4.59 0 0 0-6.38.61 4.31 4.31 0 0 0 .62 6.14c4.56 3.69 111.28 90.07 137.45 111.77 8.42 7 9.31 16.18 2.5 25.9-7.81 11.13-24.61 19.81-34.57 14.31-17-9.36-115.77-91-152.4-121.64a4.57 4.57 0 0 0-2.95-1.05z" opacity="1" data-original="#b54e08"></path><path fill="#fc7e29" d="M395.14 332.36a27.42 27.42 0 0 1-13-3.13c-21.73-11.57-150.78-116.32-156.26-120.78a8.09 8.09 0 0 1-1.13-11.5 8.37 8.37 0 0 1 11.67-1.11c37 30.06 136.73 110 153.59 119 7.35 3.92 22.22-2.95 29.45-13.6 5.56-8.19 4.85-15.18-2.12-20.79-26.95-21.68-138-108.86-139.07-109.74a8.09 8.09 0 0 1-1.32-11.48 8.37 8.37 0 0 1 11.65-1.3c1.12.88 112.2 88.11 139.23 109.86 13.69 11 15.76 27.31 5.42 42.55-8.44 12.41-23.83 22.02-38.11 22.02z" opacity="1" data-original="#fc7e29"></path><path fill="#b54e08" d="M395.14 336.14a31.13 31.13 0 0 1-14.8-3.57C358.29 320.83 229 215.85 223.48 211.39a11.87 11.87 0 0 1-1.64-16.87 12.18 12.18 0 0 1 17-1.62c36.92 30 136.39 109.77 153 118.6 5.06 2.7 18.12-2.93 24.54-12.39 5.69-8.38 2.26-12.8-1.36-15.72-24.42-19.65-119.38-94.26-138.17-109l-.87-.69a11.88 11.88 0 0 1-1.98-16.84 12.18 12.18 0 0 1 16.93-1.9c1.08.85 112.18 88.09 139.26 109.88 15.13 12.17 17.55 30.87 6.18 47.62-9.62 14.17-26.19 23.68-41.23 23.68zm-164-138.39a4.54 4.54 0 0 0-3.5 1.62 4.28 4.28 0 0 0-1 3.18 4.33 4.33 0 0 0 1.6 3c5.47 4.44 134.23 109 155.65 120.37a23.65 23.65 0 0 0 11.24 2.69c12.44 0 26.82-8.37 35-20.36 9.27-13.66 7.53-27.67-4.66-37.48-27-21.76-138.11-109-139.19-109.83a4.58 4.58 0 0 0-6.37.7 4.28 4.28 0 0 0-.94 3.2 4.33 4.33 0 0 0 1.65 2.93l.87.69c18.79 14.76 113.78 89.4 138.23 109.08 8.53 6.86 9.55 16 2.88 25.86-7.64 11.25-24.31 20.17-34.36 14.81-20.64-11-152.87-118.33-154.2-119.41a4.57 4.57 0 0 0-2.9-1.04z" opacity="1" data-original="#b54e08"></path><path fill="#ffbf4d" d="m3.78 261.76 74.63 62.66s38.7-32.69 107.8-30S392.13 317.61 459.85 244l-181-129.41z" opacity="1" data-original="#ffbf4d" class=""></path><path fill="#b54e08" d="M78.41 328.2a3.77 3.77 0 0 1-2.43-.88L1.35 264.65a3.78 3.78 0 0 1 .65-6.23L277 111.3a3.78 3.78 0 0 1 4 .26L462 241a3.78 3.78 0 0 1 .58 5.64C402.47 312 290.24 304.72 216 299.93c-10.8-.7-21-1.35-29.91-1.71C119.4 295.6 81.23 327 80.85 327.31a3.79 3.79 0 0 1-2.44.89zM10.5 262.45l68 57.1c9.8-7.23 47.21-31.28 107.85-28.89 9 .36 19.25 1 30.1 1.71 71.6 4.62 179.2 11.55 237.65-47.79l-175.58-125.5z" opacity="1" data-original="#b54e08"></path><path fill="#ffffff" d="M113.93 282.24 55.12 234.3" opacity="1" data-original="#ffffff" class=""></path><path fill="#b54e08" d="M113.92 286a3.77 3.77 0 0 1-2.39-.85l-58.81-47.92a3.78 3.78 0 1 1 4.78-5.86l58.81 47.94a3.78 3.78 0 0 1-2.39 6.72z" opacity="1" data-original="#b54e08"></path><path fill="#ffffff" d="m134.71 299.18-12.51-10.27" opacity="1" data-original="#ffffff" class=""></path><path fill="#b54e08" d="M134.7 303a3.77 3.77 0 0 1-2.4-.86l-12.5-10.3a3.78 3.78 0 1 1 4.8-5.85l12.51 10.27a3.78 3.78 0 0 1-2.4 6.71z" opacity="1" data-original="#b54e08"></path><path fill="#ffffff" d="m191.47 236.12-56.76-44.4" opacity="1" data-original="#ffffff" class=""></path><path fill="#b54e08" d="M191.47 239.9a3.77 3.77 0 0 1-2.33-.8l-56.76-44.4a3.78 3.78 0 1 1 4.66-6l56.76 44.4a3.78 3.78 0 0 1-2.33 6.76z" opacity="1" data-original="#b54e08"></path><path fill="#ffffff" d="m204.19 246.07-3.75-2.93" opacity="1" data-original="#ffffff" class=""></path><path fill="#b54e08" d="M204.19 249.86a3.77 3.77 0 0 1-2.33-.8l-3.75-2.93a3.78 3.78 0 1 1 4.66-6l3.75 2.93a3.78 3.78 0 0 1-2.33 6.76z" opacity="1" data-original="#b54e08"></path><path fill="#ffffff" d="m271.74 298.91-59.25-46.32" opacity="1" data-original="#ffffff" class=""></path><path fill="#b54e08" d="M271.74 302.7a3.77 3.77 0 0 1-2.33-.8l-59.25-46.32a3.78 3.78 0 1 1 4.66-6l59.25 46.32a3.78 3.78 0 0 1-2.33 6.76z" opacity="1" data-original="#b54e08"></path><path fill="#ffffff" d="m315.22 230.31-105.98-78.46" opacity="1" data-original="#ffffff" class=""></path><path fill="#b54e08" d="M315.22 234.1a3.77 3.77 0 0 1-2.25-.74L207 154.89a3.78 3.78 0 0 1 4.5-6.08l106 78.46a3.78 3.78 0 0 1-2.25 6.82z" opacity="1" data-original="#b54e08"></path><path fill="#ffffff" d="m324.51 237.18-1.44-1.06" opacity="1" data-original="#ffffff" class=""></path><path fill="#b54e08" d="M324.5 241a3.77 3.77 0 0 1-2.25-.74l-1.44-1.06a3.78 3.78 0 1 1 4.5-6.08l1.44 1.06a3.78 3.78 0 0 1-2.25 6.82z" opacity="1" data-original="#b54e08"></path><path fill="#ffffff" d="m390.4 285.96-53.31-39.42" opacity="1" data-original="#ffffff" class=""></path><path fill="#b54e08" d="M390.39 289.75a3.77 3.77 0 0 1-2.25-.74l-53.31-39.42a3.78 3.78 0 0 1 4.5-6.08l53.31 39.42a3.78 3.78 0 0 1-2.25 6.83z" opacity="1" data-original="#b54e08"></path><path fill="#ffffff" d="m92.42 256.33-33.4 18.44" opacity="1" data-original="#ffffff" class=""></path><path fill="#b54e08" d="M59 278.55a3.78 3.78 0 0 1-1.83-7.1L90.59 253a3.78 3.78 0 0 1 3.66 6.62l-33.4 18.44a3.77 3.77 0 0 1-1.85.49z" opacity="1" data-original="#b54e08"></path><path fill="#ffffff" d="m109.72 246.58-6.88 3.8" opacity="1" data-original="#ffffff" class=""></path><path fill="#b54e08" d="M102.85 254.16a3.78 3.78 0 0 1-1.83-7.1l6.88-3.8a3.78 3.78 0 0 1 3.66 6.62l-6.88 3.8a3.77 3.77 0 0 1-1.83.48z" opacity="1" data-original="#b54e08"></path><path fill="#ffffff" d="m188.89 203.04-66.69 36.69" opacity="1" data-original="#ffffff" class=""></path><path fill="#b54e08" d="M122.2 243.52a3.78 3.78 0 0 1-1.83-7.1l66.69-36.69a3.78 3.78 0 1 1 3.65 6.63L124 243a3.77 3.77 0 0 1-1.8.52z" opacity="1" data-original="#b54e08"></path><path fill="#ffffff" d="m200.75 196.76-1.88 1.03" opacity="1" data-original="#ffffff" class=""></path><path fill="#b54e08" d="M198.87 201.58a3.78 3.78 0 0 1-1.83-7.1l1.88-1a3.78 3.78 0 1 1 3.66 6.62l-1.88 1a3.77 3.77 0 0 1-1.83.48z" opacity="1" data-original="#b54e08"></path><path fill="#ffffff" d="m307.89 137.32-95.4 52.73" opacity="1" data-original="#ffffff" class=""></path><path fill="#b54e08" d="M212.5 193.83a3.78 3.78 0 0 1-1.83-7.1L306.06 134a3.78 3.78 0 0 1 3.66 6.62l-95.39 52.73a3.77 3.77 0 0 1-1.83.48z" opacity="1" data-original="#b54e08"></path><path fill="#ffffff" d="m242.92 260.26-60.93 33.16" opacity="1" data-original="#ffffff" class=""></path><path fill="#b54e08" d="M182 297.2a3.78 3.78 0 0 1-1.81-7.11l60.94-33.15a3.78 3.78 0 0 1 3.62 6.65l-60.95 33.15a3.77 3.77 0 0 1-1.8.46z" opacity="1" data-original="#b54e08"></path><path fill="#ffffff" d="m348.19 203.16-93.32 50.7" opacity="1" data-original="#ffffff" class=""></path><path fill="#b54e08" d="M254.87 257.64a3.78 3.78 0 0 1-1.81-7.11l93.32-50.7a3.78 3.78 0 0 1 3.61 6.65l-93.32 50.7a3.76 3.76 0 0 1-1.8.46z" opacity="1" data-original="#b54e08"></path><path fill="#ffffff" d="m368.91 191.72-7.29 3.97" opacity="1" data-original="#ffffff" class=""></path><path fill="#b54e08" d="M361.62 199.47a3.78 3.78 0 0 1-1.81-7.11l7.29-4a3.78 3.78 0 0 1 3.62 6.65l-7.29 4a3.77 3.77 0 0 1-1.81.46z" opacity="1" data-original="#b54e08"></path><path fill="#ffffff" d="m413.26 252.34-81.96 44.87" opacity="1" data-original="#ffffff" class=""></path><path fill="#b54e08" d="M331.3 301a3.78 3.78 0 0 1-1.82-7.1l82-44.86a3.78 3.78 0 1 1 3.63 6.64l-82 44.86a3.77 3.77 0 0 1-1.81.46z" opacity="1" data-original="#b54e08"></path><path fill="#ffffff" d="m428.01 244.26-1.44.78" opacity="1" data-original="#ffffff" class=""></path><path fill="#b54e08" d="M426.58 248.83a3.78 3.78 0 0 1-1.82-7.1l1.44-.79a3.78 3.78 0 0 1 3.63 6.64l-1.44.79a3.76 3.76 0 0 1-1.81.46z" opacity="1" data-original="#b54e08"></path><path fill="#ffffff" d="m446.21 234.3-8.17 4.47" opacity="1" data-original="#ffffff" class=""></path><path fill="#b54e08" d="M438 242.55a3.78 3.78 0 0 1-1.82-7.1l8.17-4.47a3.78 3.78 0 1 1 3.63 6.64l-8.17 4.47a3.76 3.76 0 0 1-1.81.46z" opacity="1" data-original="#b54e08"></path><path fill="#fc7e29" d="M150 106.46s-32 21.8-28.8 57.21S166 196.37 150 244c0 0 35.2-20.43 23.46-61.3s-42.67-19.02-23.46-76.24z" opacity="1" data-original="#fc7e29"></path><path fill="#b54e08" d="M150 247.83a3.78 3.78 0 0 1-3.59-5c8.63-25.72-.46-35-11-45.83-7.76-8-16.55-17-18-33-3.36-37.2 29.05-59.74 30.44-60.68a3.78 3.78 0 0 1 5.72 4.33c-10.81 32.21-5.34 36.79 3.73 44.38 6.61 5.54 14.84 12.43 19.79 29.65 6.48 22.57-.72 39.22-7.89 49.22a62 62 0 0 1-17.31 16.39 3.77 3.77 0 0 1-1.89.54zm-7.43-129.73c-8.54 9-19.46 24.82-17.62 45.23 1.21 13.34 8.33 20.65 15.88 28.39 9.74 10 19.76 20.26 15.67 42.44 8.85-8.51 20.53-25.23 13.31-50.38-4.31-15-11.25-20.81-17.37-25.94-9.92-8.3-16.07-15.16-9.87-39.74z" opacity="1" data-original="#b54e08"></path><path fill="#fc7e29" d="M197.29 40.46s-32 21.8-28.8 57.21 44.8 32.69 28.8 80.37c0 0 35.2-20.43 23.46-61.3s-42.66-19.06-23.46-76.28z" opacity="1" data-original="#fc7e29"></path><path fill="#b54e08" d="M197.29 181.83a3.78 3.78 0 0 1-3.59-5c8.63-25.72-.46-35-11-45.83-7.76-8-16.55-17-18-33-3.36-37.2 29.05-59.74 30.44-60.68a3.78 3.78 0 0 1 5.72 4.33c-10.8 32.23-5.33 36.81 3.74 44.35 6.61 5.54 14.84 12.43 19.79 29.65 6.48 22.57-.72 39.22-7.9 49.22a62.05 62.05 0 0 1-17.31 16.39 3.78 3.78 0 0 1-1.89.57zM189.87 52.1c-8.54 9-19.46 24.82-17.62 45.23 1.21 13.34 8.33 20.65 15.88 28.39 9.74 10 19.76 20.26 15.67 42.44 8.85-8.51 20.53-25.23 13.31-50.38-4.31-15-11.25-20.81-17.37-25.94-9.92-8.3-16.07-15.16-9.87-39.74z" opacity="1" data-original="#b54e08"></path><path fill="#fc7e29" d="M303.26 53.5s-32 21.8-28.8 57.21 44.8 32.69 28.8 80.37c0 0 35.2-20.43 23.46-61.3s-42.65-19.07-23.46-76.28z" opacity="1" data-original="#fc7e29"></path><path fill="#b54e08" d="M303.26 194.87a3.78 3.78 0 0 1-3.59-5c8.63-25.72-.46-35-11-45.83-7.76-8-16.55-17-18-33-3.36-37.2 29.05-59.74 30.44-60.68a3.78 3.78 0 0 1 5.72 4.33c-10.81 32.21-5.34 36.79 3.73 44.38 6.61 5.54 14.84 12.43 19.79 29.65 6.48 22.57-.72 39.22-7.89 49.22a62 62 0 0 1-17.31 16.39 3.77 3.77 0 0 1-1.89.54zm-7.41-129.73c-8.54 9-19.46 24.82-17.62 45.23 1.21 13.34 8.33 20.65 15.88 28.39 9.74 10 19.76 20.26 15.67 42.44 8.85-8.51 20.53-25.23 13.31-50.38-4.31-15-11.25-20.81-17.37-25.94-9.92-8.3-16.07-15.17-9.87-39.74z" opacity="1" data-original="#b54e08"></path><path fill="#ffffff" d="m46.4 282.24-10.85 6.19" opacity="1" data-original="#ffffff" class=""></path><path fill="#b54e08" d="M35.55 292.21a3.78 3.78 0 0 1-1.88-7.07L44.52 279a3.78 3.78 0 0 1 3.75 6.57l-10.85 6.19a3.77 3.77 0 0 1-1.87.45z" opacity="1" data-original="#b54e08"></path></g></svg>
    </template>

    <template #title>
      {{ item.name }}
    </template>

    <template #status>
      <template v-if="state.available">
        {{ temp(state.floorTemp) }} <span class="text-zinc-600">/</span> {{ temp(state.setTemp) }}
        <span v-if="state.heating" class="pill pill-accent"><span class="pill-dot"></span>Heating</span>
        <span v-else class="pill pill-muted">{{ MODE_LABELS[state.mode] }}</span>
        <span v-if="state.faults.length" class="pill pill-fault"><span class="pill-dot"></span>{{ state.faults.length }} fault</span>
      </template>
      <span v-else class="pill pill-muted"><span class="pill-dot"></span>Offline</span>
    </template>

    <template #action>
      <Toggle
          v-on:click="call(state.enabled ? 'disable' : 'enable')"
          :value="state.enabled"></Toggle>
    </template>

    <template #extended>
      <Section name="Heating">
        <List>
          <Item label="Power">
            <Toggle
                v-on:click="call(state.enabled ? 'disable' : 'enable')"
                :value="state.enabled"></Toggle>
          </Item>
          <li class="field-row mode-row">
            <span class="field-label">Mode</span>
            <div class="mode-grid">
              <button type="button" @click="call('setMode', {value: 'schedule'})" class="mode-btn" :class="{'is-sel': onSchedule}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/></svg>
                <span class="mode-txt">Schedule</span>
              </button>
              <button type="button" @click="call('setMode', {value: 'manual'})" class="mode-btn" :class="{'is-sel': state.mode === 'manual'}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2.2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="2.2" fill="currentColor" stroke="none"/><circle cx="8" cy="18" r="2.2" fill="currentColor" stroke="none"/></svg>
                <span class="mode-txt">Manual</span>
              </button>
            </div>
          </li>
          <Item label="Set temperature">
            <CounterInput
                v-on:update:value="value => call('setTemperature', {value: value})"
                v-model:value="state.setTemp"
                :min="state.lowerLimit" :max="state.upperLimit"></CounterInput>
          </Item>
          <Item label="Floor temperature">
            <span>{{ temp(state.floorTemp) }}</span>
          </Item>
          <Item v-if="state.airTemp !== null" label="Air temperature">
            <span>{{ temp(state.airTemp) }}</span>
          </Item>
          <Item label="Heating now">
            <span :class="state.heating ? 'pill pill-accent' : 'pill pill-muted'"><span class="pill-dot"></span>{{ state.heating ? 'On' : 'Off' }}</span>
          </Item>
          <Item v-if="state.mode === 'temporary'" label="Temporary override">
            <div class="flex items-center gap-2">
              <span>{{ temp(state.temporaryTemp) }}</span>
              <button type="button" @click="call('cancelTemporary')" class="ctl-btn px-2.5 py-1 text-xs">Cancel</button>
            </div>
          </Item>
        </List>
      </Section>

      <Section name="Setpoints">
        <List>
          <Item label="Manual">
            <CounterInput
                v-on:update:value="value => call('setManualTemperature', {value: value})"
                v-model:value="state.manualTemp"
                :min="state.lowerLimit" :max="state.upperLimit"></CounterInput>
          </Item>
          <Item label="Away">
            <CounterInput
                v-on:update:value="value => call('setAwayTemperature', {value: value})"
                v-model:value="state.awayTemp"
                :min="state.lowerLimit" :max="state.upperLimit"></CounterInput>
          </Item>
          <Item label="Allowed range">
            <span>{{ state.lowerLimit }}–{{ state.upperLimit }}℃</span>
          </Item>
        </List>
      </Section>

      <Section name="Away">
        <List>
          <Item v-if="state.mode === 'away'" label="Active until">
            <div class="flex items-center gap-2">
              <span>{{ formatMoment(state.awayEnd) }}</span>
              <button type="button" @click="call('cancelAway')" class="ctl-btn px-2.5 py-1 text-xs">Cancel</button>
            </div>
          </Item>
          <li class="field-row away-row">
            <span class="field-label">Period</span>
            <div class="away-grid">
              <input type="datetime-local" v-model="awayFrom" class="away-input" aria-label="Away from">
              <input type="datetime-local" v-model="awayTo" class="away-input" aria-label="Away to">
              <button type="button" @click="startAway" class="ctl-btn away-apply">Start away</button>
            </div>
          </li>
          <Item v-if="state.mode !== 'away'" label="Last period">
            <span class="text-zinc-400">{{ formatMoment(state.awayStart) }} → {{ formatMoment(state.awayEnd) }}</span>
          </Item>
        </List>
      </Section>

      <Section name="Schedule">
        <!-- The week as it stands; tap a day to load it into the editor below. -->
        <List>
          <li v-for="day in scheduleDays" :key="day.label"
              class="field-row day-row" :class="{'is-sel': selectedDay === day.day}"
              role="button" tabindex="0" @click="selectDay(day.day)" @keydown.enter="selectDay(day.day)">
            <span class="field-label">{{ day.label }}</span>
            <div class="field-value flex flex-wrap items-center justify-end gap-1.5">
              <span v-for="period in day.periods" :key="period.time" class="pill">
                {{ period.time }} · {{ period.temperature }}℃
              </span>
              <span v-if="!day.periods.length" class="text-zinc-500">—</span>
            </div>
          </li>
        </List>

        <p class="section-title mt-4">Edit {{ DAYS[selectedDay] }}</p>
        <List>
          <li v-for="(period, index) in draft" :key="index" class="field-row">
            <input type="time" v-model="period.time" class="period-input" :aria-label="`Period ${index + 1} time`">
            <div class="field-value flex items-center gap-2">
              <CounterInput v-model:value="period.temperature"
                            :min="state.lowerLimit" :max="state.upperLimit"></CounterInput>
              <button type="button" @click="removePeriod(index)" class="ctl-btn h-8 w-8" aria-label="Remove period">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="h-4 w-4"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </li>
          <li v-if="!draft.length" class="field-row">
            <span class="text-zinc-500">No periods — the device needs at least one.</span>
          </li>
        </List>

        <div class="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" @click="addPeriod" class="ctl-btn px-3 py-1.5 text-sm"
                  :disabled="draft.length >= state.maxSchedulePeriods || !!saving">
            + Add period
          </button>
          <button type="button" @click="saveDay" class="ctl-btn px-3 py-1.5 text-sm font-semibold"
                  :disabled="!dirty || !draft.length || !!saving">
            {{ saving === 'day' ? 'Saving…' : `Save ${DAYS[selectedDay]}` }}
          </button>
          <button type="button" @click="saveWeek" class="ctl-btn px-3 py-1.5 text-sm"
                  :disabled="!draft.length || !!saving">
            {{ saving && saving !== 'day' ? `Saving ${saving}…` : 'Apply to all days' }}
          </button>
          <button type="button" v-if="dirty && !saving" @click="selectDay(selectedDay)"
                  class="ctl-btn px-3 py-1.5 text-sm">Reset</button>
        </div>
        <p v-if="saveError" class="mt-2 text-xs text-rose-400">{{ saveError }}</p>
      </Section>

      <Section name="Comfort">
        <List>
          <Item label="Display brightness">
            <CounterInput
                v-on:update:value="value => call('setBrightness', {value: value})"
                v-model:value="state.brightness"
                :min="0" :max="9"></CounterInput>
          </Item>
          <Item label="Night dimming">
            <div class="flex items-center gap-2">
              <span class="text-zinc-400">{{ state.nightBrightStart }}–{{ state.nightBrightEnd }}</span>
              <Toggle
                  v-on:click="call('setNightBright', {enabled: !state.nightBright})"
                  :value="state.nightBright"></Toggle>
            </div>
          </Item>
          <Item label="Child lock">
            <Toggle
                v-on:click="call('setChildrenLock', {value: !state.childrenLock})"
                :value="state.childrenLock"></Toggle>
          </Item>
          <Item label="Preheat">
            <div class="flex items-center gap-2">
              <span v-if="state.preheatActive" class="pill pill-accent"><span class="pill-dot"></span>Active</span>
              <Toggle
                  v-on:click="call('setPreheat', {value: !state.preheat})"
                  :value="state.preheat"></Toggle>
            </div>
          </Item>
          <Item label="Open-window detection">
            <div class="flex items-center gap-2">
              <span v-if="state.windowOpen" class="pill pill-accent"><span class="pill-dot"></span>Open</span>
              <Toggle
                  v-on:click="call('setWindowControl', {value: !state.windowControl})"
                  :value="state.windowControl"></Toggle>
            </div>
          </Item>
        </List>
      </Section>

      <Section name="Diagnostics">
        <List>
          <Item label="Status">
            <div class="flex flex-wrap items-center justify-end gap-1.5">
              <span v-for="fault in state.faults" :key="fault" class="pill pill-fault"><span class="pill-dot"></span>{{ FAULT_LABELS[fault] ?? fault }}</span>
              <span v-if="!state.faults.length" class="pill pill-ok"><span class="pill-dot"></span>OK</span>
            </div>
          </Item>
          <Item label="Control">
            <span>{{ CONTROL_LABELS[state.controlType] ?? state.controlType }}</span>
          </Item>
          <Item label="Connected load">
            <span>{{ state.power }} W</span>
          </Item>
          <Item label="Hysteresis">
            <span>{{ state.hysteresis.toFixed(1) }}℃</span>
          </Item>
          <Item label="Floor correction">
            <span>{{ state.floorCorrection > 0 ? '+' : '' }}{{ state.floorCorrection.toFixed(1) }}℃</span>
          </Item>
          <Item label="Floor sensor">
            <span>{{ SENSOR_LABELS[state.sensorType] ?? state.sensorType }}</span>
          </Item>
          <Item v-if="state.overheatTemp !== null" label="Internal sensor">
            <span>{{ temp(state.overheatTemp) }}</span>
          </Item>
          <Item v-if="state.proportional" label="Proportional mode">
            <span class="pill pill-accent"><span class="pill-dot"></span>Active</span>
          </Item>
          <Item label="Wi-Fi">
            <span>{{ state.wifi }} dBm</span>
          </Item>
          <Item v-if="state.blocking !== 'none'" label="Control blocked">
            <span>{{ BLOCKING_LABELS[state.blocking] ?? state.blocking }}</span>
          </Item>
          <Item label="Last update">
            <LastUpdate :timestamp="state.updatedAt"></LastUpdate>
          </Item>
        </List>
      </Section>
    </template>
  </Device>
</template>

<style scoped>
  /* Mode selector — same shape as the HVAC panel, two modes wide */
  .mode-row {
    @apply block;
  }
  .mode-grid {
    @apply mt-2.5 grid grid-cols-2 gap-1.5;
  }
  .mode-btn {
    @apply flex flex-col items-center justify-center gap-1 rounded-xl border py-2 text-zinc-400 transition duration-150 active:scale-95;
    border-color: rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.03);
  }
  .mode-btn:hover {
    background: rgba(255, 255, 255, 0.09);
    color: #fff;
  }
  .mode-btn.is-sel {
    background: rgb(var(--accent-rgb));
    border-color: transparent;
    color: #0a0a0d;
    box-shadow: 0 0 14px rgb(var(--accent-rgb) / 0.35);
  }
  .mode-txt {
    @apply text-[10px] font-semibold tracking-wide;
  }

  /* Away period editor */
  .away-row {
    @apply block;
  }
  .away-grid {
    @apply mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2;
  }
  .away-input {
    @apply rounded-lg px-2.5 py-1.5 text-sm font-medium text-white outline-none transition duration-150;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color-scheme: dark;
  }
  .away-input:focus {
    border-color: rgb(var(--accent-rgb));
  }
  .away-apply {
    @apply py-1.5 text-sm font-semibold sm:col-span-2;
  }

  /* Schedule editor */
  .day-row {
    @apply cursor-pointer transition duration-150;
  }
  .day-row:hover {
    background: rgba(255, 255, 255, 0.04);
  }
  .day-row.is-sel {
    background: rgb(var(--accent-rgb) / 0.1);
    box-shadow: inset 2px 0 0 rgb(var(--accent-rgb));
  }
  .period-input {
    @apply rounded-lg px-2.5 py-1.5 text-sm font-semibold text-white outline-none transition duration-150;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color-scheme: dark;
  }
  .period-input:focus {
    border-color: rgb(var(--accent-rgb));
  }
  .ctl-btn:disabled {
    @apply cursor-not-allowed opacity-40;
  }
  .ctl-btn:disabled:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .pill-ok {
    background: rgba(52, 211, 153, 0.16);
    color: #34d399;
  }
  .pill-fault {
    background: rgba(248, 113, 113, 0.16);
    color: #f87171;
  }
</style>
