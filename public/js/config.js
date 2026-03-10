// Zmienne do wyświetlenia jako metryki główne
export const KEY_METRICS = [
    { key: "pvPower", label: "Moc PV", unit: "kW", cls: "metric-accent" },
    { key: "loadsPower", label: "Pobór domu", unit: "kW", cls: "metric-blue" },
    { key: "gridConsumptionPower", label: "Pobór z sieci", unit: "kW", cls: "metric-red" },
    { key: "feedinPower", label: "Oddano do sieci", unit: "kW", cls: "metric-green" },
    { key: "batChargePower", label: "Ładowanie bat.", unit: "kW", cls: "metric-green" },
    { key: "batDischargePower", label: "Rozładowanie bat.", unit: "kW", cls: "metric-red" },
    { key: "SoC", label: "Stan baterii", unit: "%", cls: "metric-blue" },
    { key: "ambientTemperation", label: "Temp. otoczenia", unit: "°C", cls: "metric-accent" },
];

// Dodatkowe zmienne do pobrania w realtime
export const EXTRA_REALTIME_VARS = [
    "pv1Power",
    "pv2Power",
    "pv3Power",
    "pv4Power",
    "pv1Volt",
    "pv2Volt",
    "pv1Current",
    "pv2Current",
    "invBatPower",
    "invTemperation",
    "batTemperature",
    "gridVoltage",
    "gridFrequency",
    "RVolt",
    "SVolt",
    "TVolt",
    "YVolt",
    "BVolt",
];

// Zmienne do raportu dziennego
export const REPORT_VARS = [
    { key: "generation", label: "Produkcja PV" },
    { key: "gridConsumption", label: "Pobór z sieci" },
    { key: "feedin", label: "Oddano do sieci" },
    { key: "loads", label: "Zużycie domu" },
    { key: "chargeEnergyToTal", label: "Naładowano baterię" },
    { key: "dischargeEnergyToTal", label: "Rozładowano baterię" },
];
