# Tidradio H3 Plus Memory Map

**Total memory:** 16 KiB (0x0000–0x3FFF). The radio UI reports 100% used at ~8 KiB.

## Overview

This document describes known fields in the radio’s memory image. Offsets are absolute addresses.

| Area | Address range | What’s in it |
|------|---------------|--------------|
| Early area | 0x0000–0x00FF | Sparse global settings / header-like bytes |
| Channels area | 0x0010–0x0C7F | 199 channels × 16 bytes (channel records) |
| Settings block 1 | 0x0C90–0x1377 | Menu settings + VFO state + VFO offsets + band limits + FM channels + channel names |
| Settings block 2 | 0x1800–0x1C2F | DTMF/ANI + channel/scan bitmaps + VFO freqs + FM VFO + password + startup messages |
| Settings block 3 | 0x1F00–0x1F7F | Repeater tail + secondary settings + factory calibration (TX power tune) |
| Settings block 4 | 0x3000–0x3113 | Extended settings + additional unknown data |

Status notes:

- Menu settings mapped: 41 (menu 31 “Factory Reset” is an action, not a stored setting)

## Sources

- **[1] Discovery**: local dumps + comparisons + on-device testing (e.g. `dumps/manifest.txt`, dump diffs)
- **[2] CHIRP**: CHIRP driver analysis and notes in [chirpmyradio issue #11968](https://chirpmyradio.com/issues/11968)
- **[3] Windows CPS**: Windows CPS “Machine Info” and CPS read/write testing

## Early area (0x0000–0x00FF)

| Offset | Setting | Menu # | Encoding | Source |
|--------|---------|--------|----------|--------|
| 0x001F | ~~Modulation~~ | 38 | **WRONG** - this is Channel 2 data, NOT modulation | [1] |

### 0x001F - NOT Modulation (Corrected Session 19)

**CORRECTION:** This offset was incorrectly documented as the global Modulation setting. In reality:
- Channels start at 0x0008 (not 0x0010), with 16 bytes per channel
- 0x001F falls within Channel 2 (0x0018-0x0027), byte 7
- **Real modulation location:** Per-VFO at byte 15 of each VFO record:
  - VFO A: **0x195F** (0=FM, 1=AM)
  - VFO B: **0x196F** (0=FM, 1=AM)
- The radio's menu [38] Modulation setting updates the current VFO's modulation byte

## Channels area (0x0010–0x0C7F)

| Offset | Setting | Menu # | Encoding | Source |
|--------|---------|--------|----------|--------|
| 0x0010–0x0C7F | Channel records (CH1–CH199) |  | 199 × 16-byte records (see structure below) | [1] |

### 0x0010–0x0C7F - Channel record structure (16 bytes per channel)

Per-channel record base:

- **CH \(n\)** base offset = \(0x0010 + (n-1) \times 16\)

Record layout (offsets are relative to a channel’s base):

| Rel. offset | Size | Field | Encoding |
|------------:|-----:|-------|----------|
| 0x00–0x03 | 4 | RX frequency | BCD little-endian, 10 Hz units |
| 0x04–0x07 | 4 | TX frequency | BCD little-endian, 10 Hz units |
| 0x08–0x09 | 2 | RX tone (decode) | BCD for CTCSS; special encoding for DCS |
| 0x0A–0x0B | 2 | TX tone (encode) | BCD for CTCSS; special encoding for DCS |
| 0x0C | 1 | Scramble level | 0=off, 1–16=level (direct value, not a bitfield) |
| 0x0D | 1 | Flags 2 | See below |
| 0x0E | 1 | Flags 3 | See below |
| 0x0F | 1 | **Modulation** | 0=FM, 1=AM (discovered Session 19) |

**Flags 2 (byte 0x0D):**

- Bit 2 (0x04): Busy lock (0=off, 1=on)
- Bit 5 (0x20): Frequency hop (0=off, 1=on)
- Bits 6–7: PTT ID (0=off, 1=BOT, 2=EOT, 3=both)

**Flags 3 (byte 0x0E):**

- Bit 3 (0x08): Bandwidth (0=wide, 1=narrow) (inverted)
- Bit 4 (0x10): TX power (0=low, 1=high)

**Frequency encoding example (BCD little-endian):**

- 446.00625 MHz → bytes `25 06 60 44`

**CTCSS/DCS tone encoding (16-bit, little-endian):**

| Type | High byte | Example |
|------|-----------|---------|
| OFF | 0x00 or 0xFF | `00 00` or `FF FF` |
| CTCSS | BCD of tone×10 | 88.5 Hz → `85 08` (0x0885) |
| DCS Normal | `0x80 \| d2` | D754N → `54 87` (d2=7, low=54) |
| DCS Inverted | `0xC0 \| d2` | D023I → `23 C0` (d2=0, low=23) |

- CTCSS: Stored as BCD of frequency × 10 (e.g., 88.5 Hz = 885 → 0x0885 → `85 08`)
- DCS Normal: High byte = `0x80 | d2` where d2 is hundreds digit
- DCS Inverted: High byte = `0xC0 | d2` (adds 0x40 invert flag)
- Low byte: BCD of `(d1 << 4) | d0` where d1=tens, d0=ones

## Settings block 1 (0x0C90–0x1377)

| Offset | Setting | Menu # | Encoding | Source |
|--------|---------|--------|----------|--------|
| 0x0C91 | PF1 short press | 27 | 0=none, 1=fm radio, 2=lamp, 3=tone, 4=alarm, 5=weather, 7=ptt2, 8=od ptt | [1] |
| 0x0C92 | PF2 short press | 29 | Same as PF1 short press | [1] |
| 0x0C94 | PF1 long press | 28 | 0=none, 1=fm radio, 2=lamp, 3=cancel sq, 4=tone, 5=alarm, 6=weather | [1] |
| 0x0C95 | PF2 long press | 30 | Same as PF1 long press | [1] |
| 0x0C98 | DCD | 35 | 0=off, 1=on | [1] |
| 0x0C99 | D-HOLD | 36 | 0=off, 1=5s, 2=10s, 3=15s | [1] |
| 0x0C9A | D-RSP | 37 | 0=null, 1=ring, 2=reply, 3=both | [1] |
| 0x0C9B | DTMF speed | 34 | 0=80ms, 1=90ms, 2=100ms, 3=110ms, 4=120ms, 5=130ms, 6=140ms, 7=150ms | [1] |
| 0x0C9D | Brightness | 13 | Inverted: display = 5 − memory | [1] |
| 0x0CA0 | DTMFST | 19 | Bit 1: 0=off, 1=on | [1] |
| 0x0CA0 | Unknown |  | Bit 4: purpose unknown; Windows CPS flipped 0→1 when writing unchanged data (possibly related to NORMAL vs HAM mode) | [1][3] |
| 0x0CA0 | Disp LCD (RX) |  | Bit 6: 0=off, 1=on | [1] |
| 0x0CA0 | Disp LCD (TX) |  | Bit 7: 0=off, 1=on | [1] |
| 0x0CA1 | Voice | 11 | Bit 0: 0=off, 1=on | [1] |
| 0x0CA1 | Keypad beep | 7 | Bit 2: 0=off, 1=on | [1] |
| 0x0CA1 | Keypad lock | 9 | Bit 4: 0=off, 1=on | [1] |
| 0x0CA1 | Scan mode |  | Bits 6–7: 0b00=TO, 0b01=CO, 0b10=SE | [1] |
| 0x0CA2 | VFO A work mode |  | Bit 0: 0=VFO/freq, 1=channel | [1] |
| 0x0CA2 | Display Type-A | 17 | Bit 2: 0=freq+num, 1=name+num | [1] |
| 0x0CA2 | FM interrupt | 26 | Bit 3: 0=off, 1=on | [1] |
| 0x0CA2 | Tone burst | 24 | Bits 4–5: 0=1000Hz, 1=1450Hz, 2=1750Hz, 3=2100Hz | [1] |
| 0x0CA2 | FM mode |  | Bit 7: 0=VFO, 1=channel | [1] |
| 0x0CA3 | VFO B work mode |  | Bit 0: 0=VFO/freq, 1=channel | [1] |
| 0x0CA3 | Dual watch | 10 | Bit 2: 0=off, 1=on | [1] |
| 0x0CA3 | Display Type-B | 18 | Bit 4: 0=freq+num, 1=name+num | [1] |
| 0x0CA3 | Power-on display | 14 | Bits 6–7: 0=voltage, 1=message, 2=picture | [1] |
| 0x0CA4 | VFO A current channel |  | 1 byte: channel number (1-199, 1-indexed) | [1] |
| 0x0CA5 | VFO B current channel |  | 1 byte: channel number (1-199, 1-indexed) | [1] |
| 0x0CA6 | (undocumented) |  | Included in the documented VFO state range (0x0CA4–0x0CA6) | [1] |
| 0x0CA7 | VOX level (+ STUN/KILL flags) | 3 | Bits 0–2: 0=off, 1–5=level; Bit 3: STUN (0=off,1=on); Bit 4: KILL (0=off,1=on) | [1] |
| 0x0CA8 | Step freq | 2 | Stored in high nibble; values: 0=2.5K, 1=5K, 2=6.25K, 3=10K, 4=12.5K, 5=25K, 6=50K, 7=0.5K, 8=8.33K | [1] |
| 0x0CA9 | Squelch level | 1 | 0=off, 1–9=level | [1] |
| 0x0CAA | TOT | 5 | 0=off, 1=30s, 2=60s, 3=90s, 4=120s, 5=150s, 6=180s, 7=210s | [1] |
| 0x0CAB | Roger beep | 6 | Bits 6–7: 0=off, 1=tone1, 2=tone2 | [1] |
| 0x0CAB | 200Tx | 39 | Bit 4: 0=off, 1=on | [1] |
| 0x0CAB | 350Tx | 40 | Bit 3: 0=off, 1=on | [1] |
| 0x0CAB | 500Tx | 41 | Bit 2: 0=off, 1=on | [1] |
| 0x0CAC | Power save | 8 | 0=off, 1–4=level | [1] |
| 0x0CAD | Backlight | 12 | 0=always, 1=5s, 2=10s, 3=15s, 4=30s | [1] |
| 0x0CAE | VOX delay | 4 | 0=1.0s, 1=2.0s, 2=3.0s | [1] |
| 0x0CAF | Breath LED + flags | 32 | Bit 1: AM BAND (0=off,1=on); Bits 4–6: Breath LED (0=off, 1=5s, 2=10s, 3=15s, 4=30s); Bit 7: Only CH Mode (purpose unknown, from Windows CPS) | [1][3] |
| 0x0CB0–0x0CB3 | VFO A offset |  | 4-byte BCD little-endian, 10 Hz units | [2] |
| 0x0CB4–0x0CB7 | VFO B offset |  | 4-byte BCD little-endian, 10 Hz units | [2] |
| 0x0CC0–0x0CC1 | VHF low TX limit | CPS-only | 16-bit BCD big-endian, 0.1 MHz units (e.g. `14 40` = 144.0 MHz) | [3] |
| 0x0CC2–0x0CC3 | VHF high TX limit | CPS-only | 16-bit BCD big-endian, 0.1 MHz units (e.g. `14 80` = 148.0 MHz) | [3] |
| 0x0CC4–0x0CC5 | UHF low TX limit | CPS-only | 16-bit BCD big-endian, 0.1 MHz units (e.g. `42 00` = 420.0 MHz) | [3] |
| 0x0CC6–0x0CC7 | UHF high TX limit | CPS-only | 16-bit BCD big-endian, 0.1 MHz units (e.g. `45 00` = 450.0 MHz) | [3] |
| 0x0CD0–0x0D33 | FM broadcast channels (FM CH1–CH25) |  | 25 × 4 bytes: 16-bit BCD little-endian (0.1 MHz) + 2 padding bytes | [1] |
| 0x0D40–0x1377 | Channel names (CH1–CH199) |  | 199 × 8 bytes: null/0xFF-padded string | [1] |

### 0x0C91–0x0C95 - Function key notes

Short press options differ from long press options (long press has “cancel sq”, but no “ptt2/od ptt”).

### 0x0CA0–0x0CA3 - Packed flags notes (CHIRP vs testing)

CHIRP driver notes suggest different bit positions for some functions (e.g. FM mode and work-mode bits, or power-on display bits). These notes conflict with manual testing for the mappings above. See [2].

### 0x0CB0–0x0CB7 - VFO offset example

- 5.0 MHz offset = 500000 (10 Hz units)
- BCD: 0x500000
- Stored (little-endian): `00 00 50 00`

These offsets work with the offset direction flags in the VFO A/B structures (channel-like records).

VFO records have TX freq bytes (4-7) but radio doesn't use them. Instead, TX is calculated as RX ± offset.

### 0x0CC0–0x0CC7 - Band limit values by radio mode

Windows CPS changes these values when switching radio modes.

- **NORMAL mode (unlocked):**
  - VHF: 136.0–174.0 MHz → `60 13 40 17`
  - UHF: 200.0–600.0 MHz → `00 20 00 60`
- **HAM mode (amateur bands):**
  - VHF: 144.0–148.0 MHz → `14 40 14 80`
  - UHF: 420.0–450.0 MHz → `42 00 45 00`

Note: This region is not documented in CHIRP.

### 0x0CD0–0x0D33 - FM broadcast channel encoding examples

- 88.0 MHz = 880 tenths → BCD 0x0880 → stored as `80 08 00 00`
- 107.9 MHz = 1079 tenths → BCD 0x1079 → stored as `79 10 00 00`

ODMaster app has float parsing issues; use explicit decimal (e.g. 88.0, not 88).

### 0x0D40–0x1377 - Channel name layout

- Name for CH \(n\) offset = \(0x0D40 + (n-1) \times 8\)
- 8 bytes per name, null/0xFF padded

## Settings block 2 (0x1800–0x1C2F)

This block contains the DTMF/ANI system, plus several bitmaps and VFO-related structures.

| Offset | Setting | Menu # | Encoding | Source |
|--------|---------|--------|----------|--------|
| 0x1800–0x180F | Stun code | CPS-only | 16 bytes: 15 DTMF digits + 1 byte (see DTMF field encoding); H3/H3-Plus only | [2] |
| 0x1810–0x181F | Kill code | CPS-only | 16 bytes: 15 DTMF digits + 1 byte (see DTMF field encoding); H3/H3-Plus only | [2] |
| 0x1820–0x1822 | ANI-Edit (ID code) | 16 | 3 bytes: DTMF digits (no trailing length byte), max 3 digits | [2] |
| 0x1829 | Group code selector | CPS-only | 1 byte: 0x00 or 0xFF=off; 0x0A=A, 0x0B=B, 0x0C=C, 0x0D=D, 0x0E=*, 0x0F=# | [1][3] |
| 0x1830–0x18AF | DTMF group call codes (8 groups) | CPS-only | 8 × 16-byte DTMF fields (see DTMF field encoding) | [2] |
| 0x18C0–0x18CF | PTT ID start code (BOT) | CPS-only | 16-byte DTMF field (see DTMF field encoding) | [2] |
| 0x18D0–0x18DF | PTT ID end code (EOT) | CPS-only | 16-byte DTMF field (see DTMF field encoding) | [2] |
| 0x1900–0x1918 | Channel valid bitmap (CH1–CH199) |  | 199 bits, 1=valid/programmed, 0=empty | [1] |
| 0x1920–0x1938 | Scan bitmap (CH1–CH199) |  | 199 bits, 1=scan on, 0=scan off | [1] |
| 0x1940–0x1943 | FM scan bitmap (FM CH1–CH25) |  | 25 bits, 1=scan enabled, 0=scan disabled | [1] |
| 0x1950–0x195F | VFO A frequency record |  | 16-byte record: RX freq, tones, scramble, flags (byte 14 has offset dir) | [1] |
| 0x1960–0x196F | VFO B frequency record |  | 16-byte record: RX freq, tones, scramble, flags (byte 14 has offset dir) | [1] |
| 0x1970–0x1971 | FM VFO frequency |  | 16-bit BCD little-endian, 0.1 MHz units | [1] |
| 0x1B40–0x1B45 | Password | CPS-only | 6 bytes ASCII, max 6 chars | [3] |
| 0x1C00–0x1C2F | Startup messages (3 strings) |  | 3 × 16 bytes, null-padded string | [1] |

### 0x1800–0x18DF - DTMF field encoding

**DTMF character map:**

- `0–9` → `0x00–0x09`
- `A–D` → `0x0A–0x0D`
- `*` → `0x0E`
- `#` → `0x0F`
- Padding/unused → `0xFF`

**16-byte DTMF field (used by stun/kill, group codes, BOT/EOT):**

- **Implementation used by this project (`docs/js/ble.js`) and CHIRP notes** treat this as **15 digits + 1 length byte**:
  - Bytes 0–14: DTMF symbols (`0x00–0x0F`) or padding (`0xFF`)
  - Byte 15: length (0–15)
  - If the string is empty, byte 15 is written as 0
  - When parsing, the code uses the length byte and **does not** stop early on `0xFF` (it just skips invalid chars).
- Windows CPS testing indicates the group call codes are also **max 15 digits**, consistent with the 15+length encoding.

**Examples observed while mapping:**

- e.g. `"1212"` → `01 02 01 02 FF ... FF 04`
- e.g. `"34340000"` → `03 04 03 04 00 00 00 00 FF ... FF 08`
- e.g. `"*#ABCD"` → `0E 0F 0A 0B 0C 0D FF ... FF 06`
- e.g. `"01234"` → `00 01 02 03 04 FF ... FF 05`
- e.g. `"5678"` → `05 06 07 08 FF ... FF 04`
- e.g. max length: `"9"` + 14 zeros → `09 00 00 ... 00 0F`

Practical note: if you ever see an apparent “16th digit”, it’s likely the length byte being misread as a digit (e.g. 0x0F resembles `#` if interpreted via the DTMF map).

**ANI-Edit special case (3 bytes, no trailing length byte):**

- Bytes 0–2: up to 3 digits directly (0x00–0x0F), or 0xFF for empty
- e.g. `"489"` → `04 08 09`

### 0x1830–0x18AF - DTMF group call codes

Eight 16-byte DTMF fields:

| Offset | Group | Encoding | Source |
|--------|-------|----------|--------|
| 0x1830–0x183F | Group 1 | 16-byte DTMF field | [2] |
| 0x1840–0x184F | Group 2 | 16-byte DTMF field | [2] |
| 0x1850–0x185F | Group 3 | 16-byte DTMF field | [2] |
| 0x1860–0x186F | Group 4 | 16-byte DTMF field | [2] |
| 0x1870–0x187F | Group 5 | 16-byte DTMF field | [2] |
| 0x1880–0x188F | Group 6 | 16-byte DTMF field | [2] |
| 0x1890–0x189F | Group 7 | 16-byte DTMF field | [2] |
| 0x18A0–0x18AF | Group 8 | 16-byte DTMF field | [2] |

### 0x1829 - Group code selector example

Observed values:

- 0x00 or 0xFF = off
- 0x0A=A, 0x0B=B, 0x0C=C, 0x0D=D, 0x0E=*, 0x0F=#
- e.g. `'D'` = 0x0D

### 0x1900–0x1918 - Channel valid bitmap

Controls which channels the radio considers “valid/programmed” for UP/DOWN cycling.

- Bit=1: channel is valid/programmed
- Bit=0: channel is empty/invalid and is skipped
- Factory reset sets all bits to 0 except CH1 (radio appears “stuck” on CH1 after reset)
- Rule used when mapping: set bit=1 if channel has RX frequency > 0

Bit layout example:

- 0x1900: CH1–CH8 (bit 0=CH1 … bit 7=CH8)
- 0x1901: CH9–CH16 (same pattern)
- … continues for all 199 channels

### 0x1920–0x1938 - Scan bitmap

- Bit=1: scan on
- Bit=0: scan off
- Scan Add is not stored in the per-channel record; it’s a separate bitmap.

Bit layout example:

- 0x1920: CH1–CH8 (bit 0=CH1 … bit 7=CH8)
- 0x1921: CH9–CH16 (same pattern)
- … continues for all 199 channels

### 0x1940–0x1943 - FM scan bitmap layout

- 0x1940: FM CH1–CH8 (bit 0=CH1 … bit 7=CH8)
- 0x1941: FM CH9–CH16
- 0x1942: FM CH17–CH24
- 0x1943: FM CH25 (bit 0 only)

### 0x1950 / 0x1960 - VFO frequency records

VFO A (0x1950-0x195F) and VFO B (0x1960-0x196F) use a 16-byte structure similar to channel records, but with key differences:

**VFO record layout (offsets relative to base):**

| Rel. offset | Size | Field | Encoding |
|------------:|-----:|-------|----------|
| 0x00–0x03 | 4 | RX frequency | BCD little-endian, 10 Hz units |
| 0x04–0x07 | 4 | TX frequency | **NOT USED** - radio calculates TX = RX ± offset |
| 0x08–0x09 | 2 | RX subtone (decode) | Same as channels (CTCSS/DCS) |
| 0x0A–0x0B | 2 | TX subtone (encode) | Same as channels (CTCSS/DCS) |
| 0x0C | 1 | Scramble level | 0=off, 1–16=level |
| 0x0D | 1 | Flags 2 | Bit 2: Busy lock (assumed same as channels) |
| 0x0E | 1 | Flags 3 | **VFO-specific** - see below |
| 0x0F | 1 | **Modulation [38]** | 0=FM, 1=AM (discovered Session 19) |

**Flags 3 (byte 0x0E) - VFO-specific encoding:**

| Bits | Mask | Meaning |
|------|------|---------|
| 0–1 | 0x03 | Offset direction: 0=off (simplex), 1=negative (-), 2=positive (+) |
| 3 | 0x08 | Bandwidth: 0=wide, 1=narrow |
| 4 | 0x10 | TX power: 0=low, 1=high |

**Key differences from channels:**
- TX frequency bytes are not used; the radio calculates TX = RX ± offset
- Offset direction is stored in byte 14 bits 0-1 (channels don't have this)
- Offset value is stored separately at 0x0CB0 (VFO A) / 0x0CB4 (VFO B)
- No PTT ID or frequency hop flags (those are channel-specific)
- No channel name storage

### 0x1970–0x1971 - FM VFO examples

- 90.5 MHz = 905 tenths → BCD 0x0905 → stored as `05 09`
- 107.9 MHz = 1079 tenths → BCD 0x1079 → stored as `79 10`

Related: FM mode at 0x0CA2 bit 7 (0=VFO, 1=channel).

### 0x1B40–0x1B45 - Password

Radio security password (function and handshake protocol unknown).

- Encoding is direct ASCII (not DTMF encoding)
- e.g. `"qwerty"` → `71 77 65 72 74 79`
- Empty/no password: all `00`

Status: memory location documented; UI/feature integration deferred until the password handshake protocol is understood.

### 0x1C00–0x1C2F - Startup messages

Used when Power-on display (menu 14) is set to “message”.

- 0x1C00: message 1 (16 bytes)
- 0x1C10: message 2 (16 bytes)
- 0x1C20: message 3 (16 bytes)

## Settings block 3 (0x1F00–0x1F7F)

| Offset | Setting | Menu # | Encoding | Source |
|--------|---------|--------|----------|--------|
| 0x1F02 | STE (squelch tail elimination) |  | 0=off, 1–10 (seconds) | [2] |
| 0x1F03 | Repeater tone delay |  | 0=off, 1–10 (seconds) | [2] |
| 0x1F20 | MIC gain | 33 | 0–9 | [1] |
| 0x1F28 | Language | 21 | 0=en, 1=cn, 2=tr, 3=ru, 4=de, 5=es, 6=it, 7=fr | [1] |
| 0x1F29 | Display | 15 | 0=single, 1=dual, 2=classic | [1] |
| 0x1F2A | Menu color | 42 | 0=blue, 1=red, 2=green, 3=yellow, 4=purple, 5=orange, 6=lightblue, 7=cyan, 8=gray, 9=darkblue, 10=lightgreen, 11=brown, 12=pink, 13=B.red, 14=G.blue, 15=L.gray, 16=LG.blue, 17=LB.blue | [1] |
| 0x1F2B–0x1F2C | Scan freq range upper |  | 16-bit little-endian, MHz (e.g. 0x0257=599 MHz) | [1] |
| 0x1F2D | Scan freq range lower |  | 8-bit, MHz (e.g. 0x42=66 MHz) | [1] |
| 0x1F2F | Scan hang time |  | (seconds × 2) − 1; range 0.5s–10.0s (values 0–19) | [1] |
| 0x1F30 | Bluetooth? |  | Unverified: CHIRP claims bit 7; dumps suggest bit 0 (0x01); toggling didn’t disable radio bluetooth; real location unknown | [2] |
| 0x1F50–0x1F5D | TX power tune (low power) | CPS-only | 14 bytes: power factors (0–255) for various bands (see breakdown) | [2] |
| 0x1F5E–0x1F5F | (unused/padding) |  | Padding | [2] |
| 0x1F70–0x1F7F | TX power tune (high power) | CPS-only | Same structure as low power (14 bands + 2 padding bytes) | [2] |

### 0x1F50–0x1F5D - TX power tune (low power) band breakdown

Factory calibration values—avoid modifying unless you know what you’re doing.

| Offset | Freq band | Meaning |
|--------|-----------|---------|
| 0x1F50 | 136–140 MHz | Power factor (0–255) |
| 0x1F51 | 140–150 MHz | Power factor (0–255) |
| 0x1F52 | 150–160 MHz | Power factor (0–255) |
| 0x1F53 | 160–170 MHz | Power factor (0–255) |
| 0x1F54 | 170+ MHz | Power factor (0–255) |
| 0x1F55 | 400–410 MHz | Power factor (0–255) |
| 0x1F56 | 410–420 MHz | Power factor (0–255) |
| 0x1F57 | 420–430 MHz | Power factor (0–255) |
| 0x1F58 | 430–440 MHz | Power factor (0–255) |
| 0x1F59 | 440–450 MHz | Power factor (0–255) |
| 0x1F5A | 450–460 MHz | Power factor (0–255) |
| 0x1F5B | 460–470 MHz | Power factor (0–255) |
| 0x1F5C | 470+ MHz | Power factor (0–255) |
| 0x1F5D | 245 MHz | Power factor (0–255) |

Note: H3-Plus has only low/high power (no mid power). H8 has 3 power levels.

## Settings block 4 (0x3000–0x3113)

| Offset | Setting | Menu # | Encoding | Source |
|--------|---------|--------|----------|--------|
| 0x3004 | Active VFO |  | 0=A, 1=B | [1] |
| 0x300A | STE | 23 | Bit 7: 0=off, 1=on | [1] |
| 0x300A | Alarm mode | 22 | Bits 4–5: 0=on site, 2=tx alarm | [1] |
| 0x300B | PTT delay | 20 | Bits 0–5: raw; value = (raw + 1) × 100 ms | [1] |
| 0x300C | Talk around | 25 | 0=off, 1=on | [1] |

### 0x300A - Packed byte

0x300A combines STE (bit 7) and Alarm mode (bits 4–5).

## Undocumented / observed data regions (non-0xFF)

These regions contain non-0xFF bytes, but purpose is still unknown.

| Address range | Size | Notes |
|---------------|------|-------|
| 0x0CC8–0x0CCF | 8 b | After frequency band limits |
| 0x0D88–0x0D97 | 16 b | Between names and channels |
| 0x1380–0x13FF | 128 b | Unknown block (possibly FM presets?) |
| 0x1480–0x1483 | 4 b | Before extended channels |
| 0x18B0–0x18BF | 16 b | Between group 8 and start code |
| 0x18E0–0x18FF | 32 b | After end code |
| 0x1919–0x191F | 7 b | After channel valid bitmap |
| 0x1939–0x194F | 23 b | Between scan bitmap and VFO A |
| 0x1970–0x1BFF | 656 b | After FM VFO |
| 0x1F04–0x1F1F | 28 b | Between repeater tail and MIC gain |
| 0x1F31–0x1F4F | 31 b | Between bluetooth and power tune |
| 0x300D–0x3019 | 13 b | After Talk Around |
| 0x303C–0x3113 | 215 b | Extended region unknowns |

Potential contents (hypotheses):

- Analog settings (AM Vol Level not found)
- Additional DTMF/ANI features
- Extended calibration data

## Notes

1. Empty/unprogrammed memory is often 0xFF.
2. Channel 1 base offset is documented as 0x0010 (not 0x0000).
3. Settings are scattered across multiple regions.
4. Bit numbering is LSB-first (bit 0 = 0x01, bit 7 = 0x80).
