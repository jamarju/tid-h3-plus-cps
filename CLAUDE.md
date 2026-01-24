# Handoff Document for Tidradio H3 Plus Web CPS

**Last Updated:** January 24, 2026 (Session 16)
**Status:** All discovered settings implemented in UI! Full feature parity with ODMaster. FM channels grid complete with spreadsheet navigation. Tab reordering. Python scripts organized. Ready for user testing.

---

## Project Overview

Web-based CPS for Tidradio H3 Plus radio using Web Bluetooth. Pure HTML+CSS+JS, no frameworks.

**App Files** (in `docs/` for GitHub Pages):
- `index.html` - Main UI with 4 tabs (Settings, Channels, FM Channels, Debug)
- `js/ble.js` - BLE protocol, `parseSettings()` and `encodeSettings()`
- `js/grid.js` - Editable spreadsheet-style grid for channels (199 channels)
- `js/fm.js` - Editable spreadsheet-style grid for FM channels (25 channels)
- `js/settings.js` - Settings form handling, dropdown options
- `js/debug.js` - Hex dump viewer with memory map (full coverage)
- `js/main.js` - App initialization and state management
- `js/storage.js` - File save/load (.h3p format)

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
- Tab switching: Ctrl+1 (Settings), Ctrl+2 (Channels), Ctrl+3 (FM Channels), Ctrl+4 (Debug)
- File operations: Ctrl+S (save), Ctrl+O (load)
- Grid navigation: Arrow keys, Enter (edit), Escape (cancel), Tab (next cell), Ctrl+C/V (copy/paste)

**Python Tools** (in `scripts/` directory):
- All Python helper scripts moved to `scripts/` for organization
- `uv run dump_memory.py [file.bin] [baseline.bin] [--stop N]` - Dump radio memory via BLE
  - Optimized: Only reads 5.5KB/16KB (skips channels and 0xFF regions)
  - 66% faster than full dump (171 vs 512 chunks)
  - Output is full 16KB with 0xFF fill for skipped regions
  - Progress output: dots (with count every 50 chunks) - context-efficient!
  - If baseline provided: compares on-the-fly, prints diffs as `0xADDR:0xOLD->0xNEW`
  - `--stop N`: Stop after N mismatches (default: 0 = show all diffs)
  - Can temporarily read 32KB by changing MEMORY_END to 0x8000 (but 16KB-32KB is all 0xFF)
  - Examples:
    - `uv run dump_memory.py new.bin baseline.bin` - Show all differences
    - `uv run dump_memory.py new.bin baseline.bin --stop 1` - Stop at first diff
- `uv run get_firmware_version.py` - Get model string from radio (returns "P31183", see `docs/ble-protocol.md`)
- `uv run scan_ble_services.py` - Scan all BLE services/characteristics on radio
- Test scripts (Session 13): `test_at_commands.py`, `test_at_commands_stages.py`, `test_handshake_responses.py` - Confirmed AT commands return null bytes over BLE

---

## Fully Implemented Features (Session 16)

All discovered settings now have UI implementation! ✅

**Channels Tab:**
- 199 radio channels with full spreadsheet editing
- Arrow key navigation, Enter to edit, Escape to cancel
- Copy/paste support (Ctrl+C/V)
- All channel properties: RX/TX freq, tones, power, bandwidth, PTT ID, scan, name, scramble, etc.

**Settings Tab:**
- All 41 menu settings + hidden settings
- VFO A/B frequency editors (RX/TX for both)
- Scan settings: Mode (TO/CO/SE), Hang Time (0.5s-10.0s), Freq Range (lower/upper)
- FM broadcast settings: FM Mode (VFO/Channel), FM VFO frequency
- Security settings (with red warning): STUN, KILL
- AM Band enable/disable
- All settings properly encoded/decoded

