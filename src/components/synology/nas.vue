<script setup>
  import {computed, onUnmounted, ref} from "vue";
  import Device from "@/components/Device.vue";
  import Toggle from "@/components/controls/Toggle.vue";
  import List from "@/components/properties/List.vue";
  import Item from "@/components/properties/Item.vue";
  import Section from "@/components/properties/Section.vue";
  import {registry as Registry} from "@/registry";
  import {ago, prettifyMilliseconds} from "@/format";

  const props = defineProps({
    item: Object,
    device: Object
  });

  const p = computed(() => props.device.properties);
  const power = computed(() => p.value.power ?? 'unknown');
  const on = computed(() => power.value === 'on');
  const moving = computed(() => power.value === 'waking' || power.value === 'stopping');

  const STATUS = {
    unknown: 'Перевіряю…', on: 'Увімкнено', off: 'Вимкнено', waking: 'Прокидається…', stopping: 'Вимикається…',
  };

  // Ticks while the NAS is on its way, so «40 с» grows on screen.
  const now = ref(Date.now());
  const ticker = setInterval(() => now.value = Date.now(), 1000);
  onUnmounted(() => clearInterval(ticker));

  const elapsed = computed(() => p.value.since ? prettifyMilliseconds(Math.max(0, now.value - p.value.since)) : null);

  const tileStatus = computed(() => moving.value && elapsed.value ? `${STATUS[power.value]} ${elapsed.value}` : STATUS[power.value]);

  // Two units, as DSM's Info Center counts its uptime: "2 дн 4 год", "3 год 12 хв", "25 хв".
  const duration = (ms) => {
    const minutes = Math.floor(ms / 60_000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) {
      return `${days} дн ${hours % 24} год`;
    }
    if (hours > 0) {
      return `${hours} год ${minutes % 60} хв`;
    }
    return minutes > 0 ? `${minutes} хв` : `${Math.floor(ms / 1000)} с`;
  };

  // On: how long it has run, from DSM's own uptime when the Pi has the login (right across
  // restarts of the module), else since the module saw it come on. Off: since when.
  const uptime = computed(() => {
    const start = p.value.bootedAt ?? p.value.since;
    return start ? duration(Math.max(0, now.value - start)) : null;
  });
  const offFor = computed(() => p.value.since ? ago(p.value.since, now.value) : null);

  const busy = ref(false);
  const failed = ref(null);
  const confirming = ref(false);
  const tile = ref(null);

  const call = async (method) => {
    busy.value = true;
    failed.value = null;
    try {
      const result = await Registry.call(props.device.id, method);
      if (result.code !== 0) {
        failed.value = result.data?.error ?? 'модуль NAS не відповів';
      }
    } finally {
      busy.value = false;
    }
  };

  const wake = () => call('wake');

  const shutdown = async () => {
    confirming.value = false;
    await call('shutdown');
  };

  // On the tile: off → wake at once; on → the sheet opens and asks first, since a switched-off
  // NAS takes the photos, the documents and the passwords with it.
  const toggle = () => {
    if (power.value === 'off' || power.value === 'unknown') {
      wake();
    } else if (on.value) {
      confirming.value = true;
      tile.value?.open();
    }
  };

  const problem = computed(() => failed.value ?? p.value.error ?? null);
  const dsmUrl = computed(() => p.value.host ? `https://${p.value.host}:5001/` : null);
</script>

<template>
  <Device ref="tile" accent="cyan" :active="on" @close="confirming = false">
    <template #icon>
      <svg viewBox="0 0 24 24" fill="none" stroke="#32ade6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2.75" width="14" height="18.5" rx="2.5"/><path d="M9.5 6.5v7M14.5 6.5v7" stroke="#7fd1f5"/><path d="M9 17.5h.01M12 17.5h.01" stroke-width="2.4"/><path d="M15 17.5h.01" stroke="#30d158" stroke-width="2.4"/></svg>
    </template>

    <template #title>
      {{ item.name }}
    </template>

    <template #status>
      <span>{{ tileStatus }}</span>
    </template>

    <template #action>
      <Toggle :value="on || power === 'waking'" :disabled="moving || busy" @click="toggle"></Toggle>
    </template>

    <template #extended>
      <Section>
        <List>
          <Item label="Стан">
            <span class="pill" :class="on ? 'pill-accent' : moving ? '' : 'pill-muted'">
              <span class="pill-dot"></span>{{ STATUS[power] }}
            </span>
          </Item>
          <Item v-if="on && uptime" label="Час роботи">
            {{ uptime }}
          </Item>
          <Item v-else-if="power === 'off' && offFor" label="Вимкнувся">
            {{ offFor }}
          </Item>
        </List>

        <p v-if="power === 'waking'" class="nas-note">
          Прокидається {{ elapsed }}. Від пакета до робочого DSM зазвичай 1–2 хвилини: диски розкручуються, система вантажиться.
        </p>
        <p v-else-if="power === 'stopping'" class="nas-note">
          DSM закриває програми й диски, за хвилину-дві NAS згасне. Розбудити його можна, коли він вимкнеться.
        </p>
      </Section>

      <Section>
        <div v-if="power === 'off' || power === 'unknown'">
          <button type="button" class="ctl-btn nas-btn nas-apply" :disabled="busy" @click="wake">Розбудити</button>
        </div>

        <div v-else-if="on && !confirming">
          <button type="button" class="ctl-btn nas-btn nas-danger" :disabled="busy || !p.canShutdown" @click="confirming = true">Вимкнути</button>
          <p v-if="!p.canShutdown" class="nas-note">
            Вимикати з пульта можна, коли на Pi є логін адміністратора DSM (файл ~/.shelter-synology.json). Поки що тільки з самого DSM.
          </p>
        </div>

        <div v-else-if="on && confirming" class="nas-confirm">
          <p class="text-[15px] font-semibold">Вимкнути NAS?</p>
          <p class="nas-note !mt-1 !px-0">Immich, Drive, Vaultwarden і спільні папки стануть недоступні, поки NAS не розбудити.</p>
          <div class="mt-3 flex gap-2">
            <button type="button" class="ctl-btn nas-btn nas-danger" :disabled="busy" @click="shutdown">Так, вимкнути</button>
            <button type="button" class="ctl-btn nas-btn" :disabled="busy" @click="confirming = false">Скасувати</button>
          </div>
        </div>

        <p v-if="problem" class="nas-note !text-[#ff6961]">{{ problem }}</p>
      </Section>

      <Section v-if="dsmUrl && on">
        <List>
          <li class="field-row">
            <a :href="dsmUrl" target="_blank" rel="noopener noreferrer" class="flex w-full items-center justify-between">
              <span class="field-label">Відкрити DSM</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 text-[color:var(--ink-3)]"><path d="M7 17 17 7M9 7h8v8"/></svg>
            </a>
          </li>
        </List>
      </Section>
    </template>
  </Device>
</template>

<style scoped>
  .nas-note {
    @apply mt-2 px-1 text-[13px] leading-[1.4];
    color: var(--ink-3);
  }
  .nas-btn {
    @apply w-full px-3 py-3 text-[15px] font-semibold;
  }
  .nas-btn:disabled {
    @apply opacity-40;
  }
  .nas-apply {
    background: rgb(var(--accent-rgb) / 0.22);
    color: rgb(var(--accent-rgb));
  }
  .nas-danger {
    background: rgba(255, 69, 58, 0.2);
    color: #ff6961;
  }
  .nas-confirm {
    @apply rounded-[18px] px-4 py-3.5;
    background: var(--group);
  }
</style>
