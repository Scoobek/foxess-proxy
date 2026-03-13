/**
 * Logger - konfiguracja Winston dla aplikacji
 */

import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { LOGS_DIR_NAME, TIMESTAMP_FORMAT, MAX_LOG_AGE } from "../config/logger.js";

// Ścieżka do katalogu logów (root projektu + nazwa katalogu z config)
const logsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..", LOGS_DIR_NAME);

// Utwórz katalog logs jeśli nie istnieje
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const { combine, timestamp, printf, colorize, splat } = winston.format;

const logFormat = printf(({ timestamp, level, message, module, ...meta }) => {
    const mod = module ? `[${module}]` : "";
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} ${level} ${mod} ${message}${extra}`;
});

// Wspólna konfiguracja formatu
const baseFormat = combine(timestamp({ format: TIMESTAMP_FORMAT }), splat(), logFormat);
const consoleFormat = combine(timestamp({ format: TIMESTAMP_FORMAT }), splat(), colorize(), logFormat);

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    transports: [
        new winston.transports.Console({ format: consoleFormat }),
        new DailyRotateFile({
            dirname: logsDir,
            filename: "combined-%DATE%.log",
            datePattern: "YYYY-MM-DD",
            maxFiles: MAX_LOG_AGE,
            format: baseFormat,
        }),
        new DailyRotateFile({
            dirname: logsDir,
            filename: "error-%DATE%.log",
            datePattern: "YYYY-MM-DD",
            level: "error",
            maxFiles: MAX_LOG_AGE,
            format: baseFormat,
        }),
    ],
});

/**
 * Tworzy child logger dla modułu
 * Obsługuje wywołania: log.info("msg") lub log.info({meta}, "msg")
 * @param {string} module - nazwa modułu
 */
export function createLogger(module) {
    const child = logger.child({ module });

    const wrap = (level) => (metaOrMsg, msg) => {
        if (typeof metaOrMsg === "object" && msg) {
            child[level](Object.assign({ message: msg }, metaOrMsg));
        } else {
            child[level](metaOrMsg);
        }
    };

    return {
        error: wrap("error"),
        warn: wrap("warn"),
        info: wrap("info"),
        debug: wrap("debug"),
    };
}

export default logger;
