const TIMEZONE = "Europe/Warsaw";

// ─── PARSOWANIE CZASU Z FORMATU FOXESS ───────────────────────────────────────
// Format: "2026-03-10 06:38:46 CET+0100"
function parseTimeString(timeStr) {
    // Wyciągnij datę i czas (ignoruj strefę - parsujemy jako lokalny)
    const match = timeStr.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})/);
    if (!match) return 0;
    return new Date(`${match[1]}T${match[2]}`).getTime();
}

// ─── PRZELICZENIE PRÓBEK NA kWh ───────────────────────────────────────────────
// FoxESS wysyła próbki mocy (kW) co ~5 minut.
// Jeśli próbki nie są równo co 5 minut, używamy różnicy czasu między próbkami.
export function samplesToKwh(dataPoints) {
    if (!dataPoints || dataPoints.length === 0) return 0;

    // Konwertuj stringi czasu na timestampy i sortuj
    const sorted = dataPoints
        .map((p) => ({
            time: typeof p.time === "string" ? parseTimeString(p.time) : p.time,
            value: p.value ?? 0,
        }))
        .sort((a, b) => a.time - b.time);

    let kwh = 0;

    if (sorted.length === 1) {
        // Tylko jedna próbka – zakładamy 5 minut
        kwh = sorted[0].value / 12;
    } else {
        for (let i = 1; i < sorted.length; i++) {
            const dt_hours =
                (sorted[i].time - sorted[i - 1].time) / 1000 / 3600;
            const avg_kw = (sorted[i - 1].value + sorted[i].value) / 2;
            kwh += avg_kw * dt_hours;
        }
    }

    return Math.round(kwh * 100) / 100;
}

// ─── TIMESTAMPY POCZĄTKU I KOŃCA DNIA ────────────────────────────────────────
// Poprawnie obsługuje czas letni/zimowy dla Europe/Warsaw
export function getDayTimestamps(dateStr) {
    // dateStr: 'YYYY-MM-DD' lub undefined dla dzisiaj
    if (!dateStr) {
        dateStr = new Date().toLocaleDateString("sv-SE", {
            timeZone: TIMEZONE,
        });
    }

    const startStr = `${dateStr}T00:00:00`;
    const endStr = `${dateStr}T23:59:59`;

    // Używamy Intl żeby uzyskać offset dla danej daty i strefy
    const getOffset = (isoLocal) => {
        const d = new Date(isoLocal + "Z");
        const local = new Date(
            d.toLocaleString("en-US", { timeZone: TIMEZONE })
        );
        return Math.round((d - local) / 60000);
    };

    const startOffset = getOffset(startStr);
    const endOffset = getOffset(endStr);

    const begin = new Date(startStr + "Z").getTime() + startOffset * 60000;
    const end = new Date(endStr + "Z").getTime() + endOffset * 60000;

    return { begin, end, dateStr };
}

// ─── PRZETWARZANIE ODPOWIEDZI HISTORYCZNEJ ───────────────────────────────────
// Struktura odpowiedzi: result[0].datas[] -> { variable, unit, data: [{ value, time }] }
export function calculateHistoryConsumption(historyResult) {
    if (!historyResult || !Array.isArray(historyResult)) return null;

    // Dane są w result[0].datas
    const datas = historyResult[0]?.datas ?? [];

    const consumption = {
        loads: 0,
        gridConsumption: 0,
        feedin: 0,
        pv: 0,
        samples: 0,
    };

    for (const item of datas) {
        const dataPoints = item.data ?? [];

        switch (item.variable) {
            case "loadsPower":
                consumption.loads = samplesToKwh(dataPoints);
                break;
            case "gridConsumptionPower":
                consumption.gridConsumption = samplesToKwh(dataPoints);
                break;
            case "feedinPower":
                consumption.feedin = samplesToKwh(dataPoints);
                break;
            case "pvPower":
                consumption.pv = samplesToKwh(dataPoints);
                consumption.samples = dataPoints.length;
                break;
        }
    }

    console.log(consumption);

    return consumption;
}
