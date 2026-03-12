/**
 * Bojler - stan i logika auto-control
 */

import { turnOnBojler } from "./tuya.js";
import { BOJLER_POWER_THRESHOLD } from "../config/index.js";

export const bojlerState = {
    isOn: false,
    lastChange: null,
    lastCheck: null,
    turnedOnBy: null, // 'auto' | 'manual' | null
    pvPower: 0,
    loadsPower: 0,
    surplus: 0,
    sunrise: null,
    sunset: null,
};

export function updateBojlerState(updates) {
    Object.assign(bojlerState, updates);
    console.log(
        `[bojler] Stan: ${bojlerState.isOn ? "🟢 WŁĄCZONY" : "🔴 WYŁĄCZONY"}`
    );
}

export function checkBojlerConditions(datas) {
    const pvPower = datas.find((d) => d.variable === "pvPower")?.value ?? 0;
    const loadsPower =
        datas.find((d) => d.variable === "loadsPower")?.value ?? 0;
    const surplus = pvPower - loadsPower;

    // Aktualizuj stan z danymi PV
    bojlerState.pvPower = pvPower;
    bojlerState.loadsPower = loadsPower;
    bojlerState.surplus = surplus;
    bojlerState.lastCheck = new Date().toISOString();

    console.log(
        `[bojler] pvPower: ${pvPower}W, loadsPower: ${loadsPower}W, nadwyżka: ${surplus}W`
    );

    // Warunki: pvPower > threshold AND surplus >= threshold
    const shouldTurnOn =
        pvPower > BOJLER_POWER_THRESHOLD && surplus >= BOJLER_POWER_THRESHOLD;

    if (shouldTurnOn) {
        console.log(`[bojler] Warunki spełnione - można uruchomić bojler`);
    }

    return shouldTurnOn;
}

export async function handleBojlerAutoControl(datas) {
    const shouldTurnOn = checkBojlerConditions(datas);

    if (shouldTurnOn && !bojlerState.isOn) {
        const result = await turnOnBojler();
        if (result.success) {
            updateBojlerState({
                isOn: true,
                lastChange: new Date().toISOString(),
                turnedOnBy: "auto",
            });
        }
    }
}
