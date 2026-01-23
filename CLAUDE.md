# Handoff Document for Tidradio H3 Plus Web CPS

**Last Updated:** January 23, 2026 (Session 2)
**Status:** Feature complete. Tested with FW v1.0.45. Ready to discover VFO frequencies.

---

## Project Overview

Web-based CPS for Tidradio H3 Plus radio using Web Bluetooth. Pure HTML+CSS+JS, no frameworks.

**App Files** (at root):
- `index.html` - Main UI with tabs (Channels, Settings, Debug)
- `js/ble.js` - BLE protocol, `parseSettings()` and `encodeSettings()`
- `js/debug.js` - Hex dump viewer with memory map (436 entries)
- `js/settings.js` - Settings form handling, dropdown options

**Docs** (in `docs/`):
- `settings-reference.md` - **SOURCE OF TRUTH** for option values
- `memory-map.md` - Complete memory layout documentation
- `ble-protocol.md` - BLE connection and commands
- `thoughts.md` - Future considerations (read optimization trade-offs)

**Claude Commands** (in `.claude/commands/`):
- `my_harakiri.md` - Update CLAUDE.md before context death
- `my_discover.md` - Interactive protocol for discovering new settings

**Server:** `python -m http.server 8000` then open http://localhost:8000

**Keyboard shortcuts:** Ctrl+1/2/3 to switch tabs, Ctrl+S save, Ctrl+O load

---

## Remaining Work

1. **Discover VFO frequencies** - IN PROGRESS. VFO A=145.500 MHz, B=437.550 MHz. Likely 32-bit integers (4 bytes each).

2. **Verify DTCS subtone encoding** - Not sure if DCS codes are properly encoded. Radio has options for normal and reversed polarity (DCS-N vs DCS-I) - need to verify these work correctly.

3. **Discover additional settings** - Analog Settings (AM Vol Level) not found in 16KB dump.

4. **Firmware version** - Not in memory dump, likely retrieved via different BLE command.

5. **Investigate OFFSET setting** - User reports it's NOT for frequency offset (shows "REJECT").

6. **STUN/KILL settings** - Placeholder fields exist in code but memory offsets not discovered.

---

## Debug Tab

The Debug tab shows an annotated hex dump of the 16KB memory:
- **Green (#aaff66)**: Known/mapped bytes
- **Red (#ffaaaa)**: Unknown bytes with data (not 0xFF) - investigate these!
- **Gray**: Empty (0xFF)
- **Hover**: Instant tooltip with address, description, value (bitfields show per-bit breakdown)

**Browser cache gotcha:** If CSS changes don't show, hard refresh with **Ctrl+Shift+R**.

---

## Claude Commands

Two custom commands available via `/my_harakiri` and `/my_discover`:

- **my_harakiri**: Updates this CLAUDE.md file before context window fills up
- **my_discover**: Interactive protocol for discovering new settings (see `.claude/commands/my_discover.md` for full protocol)

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
