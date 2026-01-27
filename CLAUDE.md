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

**Docs** (in `info/` due to GH pages limitation require the app to be in `docs/`):
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
- `uv run scan_ble_services.py` - Scan all BLE services/characteristics

**Dump Management:**
- All dumps stored in `dumps/` directory
- Naming convention: `NNN_description.bin` (000, 001, 002, etc.)
- Maintain `dumps/manifest.txt` explaining each dump
- To take baseline: `uv run dump_memory.py dumps/000_baseline.bin`
- To take another dump AND compare to baseline (will output what changed): `uv run dump_memory.py dumps/001_new.bin dumps/000_baseline.bin`. Output will be line: `0xADDR:0xOLD->0xNEW`

## Discovery Protocol

**Workflow:**
1. Take baseline: `uv run scripts/dump_memory.py dumps/000_baseline.bin`
2. Change setting on radio
3. Compare: `uv run scripts/dump_memory.py dumps/001_desc.bin dumps/000_baseline.bin`
4. Review diffs: `0xADDR:0xOLD->0xNEW`
5. Update `dumps/manifest.txt`

---

## Last session work (handoff for next agent)

Session 21 - VFO Work Mode & Channel Selection

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

## TODO items

1. **Firmware Version** - It'd be nice to check compatibility, but we haven't figure out how to extract it from the radio.
2. **SMS Messages** - Not found in 16KB dump, in-app edidion of inbox, drafts, outbox nice to have.
3. **Bluetooth Toggle** - Dumped with Windows CPS via USB in on/off states but no differences. Windows CPS dump is limited to 8 B so perhaps is above that.

