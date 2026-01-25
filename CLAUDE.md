# Handoff Document for Tidradio H3 Plus Web CPS

**Last Updated:** January 25, 2026 (Session 20)
**Status:** Full VFO A/B settings implemented (subtones, bandwidth, power, scramble, offset direction). DCS inverted encoding fixed. Write protocol bug fixed (must always send 32-byte packets). Channel names write range corrected.

---

## Project Overview

Web-based CPS for Tidradio H3 Plus radio using Web Bluetooth. Pure HTML+CSS+JS, no frameworks.

**App Files** (all files are in `docs/` directory for GitHub Pages):
- `docs/index.html` - Main UI with 4 tabs (Settings, Channels, FM Channels, Debug)
- `docs/js/ble.js` - BLE protocol, `parseSettings()` and `encodeSettings()`
- `docs/js/grid.js` - Editable spreadsheet-style grid for channels (199 channels)
- `docs/js/fm.js` - Editable spreadsheet-style grid for FM channels (25 channels)
- `docs/js/settings.js` - Settings form handling, dropdown options, tone selects
- `docs/js/debug.js` - Hex dump viewer with memory map (full coverage)
- `docs/js/main.js` - App initialization and state management
- `docs/js/storage.js` - File save/load (.h3p format)

**Docs** (in `docs/`):
- `settings-reference.md` - **SOURCE OF TRUTH** for option values
- `memory-map.md` - Complete memory layout documentation
- `ble-protocol.md` - BLE connection and commands
- `thoughts.md` - Future considerations (read optimization trade-offs)

**Claude Commands** (in `.claude/commands/`):
- `my_harakiri.md` - Update CLAUDE.md before context death
- `my_discover.md` - Interactive protocol for discovering new settings

**Server:** `cd docs && uv run python -m http.server 8000` then open http://localhost:8000

**Keyboard shortcuts:**
- Tab switching: Ctrl+1 (Settings), Ctrl+2 (Channels), Ctrl+3 (FM Channels), Ctrl+4 (enable Debug - stays visible until refresh)
- File operations: Ctrl+S (save), Ctrl+O (load)
- Grid navigation: Arrow keys, Enter (edit), Escape (cancel), Tab (next cell), Delete (clear), Ctrl+C/V (copy/paste)

**Python Tools** (in `scripts/` directory):
- `uv run dump_memory.py [file.bin] [baseline.bin] [--stop N]` - Dump radio memory via BLE
- `uv run get_firmware_version.py` - Get model string from radio
- `uv run scan_ble_services.py` - Scan all BLE services/characteristics

**Dump Management:**
- All dumps stored in `dumps/` directory
- Naming convention: `NNN_description.bin` (000, 001, 002, etc.)
- Maintain `dumps/manifest.txt` explaining each dump
- To take baseline: `uv run dump_memory.py dumps/000_baseline.bin`
- To compare: `uv run dump_memory.py dumps/001_new.bin dumps/000_baseline.bin`

---

## Session 20 - VFO Full Implementation & Write Protocol Fixes

### VFO Discovery (via dump comparison)

**VFO records use 16-byte structure at 0x1950 (VFO A) and 0x1960 (VFO B):**

| Offset | Field | Encoding |
|--------|-------|----------|
| 0-3 | RX frequency | BCD LE, 10Hz units |
| 4-7 | TX frequency | **NOT USED** - radio calculates TX = RX ± offset |
| 8-9 | RX subtone | Same as channels (CTCSS/DCS) |
| 10-11 | TX subtone | Same as channels (CTCSS/DCS) |
| 12 | Scramble | 0=off, 1-16=level |
| 13 | Flags2 | bit 2=busy lock (assumed) |
| 14 | Flags3 | **VFO-specific** - see below |
| 15 | Unknown | Always 0x00 |

**VFO Flags3 (byte 14) - Different from channels!**
- Bits 0-1: Offset direction (0=off/simplex, 1=negative, 2=positive)
- Bit 3: Bandwidth (0=wide, 1=narrow)
- Bit 4: TX power (0=low, 1=high)

**Offset values stored separately:** 0x0CB0 (VFO A), 0x0CB4 (VFO B)

### DCS Encoding Discovery

**DCS Normal vs Inverted - verified via dump comparison:**
- CTCSS: BCD of freq×10 (e.g., 88.5 Hz = 0x0885 → `85 08`)
- DCS Normal: high byte = `0x80 | d2` (e.g., D754N → `54 87`)
- DCS Inverted: high byte = `0xC0 | d2` (e.g., D023I → `23 C0`)
- 0x80 = DCS marker, 0x40 = inverted flag

### UI Changes

**VFO Settings split into VFO A and VFO B cards:**
- RX Frequency
- Offset (MHz)
- Offset Direction (Off / + / -)
- RX Subtone (dropdown with CTCSS + DCS-N + DCS-I)
- TX Subtone (dropdown)
- Bandwidth (Wide/Narrow)
- TX Power (Low/High)
- Scramble (0-16)
- Busy Lock (checkbox)

