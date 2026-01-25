/**
 * ble.js - Web Bluetooth communication for Tidradio H3 Plus
 */

const BLE = {
    // BLE UUIDs
    SERVICE_UUID: 0xFF00,
    CHAR_NOTIFY_UUID: 0xFF01,
    CHAR_WRITE_UUID: 0xFF02,

    // Protocol constants
    MEMORY_START: 0x0000,
    MEMORY_END: 0x4000,  // 16KB
    CHUNK_SIZE: 32,
    TOTAL_CHANNELS: 199,

    // Write ranges by mode
    WRITE_RANGES_ALL: [
        [0x0000, 0x13C0],  // Channels, names, settings
        [0x1800, 0x18E0],  // DTMF/ANI system
        [0x1900, 0x1980],  // Channel valid + scan bitmaps + VFO frequencies
        [0x1C00, 0x1C40],  // Startup messages
        [0x1F00, 0x1F40],  // Repeater tail + secondary settings + bluetooth
        [0x3000, 0x3020],  // Extended: active VFO, STE, alarm, PTT delay, talk around
    ],

    WRITE_RANGES_SETTINGS: [
        [0x0000, 0x0020],  // Header with modulation at 0x1F
        [0x0C90, 0x0CD0],  // Function keys + main settings + VFO offsets + TX band limits
        [0x1800, 0x18E0],  // DTMF/ANI system (stun, kill, groups, BOT/EOT)
        [0x1950, 0x1980],  // VFO A/B records (0x1950-0x196F) + FM VFO (0x1970-0x1971)
        [0x1C00, 0x1C40],  // Startup messages
        [0x1F00, 0x1F40],  // Repeater tail + secondary settings + bluetooth
        [0x3000, 0x3020],  // Extended settings (active VFO, STE, alarm, PTT delay, talk around)
    ],

    WRITE_RANGES_CHANNELS: [
        [0x0000, 0x0C80],  // Header + 199 channels × 16 bytes (aligned to 32)
        [0x0D40, 0x1380],  // Channel names (199 × 8 bytes, rounded up to 32-byte boundary)
        [0x1900, 0x1940],  // Channel valid bitmap + Scan bitmap (combined, both 32-byte aligned)
    ],

    WRITE_RANGES_FM: [
        [0x0CA0, 0x0CB0],  // FM mode flag at 0xCA2 bit 7
        [0x0CD0, 0x0D40],  // 25 FM channels × 4 bytes
        [0x1940, 0x1980],  // FM scan bitmap + FM VFO frequency
    ],

    // State
    device: null,
    server: null,
    service: null,
    notifyChar: null,
    writeChar: null,
    connected: false,

    // Read state
    readBuffer: null,
    readResolve: null,
    readReject: null,
    expectedAddress: 0,
    progressCallback: null,

    // Write state (for ACK handling)
    writeAckResolve: null,
    writeAckReject: null,

    /**
     * Connect to the radio via BLE
     * @returns {Promise<boolean>} Connection success
     */
    async connect() {
        try {
            // Request device
            this.device = await navigator.bluetooth.requestDevice({
                filters: [{ namePrefix: 'TD-H3' }],
                optionalServices: [this.SERVICE_UUID]
            });

            this.device.addEventListener('gattserverdisconnected', () => {
                this.handleDisconnect();
            });

            // Connect to GATT server
            this.server = await this.device.gatt.connect();

            // Get service
            this.service = await this.server.getPrimaryService(this.SERVICE_UUID);

            // Get characteristics
            this.notifyChar = await this.service.getCharacteristic(this.CHAR_NOTIFY_UUID);
            this.writeChar = await this.service.getCharacteristic(this.CHAR_WRITE_UUID);

            // Start notifications
            await this.notifyChar.startNotifications();
            this.notifyChar.addEventListener('characteristicvaluechanged',
                (e) => this.handleNotification(e));

            this.connected = true;
            return true;
        } catch (err) {
            console.error('BLE connect error:', err);
            this.connected = false;
            throw err;
        }
    },

    /**
     * Disconnect from the radio
     */
    disconnect() {
        if (this.device && this.device.gatt.connected) {
            this.device.gatt.disconnect();
        }
        this.handleDisconnect();
    },

    /**
     * Handle disconnection
     */
    handleDisconnect() {
        this.connected = false;
        this.device = null;
        this.server = null;
        this.service = null;
        this.notifyChar = null;
        this.writeChar = null;

        if (typeof this.onDisconnect === 'function') {
            this.onDisconnect();
        }
    },

    /**
     * Handle notification from radio
     * @param {Event} event - Characteristic value changed event
     */
    handleNotification(event) {
        const data = new Uint8Array(event.target.value.buffer);

        // Handle ACK response (0x06) for write operations
        if (data.length === 1 && data[0] === 0x06 && this.writeAckResolve) {
            const resolve = this.writeAckResolve;
            this.writeAckResolve = null;
            this.writeAckReject = null;
            resolve(true);
            return;
        }

        if (this.readBuffer && this.readResolve) {
            // Check if this is a read response (starts with 'W')
            if (data[0] === 0x57) { // 'W'
                const addrHi = data[1];
                const addrLo = data[2];
                const addr = (addrHi << 8) | addrLo;
                const len = data[3];
                const payload = data.slice(4, 4 + len);

                // Store data at correct offset
                this.readBuffer.set(payload, addr);

                // Update progress
                if (this.progressCallback) {
                    const progress = (addr + len) / this.MEMORY_END;
                    this.progressCallback(Math.min(progress, 1));
                }

                // Check if read complete
                if (addr + len >= this.MEMORY_END) {
                    const resolve = this.readResolve;
                    const buffer = this.readBuffer;
                    this.readBuffer = null;
                    this.readResolve = null;
                    this.readReject = null;
                    resolve(buffer);
                }
            }
        }
    },

    /**
     * Write data to the radio
     * @param {Uint8Array} data - Data to write
     */
    async write(data) {
        if (!this.writeChar) {
            throw new Error('Not connected');
        }
        await this.writeChar.writeValue(data);
    },

    /**
     * Send string as bytes
     * @param {string} str - String to send
     */
    async writeString(str) {
        const encoder = new TextEncoder();
        await this.write(encoder.encode(str));
    },

    /**
     * Delay helper
     * @param {number} ms - Milliseconds to delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Wait for ACK (0x06) from radio with timeout
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<boolean>} True if ACK received
     */
    waitForAck(timeout = 2000) {
        return new Promise((resolve, reject) => {
            this.writeAckResolve = resolve;
            this.writeAckReject = reject;

            setTimeout(() => {
                if (this.writeAckResolve) {
                    this.writeAckResolve = null;
                    this.writeAckReject = null;
                    reject(new Error('ACK timeout'));
                }
            }, timeout);
        });
    },

    /**
     * Read all memory from the radio
     * @param {Function} onProgress - Progress callback (0-1)
     * @returns {Promise<Uint8Array>} Memory contents
     */
    async readMemory(onProgress) {
        if (!this.connected) {
            throw new Error('Not connected');
        }

        this.progressCallback = onProgress;
        this.readBuffer = new Uint8Array(this.MEMORY_END);

        return new Promise(async (resolve, reject) => {
            this.readResolve = resolve;
            this.readReject = reject;

            try {
                // Step 1: Send AT+BAUD?
                await this.writeString('AT+BAUD?\r\n');
                await this.delay(100);

                // Step 2: Send handshake PVOJH\x5c\x14
                await this.write(new Uint8Array([0x50, 0x56, 0x4F, 0x4A, 0x48, 0x5C, 0x14]));
                await this.delay(100);

                // Step 3: Send mode 0x02
                await this.write(new Uint8Array([0x02]));
                await this.delay(50);

                // Step 4: Send mode 0x06
                await this.write(new Uint8Array([0x06]));
                await this.delay(50);

                // Step 5: Read memory in chunks
                for (let addr = this.MEMORY_START; addr < this.MEMORY_END; addr += this.CHUNK_SIZE) {
                    const addrHi = (addr >> 8) & 0xFF;
                    const addrLo = addr & 0xFF;

                    // R + addrHi + addrLo + 0x20 (32 bytes)
                    await this.write(new Uint8Array([0x52, addrHi, addrLo, this.CHUNK_SIZE]));
                    await this.delay(30);
                }

            } catch (err) {
                this.readBuffer = null;
                this.readResolve = null;
                this.readReject = null;
                reject(err);
            }
        });
    },

    /**
     * Write memory to the radio
     * Based on ODMaster protocol analysis - requires checksum and ACK waiting
     * @param {Uint8Array} data - Memory contents to write
     * @param {Function} onProgress - Progress callback (0-1)
     * @param {string} mode - Write mode: 'all', 'settings', or 'channels'
     */
    async writeMemory(data, onProgress, mode = 'all') {
        if (!this.connected) {
            throw new Error('Not connected');
        }

        // Handshake sequence (from ODMaster capture)
        // Step 1: AT+BAUD query
        await this.writeString('AT+BAUD?\r\n');
        await this.delay(100);

        // Step 2: Send PVOJH handshake
        await this.write(new Uint8Array([0x50, 0x56, 0x4F, 0x4A, 0x48, 0x5C, 0x14]));
        await this.delay(100);

        // Step 3: Wait for initial ACK (0x06), then send 0x02
        // The radio sends 0x06 when ready
        try {
            await this.waitForAck(1000);
        } catch (e) {
            // Radio might already be ready, continue
        }
        await this.write(new Uint8Array([0x02]));
        await this.delay(50);

        // Step 4: Wait for model string response, then send ACK
        // Radio responds with model info (e.g., "P31183")
        await this.delay(100);
        await this.write(new Uint8Array([0x06]));

        // Step 5: Wait for ready ACK before starting writes
        try {
            await this.waitForAck(1000);
        } catch (e) {
            // Continue anyway
        }

        // Step 6: Write memory in chunks with checksum
        // Select write ranges based on mode
        let writeRanges;
        switch (mode) {
            case 'settings':
                writeRanges = this.WRITE_RANGES_SETTINGS;
                console.log('Write mode: Settings only');
                break;
            case 'channels':
                writeRanges = this.WRITE_RANGES_CHANNELS;
                console.log('Write mode: Channels only');
                break;
            case 'fm':
                writeRanges = this.WRITE_RANGES_FM;
                console.log('Write mode: FM Radio only');
                break;
            default:
                writeRanges = this.WRITE_RANGES_ALL;
                console.log('Write mode: All');
        }

        let totalBytes = 0;
        for (const [start, end] of writeRanges) {
            totalBytes += end - start;
        }

        let bytesWritten = 0;
        for (const [rangeStart, rangeEnd] of writeRanges) {
            for (let addr = rangeStart; addr < rangeEnd && addr < data.length; addr += this.CHUNK_SIZE) {
                const addrHi = (addr >> 8) & 0xFF;
                const addrLo = addr & 0xFF;
                const actualLen = Math.min(this.CHUNK_SIZE, rangeEnd - addr, data.length - addr);
                const chunk = data.slice(addr, addr + actualLen);

                // Always send 32 bytes - pad with 0xFF if needed (protocol requires 0x20)
                const paddedChunk = new Uint8Array(this.CHUNK_SIZE);
                paddedChunk.fill(0xFF);
                paddedChunk.set(chunk, 0);

                // Calculate checksum on padded data (sum of all 32 bytes, mod 256)
                let checksum = 0;
                for (let i = 0; i < this.CHUNK_SIZE; i++) {
                    checksum = (checksum + paddedChunk[i]) & 0xFF;
                }

                // Packet format: W + addrHi + addrLo + 0x20 + data[32] + checksum
                const packet = new Uint8Array(5 + this.CHUNK_SIZE);
                packet[0] = 0x57; // 'W'
                packet[1] = addrHi;
                packet[2] = addrLo;
                packet[3] = this.CHUNK_SIZE; // Always 0x20 (32)
                packet.set(paddedChunk, 4);
                packet[4 + this.CHUNK_SIZE] = checksum;

                console.log(`Write 0x${addr.toString(16).toUpperCase()}: ${actualLen} bytes (padded to 32), checksum 0x${checksum.toString(16).toUpperCase()}`);
                await this.write(packet);

                // Wait for ACK (0x06) after each packet
                try {
                    await this.waitForAck(2000);
                    console.log(`  ACK received`);
                } catch (e) {
                    console.error(`  NO ACK at 0x${addr.toString(16)}`);
                    throw new Error(`Write failed at address 0x${addr.toString(16)}: no ACK`);
                }

                bytesWritten += actualLen;
                if (onProgress) {
                    onProgress(bytesWritten / totalBytes);
                }
            }
        }
        console.log('Write complete!');
    },

    /**
     * Parse raw memory into channel and settings objects
     * @param {Uint8Array} data - Raw memory data
     * @returns {Object} Parsed data with channels and settings
     */
    parseMemory(data) {
        const channels = [];

        // Channel data structure: 16 bytes per channel
        // First 16 bytes (0x0000-0x000F) are header, channels start at 0x0010
        const CHANNEL_SIZE = 16;
        const CHANNEL_START = 0x0010;
        const NAMES_START = 0x0D40;  // Names stored at offset 3392
        const NAME_SIZE = 8;

        for (let i = 0; i < this.TOTAL_CHANNELS; i++) {
            const channelOffset = CHANNEL_START + (i * CHANNEL_SIZE);
            const nameOffset = NAMES_START + (i * NAME_SIZE);
            channels.push(this.parseChannel(data, channelOffset, nameOffset, i + 1));
        }

        // Settings location (verified by comparing with radio menu values)
        const SETTINGS_START = 0x0CA0;
        const settings = this.parseSettings(data, SETTINGS_START);

        return { channels, settings, rawData: Array.from(data) };
    },

    /**
     * Get an empty channel object with defaults
     * @param {number} channelNum - Channel number (1-199)
     * @returns {Object} Empty channel object
     */
    getEmptyChannel(channelNum) {
        return {
            channel: channelNum,
            rxFreq: 0,
            txFreq: 0,
            frequencyHop: false,
            decode: 'OFF',
            encode: 'OFF',
            txPower: 'HIGH',
            bandwidth: 'W',
            busyLock: false,
            pttId: 'OFF',
            scanAdd: true,
            name: '',
            scramble: 0
        };
    },

    /**
     * Parse a single channel from memory (16 bytes per channel)
     * @param {Uint8Array} data - Raw memory
     * @param {number} offset - Channel data offset
     * @param {number} nameOffset - Channel name offset
     * @param {number} channelNum - Channel number (1-199)
     * @returns {Object} Channel object
     */
    parseChannel(data, offset, nameOffset, channelNum) {
        // Check validity bitmap at 0x1900 (1 bit per channel)
        // Radio only allows cycling to channels with bit=1 in this bitmap
        const validByteOffset = 0x1900 + Math.floor((channelNum - 1) / 8);
        const validBitMask = 1 << ((channelNum - 1) % 8);
        const isValid = !!(data[validByteOffset] & validBitMask);

        // If channel is marked invalid in bitmap, return empty channel
        if (!isValid) {
            return this.getEmptyChannel(channelNum);
        }

        // Check if channel data is empty (all 0xFF) - for files without validity bitmap
        const isEmpty = data[offset] === 0xFF && data[offset + 1] === 0xFF;

        // Frequency stored as little-endian BCD (4 bytes)
        // Example: 25 06 60 44 -> read as LE BCD -> 44600625 -> 446.00625 MHz
        const rxFreq = isEmpty ? 0 : this.decodeBCDFrequency(data, offset);
        const txFreq = isEmpty ? 0 : this.decodeBCDFrequency(data, offset + 4);

        // Bytes 8-9: CTCSS/DCS tones (combined RX/TX tone value)
        const rxTone = (data[offset + 8] | (data[offset + 9] << 8));
        const txTone = (data[offset + 10] | (data[offset + 11] << 8));

        // Bytes 12-14: Channel flags (VERIFIED mapping Jan 2026)
        // Byte 12: Scramble value (0=off, 1-16=level)
        // Byte 13: bit 2=Busy Lock, bit 5=Freq Hop, bits 6-7=PTT ID
        // Byte 14: bit 3=Bandwidth (inverted), bit 4=Power
        const scrambleVal = data[offset + 12] || 0;
        const flags2 = data[offset + 13] || 0;
        const flags3 = data[offset + 14] || 0;

        // PTT ID: bits 6-7 of byte 13 (0=Off, 1=BOT, 2=EOT, 3=BOTH)
        const pttIdVal = (flags2 >> 6) & 0x03;
        const pttIdMap = ['OFF', 'BOT', 'EOT', 'BOTH'];

        // Parse name from separate memory location (8 bytes)
        let name = '';
        if (nameOffset < data.length) {
            for (let i = 0; i < 8; i++) {
                const b = data[nameOffset + i];
                if (b === 0 || b === 0xFF) break;
                name += String.fromCharCode(b);
            }
        }

        // Scan Add is stored in bitmap at 0x1920+, not in channel structure
        // Will be populated separately after parsing all channels
        const scanByteOffset = 0x1920 + Math.floor((channelNum - 1) / 8);
        const scanBitMask = 1 << ((channelNum - 1) % 8);
        const scanAdd = !!(data[scanByteOffset] & scanBitMask);

        return {
            channel: channelNum,
            rxFreq: rxFreq,
            txFreq: txFreq,
            frequencyHop: !!(flags2 & 0x20),        // Byte 13, bit 5
            decode: this.decodeTone(rxTone),
            encode: this.decodeTone(txTone),
            txPower: (flags3 & 0x10) ? 'HIGH' : 'LOW',  // Byte 14, bit 4
            bandwidth: (flags3 & 0x08) ? 'N' : 'W',     // Byte 14, bit 3 (inverted: 1=N, 0=W)
            busyLock: !!(flags2 & 0x04),            // Byte 13, bit 2
            pttId: pttIdMap[pttIdVal],              // Byte 13, bits 6-7
            scanAdd: scanAdd,                       // From bitmap at 0x1920+
            name: name.trim(),
            scramble: scrambleVal                   // Byte 12, value 0-16
        };
    },

    /**
     * Parse VFO record from memory (16 bytes, similar to channel but with offset direction)
     * VFO A: 0x1950-0x195F, VFO B: 0x1960-0x196F
     * Offset values stored separately at 0x0CB0 (A) and 0x0CB4 (B)
     *
     * @param {Uint8Array} data - Raw memory
     * @param {number} offset - VFO record offset (0x1950 or 0x1960)
     * @param {number} offsetValueAddr - Offset frequency address (0x0CB0 or 0x0CB4)
     * @returns {Object} VFO settings object
     */
    parseVFO(data, offset, offsetValueAddr) {
        // RX frequency (bytes 0-3) - TX is calculated from RX ± offset
        const rxFreq = this.decodeBCDFrequency(data, offset);

        // Tones (bytes 8-11)
        const rxTone = (data[offset + 8] | (data[offset + 9] << 8));
        const txTone = (data[offset + 10] | (data[offset + 11] << 8));

        // Scramble (byte 12)
        const scramble = data[offset + 12] || 0;

        // Flags2 (byte 13) - same as channels
        const flags2 = data[offset + 13] || 0;

        // Flags3 (byte 14) - VFO-specific: bits 0-1=offset dir, bit 3=BW, bit 4=power
        const flags3 = data[offset + 14] || 0;

        // Offset direction: bits 0-1 (0=off, 1=-, 2=+)
        const offsetDir = flags3 & 0x03;
        const offsetDirMap = ['OFF', '-', '+'];

        // Offset value from separate location
        const offsetValue = this.decodeBCDFrequency(data, offsetValueAddr);

        return {
            rxFreq: rxFreq,
            rxTone: this.decodeTone(rxTone),
            txTone: this.decodeTone(txTone),
            scramble: scramble,
            busyLock: !!(flags2 & 0x04),           // Byte 13, bit 2 (assumed same as channel)
            bandwidth: (flags3 & 0x08) ? 'N' : 'W', // Byte 14, bit 3
            txPower: (flags3 & 0x10) ? 'HIGH' : 'LOW', // Byte 14, bit 4
            offsetDir: offsetDirMap[offsetDir],
            offset: offsetValue
        };
    },

    /**
     * Decode BCD frequency from 4 bytes (little-endian)
     * @param {Uint8Array} data - Raw memory
     * @param {number} offset - Byte offset
     * @returns {number} Frequency in MHz
     */
    decodeBCDFrequency(data, offset) {
        // Read 4 bytes as little-endian BCD
        // Each byte contains 2 BCD digits
        let freq = 0;
        let multiplier = 1;

        for (let i = 0; i < 4; i++) {
            const byte = data[offset + i];
            const lowNibble = byte & 0x0F;
            const highNibble = (byte >> 4) & 0x0F;

            freq += lowNibble * multiplier;
            multiplier *= 10;
            freq += highNibble * multiplier;
            multiplier *= 10;
        }

        // Convert from 10Hz units to MHz
        return freq / 100000;
    },

    /**
     * Decode CTCSS/DCS tone from 2 bytes (little-endian BCD)
     * @param {number} value - Raw 16-bit tone value
     * @returns {string} Tone string (e.g., 'OFF', '88.5', 'D023N', 'D023I')
     */
    decodeTone(value) {
        if (value === 0 || value === 0xFFFF) return 'OFF';

        const highByte = (value >> 8) & 0xFF;
        const lowByte = value & 0xFF;

        // DCS detection: bit 7 (0x80) indicates DCS
        if (highByte & 0x80) {
            // DCS code - decode as BCD
            const d0 = lowByte & 0x0F;
            const d1 = (lowByte >> 4) & 0x0F;
            const d2 = highByte & 0x0F;
            const dcsCode = d0 + d1 * 10 + d2 * 100;
            // Bit 6 (0x40) indicates inverted DCS
            const suffix = (highByte & 0x40) ? 'I' : 'N';
            return 'D' + dcsCode.toString().padStart(3, '0') + suffix;
        }

        // CTCSS tone - stored as BCD (e.g., 70 06 = 0670 = 67.0 Hz)
        const d0 = lowByte & 0x0F;
        const d1 = (lowByte >> 4) & 0x0F;
        const d2 = highByte & 0x0F;
        const d3 = (highByte >> 4) & 0x0F;
        const toneValue = d0 + d1 * 10 + d2 * 100 + d3 * 1000;
        const toneFreq = toneValue / 10;

        if (toneFreq < 60 || toneFreq > 260) return 'OFF';
        return toneFreq.toFixed(1);
    },

    /**
     * Decode CTCSS/DCS tone value
     * @param {number} type - Tone type (0=OFF, 1=CTCSS, 2=DCS)
     * @param {number} value - Tone index
     * @returns {string} Tone string
     */
    decodeToneValue(type, value) {
        if (type === 0 || value === 0) return 'OFF';

        if (type === 1) {
            // CTCSS tones
            const ctcssTones = [
                '67.0', '69.3', '71.9', '74.4', '77.0', '79.7', '82.5', '85.4',
                '88.5', '91.5', '94.8', '97.4', '100.0', '103.5', '107.2', '110.9',
                '114.8', '118.8', '123.0', '127.3', '131.8', '136.5', '141.3', '146.2',
                '151.4', '156.7', '162.2', '167.9', '173.8', '179.9', '186.2', '192.8',
                '203.5', '206.5', '210.7', '218.1', '225.7', '229.1', '233.6', '241.8',
                '250.3', '254.1'
            ];
            return value <= ctcssTones.length ? ctcssTones[value - 1] : 'OFF';
        }

        if (type === 2) {
            // DCS codes
            const dcsCodes = [
                '023', '025', '026', '031', '032', '036', '043', '047',
                '051', '053', '054', '065', '071', '072', '073', '074',
                '114', '115', '116', '122', '125', '131', '132', '134',
                '143', '145', '152', '155', '156', '162', '165', '172',
                '174', '205', '212', '223', '225', '226', '243', '244',
                '245', '246', '251', '252', '255', '261', '263', '265',
                '266', '271', '274', '306', '311', '315', '325', '331',
                '332', '343', '346', '351', '356', '364', '365', '371',
                '411', '412', '413', '423', '431', '432', '445', '446',
                '452', '454', '455', '462', '464', '465', '466', '503',
                '506', '516', '523', '526', '532', '546', '565', '606',
                '612', '624', '627', '631', '632', '654', '662', '664',
                '703', '712', '723', '731', '732', '734', '743', '754'
            ];
            return value <= dcsCodes.length ? 'D' + dcsCodes[value - 1] : 'OFF';
        }

        return 'OFF';
    },

    /**
     * Parse settings from memory - ALL 41 SETTINGS VERIFIED (Session 6)
     *
     * Memory regions:
     *   0x001F: Modulation
     *   0x0C90-0x0C9F: Function keys, DTMF, DCD, brightness
     *   0x0CA0-0x0CAF: Main settings (packed bytes)
     *   0x1820-0x1822: ANI-Edit
     *   0x1C00-0x1C2F: Startup messages
     *   0x1F20-0x1F2A: Secondary settings
     *   0x3000+: Extended settings (STE, PTT Delay, Alarm, Talk Around)
     *
     * @param {Uint8Array} data - Raw memory
     * @param {number} offset - Settings offset (unused, using absolute addresses)
     * @returns {Object} Settings object
     */
    parseSettings(data, offset) {
        // Packed bytes
        const flags0xCA0 = data[0xCA0] || 0;
        const flags0xCA1 = data[0xCA1] || 0;
        const flags0xCA2 = data[0xCA2] || 0;
        const flags0xCA3 = data[0xCA3] || 0;
        const flags0xCA7 = data[0xCA7] || 0;
        const flags0xCAB = data[0xCAB] || 0;
        const flags0xCAF = data[0xCAF] || 0;
        const flags0x300A = data[0x300A] || 0;

        return {
            // [1] Squelch Level - 0xCA9: 0=off, 1-9=level
            squelchLevel: data[0xCA9] || 0,

            // [2] Step Freq - 0xCA8 upper nibble: 0=2.5K,1=5K,2=6.25K,3=10K,4=12.5K,5=25K,6=50K,7=0.5K,8=8.33K
            stepFreq: (data[0xCA8] >> 4) & 0x0F,

            // [3] VOX Level - 0xCA7 bits 0-2: 0=off, 1-5=level
            voxGain: flags0xCA7 & 0x07,

            // [4] VOX Delay - 0xCAE: 0=1.0s, 1=2.0s, 2=3.0s
            voxDelay: data[0xCAE] || 0,

            // [5] TOT - 0xCAA: 0=off, 1=30s, 2=60s, 3=90s, 4=120s, 5=150s, 6=180s, 7=210s
            tot: data[0xCAA] || 0,

            // [6] Roger Beep - 0xCAB bits 6-7: 0=off, 1=tone1, 2=tone2
            roger: (flags0xCAB >> 6) & 0x03,

            // [7] Keypad Beep - 0xCA1 bit 2: 0=off, 1=on
            beep: !!(flags0xCA1 & 0x04),

            // [8] Power Save - 0xCAC: 0=off, 1-4=level
            save: data[0xCAC] || 0,

            // [9] Keypad Lock - 0xCA1 bit 4: 0=off, 1=on
            autoLock: !!(flags0xCA1 & 0x10),

            // [10] Dual Watch - 0xCA3 bit 2: 0=off, 1=on
            tdr: !!(flags0xCA3 & 0x04),

            // [11] Voice - 0xCA1 bit 0: 0=off, 1=on
            voicePrompt: !!(flags0xCA1 & 0x01),

            // [12] Backlight - 0xCAD: 0=always, 1=5s, 2=10s, 3=15s, 4=30s
            lightControl: data[0xCAD] || 0,

            // [13] Brightness - 0xC9D: INVERTED (display = 5 - memory)
            brightness: 5 - (data[0xC9D] || 0),

            // [14] Power On Display - 0xCA3 bits 6-7: 0=voltage, 1=message, 2=picture
            ponmgs: (flags0xCA3 >> 6) & 0x03,

            // [15] Display - 0x1F29: 0=single, 1=dual, 2=classic
            display: data[0x1F29] || 0,

            // [16] ANI-Edit - 0x1820-0x1822: 3 digits
            aniEdit: String(data[0x1820] || 0) + String(data[0x1821] || 0) + String(data[0x1822] || 0),

            // [17] Display Type-A - 0xCA2 bit 2: 0=freq+num, 1=name+num
            aChannelDisp: (flags0xCA2 >> 2) & 0x01,

            // [18] Display Type-B - 0xCA3 bit 4: 0=freq+num, 1=name+num
            bChannelDisp: (flags0xCA3 >> 4) & 0x01,

            // [19] DTMFST - 0xCA0 bit 1: 0=off, 1=on
            dtmfSideTone: !!(flags0xCA0 & 0x02),

            // [20] PTT Delay - 0x300B bits 0-5: value = (raw+1)*100 ms
            pttDelay: (data[0x300B] & 0x3F) || 0,

            // [21] Language - 0x1F28: 0=en, 1=cn, 2=tr, 3=ru, 4=de, 5=es, 6=it, 7=fr
            language: data[0x1F28] || 0,

            // [22] Alarm Mode - 0x300A bits 4-5: 0=on site, 2=tx alarm
            alarmMode: (flags0x300A >> 4) & 0x03,

            // [23] STE - 0x300A bit 7: 0=off, 1=on
            ste: !!(flags0x300A & 0x80),

            // [24] Tone Burst - 0xCA2 bits 4-5: 0=1000Hz, 1=1450Hz, 2=1750Hz, 3=2100Hz
            toneBurst: (flags0xCA2 >> 4) & 0x03,

            // [25] Talk Around - 0x300C: 0=off, 1=on
            talkAround: data[0x300C] || 0,

            // [26] FM Interrupt - 0xCA2 bit 3: 0=off, 1=on
            fmInterrupt: !!(flags0xCA2 & 0x08),

            // [27] PF1 Short Press - 0xC91: 0=none,1=fm,2=lamp,3=tone,4=alarm,5=weather,7=ptt2,8=od ptt
            shortKeyPf1: data[0xC91] || 0,

            // [28] PF1 Long Press - 0xC94: 0=none,1=fm,2=lamp,3=cancel sq,4=tone,5=alarm,6=weather
            longKeyPf1: data[0xC94] || 0,

            // [29] PF2 Short Press - 0xC92: same as PF1 Short
            shortKeyPf2: data[0xC92] || 0,

            // [30] PF2 Long Press - 0xC95: same as PF1 Long
            longKeyPf2: data[0xC95] || 0,

            // [32] Breath LED - 0xCAF bits 4-6: 0=off, 1=5s, 2=10s, 3=15s, 4=30s
            breathLed: (data[0xCAF] >> 4) & 0x07,
            // Only CH Mode - 0xCAF bit 7: purpose unknown (Windows CPS setting)
            onlyChMode: !!(data[0xCAF] & 0x80),

            // [33] MIC Gain - 0x1F20: 0-9
            micGain: data[0x1F20] || 0,

            // [34] DTMF Speed - 0xC9B: 0=80ms, 1=90ms, 2=100ms, 3=110ms, 4=120ms, 5=130ms, 6=140ms, 7=150ms
            dtmfSpeed: data[0xC9B] || 0,

            // [35] DCD - 0xC98: 0=off, 1=on
            dDcd: data[0xC98] || 0,

            // [36] D-HOLD - 0xC99: 0=off, 1=5s, 2=10s, 3=15s
            dHold: data[0xC99] || 0,

            // [37] D-RSP - 0xC9A: 0=null, 1=ring, 2=reply, 3=both
            dRsp: data[0xC9A] || 0,

            // [38] Modulation - 0x1F: 0=fm, 1=am
            modulation: data[0x1F] || 0,

            // [39] 200Tx - 0xCAB bit 4: 0=off, 1=on
            tx200: !!(flags0xCAB & 0x10),

            // [40] 350Tx - 0xCAB bit 3: 0=off, 1=on
            tx350: !!(flags0xCAB & 0x08),

            // [41] 500Tx - 0xCAB bit 2: 0=off, 1=on
            tx500: !!(flags0xCAB & 0x04),

            // [42] Menu Color - 0x1F2A: 0-17 (blue, red, green, yellow, purple, orange, lightblue, cyan, gray, darkblue, lightgreen, brown, pink, B.red, G.blue, L.gray, LG.blue, LB.blue)
            menuColor: data[0x1F2A] || 0,

            // Startup Messages - 0x1C00, 0x1C10, 0x1C20 (16 bytes each)
            msg1: this.parseString(data, 0x1C00, 16),
            msg2: this.parseString(data, 0x1C10, 16),
            msg3: this.parseString(data, 0x1C20, 16),

            // Scan Settings (non-menu)
            scanMode: (flags0xCA1 >> 6) & 0x03,  // 0x0CA1 bits 6-7: 0=TO, 1=CO, 2=SE
            scanHangTime: data[0x1F2F] || 0,     // 0x1F2F: (seconds * 2) - 1, range 0-19
            scanFreqLower: data[0x1F2D] || 0,    // 0x1F2D: 8-bit MHz
            scanFreqUpper: (data[0x1F2B] || 0) | ((data[0x1F2C] || 0) << 8),  // 0x1F2B-0x1F2C: 16-bit LE MHz

            // VFO Settings
            activeVfo: data[0x3004] || 0,            // 0x3004: 0=A, 1=B

            // VFO A (0x1950-0x195F) + offset at 0x0CB0
            vfoA: this.parseVFO(data, 0x1950, 0x0CB0),

            // VFO B (0x1960-0x196F) + offset at 0x0CB4
            vfoB: this.parseVFO(data, 0x1960, 0x0CB4),

            // TX Band Limits (0x0CC0-0x0CC7) - Windows CPS source (BCD big-endian!)
            txVhfLow: this.decodeBCDBigEndian(data, 0x0CC0),
            txVhfHigh: this.decodeBCDBigEndian(data, 0x0CC2),
            txUhfLow: this.decodeBCDBigEndian(data, 0x0CC4),
            txUhfHigh: this.decodeBCDBigEndian(data, 0x0CC6),

            // Repeater Tail Settings (0x1F02-0x1F03) - from CHIRP
            rpSte: data[0x1F02] || 0,          // 0=off, 1-10 seconds
            rpToneDelay: data[0x1F03] || 0,    // 0=off, 1-10 seconds

            // FM Radio Settings
            fmMode: (flags0xCA2 >> 7) & 0x01,    // 0x0CA2 bit 7: 0=VFO, 1=Channel
            fmVfoFreq: this.decodeBCDFMFrequency(data, 0x1970),  // 0x1970-0x1971: 16-bit BCD in 0.1MHz
            fmChannels: this.parseFMChannels(data),  // 0x0CD0-0x0D33: 25 channels × 4 bytes
            fmScanBitmap: this.parseFMScanBitmap(data),  // 0x1940-0x1943: 4 bytes

            // Security Settings
            stun: !!(flags0xCA7 & 0x08),         // 0x0CA7 bit 3: STUN
            kill: !!(flags0xCA7 & 0x10),         // 0x0CA7 bit 4: KILL

            // AM Band
            amBand: !!(flags0xCAF & 0x02),       // 0x0CAF bit 1: AM BAND

            // DTMF/ANI System (discovered from CHIRP driver - chirpmyradio.com/issues/11968)
            dtmfStunCode: this.parseDTMF(data, 0x1800, 16),      // Stun Code (H3/H3-Plus only)
            dtmfKillCode: this.parseDTMF(data, 0x1810, 16),      // Kill Code (H3/H3-Plus only)
            dtmfGroupCode: data[0x1829] || 0,                     // Group Code Selector: 0x00="", 0xFF=Off, 0x0A-0x0D=A-D, 0x0E=*, 0x0F=#
            dtmfGroup1: this.parseDTMF(data, 0x1830, 16),        // Group 1 call code
            dtmfGroup2: this.parseDTMF(data, 0x1840, 16),        // Group 2 call code
            dtmfGroup3: this.parseDTMF(data, 0x1850, 16),        // Group 3 call code
            dtmfGroup4: this.parseDTMF(data, 0x1860, 16),        // Group 4 call code
            dtmfGroup5: this.parseDTMF(data, 0x1870, 16),        // Group 5 call code
            dtmfGroup6: this.parseDTMF(data, 0x1880, 16),        // Group 6 call code
            dtmfGroup7: this.parseDTMF(data, 0x1890, 16),        // Group 7 call code
            dtmfGroup8: this.parseDTMF(data, 0x18A0, 16),        // Group 8 call code
            dtmfBotCode: this.parseDTMF(data, 0x18C0, 16),       // Start Code (BOT) - PTT ID
            dtmfEotCode: this.parseDTMF(data, 0x18D0, 16),       // End Code (EOT) - PTT ID

            // Legacy/unused fields (kept for compatibility)
            scanRev: 0,
            priorityTx: 0,
            dispLcdTx: true,
            dispLcdRx: true,
            bl: true,
            sync: false,
            rpSte: 0
        };
    },

    /**
     * Parse a null-terminated string from memory
     * @param {Uint8Array} data - Raw memory
     * @param {number} offset - String offset
     * @param {number} maxLen - Maximum length
     * @returns {string} Parsed string
     */
    parseString(data, offset, maxLen) {
        let str = '';
        for (let i = 0; i < maxLen; i++) {
            const b = data[offset + i];
            if (b === 0 || b === 0xFF) break;
            str += String.fromCharCode(b);
        }
        return str;
    },

    /**
     * Parse DTMF code from memory (CHIRP driver format)
     * @param {Uint8Array} data - Raw memory
     * @param {number} offset - Start offset
     * @param {number} size - Field size in bytes (16 for most codes)
     * @returns {string} DTMF code string (0-9, A-D, *, #) or empty string
     *
     * Encoding (from CHIRP tdh8.py):
     * - 0x00-0x09 → '0'-'9'
     * - 0x0A-0x0D → 'A'-'D'
     * - 0x0E → '*'
     * - 0x0F → '#'
     * - 0xFF → padding/empty
     * - Last byte = length (number of actual digits, 0-15)
     */
    parseDTMF(data, offset, size) {
        const DTMF_MAP = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
                          'A', 'B', 'C', 'D', '*', '#'];

        // Read length from last byte (if size includes length byte)
        const hasLengthByte = (size === 16);
        const dataLen = hasLengthByte ? size - 1 : size;
        const length = hasLengthByte ? (data[offset + size - 1] || 0) : dataLen;

        let code = '';
        for (let i = 0; i < Math.min(length, dataLen); i++) {
            const b = data[offset + i];
            // Don't break on 0xFF - length byte tells us when to stop!
            // Only add valid DTMF characters
            if (b <= 0x0F) {
                code += DTMF_MAP[b];
            }
        }

        return code;
    },

    /**
     * Decode FM frequency from 2 bytes (16-bit BCD little-endian in 0.1 MHz units)
     * @param {Uint8Array} data - Raw memory
     * @param {number} offset - Byte offset
     * @returns {number} Frequency in MHz (e.g., 90.5)
     */
    decodeBCDFMFrequency(data, offset) {
        // Read 2 bytes as little-endian BCD
        const lowByte = data[offset] || 0;
        const highByte = data[offset + 1] || 0;

        // Extract BCD digits (little-endian: low byte = least significant)
        const d0 = lowByte & 0x0F;
        const d1 = (lowByte >> 4) & 0x0F;
        const d2 = highByte & 0x0F;
        const d3 = (highByte >> 4) & 0x0F;

        // Combine into value (in 0.1 MHz units)
        const tenths = d0 + d1 * 10 + d2 * 100 + d3 * 1000;

        // Convert to MHz
        return tenths / 10;
    },

    /**
     * Decode 2 bytes as BCD big-endian (for TX band limits)
     * @param {Uint8Array} data - Raw memory
     * @param {number} offset - Byte offset
     * @returns {number} Frequency in MHz (e.g., 144.0)
     *
     * Example: bytes [0x14, 0x40] → digits 1-4-4-0 → 1440 tenths → 144.0 MHz
     */
    decodeBCDBigEndian(data, offset) {
        const byte0 = data[offset] || 0;
        const byte1 = data[offset + 1] || 0;

        // Extract BCD digits (big-endian: first byte = most significant)
        const d3 = (byte0 >> 4) & 0x0F;  // thousands
        const d2 = byte0 & 0x0F;          // hundreds
        const d1 = (byte1 >> 4) & 0x0F;  // tens
        const d0 = byte1 & 0x0F;          // ones

        // Combine into value (in 0.1 MHz units)
        const tenths = d0 + d1 * 10 + d2 * 100 + d3 * 1000;

        // Convert to MHz
        return tenths / 10;
    },

    /**
     * Parse FM channels (25 channels × 4 bytes at 0x0CD0-0x0D33)
     * @param {Uint8Array} data - Raw memory
     * @returns {Array} Array of 25 FM frequencies in MHz (0 = empty)
     */
    parseFMChannels(data) {
        const channels = [];
        const FM_START = 0x0CD0;
        const FM_COUNT = 25;

        for (let i = 0; i < FM_COUNT; i++) {
            const offset = FM_START + i * 4;
            const freq = this.decodeBCDFMFrequency(data, offset);
            // Check if empty (0xFF padding)
            const isEmpty = data[offset] === 0xFF || freq === 0 || freq < 87 || freq > 109;
            channels.push(isEmpty ? 0 : freq);
        }

        return channels;
    },

    /**
     * Parse FM scan bitmap (4 bytes at 0x1940-0x1943, 1 bit per channel)
     * @param {Uint8Array} data - Raw memory
     * @returns {Array} Array of 25 booleans (true = channel has frequency assigned)
     */
    parseFMScanBitmap(data) {
        const bitmap = [];
        const BITMAP_START = 0x1940;

        for (let i = 0; i < 25; i++) {
            const byteOffset = BITMAP_START + Math.floor(i / 8);
            const bitMask = 1 << (i % 8);
            bitmap.push(!!(data[byteOffset] & bitMask));
        }

        return bitmap;
    },

    /**
     * Encode channels and settings back to memory format
     * @param {Object} data - Data with channels and settings
     * @returns {Uint8Array} Encoded memory
     */
    encodeMemory(data) {
        const CHANNEL_SIZE = 16;
        const CHANNEL_START = 0x0010;
        const NAMES_START = 0x0D40;
        const NAME_SIZE = 8;
        const buffer = new Uint8Array(this.MEMORY_END);

        // If we have raw data, start with that as a base
        if (data.rawData) {
            buffer.set(new Uint8Array(data.rawData));
        }

        // Encode channels
        for (let i = 0; i < data.channels.length; i++) {
            const channelOffset = CHANNEL_START + (i * CHANNEL_SIZE);
            const nameOffset = NAMES_START + (i * NAME_SIZE);
            this.encodeChannel(buffer, channelOffset, data.channels[i]);
            this.encodeChannelName(buffer, nameOffset, data.channels[i].name);
        }

        // Encode channel valid bitmap (0x1900+, 1 bit per channel, 1=valid/programmed, 0=empty)
        // Radio only allows cycling to channels with bit=1 in this bitmap
        const VALID_BITMAP_START = 0x1900;
        for (let i = 0; i < data.channels.length; i++) {
            const byteOffset = VALID_BITMAP_START + Math.floor(i / 8);
            const bitMask = 1 << (i % 8);
            // Channel is valid if it has RX frequency > 0
            if (data.channels[i].rxFreq > 0) {
                buffer[byteOffset] |= bitMask;   // Set bit (channel valid)
            } else {
                buffer[byteOffset] &= ~bitMask;  // Clear bit (channel empty)
            }
        }

        // Encode scan bitmap (0x1920+, 1 bit per channel, 1=on, 0=off)
        const SCAN_BITMAP_START = 0x1920;
        for (let i = 0; i < data.channels.length; i++) {
            const byteOffset = SCAN_BITMAP_START + Math.floor(i / 8);
            const bitMask = 1 << (i % 8);
            if (data.channels[i].scanAdd) {
                buffer[byteOffset] |= bitMask;   // Set bit (scan on)
            } else {
                buffer[byteOffset] &= ~bitMask;  // Clear bit (scan off)
            }
        }

        // Debug: show bitmaps for first 8 channels
        console.log('Valid bitmap byte 0x1900:', buffer[0x1900].toString(2).padStart(8, '0'),
            '(CH1-8 valid:', data.channels.slice(0, 8).map(c => c.rxFreq > 0 ? '1' : '0').join(''), ')');
        console.log('Scan bitmap byte 0x1920:', buffer[0x1920].toString(2).padStart(8, '0'),
            '(CH1-8 scan:', data.channels.slice(0, 8).map(c => c.scanAdd ? '1' : '0').join(''), ')');

        // Encode settings
        const settingsOffset = 0x0C90;
        this.encodeSettings(buffer, settingsOffset, data.settings);

        // Debug: show key settings being encoded
        console.log('Encoding settings:');
        console.log('  Menu Color:', data.settings.menuColor, '-> 0x1F2A =', buffer[0x1F2A]);
        console.log('  Msg1:', data.settings.msg1, '-> 0x1C00');
        console.log('  Msg3:', data.settings.msg3, '-> 0x1C20');

        return buffer;
    },

    /**
     * Encode channel name to memory
     * @param {Uint8Array} buffer - Target buffer
     * @param {number} offset - Name offset
     * @param {string} name - Channel name
     */
    encodeChannelName(buffer, offset, name) {
        const nameStr = (name || '').substring(0, 8);
        for (let i = 0; i < 8; i++) {
            buffer[offset + i] = i < nameStr.length ? nameStr.charCodeAt(i) : 0xFF;
        }
    },

    /**
     * Encode a single channel to memory (16 bytes)
     * @param {Uint8Array} buffer - Target buffer
     * @param {number} offset - Channel offset
     * @param {Object} channel - Channel data
     */
    encodeChannel(buffer, offset, channel) {
        // Empty channel
        if (channel.rxFreq === 0) {
            for (let i = 0; i < 16; i++) {
                buffer[offset + i] = 0xFF;
            }
            return;
        }

        // Encode frequencies as little-endian BCD
        this.encodeBCDFrequency(buffer, offset, channel.rxFreq);
        this.encodeBCDFrequency(buffer, offset + 4, channel.txFreq);

        // Encode tones
        const rxTone = this.encodeTone(channel.decode);
        const txTone = this.encodeTone(channel.encode);

        buffer[offset + 8] = rxTone & 0xFF;
        buffer[offset + 9] = (rxTone >> 8) & 0xFF;
        buffer[offset + 10] = txTone & 0xFF;
        buffer[offset + 11] = (txTone >> 8) & 0xFF;

        // Encode flags (VERIFIED mapping Jan 2026)
        // Byte 12: Scramble value (0=off, 1-16=level)
        const scrambleVal = typeof channel.scramble === 'number' ? channel.scramble : 0;
        buffer[offset + 12] = scrambleVal & 0x1F; // 0-16 fits in 5 bits

        // Byte 13: bit 2=Busy Lock, bit 5=Freq Hop, bits 6-7=PTT ID
        let flags2 = 0;
        if (channel.busyLock) flags2 |= 0x04;      // Bit 2
        if (channel.frequencyHop) flags2 |= 0x20;  // Bit 5
        // PTT ID: bits 6-7 (0=Off, 1=BOT, 2=EOT, 3=BOTH)
        const pttIdMap = { 'OFF': 0, 'BOT': 1, 'EOT': 2, 'BOTH': 3 };
        const pttIdVal = pttIdMap[channel.pttId] || 0;
        flags2 |= (pttIdVal << 6);
        buffer[offset + 13] = flags2;

        // Byte 14: bit 3=Bandwidth (inverted: 1=N, 0=W), bit 4=Power
        let flags3 = 0;
        if (channel.bandwidth === 'N') flags3 |= 0x08;  // Bit 3 (inverted)
        if (channel.txPower === 'HIGH') flags3 |= 0x10; // Bit 4
        buffer[offset + 14] = flags3;

        buffer[offset + 15] = 0x00;
        // Note: Scan Add is stored in bitmap at 0x1920+, encoded separately
    },

    /**
     * Encode VFO record to memory (16 bytes)
     * VFO A: 0x1950-0x195F, VFO B: 0x1960-0x196F
     * Offset values stored separately at 0x0CB0 (A) and 0x0CB4 (B)
     *
     * @param {Uint8Array} buffer - Target buffer
     * @param {number} offset - VFO record offset (0x1950 or 0x1960)
     * @param {number} offsetValueAddr - Offset frequency address (0x0CB0 or 0x0CB4)
     * @param {Object} vfo - VFO settings object
     */
    encodeVFO(buffer, offset, offsetValueAddr, vfo) {
        // RX frequency (bytes 0-3)
        this.encodeBCDFrequency(buffer, offset, vfo.rxFreq || 0);

        // TX frequency (bytes 4-7) - not used by radio, set to 0
        buffer[offset + 4] = 0;
        buffer[offset + 5] = 0;
        buffer[offset + 6] = 0;
        buffer[offset + 7] = 0;

        // Encode tones (bytes 8-11)
        const rxTone = this.encodeTone(vfo.rxTone);
        const txTone = this.encodeTone(vfo.txTone);

        buffer[offset + 8] = rxTone & 0xFF;
        buffer[offset + 9] = (rxTone >> 8) & 0xFF;
        buffer[offset + 10] = txTone & 0xFF;
        buffer[offset + 11] = (txTone >> 8) & 0xFF;

        // Byte 12: Scramble (0=off, 1-16=level)
        buffer[offset + 12] = (vfo.scramble || 0) & 0x1F;

        // Byte 13: Flags2 - bit 2=Busy Lock (assumed same as channel)
        let flags2 = 0;
        if (vfo.busyLock) flags2 |= 0x04;
        buffer[offset + 13] = flags2;

        // Byte 14: Flags3 - bits 0-1=offset dir, bit 3=BW, bit 4=power
        let flags3 = 0;
        // Offset direction: 0=off, 1=-, 2=+
        const offsetDirMap = { 'OFF': 0, '-': 1, '+': 2 };
        flags3 |= (offsetDirMap[vfo.offsetDir] || 0) & 0x03;
        if (vfo.bandwidth === 'N') flags3 |= 0x08;
        if (vfo.txPower === 'HIGH') flags3 |= 0x10;
        buffer[offset + 14] = flags3;

        // Byte 15: Unknown, set to 0
        buffer[offset + 15] = 0x00;

        // Offset value at separate address
        this.encodeBCDFrequency(buffer, offsetValueAddr, vfo.offset || 0);
    },

    /**
     * Encode frequency as little-endian BCD (4 bytes)
     * @param {Uint8Array} buffer - Target buffer
     * @param {number} offset - Byte offset
     * @param {number} freqMHz - Frequency in MHz
     */
    encodeBCDFrequency(buffer, offset, freqMHz) {
        // Convert MHz to 10Hz units
        let freq = Math.round(freqMHz * 100000);

        // Encode as little-endian BCD
        for (let i = 0; i < 4; i++) {
            const lowNibble = freq % 10;
            freq = Math.floor(freq / 10);
            const highNibble = freq % 10;
            freq = Math.floor(freq / 10);
            buffer[offset + i] = (highNibble << 4) | lowNibble;
        }
    },

    /**
     * Encode CTCSS/DCS tone to 16-bit BCD value
     * @param {string} tone - Tone string
     * @returns {number} Encoded tone value (little-endian BCD)
     */
    encodeTone(tone) {
        if (!tone || tone === 'OFF') return 0;

        // DCS code (e.g., 'D023N' or 'D023I' or legacy 'D023')
        if (tone.startsWith('D')) {
            // Check for inverted suffix
            const isInverted = tone.endsWith('I');
            // Extract numeric code (strip D prefix and optional N/I suffix)
            const codeStr = tone.substring(1).replace(/[NI]$/, '');
            const code = parseInt(codeStr, 10);
            // Encode as BCD with DCS marker (0x80) and optional invert flag (0x40)
            const d0 = code % 10;
            const d1 = Math.floor(code / 10) % 10;
            const d2 = Math.floor(code / 100) % 10;
            const lowByte = (d1 << 4) | d0;
            const highByte = (isInverted ? 0xC0 : 0x80) | d2;  // 0x80=DCS, 0x40=inverted
            return (highByte << 8) | lowByte;
        }

        // CTCSS tone - encode as BCD (67.0 Hz -> 0670 -> 70 06)
        const freq = parseFloat(tone);
        if (!isNaN(freq)) {
            const toneValue = Math.round(freq * 10);
            const d0 = toneValue % 10;
            const d1 = Math.floor(toneValue / 10) % 10;
            const d2 = Math.floor(toneValue / 100) % 10;
            const d3 = Math.floor(toneValue / 1000) % 10;
            const lowByte = (d1 << 4) | d0;
            const highByte = (d3 << 4) | d2;
            return (highByte << 8) | lowByte;
        }

        return 0;
    },

    /**
     * Encode a tone value to type and index
     * @param {string} tone - Tone string
     * @returns {Object} { type, value }
     */
    encodeToneValue(tone) {
        if (!tone || tone === 'OFF') {
            return { type: 0, value: 0 };
        }

        // DCS code
        if (tone.startsWith('D')) {
            const dcsCodes = [
                '023', '025', '026', '031', '032', '036', '043', '047',
                '051', '053', '054', '065', '071', '072', '073', '074',
                '114', '115', '116', '122', '125', '131', '132', '134',
                '143', '145', '152', '155', '156', '162', '165', '172',
                '174', '205', '212', '223', '225', '226', '243', '244',
                '245', '246', '251', '252', '255', '261', '263', '265',
                '266', '271', '274', '306', '311', '315', '325', '331',
                '332', '343', '346', '351', '356', '364', '365', '371',
                '411', '412', '413', '423', '431', '432', '445', '446',
                '452', '454', '455', '462', '464', '465', '466', '503',
                '506', '516', '523', '526', '532', '546', '565', '606',
                '612', '624', '627', '631', '632', '654', '662', '664',
                '703', '712', '723', '731', '732', '734', '743', '754'
            ];
            const code = tone.substring(1);
            const idx = dcsCodes.indexOf(code);
            return { type: 2, value: idx >= 0 ? idx + 1 : 0 };
        }

        // CTCSS tone
        const ctcssTones = [
            '67.0', '69.3', '71.9', '74.4', '77.0', '79.7', '82.5', '85.4',
            '88.5', '91.5', '94.8', '97.4', '100.0', '103.5', '107.2', '110.9',
            '114.8', '118.8', '123.0', '127.3', '131.8', '136.5', '141.3', '146.2',
            '151.4', '156.7', '162.2', '167.9', '173.8', '179.9', '186.2', '192.8',
            '203.5', '206.5', '210.7', '218.1', '225.7', '229.1', '233.6', '241.8',
            '250.3', '254.1'
        ];
        const idx = ctcssTones.indexOf(tone);
        return { type: 1, value: idx >= 0 ? idx + 1 : 0 };
    },

    /**
     * Encode settings to memory - ALL 41 SETTINGS VERIFIED (Session 6)
     *
     * @param {Uint8Array} buffer - Target buffer (should be copy of rawData to preserve unknown bytes)
     * @param {number} offset - Unused (kept for compatibility), we use absolute addresses
     * @param {Object} settings - Settings data
     */
    encodeSettings(buffer, offset, settings) {
        // ===== 0x001F: Modulation [38] =====
        buffer[0x1F] = settings.modulation || 0;

        // ===== 0x0C90 block: Function keys, DTMF =====
        // 0xC91: PF1 Short Press [27]
        buffer[0xC91] = settings.shortKeyPf1 || 0;

        // 0xC92: PF2 Short Press [29]
        buffer[0xC92] = settings.shortKeyPf2 || 0;

        // 0xC94: PF1 Long Press [28] (NOT 0xC93!)
        buffer[0xC94] = settings.longKeyPf1 || 0;

        // 0xC95: PF2 Long Press [30]
        buffer[0xC95] = settings.longKeyPf2 || 0;

        // 0xC98: DCD [35]
        buffer[0xC98] = settings.dDcd || 0;

        // 0xC99: D-HOLD [36]
        buffer[0xC99] = settings.dHold || 0;

        // 0xC9A: D-RSP [37]
        buffer[0xC9A] = settings.dRsp || 0;

        // 0xC9B: DTMF Speed [34]
        buffer[0xC9B] = settings.dtmfSpeed || 0;

        // 0xC9D: Brightness [13] - INVERTED encoding
        buffer[0xC9D] = 5 - (settings.brightness || 1);

        // ===== 0x0CA0 block: Packed flag bytes =====
        // 0xCA0: bit 1 = DTMFST [19]
        let flags0xCA0 = buffer[0xCA0] || 0;
        if (settings.dtmfSideTone) flags0xCA0 |= 0x02; else flags0xCA0 &= ~0x02;
        buffer[0xCA0] = flags0xCA0;

        // 0xCA1: bit 0=Voice[11], bit 2=Keypad Beep[7], bit 4=Keypad Lock[9], bits 6-7=Scan Mode
        let flags0xCA1 = buffer[0xCA1] || 0;
        if (settings.voicePrompt) flags0xCA1 |= 0x01; else flags0xCA1 &= ~0x01;
        if (settings.beep) flags0xCA1 |= 0x04; else flags0xCA1 &= ~0x04;
        if (settings.autoLock) flags0xCA1 |= 0x10; else flags0xCA1 &= ~0x10;
        flags0xCA1 = (flags0xCA1 & ~0xC0) | ((settings.scanMode || 0) << 6);
        buffer[0xCA1] = flags0xCA1;

        // 0xCA2: bit 2=Display Type-A[17], bit 3=FM Interrupt[26], bits 4-5=Tone Burst[24], bit 7=FM Mode
        let flags0xCA2 = buffer[0xCA2] || 0;
        flags0xCA2 = (flags0xCA2 & ~0x04) | ((settings.aChannelDisp || 0) << 2);
        if (settings.fmInterrupt) flags0xCA2 |= 0x08; else flags0xCA2 &= ~0x08;
        flags0xCA2 = (flags0xCA2 & ~0x30) | ((settings.toneBurst || 0) << 4);
        if (settings.fmMode) flags0xCA2 |= 0x80; else flags0xCA2 &= ~0x80;
        buffer[0xCA2] = flags0xCA2;

        // 0xCA3: bit 2=Dual Watch[10], bit 4=Display Type-B[18], bits 6-7=Power On Display[14]
        let flags0xCA3 = buffer[0xCA3] || 0;
        if (settings.tdr) flags0xCA3 |= 0x04; else flags0xCA3 &= ~0x04;
        flags0xCA3 = (flags0xCA3 & ~0x10) | ((settings.bChannelDisp || 0) << 4);
        flags0xCA3 = (flags0xCA3 & ~0xC0) | ((settings.ponmgs || 0) << 6);
        buffer[0xCA3] = flags0xCA3;

        // 0xCA7: VOX Level [3] (bits 0-2), STUN (bit 3), KILL (bit 4)
        let flags0xCA7 = buffer[0xCA7] || 0;
        flags0xCA7 = (flags0xCA7 & ~0x07) | ((settings.voxGain || 0) & 0x07);  // Bits 0-2: VOX
        if (settings.stun) flags0xCA7 |= 0x08; else flags0xCA7 &= ~0x08;       // Bit 3: STUN
        if (settings.kill) flags0xCA7 |= 0x10; else flags0xCA7 &= ~0x10;       // Bit 4: KILL
        buffer[0xCA7] = flags0xCA7;

        // 0xCA8: Step Freq [2] - upper nibble
        let val0xCA8 = buffer[0xCA8] || 0;
        val0xCA8 = (val0xCA8 & 0x0F) | ((settings.stepFreq || 0) << 4);
        buffer[0xCA8] = val0xCA8;

        // 0xCA9: Squelch Level [1]
        buffer[0xCA9] = settings.squelchLevel || 0;

        // 0xCAA: TOT [5]
        buffer[0xCAA] = settings.tot || 0;

        // 0xCAB: bits 6-7=Roger[6], bit 4=200Tx[39], bit 3=350Tx[40], bit 2=500Tx[41]
        let flags0xCAB = buffer[0xCAB] || 0;
        flags0xCAB = (flags0xCAB & ~0xC0) | ((settings.roger || 0) << 6);
        if (settings.tx200) flags0xCAB |= 0x10; else flags0xCAB &= ~0x10;
        if (settings.tx350) flags0xCAB |= 0x08; else flags0xCAB &= ~0x08;
        if (settings.tx500) flags0xCAB |= 0x04; else flags0xCAB &= ~0x04;
        buffer[0xCAB] = flags0xCAB;

        // 0xCAC: Power Save [8]
        buffer[0xCAC] = settings.save || 0;

        // 0xCAD: Backlight [12]
        buffer[0xCAD] = settings.lightControl || 0;

        // 0xCAE: VOX Delay [4]
        buffer[0xCAE] = settings.voxDelay || 0;

        // 0xCAF: bits 4-6 = Breath LED [32], bit 1 = AM Band, bit 7 = Only CH Mode
        let flags0xCAF = buffer[0xCAF] || 0;
        flags0xCAF = (flags0xCAF & 0x8F) | (((settings.breathLed || 0) & 0x07) << 4);  // bits 4-6 only
        if (settings.amBand) flags0xCAF |= 0x02; else flags0xCAF &= ~0x02;
        if (settings.onlyChMode) flags0xCAF |= 0x80; else flags0xCAF &= ~0x80;
        buffer[0xCAF] = flags0xCAF;

        // ===== 0x1820: ANI-Edit [16] =====
        const ani = settings.aniEdit || '000';
        buffer[0x1820] = parseInt(ani[0]) || 0;
        buffer[0x1821] = parseInt(ani[1]) || 0;
        buffer[0x1822] = parseInt(ani[2]) || 0;

        // ===== DTMF/ANI System (discovered from CHIRP - chirpmyradio.com/issues/11968) =====
        // 0x1800-0x180F: Stun Code (H3/H3-Plus only)
        this.encodeDTMF(buffer, 0x1800, settings.dtmfStunCode || '', 16);

        // 0x1810-0x181F: Kill Code (H3/H3-Plus only)
        this.encodeDTMF(buffer, 0x1810, settings.dtmfKillCode || '', 16);

        // 0x1829: Group Code Selector
        buffer[0x1829] = settings.dtmfGroupCode || 0;

        // 0x1830-0x18AF: Group Call Codes (8 groups × 16 bytes)
        this.encodeDTMF(buffer, 0x1830, settings.dtmfGroup1 || '', 16);
        this.encodeDTMF(buffer, 0x1840, settings.dtmfGroup2 || '', 16);
        this.encodeDTMF(buffer, 0x1850, settings.dtmfGroup3 || '', 16);
        this.encodeDTMF(buffer, 0x1860, settings.dtmfGroup4 || '', 16);
        this.encodeDTMF(buffer, 0x1870, settings.dtmfGroup5 || '', 16);
        this.encodeDTMF(buffer, 0x1880, settings.dtmfGroup6 || '', 16);
        this.encodeDTMF(buffer, 0x1890, settings.dtmfGroup7 || '', 16);
        this.encodeDTMF(buffer, 0x18A0, settings.dtmfGroup8 || '', 16);

        // 0x18C0-0x18CF: Start Code (BOT) - PTT ID
        this.encodeDTMF(buffer, 0x18C0, settings.dtmfBotCode || '', 16);

        // 0x18D0-0x18DF: End Code (EOT) - PTT ID
        this.encodeDTMF(buffer, 0x18D0, settings.dtmfEotCode || '', 16);

        // ===== 0x1C00: Startup Messages =====
        this.encodeString(buffer, 0x1C00, settings.msg1 || '', 16);
        this.encodeString(buffer, 0x1C10, settings.msg2 || '', 16);
        this.encodeString(buffer, 0x1C20, settings.msg3 || '', 16);

        // ===== VFO A/B Records (0x1950-0x196F) + Offsets (0x0CB0-0x0CB7) =====
        if (settings.vfoA) {
            this.encodeVFO(buffer, 0x1950, 0x0CB0, settings.vfoA);
        }
        if (settings.vfoB) {
            this.encodeVFO(buffer, 0x1960, 0x0CB4, settings.vfoB);
        }

        // ===== 0x0CC0: TX Band Limits (Windows CPS source - BCD big-endian!) =====
        this.encodeBCDBigEndian(buffer, 0x0CC0, settings.txVhfLow || 0);
        this.encodeBCDBigEndian(buffer, 0x0CC2, settings.txVhfHigh || 0);
        this.encodeBCDBigEndian(buffer, 0x0CC4, settings.txUhfLow || 0);
        this.encodeBCDBigEndian(buffer, 0x0CC6, settings.txUhfHigh || 0);

        // ===== 0x1F02-0x1F03: Repeater Tail Settings (from CHIRP) =====
        buffer[0x1F02] = settings.rpSte || 0;
        buffer[0x1F03] = settings.rpToneDelay || 0;

        // ===== 0x1F20 block: Secondary settings =====
        // 0x1F20: MIC Gain [33]
        buffer[0x1F20] = settings.micGain || 0;

        // 0x1F28: Language [21]
        buffer[0x1F28] = settings.language || 0;

        // 0x1F29: Display [15]
        buffer[0x1F29] = settings.display || 0;

        // 0x1F2A: Menu Color [42]
        buffer[0x1F2A] = settings.menuColor || 0;

        // 0x1F2B-0x1F2C: Scan Freq Range Upper (16-bit LE, MHz)
        const scanUpper = settings.scanFreqUpper || 0;
        buffer[0x1F2B] = scanUpper & 0xFF;
        buffer[0x1F2C] = (scanUpper >> 8) & 0xFF;

        // 0x1F2D: Scan Freq Range Lower (8-bit, MHz)
        buffer[0x1F2D] = settings.scanFreqLower || 0;

        // 0x1F2F: Scan Hang Time ((seconds * 2) - 1, range 0-19)
        buffer[0x1F2F] = settings.scanHangTime || 0;

        // ===== FM Radio Settings =====
        // 0x1970-0x1971: FM VFO Frequency (16-bit BCD in 0.1MHz)
        this.encodeBCDFMFrequency(buffer, 0x1970, settings.fmVfoFreq || 0);

        // 0x0CD0-0x0D33: FM Channels (25 channels × 4 bytes)
        this.encodeFMChannels(buffer, settings.fmChannels || []);

        // 0x1940-0x1943: FM Scan Bitmap (4 bytes, 1 bit per channel)
        this.encodeFMScanBitmap(buffer, settings.fmChannels || []);

        // ===== 0x3000 block: Extended settings =====
        // 0x3004: Active VFO (0=A, 1=B)
        buffer[0x3004] = settings.activeVfo || 0;

        // 0x300A: bit 7=STE[23], bits 4-5=Alarm Mode[22]
        let flags0x300A = buffer[0x300A] || 0;
        if (settings.ste) flags0x300A |= 0x80; else flags0x300A &= ~0x80;
        flags0x300A = (flags0x300A & ~0x30) | ((settings.alarmMode || 0) << 4);
        buffer[0x300A] = flags0x300A;

        // 0x300B: PTT Delay [20] - lower 6 bits
        let val0x300B = buffer[0x300B] || 0;
        val0x300B = (val0x300B & ~0x3F) | ((settings.pttDelay || 0) & 0x3F);
        buffer[0x300B] = val0x300B;

        // 0x300C: Talk Around [25]
        buffer[0x300C] = settings.talkAround || 0;
    },

    /**
     * Encode a string to memory
     * @param {Uint8Array} buffer - Target buffer
     * @param {number} offset - String offset
     * @param {string} str - String to encode
     * @param {number} maxLen - Maximum length
     */
    encodeString(buffer, offset, str, maxLen) {
        const bytes = new TextEncoder().encode(str.substring(0, maxLen));
        for (let i = 0; i < maxLen; i++) {
            buffer[offset + i] = i < bytes.length ? bytes[i] : 0;
        }
    },

    /**
     * Encode DTMF code to memory (CHIRP driver format)
     * @param {Uint8Array} buffer - Target buffer
     * @param {number} offset - Start offset
     * @param {string} code - DTMF code string (0-9, A-D, *, #)
     * @param {number} size - Field size in bytes (16 for most codes)
     *
     * Encoding (from CHIRP tdh8.py):
     * - '0'-'9' → 0x00-0x09
     * - 'A'-'D' → 0x0A-0x0D
     * - '*' → 0x0E
     * - '#' → 0x0F
     * - Padding → 0xFF
     * - Last byte = length (number of actual digits, 0-15)
     */
    encodeDTMF(buffer, offset, code, size) {
        const DTMF_REVERSE_MAP = {
            '0': 0x00, '1': 0x01, '2': 0x02, '3': 0x03,
            '4': 0x04, '5': 0x05, '6': 0x06, '7': 0x07,
            '8': 0x08, '9': 0x09, 'A': 0x0A, 'B': 0x0B,
            'C': 0x0C, 'D': 0x0D, '*': 0x0E, '#': 0x0F
        };

        // Clean and uppercase the code
        const cleanCode = (code || '').toUpperCase().replace(/[^0-9A-D*#]/g, '');
        const hasLengthByte = (size === 16);
        const dataLen = hasLengthByte ? size - 1 : size;

        // Fill with padding (0xFF)
        for (let i = 0; i < size; i++) {
            buffer[offset + i] = 0xFF;
        }

        // Write DTMF digits
        const length = Math.min(cleanCode.length, dataLen);
        for (let i = 0; i < length; i++) {
            const char = cleanCode[i];
            const value = DTMF_REVERSE_MAP[char];
            buffer[offset + i] = (value !== undefined) ? value : 0xFF;
        }

        // Write length byte (last byte)
        if (hasLengthByte) {
            // If all digits are 0xFF, set length to 0
            const allEmpty = cleanCode.length === 0;
            buffer[offset + size - 1] = allEmpty ? 0 : length;
        }
    },

    /**
     * Encode FM frequency as 16-bit BCD (in 0.1 MHz units)
     * @param {Uint8Array} buffer - Target buffer
     * @param {number} offset - Byte offset
     * @param {number} freqMHz - Frequency in MHz (e.g., 90.5)
     */
    encodeBCDFMFrequency(buffer, offset, freqMHz) {
        // Convert MHz to 0.1 MHz units (tenths)
        const tenths = Math.round(freqMHz * 10);

        // Encode as BCD
        const d0 = tenths % 10;
        const d1 = Math.floor(tenths / 10) % 10;
        const d2 = Math.floor(tenths / 100) % 10;
        const d3 = Math.floor(tenths / 1000) % 10;

        buffer[offset] = (d1 << 4) | d0;
        buffer[offset + 1] = (d3 << 4) | d2;
    },

    /**
     * Encode 16-bit BCD big-endian (for TX band limits)
     * @param {Uint8Array} buffer - Target buffer
     * @param {number} offset - Byte offset
     * @param {number} freqMHz - Frequency in MHz (e.g., 144.0)
     *
     * Example: 144.0 MHz → 1440 tenths → BCD 1-4-4-0 → bytes [0x14, 0x40]
     */
    encodeBCDBigEndian(buffer, offset, freqMHz) {
        // Convert MHz to 0.1 MHz units (tenths)
        const tenths = Math.round(freqMHz * 10);

        // Extract decimal digits
        const d0 = tenths % 10;          // ones
        const d1 = Math.floor(tenths / 10) % 10;    // tens
        const d2 = Math.floor(tenths / 100) % 10;   // hundreds
        const d3 = Math.floor(tenths / 1000) % 10;  // thousands

        // Write as big-endian (first byte = most significant)
        buffer[offset] = (d3 << 4) | d2;      // thousands and hundreds
        buffer[offset + 1] = (d1 << 4) | d0;  // tens and ones
    },

    /**
     * Encode FM channels to memory (25 channels × 4 bytes at 0x0CD0-0x0D33)
     * @param {Uint8Array} buffer - Target buffer
     * @param {Array} channels - Array of 25 FM frequencies in MHz (0 = empty)
     */
    encodeFMChannels(buffer, channels) {
        const FM_START = 0x0CD0;
        const FM_COUNT = 25;

        for (let i = 0; i < FM_COUNT; i++) {
            const offset = FM_START + i * 4;
            const freq = channels[i] || 0;

            if (freq === 0 || freq < 87 || freq > 109) {
                // Empty channel - fill with 0xFF
                buffer[offset] = 0xFF;
                buffer[offset + 1] = 0xFF;
                buffer[offset + 2] = 0x00;
                buffer[offset + 3] = 0x00;
            } else {
                // Valid frequency - encode as BCD
                this.encodeBCDFMFrequency(buffer, offset, freq);
                buffer[offset + 2] = 0x00;  // Padding
                buffer[offset + 3] = 0x00;
            }
        }
    },

    /**
     * Encode FM scan bitmap to memory (4 bytes at 0x1940-0x1943)
     * Note: Per user guidance, this bitmap indicates whether a channel has a frequency assigned,
     * not a "scan" setting. We set bit=1 if frequency is populated, bit=0 if blank.
     * @param {Uint8Array} buffer - Target buffer
     * @param {Array} channels - Array of 25 FM frequencies (to determine if populated)
     */
    encodeFMScanBitmap(buffer, channels) {
        const BITMAP_START = 0x1940;

        // Clear the 4 bytes first
        buffer[BITMAP_START] = 0;
        buffer[BITMAP_START + 1] = 0;
        buffer[BITMAP_START + 2] = 0;
        buffer[BITMAP_START + 3] = 0;

        for (let i = 0; i < 25; i++) {
            const freq = channels[i] || 0;
            const hasFreq = freq > 0 && freq >= 87 && freq <= 109;

            if (hasFreq) {
                const byteOffset = BITMAP_START + Math.floor(i / 8);
                const bitMask = 1 << (i % 8);
                buffer[byteOffset] |= bitMask;
            }
        }
    },

    // Callback for disconnect events
    onDisconnect: null
};
