# Discover New Settings

Interactive protocol for discovering memory offsets of unknown radio settings.

## Prerequisites

- Radio connected via Web Bluetooth
- App open in Chrome with memory loaded (Read button clicked)
- User has identified a setting to discover on the physical radio

## Protocol

| Step | Who | Action |
|------|-----|--------|
| 1 | Human | Connect to radio, click **Read**, tell Claude "ready" |
| 2 | **Claude** | Run baseline capture: `window.memBefore = Array.from(App.rawData)` |
| 3 | Human | Change **ONE** setting on physical radio |
| 4 | Human | Click **Read** in app, tell Claude "done" |
| 5 | **Claude** | Run comparison script, report changed offsets |
| 6 | Both | Interpret changes using `docs/settings-reference.md` |
| 7 | **Claude** | Update memory-map.md and code if offset discovered |

## Comparison Script

```javascript
var before = window.memBefore;
var after = App.rawData;
var changes = [];
for(var i=0; i<after.length; i++) {
  if(before[i] !== after[i]) {
    changes.push("0x"+i.toString(16).toUpperCase().padStart(4,'0')+": "+before[i]+" -> "+after[i]);
  }
}
window.memBefore = Array.from(after); // auto-save for next iteration
changes.length ? changes.join("\n") : "No changes detected"
```

## Tips

- Change **only one setting** at a time for clean results
- Some settings may affect multiple bytes (multi-byte values, bitfields)
- Check `docs/settings-reference.md` to map option index to actual value
- Unknown red bytes in Debug tab are good candidates to investigate
- VFO frequencies are stored as 32-bit integers (4 bytes each)
