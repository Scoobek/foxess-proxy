/**
 * Web Server - definicja i konfiguracja Express
 */

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { PORT } from "../config/index.js";
import routes from "../routes/index.js";
import { createLogger } from "../shared/logger.js";

const log = createLogger("server");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "../..");

export function createServer() {
    const app = express();

    // Middleware
    app.use(express.json());
    app.use(express.static(path.join(rootDir, "public")));

    // Routes
    app.use(routes);

    app.listen(PORT, () => {
        log.info({ port: PORT }, "Web Server uruchomiony");
    });
}
