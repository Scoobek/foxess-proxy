/**
 * Logger - konfiguracja Winston dla aplikacji
 */

import winston from "winston";

const { combine, timestamp, printf, colorize, splat } = winston.format;

const logFormat = printf(({ timestamp, level, message, module, ...meta }) => {
    const mod = module ? `[${module}]` : "";
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} ${level} ${mod} ${message}${extra}`;
});

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: combine(
        timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        splat(),
        colorize(),
        logFormat
    ),
    transports: [new winston.transports.Console()],
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
