# Handoff Document for Tidradio H3 Plus Web CPS

**Last Updated:** January 22, 2026
**Status:** Feature complete. Tested with FW v1.0.45.

---

## Project Overview

Web-based CPS for Tidradio H3 Plus radio using Web Bluetooth. Pure HTML+CSS+JS, no frameworks.

**Key Files:**
- `index.html` - Main UI with tabs (Channels, Settings, Debug)
- `js/ble.js` - BLE protocol, `parseSettings()` and `encodeSettings()`
- `js/debug.js` - Hex dump viewer with memory map (436 entries)
- `js/settings.js` - Settings form handling, dropdown options
- `docs/settings-reference.md` - **SOURCE OF TRUTH** for option values
- `docs/memory-map.md` - Complete memory layout documentation
- `docs/ble-protocol.md` - BLE connection and commands
- `docs/thoughts.md` - Future considerations (read optimization trade-offs)

**Server:** `python -m http.server 8000` then open http://localhost:8000

**Keyboard shortcuts:** Ctrl+1/2/3 to switch tabs, Ctrl+S save, Ctrl+O load

---

## Remaining Work

1. **Verify DTCS subtone encoding** - Not sure if DCS codes are properly encoded. Radio has options for normal and reversed polarity (DCS-N vs DCS-I) - need to verify these work correctly.

2. **Discover additional settings** - Analog Settings (AM Vol Level) not found in 16KB dump.

3. **Firmware version** - Not in memory dump, likely retrieved via different BLE command.

4. **Investigate OFFSET setting** - User reports it's NOT for frequency offset (shows "REJECT").

5. **STUN/KILL settings** - Placeholder fields exist in code but memory offsets not discovered.

---

## Debug Tab

The Debug tab shows an annotated hex dump of the 16KB memory:
- **Green (#aaff66)**: Known/mapped bytes
- **Red (#ffaaaa)**: Unknown bytes with data (not 0xFF) - investigate these!
- **Gray**: Empty (0xFF)
- **Hover**: Instant tooltip with address, description, value (bitfields show per-bit breakdown)

**Browser cache gotcha:** If CSS changes don't show, hard refresh with **Ctrl+Shift+R**.

---

## Discovery Procedure

**Human + Claude workflow for discovering new setting offsets:**

| Step | Who | Action |
|------|-----|--------|
| 1 | Human | Connect to radio via app, click **Read** |
| 2 | Human | Tell Claude "ready" |
| 3 | **Claude** | Run: `window.memBefore = Array.from(App.rawData)` |
| 4 | Human | Change ONE setting on the physical radio |
| 5 | Human | Click **Read** in the app, tell Claude "done" |
| 6 | **Claude** | Run comparison script (below), report offset |

**Comparison script:**
```javascript
var before = window.memBefore; var after = App.rawData; var changes = [];
for(var i=0; i<after.length; i++) if(before[i] !== after[i])
  changes.push("0x"+i.toString(16).toUpperCase()+": "+before[i]+" -> "+after[i]);
window.memBefore = Array.from(after); // auto-save for next iteration
changes.length ? changes.join(", ") : "No changes detected"
```

When discovering a setting, look up the Options column in `settings-reference.md` to map index to value correctly.

---

## Write Protocol

Reverse-engineered from ODMaster console capture. Successfully tested.

**Packet format:** `W + addrHi + addrLo + 0x20 + data[32] + checksum`

**Checksum:** Sum of 32 data bytes, mod 256

**ACK:** Radio responds with `0x06` after each packet - must wait for it

**Write modes:** Click Write button = Write All, or use dropdown for selective writes:

| Mode | Description |
|------|-------------|
| **All** | Full write - channels + settings + extended |
| **Settings Only** | Settings without channels |
| **Channels Only** | Channels without settings |

See `docs/ble-protocol.md` for full protocol details.

---

## DTMF Settings Reference

From user testing:
- **FM Interrupt [26]**: OFF = allow incoming calls to interrupt FM radio mode
- **DCD [35]**: Enable DTMF signaling for single call, group call, etc.
- **D-HOLD [36]**: DTMF auto-reset time
- **D-RSP [37]**: NULL=silent, RING=ring tone, REPLY=ring + 1s call-back, BOTH=ring + call-back
