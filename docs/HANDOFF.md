# Handoff Document for Tidradio H3 Plus Web CPS

**Last Updated:** January 22, 2026 (Session 9)
**Status:** Debug tab with hex dump added! Write functionality still untested.

---

## Project Overview

Web-based CPS for Tidradio H3 Plus radio using Web Bluetooth. Pure HTML+CSS+JS, no frameworks.

**Key Files:**
- `index.html` - Main UI with tabs (Channels, Settings, Debug)
- `js/ble.js` - BLE protocol, `parseSettings()` and `encodeSettings()` fully updated
- `js/debug.js` - **NEW** Hex dump viewer with memory map (436 entries)
- `js/settings.js` - Settings form handling, dropdown options
- `docs/settings-reference.md` - **SOURCE OF TRUTH** for option values
- `docs/memory-map.md` - **Complete memory layout documentation**
- `docs/ble-protocol.md` - BLE connection and commands

**Server:** `python -m http.server 8000` then open http://localhost:8000

**Keyboard shortcuts:** Ctrl+1/2/3 to switch tabs, Ctrl+S save, Ctrl+O load

---

## Debug Tab

The Debug tab shows an annotated hex dump of the 16KB memory:
- **Green (#aaff66)**: Known/mapped bytes
- **Red (#ffaaaa)**: Unknown bytes with data (not 0xFF) - investigate these!
- **Gray**: Empty (0xFF)
- **Hover**: Instant tooltip with address, description, value

The memory map in `js/debug.js` has 436 entries covering all channels, names, settings, scan bitmap, etc.

**Browser cache gotcha:** If CSS changes don't show, hard refresh with **Ctrl+Shift+R**.

---

## Discovery Procedure

**Human + Claude Agent workflow for discovering new setting offsets:**

| Step | Who | Action |
|------|-----|--------|
| 1 | Human | Connect to radio via app, click **Read** |
| 2 | Human | Tell Claude "ready" |
| 3 | **Claude** | Run: `window.memBefore = Array.from(App.rawData)` |
| 4 | Human | Change ONE setting on the physical radio |
| 5 | Human | Click **Read** in the app, tell Claude "done" |
| 6 | **Claude** | Run comparison script (below), report offset |

**Comparison script (Claude runs this):**
```javascript
var before = window.memBefore; var after = App.rawData; var changes = [];
for(var i=0; i<after.length; i++) if(before[i] !== after[i])
  changes.push("0x"+i.toString(16).toUpperCase()+": "+before[i]+" -> "+after[i]);
window.memBefore = Array.from(after); // auto-save for next iteration
changes.length ? changes.join(", ") : "No changes detected"
```

When discovering a setting, look up the Options column in `settings-reference.md` to map index→value correctly.

---

## Remaining Work

1. **Test Write functionality** - All parse/encode functions updated but untested
2. **Discover additional settings** - Analog Settings (AM Vol Level) not found in 16KB
3. **Firmware version** - Not in memory dump, likely retrieved via different command
4. **Investigate OFFSET setting** - User reports it's NOT for frequency offset (shows "REJECT")

