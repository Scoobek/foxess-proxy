import { GREE_DEVICES } from "../../config/gree.js";
import { appState, updateAcState } from "../../shared/state.js";
import { GreeDevice } from "./device.js";

const _devices = new Map();

function connectDevice({ id, name, ip }) {
    appState.ac.push({ id, name, reachable: false });
    const device = new GreeDevice({ id, name, ip });
    _devices.set(id, device);
    return device.connect((state) => updateAcState(id, state));
}

export async function initAcDevices() {
    await Promise.all(GREE_DEVICES.map(connectDevice));
}

export function getAcDevice(id) {
    return _devices.get(id);
}
