# Handoff Document for Tidradio H3 Plus Web CPS

**Last Updated:** January 25, 2026 (Session 21)
**Status:** VFO work mode (freq/channel) and current channel selection fully implemented. Discovered 0x0CA2 bit 0 = VFO A mode, 0x0CA3 bit 0 = VFO B mode, 0x0CA4/0x0CA5 = current channel (1-indexed).

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

## Session 21 - VFO Work Mode & Channel Selection

### VFO Work Mode Discovery

**Via dump comparison (fresh baseline 000, then toggled VFO modes):**

| Address | Bit | Field | Values |
|---------|-----|-------|--------|
| 0x0CA2 | 0 | VFO A work mode | 0=Frequency, 1=Channel |
| 0x0CA3 | 0 | VFO B work mode | 0=Frequency, 1=Channel |
| 0x0CA4 | - | VFO A current channel | 1-199 (**1-indexed**, not 0-indexed!) |
| 0x0CA5 | - | VFO B current channel | 1-199 (**1-indexed**, not 0-indexed!) |

**Discovery process:**
- 001: VFO A freq→ch mode: 0x0CA2 changed 0x25→0x24 (bit 0: 1→0)
- 002: VFO B freq→ch mode: 0x0CA3 changed 0x50→0x51 (bit 0: 0→1), 0x0CA5 changed (active VFO)

### Channel Index Gotcha

**IMPORTANT:** VFO channel numbers are stored 1-indexed (1-199), NOT 0-indexed!
- Initially assumed 0-indexed and added +1/-1 adjustments
- User reported UI showing channel 3 when radio showed channel 2
- Fixed by removing the adjustments - memory value = display value

### UI Changes

**VFO A and VFO B cards now include:**
- Work Mode dropdown (Frequency / Channel)
- Channel number input (1-199) - shown when in Channel mode

### Files Modified

- `docs/js/ble.js`: Added workMode and channel to vfoA/vfoB objects, encoding for 0x0CA2-0x0CA5
- `docs/js/settings.js`: Added setNumberValue(), handle number inputs in updateVFOField()
- `docs/js/debug.js`: Updated 0x0CA2/0x0CA3 descriptions to include work mode bit
- `docs/index.html`: Added Work Mode dropdown and Channel input to VFO A/B cards
- `docs/memory-map.md`: Added VFO work mode bits, clarified channel is 1-indexed

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

### Write Protocol Bug Fixes

**CRITICAL: Write packets must ALWAYS be 32 bytes!**
- Protocol requires: `W + addrHi + addrLo + 0x20 + data[32] + checksum`
- Bug: Code was sending variable length at range boundaries
- Fix: Always pad to 32 bytes with 0xFF

**WRITE_RANGES fixes:**
- CHANNELS: `[0x0D40, 0x1378]` (was 0x1000, missing channel names)
- SETTINGS: Added `[0x1950, 0x1980]` for VFO records

---

## Write Protocol

**Packet format:** `W + addrHi + addrLo + 0x20 + data[32] + checksum`

**CRITICAL:** Always send exactly 32 bytes of data. Pad with 0xFF if needed.

**Checksum:** Sum of all 32 data bytes, mod 256

**ACK:** Radio responds with `0x06` after each packet

**Write ranges (all 32-byte aligned):**

| Mode | Ranges |
|------|--------|
| All | 0x0000-0x13C0, 0x1800-0x18E0, 0x1900-0x1980, 0x1C00-0x1C40, 0x1F00-0x1F40, 0x3000-0x3020 |
| Settings | 0x0000-0x0020, 0x0C90-0x0CD0, 0x1800-0x18E0, 0x1950-0x1980, 0x1C00-0x1C40, 0x1F00-0x1F40, 0x3000-0x3020 |
| Channels | 0x0000-0x0C80, 0x0D40-0x1380, 0x1900-0x1940 |
| FM | 0x0CA0-0x0CB0, 0x0CD0-0x0D40, 0x1940-0x1980 |

---

## Remaining Work

1. **Test VFO write roundtrip** - Verify all VFO settings write correctly
2. **Busy lock for VFO** - Assumed at byte 13 bit 2, not verified
3. **Firmware Version** - Model "P31183" returned but actual version unknown
4. **SMS Messages** - Not found in 16KB dump
5. **Bluetooth Toggle** - Real location unknown (CHIRP/CPS conflicts)

## Known Issues & Gotchas

**VFO Channel Numbers:**
- Stored 1-indexed (1-199), same as radio display
- DO NOT add/subtract 1 when parsing/encoding

**Write Protocol:**
- MUST send 32-byte packets - radio ignores shorter ones
- All write ranges should be 32-byte aligned

**DCS Encoding:**
- Use `DXXXN` for normal, `DXXXI` for inverted
- 0x80 = DCS marker, 0x40 = inverted flag

**VFO TX Frequency:**
- VFO records have TX freq bytes (4-7) but radio doesn't use them
- TX is calculated as RX ± offset

---

## Discovery Protocol

**Workflow:**
1. Take baseline: `uv run scripts/dump_memory.py dumps/000_baseline.bin`
2. Change setting on radio
3. Compare: `uv run scripts/dump_memory.py dumps/001_desc.bin dumps/000_baseline.bin`
4. Review diffs: `0xADDR:0xOLD->0xNEW`
5. Update `dumps/manifest.txt`
