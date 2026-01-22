# Tidradio H3 Plus Memory Map

**Last Updated:** January 22, 2026
**Total Memory:** 16KB (0x0000-0x3FFF), but radio reports 100% at ~8KB

---

## Overview - Populated Regions

Based on actual memory scan (non-0xFF bytes):

| Region | Address Range | Size | Description |
|--------|---------------|------|-------------|
| Channels (partial) | 0x0010-0x00BF | ~176b | First channels |
| Unknown | 0x00A0-0x00BF | ~32b | Unknown data |
| Function Keys | 0x0C90-0x0C9D | 14b | PF1/PF2, brightness |
| Main Settings | 0x0CA0-0x0CB7 | 24b | Core radio settings |
| Settings cont'd | 0x0CC0-0x0CD3 | 20b | Additional settings |
| Channel Names | 0x0D40-0x0D97 | ~88b | First names |
| Unknown | 0x1380-0x13FF | 128b | Unknown block |
| Channels cont'd | 0x1480-0x17FF | 896b | More channel data |
| ANI/ID Block | 0x1820-0x182F | 16b | ANI edit, IDs |
| Secondary Settings | 0x1900-0x1F3F | ~1.5KB | MIC gain, language, display |
| **Extended Settings** | 0x3000-0x3113 | ~275b | STE, PTT Delay, more |

**Key Finding:** Settings above 0x2000 exist in 0x3000 region!

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

### 0x0CA1 - Flags B
| Bit | Setting | Menu # | Values |
|-----|---------|--------|--------|
| 0 | Voice | [11] | 0=off, 1=on |
| 2 | Keypad Beep | [7] | 0=off, 1=on |
| 4 | Keypad Lock | [9] | 0=off, 1=on |

### 0x0CA2 - Flags C
| Bit | Setting | Menu # | Values |
|-----|---------|--------|--------|
| 2 | Display Type-A | [17] | 0=freq+num, 1=name+num |
| 3 | FM Interrupt | [26] | 0=off, 1=on |
| 4-5 | Tone Burst | [24] | (data>>4)&0x03: 0=1000Hz, 1=1450Hz, 2=1750Hz, 3=2100Hz |

### 0x0CA3 - Flags D
| Bit | Setting | Menu # | Values |
|-----|---------|--------|--------|
| 2 | Dual Watch | [10] | 0=off, 1=on |
| 4 | Display Type-B | [18] | 0=freq+num, 1=name+num |
| 6-7 | Power On Display | [14] | 0=voltage, 1=message, 2=picture |

---

## Settings Block 3: Direct Values (0x0CA7-0x0CAF)

| Offset | Setting | Menu # | Encoding |
|--------|---------|--------|----------|
| 0x0CA7 | VOX Level | [3] | 0=off, 1-5=level |
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
| 0x0CAF | Breath LED | [32] | Upper nibble (data>>4)&0x0F: 0=off, 1=5s, 2=10s, 3=15s, 4=30s |

---

## Startup Messages (0x1C00-0x1C2F)

| Offset | Size | Description |
|--------|------|-------------|
| 0x1C00 | 16 | Message 1 (null-padded string) |
| 0x1C10 | 16 | Message 2 (null-padded string) |
| 0x1C20 | 16 | Message 3 (null-padded string) |

Used when Power On Display [14] = "message"

---

## Settings Block 4: ANI/ID (0x1820-0x182F)

| Offset | Setting | Menu # | Encoding |
|--------|---------|--------|----------|
| 0x1820-0x1822 | ANI-Edit | [16] | 3 bytes, one digit each (0-9) |

---

## Settings Block 5: Secondary (0x1F20-0x1F3F)

| Offset | Setting | Menu # | Encoding |
|--------|---------|--------|----------|
| 0x1F20 | MIC Gain | [33] | 0-9 |
| 0x1F28 | Language | [21] | 0=en, 1=cn, 2=tr, 3=ru, 4=de, 5=es, 6=it, 7=fr |
| 0x1F29 | Display | [15] | 0=single, 1=dual, 2=classic |
| 0x1F2A | Menu Color | [42] | 0=blue,1=red,2=green,3=yellow,4=purple,5=orange,6=lightblue,7=cyan,8=gray,9=darkblue,10=lightgreen,11=brown,12=pink,13=B.red,14=G.blue,15=L.gray,16=LG.blue,17=LB.blue |

---

## Settings Block 6: Extended (0x3000+) - NEW!

| Offset | Setting | Menu # | Encoding |
|--------|---------|--------|----------|
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
| 14-15 | 2 | Unknown | Usually 0x00 |

### Flags 1 (byte 12)
- Bit 1 (0x02): Bandwidth (0=Narrow, 1=Wide)
- Bit 2 (0x04): TX Power (0=Low, 1=High)
- Bit 4 (0x10): Busy Lock (0=Off, 1=On)
- Bit 7 (0x80): Frequency Hop (0=Off, 1=On)

### Flags 2 (byte 13)
- Bit 0 (0x01): Scan Add (0=On, 1=Off) - inverted!
- Bit 2 (0x04): PTT ID (0=Off, 1=On)
- Bit 3 (0x08): Scramble (0=Off, 1=On)

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

These memory regions contain data but purpose is unknown:

| Address Range | Size | Notes |
|---------------|------|-------|
| 0x00A0-0x00A7 | 8b | Early header area |
| 0x00AC-0x00B7 | 12b | Early header area |
| 0x00BC-0x00BF | 4b | Early header area |
| 0x0CC0-0x0CC7 | 8b | After main settings |
| 0x0CD0-0x0CD3 | 4b | After main settings |
| 0x0D88-0x0D97 | 16b | Between names and channels |
| 0x1380-0x13FF | 128b | Unknown block |
| 0x1480-0x1483 | 4b | Before extended channels |
| 0x180F | 1b | Before ANI area |
| 0x181F | 1b | Before ANI area |
| 0x1823-0x1828 | 6b | After ANI (3 extra bytes) |
| 0x182A-0x182F | 6b | After ANI area |
| 0x183F, 0x184F, 0x185F, 0x186F, 0x187F, 0x188F, 0x189F | 1b each | Scattered single bytes |
| 0x18AF-0x18BF | 17b | Unknown |
| 0x18CF | 1b | Unknown |
| 0x18DF-0x18FF | 33b | Unknown |
| 0x1901-0x191F | 31b | Unknown |
| 0x1921-0x1957 | 55b | Unknown |
| 0x195C-0x1967 | 12b | Unknown |
| 0x196C-0x1F1F | ~1.4KB | Large unknown block (excluding 0x1C00-0x1C2F messages) |
| 0x1F2B-0x1F3F | 21b | After menu color |
| 0x3004 | 1b | Before extended settings |
| 0x300D-0x3019 | 13b | After Talk Around |
| 0x303C | 1b | Unknown |
| 0x3064-0x306B | 8b | Unknown |
| 0x307C-0x3113 | 152b | Large unknown block |

**Potential contents:** Additional channel flags, DTMF codes, scan lists, FM presets, or Analog Settings (AM Vol Level was not found in 16KB scan)

---

## Notes

1. Empty memory = 0xFF
2. Channel 1 at 0x0010, not 0x0000
3. Settings scattered across multiple regions
4. Bit numbering: LSB-first (bit 0 = 0x01, bit 7 = 0x80)
5. Extended settings in 0x3000 region discovered Jan 2026
