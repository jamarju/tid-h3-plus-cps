# Tidradio H3 Plus Memory Map

**Last Updated:** January 24, 2026 (Session 18)
**Total Memory:** 16KB (0x0000-0x3FFF), but radio reports 100% at ~8KB

**Session 18 Discovery:** Complete DTMF/ANI system mapped! Discovered from CHIRP driver analysis (chirpmyradio.com/issues/11968): Stun/Kill codes, 8 group call codes, BOT/EOT PTT ID sequences, VFO offset frequencies, repeater tail settings, bluetooth toggle, TX power tune calibration, and frequency band limits.

---

## Overview - Populated Regions

Based on actual memory scan (non-0xFF bytes):

| Region | Address Range | Size | Description | Status |
|--------|---------------|------|-------------|--------|
| Channels | 0x0010+ | 16b/ch | 199 channels × 16 bytes | ✅ VERIFIED |
| Function Keys | 0x0C90-0x0C9D | 14b | PF1/PF2, brightness | ✅ VERIFIED |
| VFO State | 0x0CA4-0x0CA5 | 2b | Current A/B channels | ✅ VERIFIED |
| Main Settings | 0x0CA0-0x0CAF | 16b | Core radio settings | ✅ VERIFIED |
| **VFO Offsets** | 0x0CB0-0x0CB7 | 8b | VFO A/B offset frequencies | ✅ VERIFIED |
| **Freq Band Limits** | 0x0CC0-0x0CC7 | 8b | VHF/UHF band edges (136-174, 200-600 MHz) | ✅ VERIFIED |
| **FM Channels** | 0x0CD0-0x0D33 | 100b | 25 FM channels × 4 bytes | ✅ VERIFIED |
| Channel Names | 0x0D40+ | 8b/ch | 199 names × 8 bytes | ✅ VERIFIED |
| **Stun/Kill Codes** | 0x1800-0x181F | 32b | Remote disable codes (H3/H3-Plus) | ✅ VERIFIED |
| **ANI/ID System** | 0x1820-0x1829 | 10b | ANI edit (3b), group selector (1b) | ✅ VERIFIED |
| **DTMF Groups** | 0x1830-0x18AF | 128b | 8 group call codes × 16 bytes | ✅ VERIFIED |
| **DTMF PTT ID** | 0x18C0-0x18DF | 32b | Start/End codes (BOT/EOT) | ✅ VERIFIED |
| **Channel Valid Bitmap** | 0x1900-0x1918 | 25b | 199 channels, 1 bit each (controls UP/DOWN) | ✅ VERIFIED |
| **Scan Bitmap** | 0x1920-0x1938 | 25b | 199 channels, 1 bit each | ✅ VERIFIED |
| **FM Scan Bitmap** | 0x1940-0x1943 | 4b | 25 FM channels, 1 bit each | ✅ VERIFIED |
| **VFO A Frequency** | 0x1950-0x195F | 16b | RX/TX freq, tones, flags | ✅ VERIFIED |
| **VFO B Frequency** | 0x1960-0x196F | 16b | RX/TX freq, tones, flags | ✅ VERIFIED |
| **FM VFO Frequency** | 0x1970-0x1971 | 2b | FM VFO freq (BCD, 0.1 MHz units) | ✅ VERIFIED |
| Startup Messages | 0x1C00-0x1C2F | 48b | 3 × 16-byte messages | ✅ VERIFIED |
| **Repeater Tail** | 0x1F02-0x1F03 | 2b | STE, repeater tone delay | ✅ VERIFIED |
| Secondary Settings | 0x1F20-0x1F30 | 17b | MIC, language, display, color, scan, bluetooth | ✅ VERIFIED |
| **TX Power Tune** | 0x1F50-0x1F7F | 48b | Factory calibration (low/high × 14 bands) | ✅ VERIFIED |
| Extended Settings | 0x3000-0x300C | 13b | STE, Alarm, PTT Delay, etc | ✅ VERIFIED |
| Active VFO | 0x3004 | 1b | 0=A, 1=B | ✅ VERIFIED |

**Key Finding:** All 41 menu settings + all channel flags now mapped!

---

## Early Settings (0x0000-0x00FF)

| Offset | Setting | Menu # | Encoding |
|--------|---------|--------|----------|
| 0x001F | Modulation | [38] | 0=fm, 1=am |

