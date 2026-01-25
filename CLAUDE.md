# Handoff Document for Tidradio H3 Plus Web CPS

**Last Updated:** January 25, 2026 (Session 19)
**Status:** Channel validity bitmap now honored during parsing - invalid channels display as empty rows. New "Only CH Mode" setting discovered from Windows CPS. Debug.js and memory-map.md fully synchronized.

---

## Project Overview

Web-based CPS for Tidradio H3 Plus radio using Web Bluetooth. Pure HTML+CSS+JS, no frameworks.

**App Files** (all files are in `docs/` directory for GitHub Pages):
- `docs/index.html` - Main UI with 4 tabs (Settings, Channels, FM Channels, Debug)
- `docs/js/ble.js` - BLE protocol, `parseSettings()` and `encodeSettings()`
- `docs/js/grid.js` - Editable spreadsheet-style grid for channels (199 channels)
- `docs/js/fm.js` - Editable spreadsheet-style grid for FM channels (25 channels)
- `docs/js/settings.js` - Settings form handling, dropdown options
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

**Dump Management** (Session 18):
- All dumps stored in `dumps/` directory
- Naming convention: `NNN_description.bin` where NNN is 000, 001, 002, etc.
  - Examples: `000_baseline.bin`, `001_dtmf_group1_added.bin`, `002_vfo_b_changed.bin`
- Maintain `dumps/manifest.txt` explaining each dump:
  ```
  000_baseline.bin = Fresh dump from Windows CPS
  001_dtmf_group1_added.bin = 000_baseline + added "12345" to DTMF Group 1
  002_vfo_b_changed.bin = 001 + changed VFO B RX to 145.500
  ```
- Format in manifest: `NNN_description.bin = baseline_or_previous + what changed`
- This tracks which settings affect which memory locations for discovery
- To take baseline: `uv run dump_memory.py dumps/000_baseline.bin`
- To compare: `uv run dump_memory.py dumps/001_new.bin dumps/000_baseline.bin`

---

## Session 19 - Channel Validity Bitmap & Empty Channel UX

**Channel Validity Bitmap (0x1900) Now Honored During Parsing:**
- Previously: `parseChannel()` only checked if bytes were 0xFF to determine "empty"
- Problem: After factory reset, stale frequency data remained but validity bitmap said invalid
- Fix: `parseChannel()` now reads 0x1900 bitmap first - if bit=0, returns empty channel via `getEmptyChannel()`
- Empty channels display as faded rows (50% opacity) with only RX/TX freq editable

**Empty Channel UX in grid.js:**
- Empty rows get `.empty-channel` CSS class (faded appearance)
- Non-frequency cells get `.disabled` class (not editable, shows blank)
- Auto-populate: Enter RX freq on empty row → TX freq copies from RX, all fields become editable
- Auto-clear: Delete RX freq → entire channel cleared, row goes empty
- Both Delete key and edit-then-clear trigger the same logic via `handleFrequencyEdit()`

**New Setting Discovered: Only CH Mode (0x0CAF bit 7):**
- Found via Windows CPS checkbox "Only CH Mode"
- 0x0CAF changed from 0x01 to 0x81 when checked
- Breath LED now uses bits 4-6 only (was 4-7)
- Purpose unknown - testing shows VFO mode still works when enabled
- Added to UI in LED section with explanatory tooltip

**Debug.js Fixes:**
- Fixed bitmap label bug: 0x1900 was showing "Scan bitmap" instead of "Channel Valid bitmap"
- Now correctly identifies three bitmap regions with proper labels and channel ranges
- Added missing 0x0CA6 entry (undocumented byte in VFO state range)
- Verified all entries match memory-map.md

**Files Modified:**
- `docs/js/ble.js`: Added `getEmptyChannel()`, validity bitmap check in `parseChannel()`, `onlyChMode` parse/encode
- `docs/js/grid.js`: Empty row styling, disabled cells, `handleFrequencyEdit()`, `clearChannelData()`, `populateChannelDefaults()`
- `docs/css/style.css`: `.empty-channel` and `.cell.disabled` styles
- `docs/js/debug.js`: Fixed bitmap labels, added 0x0CA6
- `docs/index.html`: Added Only CH Mode checkbox
- `docs/js/settings.js`: Added `onlyChMode` checkbox handling
- `docs/memory-map.md`: Updated 0x0CAF to show bit 7 = Only CH Mode

