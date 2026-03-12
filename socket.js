import TuyAPI from "tuyapi";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const keys = JSON.parse(
    readFileSync(join(__dirname, "smartHome/keys.json"), "utf-8")
);
const bojler = keys.find((d) => d.name === "bojler");

const device = new TuyAPI({
    id: bojler.id,
    key: bojler.key,
    version: "3.3",
});

device.on("error", (err) => console.error("[tuya] Błąd:", err));

// Helper - wykonaj operację na urządzeniu z auto-connect/disconnect
async function withDevice(operation) {
    try {
        await device.find();
        await device.connect();
        const result = await operation();
        await device.disconnect();
        return { success: true, ...result };
    } catch (err) {
        console.error("[tuya] Błąd:", err.message);
        return { success: false, error: err.message };
    }
}

// Helper - loguj i ustaw stan
async function setBojlerState(targetState) {
    return withDevice(async () => {
        const currentState = await device.get();
        const stateLabel = currentState ? "🟢 WŁĄCZONY" : "🔴 WYŁĄCZONY";
        console.log(`[tuya] Bojler aktualny stan: ${stateLabel}`);

        if (currentState !== targetState) {
            await device.set({ set: targetState });
            console.log(`[tuya] Bojler ${targetState ? "włączony" : "wyłączony"} ✓`);
            return { changed: true, isOn: targetState };
        }

        console.log(`[tuya] Bojler już ${targetState ? "włączony" : "wyłączony"}, pomijam`);
        return { changed: false, isOn: currentState };
    });
}

// Włącz bojler
export const turnOnBojler = () => setBojlerState(true);

// Wyłącz bojler
export const turnOffBojler = () => setBojlerState(false);

// Pobierz status bojlera
export const getBojlerStatus = () =>
    withDevice(async () => {
        const isOn = await device.get();
        return { isOn };
    });
