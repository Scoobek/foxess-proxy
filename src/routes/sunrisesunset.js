/**
 * Sunrise/Sunset API routes
 */

import { Router } from "express";
import { fetchSunriseSunset } from "../lib/sunrisesunset.js";

const router = Router();

// GET /api/sunrisesunset - pobierz czasy wschodu i zachodu słońca
router.get("/", async (req, res) => {
    const result = await fetchSunriseSunset();

    if (result.success) {
        res.json({
            sunrise: result.sunrise,
            sunset: result.sunset,
        });
    } else {
        res.status(502).json({ error: result.error });
    }
});

export default router;