---

## Session 18 - Complete DTMF/ANI Implementation

**CHIRP Driver Analysis (chirpmyradio.com/issues/11968):**
- Analyzed CHIRP's tdh8.py driver to find undocumented features
- Discovered complete DTMF/ANI system (192 bytes total!)
- Found VFO offsets, repeater tail, TX power calibration, password field
- **CRITICAL:** CHIRP has conflicts with manual testing - always verify against dumps!

**DTMF/ANI System Fully Implemented:**
- **Stun/Kill Codes** (0x1800-0x181F): Remote disable, 15 digits each, moved to Security card
- **Group Calling** (0x1830-0x18AF): 8 groups × 15 digits, separate UI card with selector
- **PTT ID** (0x18C0-0x18DF): BOT/EOT codes, 15 digits each
- **ANI/Group Selector** (0x1820, 0x1829): 3-digit ID + group code selector (A-D, *, #)
- **Encoding:** 0x00-0x0F for chars, 0xFF padding, last byte=length (verified via Windows CPS)
- **UI:** All fields added with proper validation (pattern="[0-9A-D*#]{0,15}")
- **BLE:** `parseDTMF()` and `encodeDTMF()` functions with proper length handling

**DTMF Encoding Bugs Fixed:**
- **Bug 1:** `parseDTMF()` had early `break` on 0xFF - removed, use length byte only
- **Bug 2:** `encodeDTMF()` used `|| 0xFF` which treated 0x00 (digit '0') as falsy - fixed to `!== undefined`
- **Roundtrip Test:** PASSED! Bit-perfect except password (not implemented)

**Additional Features Implemented:**
- **VFO Offsets** (0x0CB0-0x0CB7): RX/TX offset frequencies, UI + BLE parse/encode
- **TX Band Limits** (0x0CC0-0x0CC7): 16-bit BCD **big-endian** (not LE!), varies by radio mode
  - NORMAL: VHF 136-174, UHF 200-600 MHz
  - HAM: VHF 144-148, UHF 420-450 MHz
- **Repeater Tail** (0x1F02-0x1F03): STE delay + tone delay (0-10 seconds each)
- **Password** (0x1B40-0x1B45): 6 ASCII chars, empty=0x00, documented but NOT in UI (protocol unknown)
- **TX Power Calibration** (0x1F50-0x1F7F): 28 bytes for factory cal, debug.js only (no UI/write)

**UI Reorganization:**
- **DTMF**: Split into "DTMF" (basic + PTT ID) and "DTMF Group Calling" (separate cards)
- **Security**: Now includes STUN/KILL enable checkboxes + code fields
- **Signal**: Added STE delay + Repeater tone delay selectors
- **TX Band Limits**: New section with 4 fields + mode hints
- **VFO Settings**: Added Active VFO selector + offset fields

**Windows CPS Discoveries:**
- Reading file → writing unchanged → dumps reveal CPS modifies TX band limits + 0xCA0 bit 4
- Confirms radio mode switching: NORMAL → HAM changes band limits
- Windows CPS files (`.h3p`) are raw 16KB dumps - **hard truth source**

**Write Ranges Updated:**
- `WRITE_RANGES_SETTINGS`: Extended to include 0x0CB0-0x0CD0, 0x1F00-0x1F40 (was 0x1F20)
- `WRITE_RANGES_ALL`: Same updates
- Now includes: VFO offsets, TX band limits, DTMF system, repeater tail

**Dump Management System:**
- `dumps/manifest.txt` tracks all dumps with change logs
- Naming: `NNN_description.bin` (000, 001, 002...)
- `.gitignore` updated to track manifest.txt but ignore .bin files
- Current dumps: 000 (baseline), 001 (CPS write test), 002 (DTMF features), 004 (roundtrip verified)

---

## Fully Implemented Features (Session 18)

All discovered settings now have UI implementation! ✅

**Channels Tab:**
- 199 radio channels with full spreadsheet editing
- Arrow key navigation, Enter to edit, Escape to cancel
- Copy/paste support (Ctrl+C/V)
- All channel properties: RX/TX freq, tones, power, bandwidth, PTT ID, scan, name, scramble, etc.

**Settings Tab:**
- All 41 menu settings + hidden settings + DTMF/ANI system
- **DTMF**: ANI-Edit, speed, DCD, D-HOLD, D-RSP, side tone, BOT/EOT codes (15 digits each)
- **DTMF Group Calling**: Group selector + 8 group codes (15 digits each)
- **Security**: STUN/KILL enable + codes (15 digits each)
- **VFO**: Active VFO selector, A/B RX/TX/offset frequencies
- **TX Band Limits**: VHF/UHF low/high (NORMAL vs HAM mode hints)
- **Signal**: STE, STE delay, repeater tone delay, tone burst, talk around, FM interrupt
- **Scan**: Mode (TO/CO/SE), hang time, freq range
- All settings properly encoded/decoded

**FM Channels Tab:**
- 25 FM broadcast channels (88.0-108.0 MHz)
- Same spreadsheet navigation as Channels tab
- Arrow keys, Enter, Escape, Tab navigation
- Single column: frequency only (channel # is readonly)
- Auto-focus first cell on load for immediate keyboard use
- FM scan bitmap auto-managed (1=frequency present, 0=blank)

**Debug Tab:**
- Complete memory map with all CHIRP discoveries
- Color-coded: Green (known), Red (unknown data), Gray (empty)
- Hover tooltips with address, description, and value
- Bitfield tooltips show per-bit breakdown
- TX power calibration detailed (28 bands), password field marked

**Write Modes:**
- Write All (full memory)
- Settings Only (includes DTMF)
- Channels Only
- FM Radio Only

---

## Session 17 Critical Bug Fix

**MAJOR DISCOVERY: Channel Valid Bitmap (0x1900-0x1918)**

**The Bug:**
After factory reset, radio got stuck on CH1 - couldn't cycle to other channels with UP/DOWN even though channels had frequencies programmed.

**Root Cause:**
- Discovered undocumented "Channel Valid Bitmap" at 0x1900-0x1918
- 1 bit per channel (1=valid/can cycle to, 0=empty/skip)
- Radio only allows cycling to channels with bit=1 in this bitmap
- Factory reset sets all bits to 0 except CH1 → stuck on CH1!
- App wasn't reading/writing this bitmap at all

**The Fix:**
- Added channel valid bitmap encoding in `encodeMemory()` - sets bit=1 for channels with rxFreq > 0
- Included 0x1900-0x1920 in `WRITE_RANGES_CHANNELS` write range
- App now auto-generates the bitmap from channel data on every write
- Updated `memory-map.md` with full documentation of the bitmap
- Updated `debug.js` to show bitmap as known (green)

**Testing:**
- User loaded broken file (stuck on CH1), clicked Write Channels → channels now cycle correctly
- The bitmap is auto-regenerated from Grid data, fixing corrupted/missing bitmap

**This bitmap is SEPARATE from the scan bitmap (0x1920):**
- 0x1900 = Channel Valid (controls which channels can be accessed via UP/DOWN)
- 0x1920 = Scan Enable (controls which channels are included in scan)

**Encoding rule:** For each channel, set bit=1 if `channel.rxFreq > 0`, else 0.

---

## Session 17 UI Polish

**Input Styling Fix:**
- Fixed input overflow issue with long labels (e.g., "FM VFO Frequency (MHz)")
- Added `flex-shrink: 1` and `min-width: 80px` to all setting inputs
- Text and number inputs now have consistent dark styling

**Tooltip Clarifications:**
- Squelch: "Higher level = stronger signal required" (clearer for non-native speakers)
- VOX: "Higher level = more sensitive microphone"
- Power Save: "Higher level = longer sleep, may miss audio start"
- Tone Burst: Removed "older repeater" mention, explained PF1/PF2 assignment needed
- PTT Delay: Noted function is unclear (user can't notice difference)
- Alarm Mode: Local=flashlight flashes, TX=10s alarm/2s pause/repeat

**PONMGS Dropdown Fix:**
- Was: 0=OFF, 1=MSG, 2=Voltage (WRONG!)
- Now: 0=Voltage, 1=Message, 2=Picture (CORRECT!)
- Picture shows Tidradio logo, Message shows custom 3-line text

**FM Grid:**
- Added Delete key support (was missing, now matches Channels grid)
- Added `clearCell()` method

**Debug Tab:**
- Now hidden by default (keeps UI cleaner)
- Press Ctrl+4 to permanently enable it (stays visible until page refresh)
- Updated all toolbar hints to reflect this
- 0x0CA6 mystery byte shows red (unknown) since we don't know what it controls yet

**README:**
- Restored accidentally deleted content from session 11
- Added `.DS_Store` to `.gitignore` and removed from repo
- Fixed broken image paths (moved `img/` from `docs/img/` to root)

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
- `docs/js/debug.js`: Added scan settings, FM VFO, updated bitfield descriptions
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

6. **VFO B TX Frequency Mystery (Session 18)** - Memory at 0x1964 shows 437.55000 MHz (parsed correctly by our code), but radio displays/transmits on 440.310 (same as RX freq at 0x1960). Web CPS UI shows both values correctly from memory. Either:
   - VFO B is simplex-only (ignores 0x1964 entirely)
   - VFO B uses different offset system (but 0x0CB4 offset is all zeros)
   - 0x1964 stores something else (previous freq? calibration?)
   - Radio firmware bug displaying wrong value
   Need to test: Change VFO B TX on radio, dump memory, see if 0x1964 updates.

7. **CHIRP Driver Conflicts (Session 18)** - CHIRP suggests different bit positions for ponmgs (bits 0-1 vs 6-7 of 0xCA3), fmMode (bit 0 vs bit 7 of 0xCA2), VFO work modes, and bluetooth (bit 7 vs bit 0). Our manual bitflip testing takes precedence over CHIRP. CHIRP may be for different firmware or radio variant. See [chirpmyradio.com/issues/11968](https://chirpmyradio.com/issues/11968).

8. **Bluetooth Toggle Location Unknown (Session 18)** - CHIRP claims 0x1F30 bit 7, Windows CPS test suggested bit 0, but toggling in our UI doesn't disable bluetooth on radio. Real location unknown. **Discovery method:** Use Windows CPS (USB connection) to change bluetooth ON→OFF, take dumps before/after using `uv run scripts/dump_memory.py`, compare files. Should be straightforward if not encrypted.

## Known Issues & Gotchas (Session 17)

**Channel Valid Bitmap (0x1900) - CRITICAL:**
- Factory reset sets all bits to 0 except CH1
- Without this bitmap, radio can't cycle past CH1 even with frequencies programmed
- App now auto-generates this bitmap on every write (bit=1 if rxFreq > 0)
- If user reports "stuck on CH1" after factory reset: load any file and click Write

**Mystery Byte 0x0CA6:**
- Changed from 1→0 in bad file but didn't affect the stuck-on-CH1 bug
- Located between VFO channel selectors (0x0CA4-0x0CA5) and VOX level (0x0CA7)
- Purpose unknown - needs further investigation
- Now shows green in Debug tab (documented as unknown but tracked)

**Grid Navigation:**
- Delete key now clears cells in both Channels and FM grids
- Both grids have identical keyboard navigation behavior

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
| **Channels Only** | Channels + channel names + channel valid bitmap + scan bitmap |
| **FM Radio Only** | FM channels + FM settings only |

See `docs/ble-protocol.md` for full protocol details.

---

## Discovery Protocol (Session 11-18 Learnings)

**Workflow for discovering settings:**
1. Take baseline dump: `uv run scripts/dump_memory.py dumps/000_baseline.bin`
2. Change ONE or more settings on radio/ODMaster app
3. Take new dump: `uv run scripts/dump_memory.py dumps/001_description.bin dumps/000_baseline.bin`
4. Review diffs printed to console: `0xADDR:0xOLD->0xNEW`
5. Update `dumps/manifest.txt` with what changed
6. Use `--stop 1` to save time when expecting single byte changes

**Dump Naming & Tracking (Session 18):**
- Sequential numbers: `000_baseline.bin`, `001_next.bin`, `002_another.bin`
- Always update `dumps/manifest.txt` with format:
  ```
  001_dtmf_added.bin = 000_baseline + added "12345" to DTMF Group 1
  ```
- This creates a change log for memory discovery
- `.gitignore` tracks manifest.txt but ignores all .bin files

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
