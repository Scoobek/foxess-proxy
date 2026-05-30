#!/usr/bin/env node
import dgram from "dgram";
import crypto from "crypto";
import readline from "readline";

const AC_IP = "192.168.1.1";
const BROADCAST = "192.168.1.255";
const PORT = 7000;
const GREE_KEY = "a3K8Bx%2r8Y7#xDh";
const SCAN_TIMEOUT_MS = 5000;

function decryptPack(pack, key) {
    const decipher = crypto.createDecipheriv("aes-128-ecb", key, null);
    decipher.setAutoPadding(true);
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(pack, "base64")),
        decipher.final(),
    ]);
    return JSON.parse(decrypted.toString("utf8"));
}

function encryptPack(obj, key) {
    const cipher = crypto.createCipheriv("aes-128-ecb", key, null);
    cipher.setAutoPadding(true);
    const encrypted = Buffer.concat([
        cipher.update(JSON.stringify(obj), "utf8"),
        cipher.final(),
    ]);
    return encrypted.toString("base64");
}

function prompt(rl, question) {
    return new Promise((resolve) => rl.question(question, resolve));
}

function promptPassword(question) {
    return new Promise((resolve) => {
        process.stdout.write(question);
        let password = "";
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding("utf8");
        process.stdin.on("data", function handler(ch) {
            if (ch === "\r" || ch === "\n") {
                process.stdin.setRawMode(false);
                process.stdin.pause();
                process.stdin.removeListener("data", handler);
                process.stdout.write("\n");
                resolve(password);
            } else if (ch === "") {
                process.exit();
            } else if (ch === "") {
                if (password.length > 0) {
                    password = password.slice(0, -1);
                    process.stdout.clearLine(0);
                    process.stdout.cursorTo(0);
                    process.stdout.write(question + "*".repeat(password.length));
                }
            } else {
                password += ch;
                process.stdout.write("*");
            }
        });
    });
}

async function scan(socket) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(
                "Brak odpowiedzi od AC. Upewnij się, że laptop jest podłączony do sieci Wi-Fi klimatyzatora (AirConditioner_XXXXXXXX)."
            ));
        }, SCAN_TIMEOUT_MS);

        socket.once("message", (msg) => {
            clearTimeout(timer);
            const outer = JSON.parse(msg.toString());
            const pack = decryptPack(outer.pack, GREE_KEY);
            resolve({ cid: outer.cid || pack.cid || pack.mac, pack });
        });

        const scanMsg = Buffer.from(JSON.stringify({ t: "scan" }));
        socket.send(scanMsg, 0, scanMsg.length, PORT, BROADCAST, (err) => {
            if (err) reject(err);
        });
    });
}

function sendCfg(socket, cid, ssid, passwd) {
    return new Promise((resolve, reject) => {
        const pack = encryptPack({ t: "cfg", ssid, passwd }, GREE_KEY);
        const outer = JSON.stringify({ t: "pack", i: 1, uid: 0, cid, tcid: "", pack });
        const buf = Buffer.from(outer);

        const timer = setTimeout(() => {
            reject(new Error("Brak potwierdzenia od AC po wysłaniu konfiguracji Wi-Fi."));
        }, SCAN_TIMEOUT_MS);

        socket.once("message", (msg) => {
            clearTimeout(timer);
            try {
                const resp = JSON.parse(msg.toString());
                const respPack = decryptPack(resp.pack, GREE_KEY);
                resolve(respPack);
            } catch {
                resolve({});
            }
        });

        socket.send(buf, 0, buf.length, PORT, AC_IP, (err) => {
            if (err) reject(err);
        });
    });
}

async function main() {
    console.log("=== Parowanie klimatyzatora Sinclair/Gree z Wi-Fi ===\n");
    console.log("Kroki przed uruchomieniem skryptu:");
    console.log("  1. Na pilocie lub panelu AC przytrzymaj przycisk Wi-Fi (~3 s) aż do piknięcia.");
    console.log("     Klimatyzator wchodzi w tryb AP i tworzy własną sieć Wi-Fi.");
    console.log("  2. Na laptopie połącz się z siecią Wi-Fi klimatyzatora");
    console.log('     (nazwa: "AirConditioner_XXXXXXXX" lub podobna, IP bramy: 192.168.1.1).');
    console.log("  3. Wróć tutaj i naciśnij Enter, aby kontynuować.\n");

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    await prompt(rl, "Naciśnij Enter gdy jesteś gotowy...");
    rl.close();

    const ssid = await new Promise((resolve) => {
        const rl2 = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl2.question("Podaj nazwę sieci Wi-Fi (SSID) do której ma połączyć się AC: ", (ans) => {
            rl2.close();
            resolve(ans.trim());
        });
    });

    const passwd = await promptPassword("Podaj hasło do sieci Wi-Fi: ");

    const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
    socket.bind(PORT, () => {
        socket.setBroadcast(true);
    });

    await new Promise((resolve) => socket.once("listening", resolve));

    console.log("\nWysyłam zapytanie skanowania do klimatyzatora...");
    let cid;
    try {
        const result = await scan(socket);
        cid = result.cid;
        console.log(`Wykryto urządzenie: CID=${cid}`);
    } catch (err) {
        console.error(`\nBłąd: ${err.message}`);
        socket.close();
        process.exit(1);
    }

    console.log(`Wysyłam konfigurację Wi-Fi (SSID: ${ssid})...`);
    try {
        await sendCfg(socket, cid, ssid, passwd);
        console.log("\nKonfiguracja Wi-Fi wysłana pomyślnie.");
    } catch (err) {
        // Niektóre urządzenia nie odsyłają potwierdzenia — to normalne
        console.log("\nKonfiguracja Wi-Fi wysłana (brak potwierdzenia — może być normalne).");
    }

    socket.close();

    console.log("\nCo teraz:");
    console.log("  1. Poczekaj ~30 sekund — AC powinien połączyć się z Twoją siecią Wi-Fi.");
    console.log("  2. Połącz laptop z powrotem ze swoją siecią Wi-Fi.");
    console.log("  3. Sprawdź w panelu routera przydzielone adresy DHCP — znajdź nowe urządzenie.");
    console.log("  4. Wpisz jego adres IP do src/config/gree.js.");
}

main().catch((err) => {
    console.error(err.message);
    process.exit(1);
});