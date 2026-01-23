# Handoff Document for Tidradio H3 Plus Web CPS

**Last Updated:** January 23, 2026 (Session 11)
**Status:** All scan settings discovered and documented. Enhanced dump_memory.py with diff comparison.

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

**Python Tool:**
- `uv run dump_memory.py [file.bin] [baseline.bin] [--stop N]` - Dump radio memory via BLE
  - Optimized: Only reads 5.5KB/16KB (skips channels and 0xFF regions)
  - 66% faster than full dump (171 vs 512 chunks)
  - Output is full 16KB with 0xFF fill for skipped regions
  - If baseline provided: compares on-the-fly, prints diffs as `0xADDR:0xOLD->0xNEW`
  - `--stop N`: Stop after N mismatches (default: 0 = show all diffs)
  - Examples:
    - `uv run dump_memory.py new.bin baseline.bin` - Show all differences
    - `uv run dump_memory.py new.bin baseline.bin --stop 1` - Stop at first diff

---

## Discovered But Not Yet Implemented

**VFO Frequencies (Session 9):**
- VFO A: 0x1950-0x195F (16 bytes, same structure as channels)
- VFO B: 0x1960-0x196F (16 bytes, same structure as channels)
- Use same BCD little-endian encoding as channels (RX/TX freq, tones, flags)
- No names stored for VFOs
- **TODO:** Add VFO frequency editor to Settings tab

**Scan Settings (Session 11):**
- Scan Mode: 0x0CA1 bits 6-7 (TO=0b00, CO=0b01, SE=0b10) ✅ VERIFIED
- Hang Time: 0x1F2F, encoding: (seconds * 2) - 1, range: 0.5s-10.0s ✅ VERIFIED
- Freq Range Upper: 0x1F2B-0x1F2C (16-bit little-endian, MHz) ✅ VERIFIED
- Freq Range Lower: 0x1F2D (8-bit, MHz) ✅ VERIFIED
- Documented in `docs/memory-map.md` and `docs/settings-reference.md`
- **TODO:** Add scan settings UI to Settings tab

---

## Remaining Work to Discover

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

## Discovery Protocol (Session 11 Learnings)

**Workflow for discovering settings:**
1. Take baseline dump: `uv run dump_memory.py baseline.bin`
2. Change ONE setting on radio
3. Compare: `uv run dump_memory.py new.bin baseline.bin` (shows all diffs)
4. Use `--stop 1` if you expect only one byte to change (saves time)

**Key insight:** Python heredocs were thrashing context! Use the dump_memory.py comparison feature instead:
- Outputs: `0xADDR:0xOLD->0xNEW` (one line per diff)
- Much more context-efficient than xxd or hex dumps
- Can stop early with `--stop N` flag for faster discovery

**Important:** When changing multiple settings, do full dump without `--stop` flag to see all changes.

---

## DTMF Settings Reference

From user testing:
- **FM Interrupt [26]**: OFF = allow incoming calls to interrupt FM radio mode
- **DCD [35]**: Enable DTMF signaling for single call, group call, etc.
- **D-HOLD [36]**: DTMF auto-reset time
- **D-RSP [37]**: NULL=silent, RING=ring tone, REPLY=ring + 1s call-back, BOTH=ring + call-back
