# Handoff Document for Tidradio H3 Plus Web CPS

**Last Updated:** January 22, 2026 (Session 6)
**Status:** ALL 41 SETTINGS MAPPED! Code updated. Write untested.

---

## Project Overview

Web-based CPS for Tidradio H3 Plus radio using Web Bluetooth. Pure HTML+CSS+JS, no frameworks.

**Key Files:**
- `index.html` - Main UI with tabs (Channels, Settings)
- `js/ble.js` - BLE protocol, `parseSettings()` and `encodeSettings()` fully updated
- `js/settings.js` - Settings form handling, dropdown options
- `docs/settings-reference.md` - **SOURCE OF TRUTH** for option values!
- `docs/memory-map.md` - Complete memory layout documentation

**Server:** `python -m http.server 8000` then open http://localhost:8000

---

## Discovery Procedure (KEEP THIS!)

**Human + Claude Agent workflow for discovering new setting offsets:**

| Step | Who | Action |
|------|-----|--------|
| 1 | Human | Connect to radio via app, click **Read** |
| 2 | Human | Tell Claude "ready" |
| 3 | **Claude** | Run: `window.memBefore = Array.from(App.rawData)` |
| 4 | Human | Change ONE setting on the physical radio |
| 5 | Human | Click **Read** in the app, tell Claude "done" |
| 6 | **Claude** | Run comparison script (below), report offset |

**Comparison script (Claude runs this):**
```javascript
var before = window.memBefore; var after = App.rawData; var changes = [];
for(var i=0; i<after.length; i++) if(before[i] !== after[i])
  changes.push("0x"+i.toString(16).toUpperCase()+": "+before[i]+" -> "+after[i]);
window.memBefore = Array.from(after); // auto-save for next iteration
changes.length ? changes.join(", ") : "No changes detected"
```

**IMPORTANT:** `docs/settings-reference.md` is the **source of truth** for option values!
When discovering a setting, look up the Options column there to map index→value correctly.

**Bit numbering:** Standard LSB-first. Bit 0 = LSB (0x01), Bit 7 = MSB (0x80).

---

## Memory Layout Summary

```
0x001F: Modulation [38]

0x0C90-0x0C9F: Function keys block
  - 0xC91: PF1 Short [27]
  - 0xC92: PF2 Short [29]
  - 0xC94: PF1 Long [28] (NOT 0xC93!)
  - 0xC95: PF2 Long [30]
  - 0xC98: DCD [35]
  - 0xC99: D-HOLD [36]
  - 0xC9A: D-RSP [37]
  - 0xC9B: DTMF Speed [34]
  - 0xC9D: Brightness [13] (inverted)

0xCA0-0xCAF: Main settings block
  - 0xCA0: bit 1=DTMFST [19]
  - 0xCA1: bit 0=Voice[11], bit 2=Keypad Beep[7], bit 4=Keypad Lock[9]
  - 0xCA2: bit 2=Display Type-A[17], bit 3=FM Interrupt[26], bits 4-5=Tone Burst[24]
  - 0xCA3: bit 2=Dual Watch[10], bit 4=Display Type-B[18], bits 6-7=Power On Display[14]
  - 0xCA7: VOX Level [3]
  - 0xCA8: upper nibble = Step Freq [2]
  - 0xCA9: Squelch [1]
  - 0xCAA: TOT [5]
  - 0xCAB: bits 6-7=Roger Beep[6], bit 4=200Tx[39], bit 3=350Tx[40], bit 2=500Tx[41]
  - 0xCAC: Power Save [8]
  - 0xCAD: Backlight [12]
  - 0xCAE: VOX Delay [4]
  - 0xCAF: upper nibble = Breath LED [32]

0x1820-0x1822: ANI-Edit [16] (3 digits)

0x1C00-0x1C2F: Startup Messages (when Power On Display = "message")
  - 0x1C00: Msg1 (16 bytes)
  - 0x1C10: Msg2 (16 bytes)
  - 0x1C20: Msg3 (16 bytes)

0x1F20-0x1F2A: Secondary settings
  - 0x1F20: MIC Gain [33]
  - 0x1F28: Language [21]
  - 0x1F29: Display [15]
  - 0x1F2A: Menu Color [42]

0x3000-0x3113: Extended settings (16KB read required!)
  - 0x300A: bit 7=STE[23], bits 4-5=Alarm Mode[22]
  - 0x300B: lower 6 bits = PTT Delay[20], value=(raw+1)*100ms
  - 0x300C: Talk Around [25]
```

---

## Key Findings

1. **16KB read required** - Settings exist in 0x3000 region
2. **Short vs Long press have DIFFERENT options** - Long has "Cancel SQ", no PTT2/OD PTT
3. **PF1 Long is 0xC94, NOT 0xC93** - There's a gap
4. **Many settings are packed in bit fields** - 0xCA0-0xCA3, 0xCAB, 0x300A
5. **Brightness is inverted** - display = 5 - memory

---

## Remaining Work

1. **Test Write functionality** - parseSettings() and encodeSettings() are updated but untested
2. **Discover additional settings** - Analog Settings (AM Vol Level) not found in 16KB
3. **Add UI elements** - Many new settings need form fields in index.html
4. **Firmware version** - Not in memory dump, likely retrieved via different command

---

## BLE Protocol

```javascript
SERVICE_UUID: 0xFF00
NOTIFY_UUID: 0xFF01  // Receive
WRITE_UUID: 0xFF02   // Send

// Handshake sequence:
AT+BAUD?\r\n
[0x50,0x56,0x4F,0x4A,0x48,0x5C,0x14] // "PVOJH\x5c\x14"
[0x02]
[0x06]
// Then read chunks: [0x52, addrHi, addrLo, 0x20]
```
