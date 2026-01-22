# Tidradio H3 Plus Web CPS

A web-based Customer Programming Software (CPS) for the Tidradio H3 Plus handheld radio. Program your radio directly from your browser using Web Bluetooth - no apps or cables required.

**[Launch the App](https://jamarju.github.io/tid-h3-plus-cps/app/)**

## Features

- **Read/Write radio memory** via Bluetooth Low Energy
- **199 channels** with frequencies, tones, power levels, names, and more
- **All radio settings** - display, audio, TX, VOX, scan, DTMF, function keys
- **Save/Load** configurations to JSON files
- **Debug hex dump** with color-coded memory map for reverse engineering

Works on Chrome, Edge, and other browsers with Web Bluetooth support. Tested with firmware v1.0.45.

## Screenshots

### Channels Tab
Edit all 199 channels with RX/TX frequencies, CTCSS/DCS tones, power levels, bandwidth, and names.

![Channels](img/channels.png)

### Settings Tab
Configure display, audio, TX settings, VOX, scan options, and DTMF parameters.

![Settings](img/settings.png)

### Debug Tab
Annotated hex dump of the 16KB radio memory. Green = known, red = unknown data, gray = empty.

![Debug](img/debug.png)

## Usage

1. Open the app in Chrome or Edge
2. Turn on your H3 Plus radio
3. Click **Connect** and select your radio from the Bluetooth dialog
4. Click **Read** to download the current configuration
5. Edit channels and settings as needed
6. Click **Write** to upload changes to the radio

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Ctrl+1/2/3 | Switch tabs |
| Ctrl+S | Save to file |
| Ctrl+O | Load from file |
| Arrow keys | Navigate grid |
| Enter | Edit cell / expand dropdown |
| Tab | Next cell |

## Local Development

```bash
# Clone the repo
git clone https://github.com/jamarju/tid-h3-plus-cps.git
cd tid-h3-plus-cps/app

# Start a local server
python -m http.server 8000

# Open http://localhost:8000
```

## Documentation

- [Memory Map](docs/memory-map.md) - Complete 16KB memory layout
- [Settings Reference](docs/settings-reference.md) - All setting values and options
- [BLE Protocol](docs/ble-protocol.md) - Bluetooth communication protocol
- [Handoff](docs/HANDOFF.md) - Development notes and remaining work

## Tech Stack

Pure HTML + CSS + JavaScript. No frameworks, no build step, no dependencies.

## License

MIT
