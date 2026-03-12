import TuyAPI from "tuyapi";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const keys = JSON.parse(readFileSync(join(__dirname, "smartHome/keys.json"), "utf-8"));
const bojler = keys.find((d) => d.name === "bojler");

const device = new TuyAPI({
    id: bojler.id,
    key: bojler.key,
    version: "3.3",
});

device.on("error", (err) => console.error("[tuya] Błąd:", err));

// Włącz bojler (tylko jeśli wyłączony)
export async function turnOnBojler() {
    try {
        await device.find();
        await device.connect();

        const status = await device.get();
        console.log("[tuya] Bojler aktualny stan:", status ? "🟢 WŁĄCZONY" : "🔴 WYŁĄCZONY");

        if (!status) {
            await device.set({ set: true });
            console.log("[tuya] Bojler włączony ✓");
        } else {
            console.log("[tuya] Bojler już włączony, pomijam");
        }

        await device.disconnect();
        return { success: true, wasOff: !status };
    } catch (err) {
        console.error("[tuya] Błąd włączania bojlera:", err.message);
        return { success: false, error: err.message };
    }
}

// Wyłącz bojler (tylko jeśli włączony)
export async function turnOffBojler() {
    try {
        await device.find();
        await device.connect();

        const status = await device.get();
        console.log("[tuya] Bojler aktualny stan:", status ? "🟢 WŁĄCZONY" : "🔴 WYŁĄCZONY");

        if (status) {
            await device.set({ set: false });
            console.log("[tuya] Bojler wyłączony ✓");
        } else {
            console.log("[tuya] Bojler już wyłączony, pomijam");
        }

        await device.disconnect();
        return { success: true, wasOn: status };
    } catch (err) {
        console.error("[tuya] Błąd wyłączania bojlera:", err.message);
        return { success: false, error: err.message };
    }
}

// Pobierz status bojlera
export async function getBojlerStatus() {
    try {
        await device.find();
        await device.connect();
        const status = await device.get();
        await device.disconnect();
        return { success: true, isOn: status };
    } catch (err) {
        console.error("[tuya] Błąd pobierania statusu:", err.message);
        return { success: false, error: err.message };
    }
}
