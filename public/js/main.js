import {
    fetchHistory,
    fetchPlants,
    fetchRealtime,
    fetchReport,
} from "./api.js";
import {
    log,
    setStatus,
    setPvStatus,
    renderMetrics,
    renderTable,
    renderReport,
    switchTab,
    clearAll,
} from "./ui.js";

// Główna funkcja pobierania danych
async function fetchAll() {
    const apiKey = document.getElementById("apiKey").value.trim();
    const sn = document.getElementById("deviceSn").value.trim();

    if (!apiKey || !sn) {
        log("Uzupełnij klucz API i numer seryjny!", "err");
        return;
    }

    const btn = document.getElementById("btnFetch");
    btn.disabled = true;
    btn.textContent = "Pobieranie…";
    setStatus("");

    try {
        // Dane bieżące
        const { datas, time } = await fetchRealtime(sn);
        renderMetrics(datas, time);
        renderTable(datas);
        setPvStatus(datas);

        // Raport dzienny
        // const report = await fetchReport(sn);
        // const plantReports = await fetchPlants();
        // const historyData = await fetchHistory(sn, "2026-03-11");
        // renderReport(report);

        // Raw JSON
        document.getElementById("rawJson").textContent = JSON.stringify(
            // { realtime: { datas, time }, report },
            { realtime: { datas, time } },
            null,
            2
        );

        setStatus("connected");
        log("Wszystkie dane pobrane pomyślnie ✓", "ok");
        // log("History data ", historyData);
    } catch (err) {
        setStatus("error");
        log(`BŁĄD: ${err.message}`, "err");
        console.error(err);
    } finally {
        btn.disabled = false;
        btn.textContent = "Pobierz dane";
    }
}

// Eksportuj do globalnego scope dla onclick w HTML
window.fetchAll = fetchAll;
window.switchTab = switchTab;
window.clearAll = clearAll;

// Enter → pobierz
document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") fetchAll();
});
