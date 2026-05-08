# FoxESS Proxy

A local Node.js server that manages a home solar installation. Automatically controls a water heater and lights based on data from a FoxESS inverter and daily sunrise/sunset times.

## What it does

- **Water heater** — turns on when solar surplus exceeds the threshold (1.65 kW), turns off when surplus drops or sunset occurs
- **Lights** — turns on 60 min after sunset, turns off 35 min before sunrise
- **Polling** — fetches inverter data every 3.5 min (PV power, load, battery SoC, etc.)
- **Scheduler** — every day at 00:01 fetches sunrise/sunset times and plans control windows

## Requirements

- Node.js 18+
- FoxESS Cloud account with API key
- Tuya devices (water heater, lights) with device ID and local key

## Configuration

Create a `.env` file in the project root:

```env
API_KEY=          # FoxESS Cloud API token
INVERTER_SN=      # inverter serial number

TUYA_BOJLER_ID=   # water heater device ID
TUYA_BOJLER_KEY=  # water heater local key

TUYA_LAMPKI_ID=   # lights device ID
TUYA_LAMPKI_KEY=  # lights local key

LOCATION_LAT=     # latitude
LOCATION_LNG=     # longitude
```

Config constants in `src/config/index.js`:

| Constant | Value | Description |
|----------|-------|-------------|
| `BOJLER_POWER_THRESHOLD` | 1.65 kW | Power threshold to turn on the water heater |
| `SUNRISE_OFFSET_MINUTES` | 90 min | Polling start delay after sunrise |
| `LAMPKI_SUNSET_OFFSET_MINUTES` | 60 min | Lights on delay after sunset |
| `LAMPKI_SUNRISE_OFFSET_MINUTES` | 35 min | Lights off offset before sunrise |
| `POLLING_INTERVAL_MS` | 3.5 min | Inverter API polling interval |

## Running

```bash
# Install dependencies
npm install

# Development
npm start

# Production (build + run)
npm run build
npm run start:prod

# Deploy (build + restart systemd SmartHeat.service)
npm run deploy
```

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/realtime` | POST | Current inverter data + auto water heater control |
| `/api/report` | POST | Daily report |
| `/api/history` | POST | Historical data |
| `/api/plants` | POST | List plants |
| `/api/bojler/status` | GET | Water heater and system state |

## Architecture

```
src/
├── api/           - Express server (port 3000)
├── config/        - config constants and FoxESS auth
├── lib/           - device control (water heater, lights, Tuya)
├── shared/        - shared state, logger (Winston), utils
└── worker/
    ├── services/      - API clients (FoxESS, sunrise/sunset)
    ├── managers/      - polling logic and sun data
    └── orchestration/ - scheduler, cron, day planning
```

## Integrations

- **FoxESS Cloud API** — inverter data (MD5 signature auth)
- **Tuya** — local IoT device control (TuyaAPI, hybrid connection with 5-min idle timeout)
- **sunrisesunset.io** — sunrise/sunset times for the configured location
