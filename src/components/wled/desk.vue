<script setup>
  import {computed, reactive, ref} from "vue";
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

  const online = computed(() => props.device.properties.available !== false);

  // One strip per controller output; a channel the controller has no segment for reports null.
  const channels = [
    {id: 'lower', label: 'Полиця 150'},
    {id: 'upper', label: 'Полиця 188'},
    {id: 'underdesk', label: 'Під столом'},
  ];

  const scenes = computed(() => [...(props.device.properties.scenes ?? []), {name: 'off', label: 'Вимк.'}]);

  const sceneLabel = computed(() => {
    const scene = props.device.properties.scene;
    if (scene === 'off') {
      return 'Вимкнено';
    }
    if (scene === 'custom') {
      return 'Вручну';
    }
    return scenes.value.find(item => item.name === scene)?.label ?? scene;
  });

  // While a slider is held, its own value is shown; the device's comes back after the call.
  const dragging = reactive({});

  async function setLevel(id, value) {
    try {
      await Registry.call(props.device.id, 'setLevel', {channel: id, value});
    } finally {
      delete dragging[id];
    }
  }

  const saving = ref(false);

  async function savePresets() {
    saving.value = true;
    try {
      await Registry.call(props.device.id, 'savePresets');
    } finally {
      saving.value = false;
    }
  }
</script>

<template>
  <Device accent="amber" :active="online && device.properties.enabled">
    <template #icon>
      <svg viewBox="0 0 24 24" fill="none" stroke="#ff9f0a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h18M3 13h12"/><path d="M5 7.5 3.5 11M19 7.5l1.5 3.5M5 13.5 3.5 17M14 13.5l1.5 3.5" stroke="#ffc35c" stroke-width="1.4"/><path d="M4 20h16" stroke="#98989d"/></svg>
    </template>

    <template #title>
      {{ item.name }}
    </template>

    <template #status>
      <span v-if="!online">Немає зв'язку</span>
      <span v-else>{{ sceneLabel }}</span>
    </template>

    <template #action>
      <Toggle
          v-on:click="Registry.call(device.id, device.properties.enabled ? 'disable' : 'enable')"
          :value="device.properties.enabled"></Toggle>
    </template>

    <template #extended>
      <Section>
        <List>
          <Item label="Живлення">
            <Toggle
                @click="Registry.call(device.id, device.properties.enabled ? 'disable' : 'enable')"
                :value="device.properties.enabled"></Toggle>
          </Item>
          <li class="field-row scene-row">
            <span class="field-label">Сцена</span>
            <div class="scene-grid">
              <button v-for="scene in scenes" :key="scene.name" type="button"
                      @click="Registry.call(device.id, 'setScene', {value: scene.name})"
                      class="scene-btn" :class="{'is-sel': device.properties.scene === scene.name}">
                {{ scene.label }}
              </button>
            </div>
          </li>
        </List>
      </Section>

      <Section name="Яскравість">
        <List>
          <template v-for="channel in channels" :key="channel.id">
            <li v-if="device.properties[channel.id] !== null && device.properties[channel.id] !== undefined" class="field-row level-row">
              <span class="field-label">{{ channel.label }}</span>
              <div class="level">
                <input type="range" min="0" max="100" step="5" :aria-label="channel.label"
                       :value="dragging[channel.id] ?? device.properties[channel.id]"
                       @input="dragging[channel.id] = $event.target.valueAsNumber"
                       @change="setLevel(channel.id, $event.target.valueAsNumber)">
                <span class="level-value">{{ dragging[channel.id] ?? device.properties[channel.id] }}%</span>
              </div>
            </li>
          </template>
        </List>
      </Section>

      <Section name="Пульт">
        <List>
          <Item label="Кнопки 1–4">
            <button type="button" class="ctl-btn save-btn" :disabled="saving" @click="savePresets">
              {{ saving ? 'Записую…' : 'Записати сцени' }}
            </button>
          </Item>
        </List>
      </Section>

      <Section name="Пристрій">
        <List>
          <Item label="Зв'язок">
            <span :class="online ? 'pill pill-accent' : 'pill pill-muted'">
              <span class="pill-dot"></span>{{ online ? 'На зв\'язку' : 'Немає зв\'язку' }}
            </span>
          </Item>
        </List>
      </Section>
    </template>
  </Device>
</template>

<style scoped>
  .scene-row, .level-row {
    @apply block;
  }
  .scene-grid {
    @apply mt-2.5 grid grid-cols-5 gap-1.5;
  }
  .scene-btn {
    @apply rounded-xl py-2.5 text-[12px] font-semibold tracking-wide transition duration-150 active:scale-95;
    background: rgba(255, 255, 255, 0.06);
    color: var(--ink-2);
  }
  .scene-btn:hover {
    background: rgba(255, 255, 255, 0.09);
    color: #fff;
  }
  .scene-btn.is-sel {
    background: rgb(var(--accent-rgb));
    color: #0a0a0d;
    box-shadow: 0 0 14px rgb(var(--accent-rgb) / 0.35);
  }
  .level {
    @apply mt-2 flex items-center gap-3;
  }
  .level input {
    @apply h-1.5 flex-1 cursor-pointer;
    accent-color: rgb(var(--accent-rgb));
  }
  .level-value {
    @apply w-11 text-right text-[15px] tabular-nums;
    color: var(--ink-2);
  }
  .save-btn {
    @apply px-3 py-1.5 text-[15px] disabled:opacity-50;
  }
</style>