**FM Channels Tab:**
- 25 FM broadcast channels (88.0-108.0 MHz)
- Same spreadsheet navigation as Channels tab
- Arrow keys, Enter, Escape, Tab navigation
- Single column: frequency only (channel # is readonly)
- Auto-focus first cell on load for immediate keyboard use
- FM scan bitmap auto-managed (1=frequency present, 0=blank)

**Debug Tab:**
- Complete memory map with all new discoveries
- Color-coded: Green (known), Red (unknown data), Gray (empty)
- Hover tooltips with address, description, and value
- Bitfield tooltips show per-bit breakdown

**Write Modes:**
- Write All (full memory)
- Settings Only
- Channels Only
- **FM Radio Only** (new!) - write just FM settings/channels

---

## Session 16 Implementation Summary

**Major UI Refactoring:**
1. **Tab reordering**: Settings → Channels → FM Channels → Debug (Settings now first/default)
2. **FM settings moved**: FM Mode and FM VFO freq moved from FM tab to Settings tab
3. **FM Channels tab**: Renamed from "FM Radio", now only contains 25-channel grid
4. **Keyboard shortcuts updated**: Ctrl+1 (Settings), Ctrl+2 (Channels), Ctrl+3 (FM), Ctrl+4 (Debug)

**FM Grid Spreadsheet Behavior:**
- Complete rewrite of `js/fm.js` to mimic `js/grid.js` behavior
- Cell-based rendering with `.cell`, `.editable`, `.focused` classes
- Full keyboard navigation: arrows, Enter, Escape, Tab, Home, End
- Click to focus, double-click to edit
- Blue border on focused cells, row highlighting
- Input auto-select on edit
- Event listener attached to document with panel check (fixed navigation bug)
- Auto-focus first cell on data load

**Memory Map Updates:**
- `js/debug.js`: Added scan settings, FM VFO, updated bitfield descriptions
- All new settings properly color-coded in hex dump

**Code Organization:**
- All Python scripts moved to `scripts/` directory
- `.gitignore` updated: ignore `tmp/`, `dumps/`, `firmware/`, `odmaster/`, `*.bin`, `*.h3p`
- Project structure cleaned up for GitHub Pages deployment

**BLE Protocol:**
- `parseSettings()`: Added all new settings (scan, VFO, FM, security, AM band)
- `encodeSettings()`: Added encoding for all new settings
- `parseFMChannels()`, `encodeFMChannels()`: FM channel handling
- `parseFMScanBitmap()`, `encodeFMScanBitmap()`: Bitmap auto-management
- `WRITE_RANGES_FM`: New write mode for FM-only updates

**Settings Panel:**
- VFO Frequencies group: RX/TX for both VFO A and B
- Scan group: Mode, Hang Time, Freq Range (lower/upper)
- FM Broadcast Radio group: FM Mode, FM VFO Frequency
- Security group: STUN/KILL with red warning text
- AM Band toggle in LED group

## Remaining Work to Discover

1. **Firmware Version 1.0.45** - Not yet extracted from radio. Model string "P31183" is returned during handshake (see `docs/ble-protocol.md`) but actual firmware version may be in memory or require different command.

2. **SMS Messages** - Draft SMS (recipient: "racipient", content with numbers) NOT found in 0x0000-0x8000 memory range. Likely in separate chip or requires different BLE command.

3. **Verify DTCS subtone encoding** - Not sure if DCS codes are properly encoded. Radio has options for normal and reversed polarity (DCS-N vs DCS-I) - need to verify these work correctly.

4. **Discover additional settings** - Analog Settings (AM Vol Level) not found in 16KB dump.

5. **Investigate OFFSET setting** - User reports it's NOT for frequency offset (shows "REJECT").

## Known Issues & Gotchas (Session 16)

**FM Grid Navigation:**
- Keyboard navigation now works via document-level event listener with panel check
- Auto-focus on first cell after data load enables immediate keyboard use
- Fixed cell selector specificity (`#fmGrid .cell[...]`) to avoid conflicts

**ODMaster Compatibility:**
- Float parsing bug: Always use "88.0" not "88" for FM frequencies
- ODMaster disconnects BLE when connecting - exit ODMaster to dump memory
- Some settings (STUN/KILL, Disp LCD) only in ODMaster, not radio menu

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
| **All** | Full write - channels + settings + FM + extended |
| **Settings Only** | Settings without channels |
| **Channels Only** | Channels without settings |
| **FM Radio Only** | FM channels + FM settings only |

See `docs/ble-protocol.md` for full protocol details.

---

## Discovery Protocol (Session 11-15 Learnings)

**Workflow for discovering settings:**
1. Take baseline dump: `uv run dump_memory.py baseline.bin`
2. Change ONE or more settings on radio/ODMaster app
3. Compare: `uv run dump_memory.py new.bin baseline.bin` (shows all diffs)
4. Use `--stop 1` to save time when expecting single byte changes

**Key insights:**
- Python heredocs were thrashing context! Use dump_memory.py comparison feature instead
- Outputs: `0xADDR:0xOLD->0xNEW` (one line per diff)
- Much more context-efficient than xxd or hex dumps
- Progress output now uses dots instead of verbose percentages (Session 12)
- Optimized dump (171 chunks) properly fills skipped regions with 0xFF - safe for comparison

**Handshake timing fix (Session 15):**
- After Mode 0x06 command, wait 0.2s and clear response buffer to avoid stray 0x06 ACK bytes
- Without this delay, first read command fails with "Invalid response: 06"

**ODMaster gotchas (Session 15):**
- **BLE disconnection**: ODMaster disconnects BLE when connecting. Need to exit ODMaster to dump memory.
- **Float parsing bug**: Setting FM channel to "88" without decimal writes wrong value. Always use "88.0" format.
- **Hidden settings**: Some settings (Disp LCD TX/RX, STUN/KILL) only accessible via ODMaster, not on radio menu.

**Volatile settings detection (Session 12):**
- To test if a setting is volatile (RAM-only), change it and power cycle the radio
- BT Int mic/spk and BT mic/spk gain confirmed volatile - reset to defaults on power cycle
- Volatile settings won't appear in memory dumps and can't be written by CPS

**Important:** When changing multiple settings, do full dump without `--stop` flag to see all changes.

---

## DTMF Settings Reference

From user testing:
- **FM Interrupt [26]**: OFF = allow incoming calls to interrupt FM radio mode
- **DCD [35]**: Enable DTMF signaling for single call, group call, etc.
- **D-HOLD [36]**: DTMF auto-reset time
- **D-RSP [37]**: NULL=silent, RING=ring tone, REPLY=ring + 1s call-back, BOTH=ring + call-back

---

## BLE Services & AT Commands (Session 12-13)

Radio exposes multiple BLE services:
- **0xff00** (ff01=notify, ff02=write) - Programming mode, used by CPS
- **0xaf00** (af01=write, af02=notify) - Unknown purpose
- **0xae00** (ae01=write, ae02=notify) - Unknown purpose (duplicate UUID with 0xae30)
- **0xae30** (ae01=write, ae02=notify) - Unknown purpose (duplicate UUID with 0xae00)

**Model String Extraction (Session 13):**
- Handshake Mode 0x02 returns "P31183" model string (8 bytes: `503331313833ffff`)
- This was already documented in `docs/ble-protocol.md` from ODMaster console capture
- Created `get_firmware_version.py` to extract this programmatically

**AT Commands (Session 13):**
- AT+NAME?, AT+VER?, AT+VERSION?, etc. all return null bytes (length matches command)
- Tested at all connection stages: immediate, after AT+BAUD?, after full handshake
- Tested on all BLE services (0xff00, 0xaf00, 0xae00, 0xae30) - all return nulls
- ODMaster console shows "+NAME: TD-H3-Plus OK" response, but likely over USB serial, not BLE
- Device name comes from BLE advertisement (e.g., "TD-H3-Plus-5595(BLE)"), not AT commands
