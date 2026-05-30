import { Router } from "express";
import { appState } from "../shared/state.js";
import { getAcDevice } from "../lib/ac/index.js";

const router = Router();

router.get("/status", (_req, res) => {
    res.json(appState.devices.ac);
});

router.post("/:id/on", (req, res) => {
    const device = getAcDevice(req.params.id);
    if (!device) return res.status(404).json({ error: "Nieznane urządzenie AC" });
    device.turnOn();
    res.json(device.getState());
});

router.post("/:id/off", (req, res) => {
    const device = getAcDevice(req.params.id);
    if (!device) return res.status(404).json({ error: "Nieznane urządzenie AC" });
    device.turnOff();
    res.json(device.getState());
});

export default router;
