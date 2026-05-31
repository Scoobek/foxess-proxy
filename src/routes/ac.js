import { Router } from "express";
import GreeClient from "gree-hvac-client";
import { appState } from "../shared/state.js";
import { getAcDevice } from "../lib/ac/index.js";

const { VALUE } = GreeClient;
const VALID_MODES = Object.values(VALUE.mode);
const VALID_FAN_SPEEDS = Object.values(VALUE.fanSpeed);

const router = Router();

function resolveDevice(id, res) {
    const device = getAcDevice(id);
    if (!device) res.status(404).json({ error: "Nieznane urządzenie AC" });
    return device;
}

router.get("/status", (_req, res) => {
    res.json(appState.devices.ac);
});

router.post("/:id/on", (req, res) => {
    const device = resolveDevice(req.params.id, res);
    if (!device) return;
    device.turnOn();
    res.json(device.getState());
});

router.post("/:id/off", (req, res) => {
    const device = resolveDevice(req.params.id, res);
    if (!device) return;
    device.turnOff();
    res.json(device.getState());
});

router.post("/:id/set", (req, res) => {
    const { mode, fanSpeed, temperature } = req.body;

    if (
        mode === undefined &&
        fanSpeed === undefined &&
        temperature === undefined
    )
        return res
            .status(400)
            .json({ error: "Brak właściwości do ustawienia" });

    const device = resolveDevice(req.params.id, res);

    if (!device) return;

    if (mode !== undefined && !VALID_MODES.includes(mode))
        return res
            .status(400)
            .json({ error: "Nieprawidłowy tryb", valid: VALID_MODES });
    if (fanSpeed !== undefined && !VALID_FAN_SPEEDS.includes(fanSpeed))
        return res
            .status(400)
            .json({
                error: "Nieprawidłowa prędkość wentylatora",
                valid: VALID_FAN_SPEEDS,
            });
    if (
        temperature !== undefined &&
        (typeof temperature !== "number" ||
            temperature < 16 ||
            temperature > 30)
    )
        return res
            .status(400)
            .json({ error: "Temperatura musi być liczbą między 16 a 30" });

    device.set({ mode, fanSpeed, temperature });
    res.json(device.getState());
});

export default router;
