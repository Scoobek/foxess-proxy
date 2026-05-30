#!/usr/bin/env node
// Diagnostyka połączenia AC - krok po kroku: scan → bind → status
import dgram from "dgram";
import crypto from "crypto";

const IP = process.argv[2] || "192.168.1.51";
const PORT = 7000;
const ECB_KEY = "a3K8Bx%2r8Y7#xDh";

function ecbDecrypt(pack, key) {
    const d = crypto.createDecipheriv("aes-128-ecb", key, null);
    return JSON.parse(d.update(pack, "base64", "utf8") + d.final("utf8"));
}

function ecbEncrypt(obj, key) {
    const c = crypto.createCipheriv("aes-128-ecb", key, null);
    return c.update(JSON.stringify(obj), "utf8", "base64") + c.final("base64");
}

function send(socket, obj) {
    const buf = Buffer.from(JSON.stringify(obj));
    return new Promise((resolve, reject) =>
        socket.send(buf, 0, buf.length, PORT, IP, (err) =>
            err ? reject(err) : resolve()
        )
    );
}

function waitForMessage(socket, timeoutMs = 3000) {
    return new Promise((resolve, reject) => {
        const t = setTimeout(
            () => reject(new Error(`Brak odpowiedzi przez ${timeoutMs}ms`)),
            timeoutMs
        );
        socket.once("message", (msg) => {
            clearTimeout(t);
            resolve(JSON.parse(msg.toString()));
        });
    });
}

const socket = dgram.createSocket("udp4");
await new Promise((r) => socket.bind(r));
socket.setBroadcast(true);

console.log(`\nDiagnostyka AC: ${IP}:${PORT}\n`);

// Krok 1: Scan
console.log("1. Wysyłam scan...");
await send(socket, { t: "scan" });
let scanResp;
try {
    scanResp = await waitForMessage(socket);
    const pack = ecbDecrypt(scanResp.pack, ECB_KEY);
    console.log("   OK - odpowiedź scan:", JSON.stringify(pack));
    var mac = pack.cid || pack.mac;
    console.log(`   MAC: ${mac}`);
} catch (e) {
    console.error("   BŁĄD:", e.message);
    socket.close();
    process.exit(1);
}

// Krok 2: Bind (ECB)
console.log("\n2. Wysyłam bind (ECB)...");
const bindPack = ecbEncrypt({ mac, t: "bind", uid: 0 }, ECB_KEY);
await send(socket, { cid: "app", i: 1, t: "pack", uid: 0, pack: bindPack });
try {
    const bindResp = await waitForMessage(socket, 5000);
    const bindPayload = ecbDecrypt(bindResp.pack, ECB_KEY);
    console.log("   OK - odpowiedź bind:", JSON.stringify(bindPayload));
    if (bindPayload.t === "bindok") {
        console.log(`   Klucz urządzenia: ${bindPayload.key}`);
    }
} catch (e) {
    console.log(`   ECB bind nie odpowiedział: ${e.message}`);
    console.log("   Próbuję GCM...");

    // Krok 2b: Bind (GCM)
    const GCM_KEY = "{yxAHAY_Lm6pbC/<";
    const GCM_NONCE = Buffer.from("5440784449675a516c5e6313", "hex");
    const GCM_AEAD = Buffer.from("qualcomm-test");
    const cipher = crypto.createCipheriv("aes-128-gcm", GCM_KEY, GCM_NONCE);
    cipher.setAAD(GCM_AEAD);
    const gcmPack =
        cipher.update(
            JSON.stringify({ mac, t: "bind", uid: 0 }),
            "utf8",
            "base64"
        ) + cipher.final("base64");
    const gcmTag = cipher.getAuthTag().toString("base64");

    await send(socket, {
        cid: "app",
        i: 1,
        t: "pack",
        uid: 0,
        pack: gcmPack,
        tag: gcmTag,
    });
    try {
        const gcmResp = await waitForMessage(socket, 5000);
        const decipher = crypto.createDecipheriv(
            "aes-128-gcm",
            GCM_KEY,
            GCM_NONCE
        );
        decipher.setAAD(GCM_AEAD);
        if (gcmResp.tag)
            decipher.setAuthTag(Buffer.from(gcmResp.tag, "base64"));
        const gcmPayload = JSON.parse(
            decipher.update(gcmResp.pack, "base64", "utf8") +
                decipher.final("utf8")
        );
        console.log(
            "   OK - GCM bind odpowiedział:",
            JSON.stringify(gcmPayload)
        );
    } catch (e2) {
        console.error("   GCM bind też nie odpowiedział:", e2.message);
    }
}

socket.close();
