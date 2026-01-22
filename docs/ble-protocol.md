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
```