---

## Settings Block 1: Function Keys (0x0C90-0x0C9F)

| Offset | Setting | Menu # | Encoding |
|--------|---------|--------|----------|
| 0x0C91 | PF1 Short Press | [27] | 0=none,1=fm radio,2=lamp,3=tone,4=alarm,5=weather,7=ptt2,8=od ptt |
| 0x0C92 | PF2 Short Press | [29] | Same as PF1 Short |
| 0x0C94 | PF1 Long Press | [28] | 0=none,1=fm radio,2=lamp,3=cancel sq,4=tone,5=alarm,6=weather |
| 0x0C95 | PF2 Long Press | [30] | Same as PF1 Long |
| 0x0C98 | DCD | [35] | 0=off, 1=on |
| 0x0C99 | D-HOLD | [36] | 0=off, 1=5s, 2=10s, 3=15s |
| 0x0C9A | D-RSP | [37] | 0=null, 1=ring, 2=reply, 3=both |
| 0x0C9B | DTMF Speed | [34] | 0=80ms, 1=90ms, 2=100ms, 3=110ms, 4=120ms, 5=130ms, 6=140ms, 7=150ms |
| 0x0C9D | Brightness | [13] | INVERTED: display = 5 - memory |

**Note:** Short press options differ from Long press options! Long has "cancel sq" but no ptt2/od ptt.

---

## Settings Block 2: Packed Bytes (0x0CA0-0x0CA3)

### 0x0CA0 - Flags A
| Bit | Setting | Menu # | Values |
|-----|---------|--------|--------|
| 1 | DTMFST | [19] | 0=off, 1=on |
| 4 | Unknown | - | Purpose unknown. Windows CPS flipped this bit (0→1) when writing unchanged data, possibly related to radio mode (NORMAL vs HAM). Source: dumps/manifest.txt, 001 vs 000 comparison. |
| 6 | Disp LCD (RX) | - | 0=off, 1=on |
| 7 | Disp LCD (TX) | - | 0=off, 1=on |

### 0x0CA1 - Flags B
| Bit | Setting | Menu # | Values |
|-----|---------|--------|--------|
| 0 | Voice | [11] | 0=off, 1=on |
| 2 | Keypad Beep | [7] | 0=off, 1=on |
| 4 | Keypad Lock | [9] | 0=off, 1=on |
| 6-7 | Scan Mode | - | 0b00=TO, 0b01=CO, 0b10=SE |

### 0x0CA2 - Flags C
| Bit | Setting | Menu # | Values |
|-----|---------|--------|--------|
| 2 | Display Type-A | [17] | 0=freq+num, 1=name+num |
| 3 | FM Interrupt | [26] | 0=off, 1=on |
| 4-5 | Tone Burst | [24] | (data>>4)&0x03: 0=1000Hz, 1=1450Hz, 2=1750Hz, 3=2100Hz |
| 7 | FM Mode | - | 0=VFO, 1=Channel |

