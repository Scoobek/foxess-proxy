import { KEY_METRICS, REPORT_VARS } from "./config.js";

// Pomocnicze
export function round2(v) {
    return typeof v === "number" ? Math.round(v * 100) / 100 : v;
}

// Logowanie
export function log(msg, type = "") {
    const box = document.getElementById("logBox");
    const line = document.createElement("span");
    const time = new Date().toLocaleTimeString("pl-PL");

    line.className = `log-line ${type}`;
    line.textContent = `[${time}] ${msg}`;

    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
}

// Status badge
export function setStatus(state) {
    const badge = document.getElementById("statusBadge");
    const txt = document.getElementById("statusText");

    badge.className = `status-badge ${state}`;
    txt.textContent =
        state === "connected"
            ? "połączony"
            : state === "error"
            ? "błąd"
            : "niepołączony";
}

// Renderowanie metryk
export function renderMetrics(datas) {
    const map = {};
    datas.forEach((d) => {
        map[d.variable] = d;
    });

    const grid = document.getElementById("metricsGrid");
    grid.innerHTML = KEY_METRICS.map((m) => {
        const item = map[m.key];
        const val = item ? round2(item.value) : "–";
        return `
            <div class="metric-card">
                <div class="metric-label">${m.label}</div>
                <div class="metric-value ${m.cls}">${val}<span class="metric-unit">${m.unit}</span></div>
            </div>`;
    }).join("");
}

// Renderowanie tabeli danych
export function renderTable(datas) {
    const tbody = document.getElementById("dataTableBody");
    tbody.innerHTML = datas
        .map(
            (d) => `
                <tr>
                    <td class="td-key">${d.variable}</td>
                    <td class="td-val">${round2(d.value)}</td>
                    <td class="td-unit">${d.unit ?? "–"}</td>
                </tr>`
        )
        .join("");

    document.getElementById("tableSection").style.display = "";
    document.getElementById("fetchTime").textContent =
        "Aktualizacja: " + new Date().toLocaleTimeString("pl-PL");
}

// Renderowanie raportu
export function renderReport(results) {
    const tbody = document.getElementById("reportTableBody");
    const date = document.getElementById("reportDate");
    const today = new Date();

    date.textContent = today.toLocaleDateString("pl-PL");

    if (!results.length) {
        tbody.innerHTML =
            '<tr><td colspan="3" class="empty-state">Brak danych raportu</td></tr>';
        return;
    }

    // Zbierz sumy z tablicy wyników
    const sums = {};
    REPORT_VARS.forEach((v) => {
        sums[v.key] = 0;
    });

    results.forEach((row) => {
        const key = row.variable;
        if (sums[key] !== undefined && Array.isArray(row.values)) {
            sums[key] += row.values.reduce((a, b) => a + (b ?? 0), 0);
        }
    });

    tbody.innerHTML = REPORT_VARS.map(
        (v) => `
            <tr>
                <td class="td-key">${v.label}</td>
                <td class="td-val">${round2(sums[v.key])}</td>
                <td class="td-unit">kWh</td>
            </tr>`
    ).join("");
}

// Przełączanie zakładek
export function switchTab(name, el) {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    el.classList.add("active");

    ["realtime", "report", "raw"].forEach((t) => {
        document.getElementById(`tab-${t}`).style.display = t === name ? "" : "none";
    });
}

// Czyszczenie danych
export function clearAll() {
    document.getElementById("metricsGrid").innerHTML =
        '<div class="empty-state" style="grid-column:1/-1"><p>Dane wyczyszczone</p></div>';
    document.getElementById("tableSection").style.display = "none";
    document.getElementById("reportTableBody").innerHTML =
        '<tr><td colspan="3" class="empty-state">Pobierz dane aby wyświetlić raport</td></tr>';
    document.getElementById("rawJson").textContent = "Oczekiwanie na dane…";
    document.getElementById("logBox").innerHTML =
        '<span class="log-line info">[system] Dane wyczyszczone</span>';

    setStatus("");
}
