import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import Weather from "./components/xiaomi/weather.vue";
import Humidifier from "./components/xiaomi/humidifier.vue";
import Magnet from "./components/xiaomi/magnet.vue";
import Motion from "./components/xiaomi/motion.vue";

const app = createApp(App);

app
    .component('zhimi.humidifier.ca1', Humidifier)
    .component('lumi.sensor_magnet.aq2', Magnet)
    .component('lumi.sensor_motion.aq2', Motion)
    .component('lumi.weather.v1', Weather);

app.mount('#app')