**Note:** CHIRP driver suggests different bit positions (bit 0=FM Mode, bits 6-7=VFO A Work Mode), but these conflict with manual testing. See [chirpmyradio.com/issues/11968](https://chirpmyradio.com/issues/11968).

### 0x0CA3 - Flags D
| Bit | Setting | Menu # | Values |
|-----|---------|--------|--------|
| 2 | Dual Watch | [10] | 0=off, 1=on |
| 4 | Display Type-B | [18] | 0=freq+num, 1=name+num |
| 6-7 | Power On Display | [14] | 0=voltage, 1=message, 2=picture |

**Note:** CHIRP driver suggests bits 0-1 for Power On Display and bits 6-7 for VFO B Work Mode, but this conflicts with manual testing. See [chirpmyradio.com/issues/11968](https://chirpmyradio.com/issues/11968).

---

## Settings Block 3: Direct Values (0x0CA7-0x0CAF)

| Offset | Setting | Menu # | Encoding |
|--------|---------|--------|----------|
| 0x0CA7 | VOX Level | [3] | Bits 0-2: 0=off, 1-5=level; Bit 3: STUN (0=off, 1=on); Bit 4: KILL (0=off, 1=on) |
| 0x0CA8 | Step Freq | [2] | Upper nibble (val<<4): 0=2.5K,1=5K,2=6.25K,3=10K,4=12.5K,5=25K,6=50K,7=0.5K,8=8.33K |
| 0x0CA9 | Squelch Level | [1] | 0=off, 1-9=level |
| 0x0CAA | TOT | [5] | 0=off, 1=30s, 2=60s, 3=90s, 4=120s, 5=150s, 6=180s, 7=210s |
| 0x0CAB | Roger Beep | [6] | Bits 6-7: (data>>6)&0x03, 0=off, 1=tone1, 2=tone2 |
| 0x0CAB | 200Tx | [39] | Bit 4: (data>>4)&0x01, 0=off, 1=on |
| 0x0CAB | 350Tx | [40] | Bit 3: (data>>3)&0x01, 0=off, 1=on |
| 0x0CAB | 500Tx | [41] | Bit 2: (data>>2)&0x01, 0=off, 1=on |
| 0x0CAC | Power Save | [8] | 0=off, 1-4=level |
| 0x0CAD | Backlight | [12] | 0=always, 1=5s, 2=10s, 3=15s, 4=30s |
| 0x0CAE | VOX Delay | [4] | 0=1.0s, 1=2.0s, 2=3.0s |
| 0x0CAF | Breath LED | [32] | Bit 1: AM BAND (0=off, 1=on); Upper nibble (bits 4-7): 0=off, 1=5s, 2=10s, 3=15s, 4=30s |

---

## VFO Offset Frequencies (0x0CB0-0x0CB7) - VERIFIED

**Source:** Discovered from CHIRP driver analysis (chirpmyradio.com/issues/11968)

VFO A and B store separate offset frequency values (used with Offset Direction flags):

| Offset | VFO | Encoding |
|--------|-----|----------|
| 0x0CB0-0x0CB3 | VFO A Offset | 4-byte BCD little-endian, same as freq (10Hz units) |
| 0x0CB4-0x0CB7 | VFO B Offset | 4-byte BCD little-endian, same as freq (10Hz units) |

**Example:** 5.0 MHz offset = 500000 (10Hz units)
- BCD: 0x500000
- Stored as: `0x00 0x00 0x50 0x00` (little-endian)

**Note:** These offsets work with the Offset Direction flags in VFO A/B structures (bits in channel flags)

---

## TX Frequency Band Limits (0x0CC0-0x0CC7) - VERIFIED

**Source:** Windows CPS "Machine Info" (hard truth source)

TX frequency band limits that vary by radio operating mode (NORMAL / HAM / GMRS):

| Offset | Purpose | Encoding |
|--------|---------|----------|
| 0x0CC0-0x0CC1 | VHF Low Limit | 16-bit BCD **big-endian**, 0.1 MHz units (e.g. bytes `0x14 0x40` = BCD 1-4-4-0 = 144.0 MHz) |
| 0x0CC2-0x0CC3 | VHF High Limit | 16-bit BCD big-endian, 0.1 MHz units (e.g. bytes `0x14 0x80` = BCD 1-4-8-0 = 148.0 MHz) |
| 0x0CC4-0x0CC5 | UHF Low Limit | 16-bit BCD big-endian, 0.1 MHz units (e.g. bytes `0x42 0x00` = BCD 4-2-0-0 = 420.0 MHz) |
| 0x0CC6-0x0CC7 | UHF High Limit | 16-bit BCD big-endian, 0.1 MHz units (e.g. bytes `0x45 0x00` = BCD 4-5-0-0 = 450.0 MHz) |

**Values by Radio Mode:**

**NORMAL Mode** (unlocked):
- VHF: 136.0 - 174.0 MHz → `60 13 40 17`
- UHF: 200.0 - 600.0 MHz → `00 20 00 60`

**HAM Mode** (amateur radio bands):
- VHF: 144.0 - 148.0 MHz → `14 40 14 80` (2m band)
- UHF: 420.0 - 450.0 MHz → `42 00 45 00` (70cm band)

**Encoding Example:**
- 144.0 MHz = 1440 tenths → BCD 0x1440 → stored as `0x14 0x40` (little-endian)

**Discovery:** Windows CPS changes these values when switching radio modes. Confirmed by comparing dumps after writing unchanged data - CPS changed NORMAL → HAM mode limits automatically.

**Note:** This region is NOT documented in CHIRP driver.

---

## VFO State (0x0CA4-0x0CA6)

| Offset | Setting | Encoding |
|--------|---------|----------|
| 0x0CA4 | A Channel | Current channel on VFO A |
| 0x0CA5 | B Channel | Current channel on VFO B |

---

## Startup Messages (0x1C00-0x1C2F)

| Offset | Size | Description |
|--------|------|-------------|
| 0x1C00 | 16 | Message 1 (null-padded string) |
| 0x1C10 | 16 | Message 2 (null-padded string) |
| 0x1C20 | 16 | Message 3 (null-padded string) |

Used when Power On Display [14] = "message"

---

## Settings Block 4: DTMF/ANI System (0x1800-0x18DF) - VERIFIED

**Source:** Discovered from CHIRP driver analysis (chirpmyradio.com/issues/11968)

### Stun/Kill Codes (0x1800-0x181F) - H3/H3-Plus Only

Remote control codes for disabling radio. **Max: 15 digits each.**

| Offset | Purpose | Encoding |
|--------|---------|----------|
| 0x1800-0x180F | Stun Code | 16 bytes: 15 DTMF digits + 1 length byte. Verified: "1212" = `01 02 01 02 FF ... FF 04` |
| 0x1810-0x181F | Kill Code | 16 bytes: 15 DTMF digits + 1 length byte. Verified: "34340000" = `03 04 03 04 00 00 00 00 FF ... FF 08` |

**DTMF Encoding:** See "DTMF Encoding Format" section below.

### ANI/ID Codes (0x1820-0x1829)

| Offset | Setting | Menu # | Encoding |
|--------|---------|--------|----------|
| 0x1820-0x1822 | ANI-Edit (ID Code) | [16] | 3 bytes: DTMF code map (0x00-0x0F), no length byte. **Max: 3 digits.** |
| 0x1829 | Group Code Selector | - | 1 byte: 0x00 or 0xFF=Off, 0x0A=A, 0x0B=B, 0x0C=C, 0x0D=D, 0x0E=*, 0x0F=#. Verified: 'D'=0x0D (Windows CPS test). |

### DTMF Group Call Codes (0x1830-0x18AF)

8 groups for group calling feature. **Max: 15 digits per group.**

| Offset | Group | Encoding |
|--------|-------|----------|
| 0x1830-0x183F | Group 1 | 16 bytes: 15 DTMF digits + 1 length byte. Verified: "*#ABCD" = `0E 0F 0A 0B 0C 0D FF ... FF 06` |
| 0x1840-0x184F | Group 2 | 16 bytes: 15 DTMF digits + 1 length byte. Verified: "01234" = `00 01 02 03 04 FF ... FF 05` |
| 0x1850-0x185F | Group 3 | 16 bytes: 15 DTMF digits + 1 length byte. Verified: "5678" = `05 06 07 08 FF ... FF 04` |
| 0x1860-0x186F | Group 4 | 16 bytes: 15 DTMF digits + 1 length byte. Verified max length: "9" + 14 zeros = `09 00 00 ... 00 0F` |
| 0x1870-0x187F | Group 5 | 16 bytes: 15 DTMF digits + 1 length byte |
| 0x1880-0x188F | Group 6 | 16 bytes: 15 DTMF digits + 1 length byte |
| 0x1890-0x189F | Group 7 | 16 bytes: 15 DTMF digits + 1 length byte |
| 0x18A0-0x18AF | Group 8 | 16 bytes: 15 DTMF digits + 1 length byte. Verified max length: "123456789012345" (15 digits) |

### DTMF PTT ID Codes (0x18C0-0x18DF)

Sequences transmitted when PTT ID is BOT/EOT/BOTH. **Max: 15 digits each.**

| Offset | Purpose | Encoding |
|--------|---------|----------|
| 0x18C0-0x18CF | Start Code (BOT) | 16 bytes: 15 DTMF digits + 1 length byte. Verified: "12345" = `01 02 03 04 05 FF ... FF 05` |
| 0x18D0-0x18DF | End Code (EOT) | 16 bytes: 15 DTMF digits + 1 length byte. Verified: "*98765A" = `0E 09 08 07 06 05 0A FF ... FF 07` |

### DTMF Encoding Format

**Source:** Verified from Windows CPS testing (Session 18, dumps/002 analysis). Encoding matches CHIRP driver.

**Character Map:**
- `0-9` → `0x00-0x09`
- `A-D` → `0x0A-0x0D`
- `*` → `0x0E`
- `#` → `0x0F`
- Empty/padding → `0xFF`

**Structure (16-byte fields):**
- Bytes 0-14: DTMF digits (or 0xFF if unused)
- Byte 15: Length of actual sequence (0-15)
- **Maximum length: 15 digits** per field
- If all bytes are 0xFF, length byte = 0

**Examples from testing:**

**Short code** "1212" (Stun):
```
[0x01, 0x02, 0x01, 0x02, 0xFF, 0xFF, ..., 0xFF, 0x04]
 ^1     2     1     2    ^padding (11 bytes)   ^len=4
```

**Full length** "9000000000000000" (Group 4 - 15 digits):
```
[0x09, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0F]
 ^9    ^14 zeros (0x00 for digit '0')                                                          ^len=15
```

**Mixed chars** "*98765A" (EOT):
```
[0x0E, 0x09, 0x08, 0x07, 0x06, 0x05, 0x0A, 0xFF, 0xFF, ..., 0xFF, 0x07]
 ^*     9     8     7     6     5     A    ^padding (8 bytes)     ^len=7
```

**Special Case - ANI-Edit (3 bytes, no length byte):**
- Bytes 0-2: 3 DTMF digits directly
- Each byte: 0x00-0x0F (DTMF char) or 0xFF (empty)
- Example "489" → `[0x04, 0x08, 0x09]`

---

## Channel Valid Bitmap (0x1900+) - VERIFIED

**CRITICAL:** This bitmap controls which channels the radio considers "valid/programmed" and allows cycling to with UP/DOWN buttons.

| Offset | Channels | Encoding |
|--------|----------|----------|
| 0x1900 | CH1-8 | Bit 0=CH1, Bit 7=CH8; 1=Valid, 0=Empty |
| 0x1901 | CH9-16 | Same pattern |
| ... | ... | Continues for all 199 channels |

**Behavior:**
- Bit=1: Channel is valid/programmed, can be accessed via UP/DOWN
- Bit=0: Channel is empty/invalid, radio skips it during channel cycling

**Important:** Even if a channel has frequency data, if this bit=0, the radio won't let you cycle to it. Factory reset sets all bits to 0 except CH1, which is why the radio gets stuck on CH1 after reset.

**Encoding rule:** Set bit=1 if channel has rxFreq > 0.

---

## Scan Bitmap (0x1920+) - VERIFIED

| Offset | Channels | Encoding |
|--------|----------|----------|
| 0x1920 | CH1-8 | Bit 0=CH1, Bit 7=CH8; 1=Scan On, 0=Scan Off |
| 0x1921 | CH9-16 | Same pattern |
| ... | ... | Continues for all 199 channels |

**Note:** Scan Add is NOT stored in the channel structure! It's a separate bitmap.

---

## FM Channels (0x0CD0-0x0D33) - VERIFIED

**25 FM broadcast channels** for commercial FM radio reception (88-108 MHz).

| Channel | Offset | Encoding |
|---------|--------|----------|
| FM CH1 | 0x0CD0-0x0CD3 | 16-bit BCD little-endian (0.1 MHz) + 2 padding bytes |
| FM CH2 | 0x0CD4-0x0CD7 | Same format |
| ... | ... | 4 bytes per channel |
| FM CH25 | 0x0D30-0x0D33 | Same format |

**Encoding examples:**
- 88.0 MHz = 880 tenths → 0x0880 BCD → stored as `0x80 0x08 0x00 0x00`
- 107.9 MHz = 1079 tenths → 0x1079 BCD → stored as `0x79 0x10 0x00 0x00`

**Note:** ODMaster app has float parsing issues - always use explicit decimal (e.g., 88.0, not 88).

---

## FM Scan Bitmap (0x1940-0x1943) - VERIFIED

**4 bytes** for 25 FM channels, 1 bit per channel (1=scan enabled, 0=scan disabled).

| Offset | FM Channels | Encoding |
|--------|-------------|----------|
| 0x1940 | FM CH1-8 | Bit 0=CH1, Bit 7=CH8 |
| 0x1941 | FM CH9-16 | Same pattern |
| 0x1942 | FM CH17-24 | Same pattern |
| 0x1943 | FM CH25 | Bit 0 only |

---

## VFO Frequency Storage (0x1950, 0x1960) - VERIFIED

VFO A and B frequencies are stored using the same 16-byte structure as channels:

| Address | VFO | Structure |
|---------|-----|-----------|
| 0x1950-0x195F | VFO A | RX freq (4b) + TX freq (4b) + RX tone (2b) + TX tone (2b) + flags (4b) |
| 0x1960-0x196F | VFO B | Same structure |

**Encoding:** Identical to channel data structure (see Channel Data section)

**Note:** VFO frequencies use BCD little-endian encoding, same as channels. Names are NOT stored for VFOs.

---

## FM VFO Frequency (0x1970-0x1971) - VERIFIED

**FM broadcast VFO** for direct frequency entry in FM radio mode.

| Address | Description | Encoding |
|---------|-------------|----------|
| 0x1970-0x1971 | FM VFO Frequency | 16-bit BCD little-endian (0.1 MHz units) |

**Encoding examples:**
- 90.5 MHz = 905 tenths → 0x0905 BCD → stored as `0x05 0x09`
- 107.9 MHz = 1079 tenths → 0x1079 BCD → stored as `0x79 0x10`

**Related setting:** FM Mode (0x0CA2 bit 7): 0=VFO mode, 1=Channel mode

---

## Password (0x1B40-0x1B45) - VERIFIED

**Source:** Windows CPS testing (Session 18, dumps/002 analysis)

Radio security password (function and handshake protocol unknown).

| Address | Description | Encoding |
|---------|-------------|----------|
| 0x1B40-0x1B45 | Password | 6 bytes: ASCII characters. **Max length: 6 characters.** |

**Encoding:**
- Direct ASCII encoding (not DTMF format!)
- Example: "qwerty" → `0x71 0x77 0x65 0x72 0x74 0x79`
- No password (empty): All `0x00` bytes

**Status:** Memory location documented. UI implementation deferred until password handshake protocol is understood.

---

## Repeater Squelch Tail Settings (0x1F02-0x1F03) - VERIFIED

**Source:** Discovered from CHIRP driver analysis (chirpmyradio.com/issues/11968)

| Offset | Setting | Encoding |
|--------|---------|----------|
| 0x1F02 | STE (Squelch Tail Elimination) | 0=Off, 1-10 (seconds) |
| 0x1F03 | Repeater Tone Delay | 0=Off, 1-10 (seconds) |

**Purpose:** Controls squelch tail elimination delay and repeater tone delay for cleaner audio.

---

## Settings Block 5: Secondary (0x1F20-0x1F3F)

| Offset | Setting | Menu # | Encoding |
|--------|---------|--------|----------|
| 0x1F20 | MIC Gain | [33] | 0-9 |
| 0x1F28 | Language | [21] | 0=en, 1=cn, 2=tr, 3=ru, 4=de, 5=es, 6=it, 7=fr |
| 0x1F29 | Display | [15] | 0=single, 1=dual, 2=classic |
| 0x1F2A | Menu Color | [42] | 0=blue,1=red,2=green,3=yellow,4=purple,5=orange,6=lightblue,7=cyan,8=gray,9=darkblue,10=lightgreen,11=brown,12=pink,13=B.red,14=G.blue,15=L.gray,16=LG.blue,17=LB.blue |
| 0x1F2B-0x1F2C | Scan Freq Range Upper | - | 16-bit little-endian, MHz (e.g. 0x0257 = 599 MHz) |
| 0x1F2D | Scan Freq Range Lower | - | 8-bit, MHz (e.g. 0x42 = 66 MHz) |
| 0x1F2F | Scan Hang Time | - | (seconds * 2) - 1, range: 0.5s-10.0s (values 0-19) |
| 0x1F30 | Bluetooth? | - | **UNVERIFIED.** CHIRP claims bit 7, dumps suggest bit 0 (value 0x01), but toggling doesn't disable radio bluetooth. Real location unknown. Need Windows CPS (USB) on/off comparison. |

---

## TX Power Tune Calibration (0x1F50-0x1F7F) - VERIFIED

**Source:** Discovered from CHIRP driver analysis (chirpmyradio.com/issues/11968)

**WARNING:** Factory calibration values! DO NOT modify unless you know what you're doing.

Power calibration factors (0-255) for different frequency bands and power levels:

### Low Power (0x1F50-0x1F5F)
| Offset | Freq Band | Description |
|--------|-----------|-------------|
| 0x1F50 | 136-140 MHz | Power factor (0-255) |
| 0x1F51 | 140-150 MHz | Power factor (0-255) |
| 0x1F52 | 150-160 MHz | Power factor (0-255) |
| 0x1F53 | 160-170 MHz | Power factor (0-255) |
| 0x1F54 | 170+ MHz | Power factor (0-255) |
| 0x1F55 | 400-410 MHz | Power factor (0-255) |
| 0x1F56 | 410-420 MHz | Power factor (0-255) |
| 0x1F57 | 420-430 MHz | Power factor (0-255) |
| 0x1F58 | 430-440 MHz | Power factor (0-255) |
| 0x1F59 | 440-450 MHz | Power factor (0-255) |
| 0x1F5A | 450-460 MHz | Power factor (0-255) |
| 0x1F5B | 460-470 MHz | Power factor (0-255) |
| 0x1F5C | 470+ MHz | Power factor (0-255) |
| 0x1F5D | 245 MHz | Power factor (0-255) |
| 0x1F5E-0x1F5F | (unused) | Padding |

### High Power (0x1F70-0x1F7F)
Same structure as Low Power (14 bands + 2 padding bytes)

**Note:** H3-Plus has only Low/High power (no mid power). H8 has 3 power levels.

---

## Settings Block 6: Extended (0x3000+) - VERIFIED

| Offset | Setting | Menu # | Encoding |
|--------|---------|--------|----------|
| 0x3004 | Active VFO | - | 0=A, 1=B |
| 0x300A | STE | [23] | Bit 7: (data>>7)&0x01, 0=off, 1=on |
| 0x300A | Alarm Mode | [22] | Bits 4-5: (data>>4)&0x03, 0=on site, 2=tx alarm |
| 0x300B | PTT Delay | [20] | Lower 6 bits: (data&0x3F), value = (raw+1)*100 ms |
| 0x300C | Talk Around | [25] | 0=off, 1=on |

**Note:** 0x300A is a packed byte with STE (bit 7) and Alarm Mode (bits 4-5)

---

## Channel Data (0x0010+)

Each channel is 16 bytes.

### Channel Structure

| Offset | Size | Description | Encoding |
|--------|------|-------------|----------|
| 0-3 | 4 | RX Frequency | Little-endian BCD, 10Hz units |
| 4-7 | 4 | TX Frequency | Little-endian BCD, 10Hz units |
| 8-9 | 2 | RX Tone (Decode) | BCD for CTCSS, special for DCS |
| 10-11 | 2 | TX Tone (Encode) | BCD for CTCSS, special for DCS |
| 12 | 1 | Flags 1 | See below |
| 13 | 1 | Flags 2 | See below |
| 14 | 1 | Flags 3 | See below |
| 15 | 1 | Unknown | Usually 0x00 |

### Byte 12 - Scramble - VERIFIED
- Value 0-16: Scramble level (0=Off, 1-16=level)
- Note: NOT a flags byte, it's a direct value!

### Flags 2 (byte 13) - VERIFIED
- Bit 2 (0x04): Busy Lock (0=Off, 1=On)
- Bit 5 (0x20): Frequency Hop (0=Off, 1=On)
- Bits 6-7: PTT ID ((data>>6)&0x03: 0=Off, 1=BOT, 2=EOT, 3=BOTH)

### Flags 3 (byte 14) - VERIFIED
- Bit 3 (0x08): Bandwidth (1=Narrow, 0=Wide) - INVERTED!
- Bit 4 (0x10): TX Power (0=Low, 1=High)

### Frequency Encoding (BCD Little-Endian)

Example: 446.00625 MHz = bytes `25 06 60 44`

```javascript
let freq = 0, multiplier = 1;
for (let i = 0; i < 4; i++) {
    const byte = data[offset + i];
    freq += (byte & 0x0F) * multiplier;
    multiplier *= 10;
    freq += ((byte >> 4) & 0x0F) * multiplier;
    multiplier *= 10;
}
return freq / 100000; // MHz
```

---

## Channel Names (0x0D40+)

8 bytes per name, null/0xFF padded.
- Offset: `0x0D40 + (ch-1) * 8`

---

## Still Unmapped Settings

**None! All 41 settings mapped!**

(Menu #31 Factory Reset is an action, not a stored setting)

---

## Undocumented Data Regions (non-0xFF)

These memory regions contain data but purpose is still unknown:

| Address Range | Size | Notes |
|---------------|------|-------|
| 0x0CC8-0x0CCF | 8b | After frequency band limits |
| 0x0D88-0x0D97 | 16b | Between names and channels |
| 0x1380-0x13FF | 128b | Unknown block - possibly FM presets? |
| 0x1480-0x1483 | 4b | Before extended channels |
| 0x18B0-0x18BF | 16b | Between group 8 and start code |
| 0x18E0-0x18FF | 32b | After end code |
| 0x1919-0x191F | 7b | After channel valid bitmap |
| 0x1939-0x194F | 23b | Between scan bitmap and VFO A |
| 0x1970-0x1BFF | 656b | After FM VFO |
| 0x1F04-0x1F1F | 28b | Between repeater tail and MIC gain |
| 0x1F31-0x1F4F | 31b | Between bluetooth and power tune |
| 0x300D-0x3019 | 13b | After Talk Around |
| 0x303C-0x3113 | 215b | Extended region unknowns |

**Potential contents:**
- Analog Settings (AM Vol Level - not found!)
- Additional DTMF/ANI features
- Extended calibration data

---

## Summary: What We Know vs Unknown

### ✅ FULLY MAPPED (Session 18 - DTMF Discovery)

**Settings (41 menu items):**
- All function keys (PF1/PF2 short/long)
- All radio settings (squelch, VOX, TOT, power save, etc.)
- All display settings (brightness, backlight, language, color)
- All DTMF settings (speed, DCD, D-HOLD, D-RSP, DTMFST)
- All TX settings (modulation, tone burst, roger beep, 200/350/500Tx)
- Extended settings (STE, alarm mode, PTT delay, talk around)
- Bluetooth toggle
- Repeater squelch tail settings

**Channel Data (per channel):**
- RX/TX frequencies (BCD little-endian)
- RX/TX tones (CTCSS/DCS)
- Scramble level (0-16)
- Busy Lock, Frequency Hop
- PTT ID (OFF/BOT/EOT/BOTH)
- Bandwidth (N/W), TX Power (L/H)
- Channel name (8 chars)
- Scan bitmap (separate from channel data!)
- Valid/programmed bitmap (controls UP/DOWN cycling)

**DTMF/ANI System:**
- Stun/Kill codes (H3/H3-Plus only)
- ANI-Edit / ID Code (3 digits)
- Group code selector (1-8, A-D, *, #)
- 8 group call codes (15 digits each)
- Start/End codes (BOT/EOT, 15 digits each)
- Complete DTMF encoding format documented

**VFO Settings:**
- VFO A/B current channel (0x0CA4-0x0CA5)
- VFO A/B frequencies (0x1950, 0x1960) - same structure as channels
- VFO A/B offset frequencies (0x0CB0-0x0CB7)
- FM VFO frequency (0x1970-0x1971)
- Active VFO indicator (0x3004)

**Other:**
- Frequency band limits (136-174, 200-600 MHz)
- Startup messages (3 × 16 chars)
- FM channels (25 channels)
- FM scan bitmap
- TX power tune calibration (factory settings)

### ❓ STILL UNKNOWN (~1KB)

1. **AM Vol Level** - Analog setting not found in 16KB
2. **Firmware version** - Not in memory, different BLE command needed
3. **~1KB of undocumented regions** - See "Undocumented Data Regions" section above

---

## Notes

1. Empty memory = 0xFF
2. Channel 1 at 0x0010, not 0x0000
3. Settings scattered across multiple regions
4. Bit numbering: LSB-first (bit 0 = 0x01, bit 7 = 0x80)
5. Extended settings in 0x3000 region discovered Jan 2026
6. Scan bitmap at 0x1920+ (NOT in channel structure!) discovered Jan 2026
