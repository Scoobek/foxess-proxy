import { GREE_DEVICES } from "../../config/gree.js";
import { appState, updateAcState } from "../../shared/state.js";
import { createLogger } from "../../shared/logger.js";
import { GreeDevice } from "./device.js";

const log = createLogger("ac");

const _devices = new Map();

function connectDevice({ id, name, ip }) {
    appState.ac.push({ id, name, reachable: false });
    const device = new GreeDevice({ id, name, ip });
    _devices.set(id, device);
    return device.connect((state) => updateAcState(id, state));
}

export async function initAcDevices() {
    const unconfigured = GREE_DEVICES.filter((d) => !d.ip);
    for (const d of unconfigured) {
        log.warn({ id: d.id, name: d.name }, "Brak adresu IP - pomijam urządzenie AC");
    }
    await Promise.all(GREE_DEVICES.filter((d) => d.ip).map(connectDevice));
}

export function getAcDevice(id) {
    return _devices.get(id);
}
