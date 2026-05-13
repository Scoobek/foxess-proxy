/**
 * SSE - rejestr połączonych klientów i broadcast stanu
 */

import { createLogger } from "./logger.js";

const log = createLogger("sse");
const clients = [];

export function addClient(res) {
    clients.push(res);
    log.debug({ total: clients.length }, "Klient SSE połączony");
}

export function removeClient(res) {
    const index = clients.indexOf(res);
    if (index !== -1) {
        clients.splice(index, 1);
    }
    log.debug({ total: clients.length }, "Klient SSE rozłączony");
}

export function broadcast(data) {
    if (clients.length === 0) return;
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const res of clients) {
        res.write(payload);
    }
}
