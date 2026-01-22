# Tidradio H3 Plus BLE Protocol

## Connection Details

```javascript
SERVICE_UUID: 0xFF00
NOTIFY_UUID: 0xFF01  // Receive
WRITE_UUID: 0xFF02   // Send
```

## Handshake Sequence

```javascript
AT+BAUD?\r\n
[0x50,0x56,0x4F,0x4A,0x48,0x5C,0x14] // "PVOJH\x5c\x14"
[0x02]
[0x06]
```

## Read Command

```javascript
// Read 32 bytes at address:
[0x52, addrHi, addrLo, 0x20]

// Response format:
[0x57, addrHi, addrLo, len, ...data]  // 'W' + address + length + payload
```

## Write Command

**Discovered via ODMaster console capture (January 2026)**

### Packet Format

```javascript
// Write 32 bytes at address:
[0x57, addrHi, addrLo, 0x20, ...data, checksum]

// Checksum = sum of all data bytes, mod 256 (lower byte only)
```

### Write Handshake Sequence

```
← 06              (wait for ready)
→ 02              (request write mode)
← P31183ffff      (model string response)
→ 06              (acknowledge)
← 06              (ready for data)
→ W packets...    (with checksum)
← 06              (ACK after each packet)
```

### Checksum Calculation

```javascript
let checksum = 0;
for (let i = 0; i < data.length; i++) {
    checksum = (checksum + data[i]) & 0xFF;
}
```

Examples:
- All 0xFF data (32 bytes): checksum = `0xE0` (32×0xFF = 0x1FE0, lower byte = E0)
- Channel data ending `...0800`: checksum = `0x82`

### ODMaster Console Capture

Captured from ODMaster writing to radio. Chinese labels translated to English.

```
Notifications started
AT Notifications started
AT decodedValue: 43
e.target.value: 2b4e414d453a2054442d48332d506c75730d0a4f4b
Received data: +NAME: TD-H3-Plus OK

AT decodedValue: 43
e.target.value: 2b424155443a20393630306270730d0a4f4b
Received data: +BAUD: 9600bps OK

Channel data refresh complete, processed 199 channels (信道数据刷新完成，共处理 199 个信道)
Channel data formatting complete, processed 199 channels (信道数据格式化完成，共处理 199 个信道)

0 Received: 06                           (接收)
  Send: 02                               (发送)
1 Received: 503331313833ffff             (P31183 - model string)
  Send: 06
2 Received: 06
  Send: 57000020FFFFFFFF...2506604425066044700670060000080082
3 Received: 06
  Send: 5700202075186044751860447006700600000800...3E
4 Received: 06
  Send: 570040207543604475436044700670060000080025566044...DE
...
(continues for all 16KB in 32-byte chunks)
...
172 Received: 06
```

### Write Address Ranges

**IMPORTANT:** ODMaster does NOT write all 16KB! It writes specific ranges with gaps.
Writing to unmapped areas may cause the radio to not ACK.

```javascript
// Exact ranges ODMaster writes (verified January 2026):
[0x0000, 0x13C0],  // Channels (0x0010-0x0C8F), names (0x0D40+), settings (0x0C90+)
[0x1800, 0x18E0],  // Config area 1 (ODMaster skips 0x18E0)
[0x1900, 0x1980],  // Scan bitmap at 0x1920-0x1938 (ODMaster skips 0x1980+)
[0x1C00, 0x1C40],  // Startup messages (0x1C00, 0x1C10, 0x1C20)
[0x1F20, 0x1F40],  // Menu color at 0x1F2A, MIC gain, etc.
```

**Gaps that are NOT written:**
- 0x13C0-0x17FF
- 0x18E0-0x18FF
- 0x1980-0x1BFF
- 0x1C40-0x1F1F
- 0x1F40-0x3FFF

### Key Observations

1. **ACK (0x06)** is received after every write packet - must wait for it
2. **Checksum byte** appended to end of each packet
3. **Model string** "P31183" returned during handshake (possibly firmware/hardware ID)
4. **Chinese log labels**: 接收 = "Received", 发送 = "Send"
5. **Write uses same address format as read responses** (0x57 'W' prefix)
6. **Write ranges have gaps** - must match ODMaster's exact ranges or radio may reject
