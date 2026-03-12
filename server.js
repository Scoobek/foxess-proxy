/**
 * FoxESS Cloud – lokalny proxy serwer
 * Uruchom: node server.js
 * Dashboard będzie dostępny na: http://localhost:3000
 */

import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { PORT } from "./config/index.js";
import routes from "./routes/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use(routes);

// Start
app.listen(PORT, () => {
    console.log(`\n✅  FoxESS Proxy działa na http://localhost:${PORT}\n`);
});
