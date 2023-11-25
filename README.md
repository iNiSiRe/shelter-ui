# Shelter UI

## Project Setup

```sh
npm install
```

### Configure
```sh
# .env
VITE_API_URL=http://shelter-core:8080
VITE_WS_URL=ws://shelter-core:8888
```

### Compile and Hot-Reload for Development
```sh
npm run dev
```

### Compile and Minify for Production
```sh
npm run build
```

### Add devices
```yaml
# public/dashboard.yaml
items:
  - device: humidifier-1
    name: Humidifier

  - device: lumi.xxxxxxxxxxxxxx
    name: Weather

  - device: lumi.xxxxxxxxxxxxxx
    name: Door

  - device: lumi.xxxxxxxxxxxxxx
    name: Motion
```

## Supported devices

### Xiaomi
- zhimi.humidifier.ca1
- lumi.sensor_magnet.aq2
- lumi.sensor_motion.aq2
- lumi.weather.v1