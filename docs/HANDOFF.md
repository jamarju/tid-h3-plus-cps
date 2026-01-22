# Handoff Document for Tidradio H3 Plus Web CPS

**Last Updated:** January 22, 2026 (Session 11)
**Status:** Write protocol WORKING! Grid UX improvements complete.

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

### Grid UI - FIXED (Session 11)

All major UX issues resolved:
- ✅ Boolean cells toggle on single click
- ✅ Arrow key navigation works after click/edit (using event capturing)
- ✅ Enter key auto-expands dropdowns (via showPicker API)
- ✅ Double-click dropdown works properly (click timing detection)
- ✅ Focus restored after editing completes
- ✅ Select change commits immediately and moves down

### What Works Well
- Typing in free text cells immediately starts editing ✓
- Ctrl+C / Ctrl+V between cells works, even for dropdowns ✓
- Tab navigation between cells ✓
- Single-click toggles boolean cells (Hop, Busy, Scan) ✓
- Arrow keys navigate between cells ✓
- Enter/double-click on dropdowns auto-expands options ✓
- Selecting dropdown option commits and moves to next row ✓

### Remaining Work

1. **Discover additional settings** - Analog Settings (AM Vol Level) not found in 16KB
2. **Firmware version** - Not in memory dump, likely retrieved via different command
3. **Investigate OFFSET setting** - User reports it's NOT for frequency offset (shows "REJECT")

---

## Write Protocol (Session 10) - TESTED & WORKING

Reverse-engineered from ODMaster console capture. **Successfully tested** - menu color, startup messages, and most channel settings save correctly.

**Packet format:** `W + addrHi + addrLo + 0x20 + data[32] + checksum`

**Checksum:** Sum of 32 data bytes, mod 256

**ACK:** Radio responds with `0x06` after each packet - must wait for it

**Write ranges** (ODMaster skips gaps - we must match):
```javascript
[0x0000, 0x13C0],  // Channels, names, settings
[0x1800, 0x18E0],  // Config area 1
[0x1900, 0x1980],  // Scan bitmap at 0x1920+
[0x1C00, 0x1C40],  // Startup messages
[0x1F20, 0x1F40],  // Menu color at 0x1F2A, other settings
```

**Debug logging added** - console shows each write address and ACK status.

See `docs/ble-protocol.md` for full ODMaster capture with Chinese→English translations.

---

## Session 10 Summary

1. Reverse-engineered write protocol from ODMaster console capture
2. Added checksum calculation (sum of data bytes mod 256)
3. Added ACK waiting after each write packet
4. Discovered ODMaster writes specific ranges with gaps (not all 16KB)
5. Added safety check: must Read before Write (preserves unknown bytes)
6. Added debug logging for write operations
7. **TESTED**: Settings (menu color, startup messages) save successfully
8. **ISSUE FOUND**: Grid UI doesn't reliably capture boolean edits (scan add) - UI polish needed

---

## Session 11 Summary

Fixed all major Grid UI/UX issues in `js/grid.js`:

1. **Boolean single-click toggle**: Added `toggleBoolean()` method, click handler detects boolean columns and toggles directly
2. **Arrow key navigation**: Changed keydown listener to use capturing phase (`true` third arg) to handle events before browser defaults
3. **Focus restoration**: `stopEditing()` now calls `focusCell()` to restore keyboard navigation
4. **Auto-expand dropdowns**: Using `showPicker()` API on select elements when entering edit mode
5. **Double-click fix**: Added click timing detection to prevent single-click handler from interfering with double-clicks
6. **Input event handlers**: Added blur handler (with delay) and change handler for selects to auto-commit on selection

