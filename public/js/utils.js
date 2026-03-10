// Przeliczanie sumy mocy na kWh
// Próbki co ~5 min = 1/12 godziny
// kWh = suma(kW) * (5/60)
export function sumToKwh(dataPoints) {
    const total = dataPoints.reduce((sum, p) => sum + (p.value ?? 0), 0);
    return Math.round((total / 12) * 100) / 100;
}

// Przetwarzanie odpowiedzi historycznej na zużycie w kWh
// Struktura odpowiedzi: result[0].datas[] -> { variable, data: [{ value, time }] }
export function calculateHistoryConsumption(historyResult) {
    console.log("here");
    const datas = historyResult?.[0]?.datas ?? [];

    const consumption = {};

    for (const item of datas) {
        const variable = item.variable;
        const dataPoints = item.data ?? [];
        consumption[variable] = sumToKwh(dataPoints);
    }

    return consumption;
}