**Subtone dropdowns:** Added `DXXXN` (normal) and `DXXXI` (inverted) options to both grid.js and settings.js toneOptions.

**"Only CH Mode" moved** to new "Unknown Settings" card (purpose still unknown).

### Write Protocol Bug Fixes

**CRITICAL: Write packets must ALWAYS be 32 bytes!**
- Protocol requires: `W + addrHi + addrLo + 0x20 + data[32] + checksum`
- Bug: Code was sending variable length at range boundaries (e.g., 16 bytes at 0x0C70)
- Radio rejected non-32-byte packets and didn't ACK
- Fix: Always pad to 32 bytes with 0xFF, checksum calculated on all 32 bytes

**WRITE_RANGES_CHANNELS was missing channel names:**
- Was: `[0x0D40, 0x1000]` = only 88 channel names
- Now: `[0x0D40, 0x1378]` = all 199 channel names (199 × 8 bytes)

**WRITE_RANGES_SETTINGS was missing VFO records:**
- Added: `[0x1950, 0x1980]` for VFO A/B + FM VFO

**Variable name bug:** `bytesWritten += len` → `bytesWritten += actualLen` (caused ReferenceError after first chunk)

### Files Modified

- `docs/js/ble.js`: parseVFO(), encodeVFO(), fixed decodeTone/encodeTone for DCS-I, fixed write padding
- `docs/js/settings.js`: toneOptions array, populateToneSelects(), VFO field handling
- `docs/js/grid.js`: Added DXXXN/DXXXI to toneOptions
- `docs/js/debug.js`: Detailed VFO byte annotations
- `docs/index.html`: VFO A/B cards, subtone dropdowns, Unknown Settings card
- `docs/memory-map.md`: VFO record structure, DCS encoding documentation
- `dumps/manifest.txt`: Session 20 VFO discovery summary

---

## Write Protocol

**Packet format:** `W + addrHi + addrLo + 0x20 + data[32] + checksum`

**CRITICAL:** Always send exactly 32 bytes of data. Pad with 0xFF if needed at range boundaries.

**Checksum:** Sum of all 32 data bytes, mod 256

**ACK:** Radio responds with `0x06` after each packet - must wait for it

**Write ranges (all 32-byte aligned):**

| Mode | Ranges |
|------|--------|
| All | 0x0000-0x13C0, 0x1800-0x18E0, 0x1900-0x1980, 0x1C00-0x1C40, 0x1F00-0x1F40, 0x3000-0x3020 |
| Settings | 0x0000-0x0020, 0x0C90-0x0CD0, 0x1800-0x18E0, 0x1950-0x1980, 0x1C00-0x1C40, 0x1F00-0x1F40, 0x3000-0x3020 |
| Channels | 0x0000-0x0C80, 0x0D40-0x1380, 0x1900-0x1940 |
| FM | 0x0CA0-0x0CB0, 0x0CD0-0x0D40, 0x1940-0x1980 |

---

## Remaining Work

1. **Test VFO write roundtrip** - Verify VFO settings write correctly to radio
2. **Busy lock for VFO** - Assumed at byte 13 bit 2, not yet verified via dump
3. **Firmware Version** - Model "P31183" returned but actual version unknown
4. **SMS Messages** - Not found in 16KB dump
5. **Bluetooth Toggle** - Real location unknown (CHIRP/CPS conflicts)
6. **VFO B TX Frequency Mystery** - Bytes 4-7 may be unused entirely

## Known Issues & Gotchas

**Write Protocol:**
- MUST send 32-byte packets - radio ignores/rejects shorter ones
- All write ranges should be 32-byte aligned for clean operation

**DCS Encoding:**
- Use `DXXXN` for normal, `DXXXI` for inverted
- Legacy `DXXX` format (no suffix) is accepted by encodeTone but decodeTone always returns with suffix

**VFO TX Frequency:**
- VFO records have TX freq bytes (4-7) but radio doesn't use them
- TX is calculated as RX ± offset based on offset direction

**Channel Names:**
- 199 names × 8 bytes = 1592 bytes (0x0D40-0x1377)
- Write range must go to 0x1378+ to include all names

---

## Discovery Protocol

**Workflow:**
1. Take baseline: `uv run scripts/dump_memory.py dumps/000_baseline.bin`
2. Change setting on radio
3. Compare: `uv run scripts/dump_memory.py dumps/001_desc.bin dumps/000_baseline.bin`
4. Review diffs: `0xADDR:0xOLD->0xNEW`
5. Update `dumps/manifest.txt`

**Session 20 dumps:** 000-006 in `dumps/manifest.txt` documenting VFO discovery (offset direction, bandwidth, power, DCS encoding).
