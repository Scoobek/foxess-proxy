/**
 * Konfiguracja Open-Meteo API (bezpłatne, bez klucza API)
 * Lokalizacja pobierana z LOCATION_LAT / LOCATION_LNG (.env)
 */

export const OPEN_METEO_API = "https://api.open-meteo.com/v1/forecast";

export const OPEN_METEO_CURRENT = [
    "temperature_2m",
    "rain",
    "wind_speed_10m",
    "cloud_cover",
];

export const OPEN_METEO_HOURLY = [
    "weather_code",
    "precipitation",
    "precipitation_probability",
];
