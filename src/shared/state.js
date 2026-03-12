/**
 * Współdzielony stan aplikacji
 */

export const bojlerState = {
    isOn: false,
    lastChange: null,
    lastCheck: null,
    turnedOnBy: null, // 'auto' | 'manual' | null
    pvPower: 0,
    loadsPower: 0,
    surplus: 0,
    sunrise: null,
    sunset: null,
};

export function updateBojlerState(updates) {
    // shallow copy pamiętać, gdyby stan się rozrósł
    Object.assign(bojlerState, updates);
    console.log(
        `[bojler] Stan: ${bojlerState.isOn ? "🟢 WŁĄCZONY" : "🔴 WYŁĄCZONY"}`
    );
}
