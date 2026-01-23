# Tidradio H3 Plus Settings Reference

This document maps ALL 42 radio menu settings to their options and current values.

## Complete Radio Menu Settings (1-42)

| Menu # | Setting | Options | Current Value |
|--------|---------|---------|---------------|
| [1] | Squelch Level | off, level 1-9 | Level 4 |
| [2] | Step Freq | 2.5K, 5.0K, 6.25K, 10K, 12.5K, 25K, 50K, 0.5K, 8.33K | 2.5K |
| [3] | VOX Level | off, level 1-5 | OFF |
| [4] | VOX Delay | 1.0s, 2.0s, 3.0s | 1.0s |
| [5] | TOT | off, 30s, 60s, 90s, 120s, 150s, 180s, 210s | 60s |
| [6] | Roger Beep | off, tone 1, tone 2 | Tone 2 |
| [7] | Keypad Beep | off, on | OFF |
| [8] | Power Save | off, level 1(1:1), level 2(1:2), level 3(1:3), level 4(1:4) | Level 1 |
| [9] | Keypad Lock | off, on | OFF |
| [10] | Dual Watch | off, on | ON |
| [11] | Voice | off, on | OFF |
| [12] | Backlight | always on, 5s, 10s, 15s, 30s | 15s |
| [13] | Brightness | 1, 2, 3, 4, 5 | 4 |
| [14] | Power On Display | voltage, message, picture | Message |
| [15] | Display | single, dual, classic | Dual |
| [16] | ANI-Edit | 3 digits (000-999) | 000 |
| [17] | Display Type-A | freq + number, name + number | Name + Number |
| [18] | Display Type-B | freq + number, name + number | Name + Number |
| [19] | DTMFST | off, on | ON |
| [20] | PTT Delay | 100ms, 200ms, 300ms, ..., 3000ms | 100ms |
| [21] | Language | english, chinese, turkish, russian, german, spanish, italian, french | English |
| [22] | Alarm Mode | on site, tx alarm | On Site |
| [23] | STE | off, on | ON |
| [24] | Tone Burst | 1000Hz, 1450Hz, 1750Hz, 2100Hz | 1750Hz |
| [25] | Talk Around | off, on | OFF |
| [26] | FM Interrupt | off, on | OFF |
| [27] | PF1 Short Press | none, fm radio, lamp, tone, alarm, weather, ptt2, od ptt | PTT2 |
| [28] | PF1 Long Press | none, fm radio, lamp, cancel sq, tone, alarm, weather | N/A |
| [29] | PF2 Short Press | none, fm radio, lamp, tone, alarm, weather, ptt2, od ptt | FM Radio |
| [30] | PF2 Long Press | none, fm radio, lamp, cancel sq, tone, alarm, weather | Lamp |
| [31] | Factory Reset | (action, no memory correspondence) | N/A |
| [32] | Breath LED | off, 5s, 10s, 15s, 30s | 5s |
| [33] | MIC Gain | 00, 01, 02, 03, 04, 05, 06, 07, 08, 09 | 05 |
| [34] | DTMF Speed | 80ms, 90ms, 100ms, 110ms, 120ms, 130ms, 140ms, 150ms | 110ms |
| [35] | DCD | off, on | OFF |
| [36] | D-HOLD | off, 5s, 10s, 15s | OFF |
| [37] | D-RSP | null, ring, reply, both | Null |
| [38] | Modulation | fm, am | FM |
| [39] | 200Tx | off, on | OFF |
| [40] | 350Tx | off, on | OFF |
| [41] | 500Tx | off, on | OFF |
| [42] | Menu Color | blue, red, green, yellow, purple, orange, lightblue, cyan, gray, darkblue, lightgreen, brown, pink, B.red, G.blue, L.gray, LG.blue, LB.blue | Blue |

---

## Setting Descriptions

| Setting | Description |
|---------|-------------|
| STE [23] | Squelch Tail Elimination - removes the burst of noise when transmission ends |
| Tone Burst [24] | Sends a tone at start of TX to open repeater squelch |
| Talk Around [25] | Bypass repeater offset, transmit on RX frequency directly |
| FM Interrupt [26] | Allow FM radio to interrupt when receiving signal |
| DCD [35] | Data Carrier Detect - for data modes |
| D-HOLD [36] | DTMF hold time |
| D-RSP [37] | DTMF response mode |
| 200Tx/350Tx/500Tx [39-41] | TX permission for specific frequency ranges |

---

## VERIFIED Memory Offsets (Session 3 - Discovery Procedure)

**Only trust these!** Confirmed by changing setting on radio and comparing memory dumps:

| Setting | Offset | Encoding |
|---------|--------|----------|
| PF1 Short Press [27] | 0xC91 | 0=NONE, 1=FM, 2=LAMP, 3=TONE, 4=ALARM, 5=WEATHER, 7=PTT2, 8=OD PTT |
| PF2 Short Press [29] | 0xC92 | Same encoding as PF1 |
| PF2 Long Press [30] | 0xC95 | Same encoding as PF1 |
| TOT [5] | 0xCAA | 0=off, 1=30s, 2=60s, 3=90s, 4=120s, 5=150s, 6=180s, 7=210s |
| Breath LED [32] | 0xCAF upper nibble | 0=off, 1=5s, 2=10s, 3=15s, 4=30s |
| MIC Gain [33] | 0x1F20 | 0-9 |

---

## UNVERIFIED - Assumed from earlier sessions (may be wrong!)

These were mapped in earlier sessions but NOT verified with discovery procedure:

| Setting | Offset | Encoding | Notes |
|---------|--------|----------|-------|
| Squelch Level [1] | 0xCA9 | 0=off, 1-9=level | Needs verification |
| VOX Level [3] | 0xCA7 | 0=off, 1-5=level | Needs verification |
| VOX Delay [4] | 0xCA8 | 0=1.0s, 1=2.0s, 2=3.0s | Needs verification |
| Keypad Beep [7] | 0xCAB bit 2 | bit=0 off, bit=1 on | Needs verification |
| Power Save [8] | 0xCAC | 0=off, 1-4=level | Needs verification |
| Keypad Lock [9] | 0xCAB bit 0 | bit=0 off, bit=1 on | Needs verification |
| Dual Watch [10] | 0xCAB bit 1 | bit=0 off, bit=1 on | Needs verification |
| Voice [11] | 0xC90 | 0=off, 1=on | Needs verification |
| Backlight [12] | 0xCAD | 0=always, 1=5s, 2=10s, 3=15s, 4=30s | Needs verification |
| Brightness [13] | 0xC9B | 0-indexed (0=1, 1=2...) | Needs verification |
| Display Type-A [17] | 0xC9D | 0=freq+num, 1=name+num | Needs verification |
| PF1 Long Press [28] | 0xC93 | Same as PF1 Short | Needs verification |

---

## Settings NOT Yet Mapped

These settings need memory offset discovery:

- Step Freq [2]
- Roger Beep [6] - **0xCAA was WRONG (that's TOT!)**
- Power On Display [14]
- Display [15]
- ANI-Edit [16]
- Display Type-B [18]
- DTMFST [19]
- PTT Delay [20]
- Language [21]
- Alarm Mode [22]
- STE [23]
- Tone Burst [24]
- Talk Around [25]
- FM Interrupt [26]
- DTMF Speed [34]
- DCD [35]
- D-HOLD [36]
- D-RSP [37]
- Modulation [38]
- 200Tx/350Tx/500Tx [39-41]
- Menu Color [42]

---

## Memory Regions

Settings are spread across multiple memory regions:

**0xC90-0xC9F Area:**
- 0xC90: Voice [11] (unverified)
- 0xC91: **PF1 Short Press [27]** ✓ VERIFIED
- 0xC92: **PF2 Short Press [29]** ✓ VERIFIED
- 0xC93: PF1 Long Press [28] (unverified)
- 0xC94: ??? (NOT PF2 Long Press!)
- 0xC95: **PF2 Long Press [30]** ✓ VERIFIED
- 0xC9B: Brightness [13] (unverified)
- 0xC9D: Display Type-A [17] (unverified)

**0xCA0-0xCAF Area:**
- 0xCA7: VOX Level [3] (unverified)
- 0xCA8: VOX Delay [4] (unverified)
- 0xCA9: Squelch Level [1] (unverified)
- 0xCAA: **TOT [5]** ✓ VERIFIED (was wrongly mapped as Roger Beep!)
- 0xCAB: Flags byte (unverified)
- 0xCAC: Power Save [8] (unverified)
- 0xCAD: Backlight [12] (unverified)
- 0xCAF: Upper nibble = **Breath LED [32]** ✓ VERIFIED, Lower nibble = unknown

**0x1F00-0x1F40 Area:** (far from main settings!)
- 0x1F20: **MIC Gain [33]** ✓ VERIFIED

**Other areas TBD** - Roger Beep, remaining settings need discovery

---

## Non-Menu Settings (Submenu/Hidden)

These settings are not part of the main 1-42 menu system but are accessible through submenus.

### Scan Settings (Submenu)

| Setting | Memory Location | Options | Encoding |
|---------|----------------|---------|----------|
| Scan Mode | 0x0CA1 bits 6-7 | TO, CO, SE | 0b00=TO, 0b01=CO, 0b10=SE |
| Scan Hang Time | 0x1F2F | 0.5s, 1.0s, 1.5s, ..., 9.5s, 10.0s | (seconds * 2) - 1 (values 0-19) |
| Scan Freq Range Upper | 0x1F2B-0x1F2C | Numeric (MHz) | 16-bit little-endian |
| Scan Freq Range Lower | 0x1F2D | Numeric (MHz) | 8-bit |
