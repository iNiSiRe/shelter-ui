<script setup>

import List from "../../properties/List.vue";
import Item from "../../properties/Item.vue";
import Section from "../../properties/Section.vue";
import LastUpdate from "../../properties/LastUpdate.vue";

defineProps({
  battery: Object
})

</script>

<template>
  <Section class="mt-4" name="Battery">
    <List>
      <Item label="Voltage">
        <span>{{ battery.voltage }}V</span>
      </item>
      <Item label="Last update">
        <LastUpdate :timestamp="battery.updatedAt"></LastUpdate>
      </item>
    </List>
  </Section>
</template>

<style scoped>

</style>