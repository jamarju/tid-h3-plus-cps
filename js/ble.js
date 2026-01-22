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
    MEMORY_END: 0x4000,  // 16KB - trying to find PTT Delay, Alarm Mode, STE, etc.
    CHUNK_SIZE: 32,
    TOTAL_CHANNELS: 199,

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
     * @param {Uint8Array} data - Memory contents to write
     * @param {Function} onProgress - Progress callback (0-1)
     */
    async writeMemory(data, onProgress) {
        if (!this.connected) {
            throw new Error('Not connected');
        }

        // Send handshake sequence
        await this.writeString('AT+BAUD?\r\n');
        await this.delay(100);

        await this.write(new Uint8Array([0x50, 0x56, 0x4F, 0x4A, 0x48, 0x5C, 0x14]));
        await this.delay(100);

        await this.write(new Uint8Array([0x02]));
        await this.delay(50);

        await this.write(new Uint8Array([0x06]));
        await this.delay(50);

        // Write memory in chunks
        const totalChunks = Math.ceil(data.length / this.CHUNK_SIZE);

        for (let addr = 0; addr < data.length; addr += this.CHUNK_SIZE) {
            const addrHi = (addr >> 8) & 0xFF;
            const addrLo = addr & 0xFF;
            const len = Math.min(this.CHUNK_SIZE, data.length - addr);
            const chunk = data.slice(addr, addr + len);

            // W + addrHi + addrLo + len + data
            const packet = new Uint8Array(4 + len);
            packet[0] = 0x57; // 'W'
            packet[1] = addrHi;
            packet[2] = addrLo;
            packet[3] = len;
            packet.set(chunk, 4);

            await this.write(packet);
            await this.delay(50);

            if (onProgress) {
                onProgress((addr + len) / data.length);
            }
        }
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
     * Parse a single channel from memory (16 bytes per channel)
     * @param {Uint8Array} data - Raw memory
     * @param {number} offset - Channel data offset
     * @param {number} nameOffset - Channel name offset
     * @param {number} channelNum - Channel number (1-199)
     * @returns {Object} Channel object
     */
    parseChannel(data, offset, nameOffset, channelNum) {
        // Check if channel is empty (all 0xFF)
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
     * @returns {string} Tone string
     */
    decodeTone(value) {
        if (value === 0 || value === 0xFFFF) return 'OFF';

        // Check if it's a DCS code (high byte has 0x80 bit set or specific pattern)
        const highByte = (value >> 8) & 0xFF;
        const lowByte = value & 0xFF;

        if (highByte >= 0x40) {
            // DCS code - decode as BCD
            const d0 = lowByte & 0x0F;
            const d1 = (lowByte >> 4) & 0x0F;
            const d2 = highByte & 0x0F;
            const dcsCode = d0 + d1 * 10 + d2 * 100;
            return 'D' + dcsCode.toString().padStart(3, '0');
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
        const flags0xCAB = data[0xCAB] || 0;
        const flags0x300A = data[0x300A] || 0;

        return {
            // [1] Squelch Level - 0xCA9: 0=off, 1-9=level
            squelchLevel: data[0xCA9] || 0,

            // [2] Step Freq - 0xCA8 upper nibble: 0=2.5K,1=5K,2=6.25K,3=10K,4=12.5K,5=25K,6=50K,7=0.5K,8=8.33K
            stepFreq: (data[0xCA8] >> 4) & 0x0F,

            // [3] VOX Level - 0xCA7: 0=off, 1-5=level
            voxGain: data[0xCA7] || 0,

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

            // [32] Breath LED - 0xCAF upper nibble: 0=off, 1=5s, 2=10s, 3=15s, 4=30s
            breathLed: (data[0xCAF] >> 4) & 0x0F,

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

            // Legacy/unused fields (kept for compatibility)
            scanRev: 0,
            priorityTx: 0,
            dispLcdTx: true,
            dispLcdRx: true,
            rTone: 2,
            bl: true,
            sync: false,
            rpSte: 0,
            stun: false,
            kill: false
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

        // Encode settings
        const settingsOffset = 0x0C90;
        this.encodeSettings(buffer, settingsOffset, data.settings);

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

        // DCS code
        if (tone.startsWith('D')) {
            const code = parseInt(tone.substring(1), 10);
            // Encode as BCD with high marker
            const d0 = code % 10;
            const d1 = Math.floor(code / 10) % 10;
            const d2 = Math.floor(code / 100) % 10;
            const lowByte = (d1 << 4) | d0;
            const highByte = 0x40 | d2;  // 0x40 marks it as DCS
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

        // 0xCA1: bit 0=Voice[11], bit 2=Keypad Beep[7], bit 4=Keypad Lock[9]
        let flags0xCA1 = buffer[0xCA1] || 0;
        if (settings.voicePrompt) flags0xCA1 |= 0x01; else flags0xCA1 &= ~0x01;
        if (settings.beep) flags0xCA1 |= 0x04; else flags0xCA1 &= ~0x04;
        if (settings.autoLock) flags0xCA1 |= 0x10; else flags0xCA1 &= ~0x10;
        buffer[0xCA1] = flags0xCA1;

        // 0xCA2: bit 2=Display Type-A[17], bit 3=FM Interrupt[26], bits 4-5=Tone Burst[24]
        let flags0xCA2 = buffer[0xCA2] || 0;
        flags0xCA2 = (flags0xCA2 & ~0x04) | ((settings.aChannelDisp || 0) << 2);
        if (settings.fmInterrupt) flags0xCA2 |= 0x08; else flags0xCA2 &= ~0x08;
        flags0xCA2 = (flags0xCA2 & ~0x30) | ((settings.toneBurst || 0) << 4);
        buffer[0xCA2] = flags0xCA2;

        // 0xCA3: bit 2=Dual Watch[10], bit 4=Display Type-B[18], bits 6-7=Power On Display[14]
        let flags0xCA3 = buffer[0xCA3] || 0;
        if (settings.tdr) flags0xCA3 |= 0x04; else flags0xCA3 &= ~0x04;
        flags0xCA3 = (flags0xCA3 & ~0x10) | ((settings.bChannelDisp || 0) << 4);
        flags0xCA3 = (flags0xCA3 & ~0xC0) | ((settings.ponmgs || 0) << 6);
        buffer[0xCA3] = flags0xCA3;

        // 0xCA7: VOX Level [3]
        buffer[0xCA7] = settings.voxGain || 0;

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

        // 0xCAF: upper nibble = Breath LED [32]
        let flags0xCAF = buffer[0xCAF] || 0;
        flags0xCAF = (flags0xCAF & 0x0F) | ((settings.breathLed || 0) << 4);
        buffer[0xCAF] = flags0xCAF;

        // ===== 0x1820: ANI-Edit [16] =====
        const ani = settings.aniEdit || '000';
        buffer[0x1820] = parseInt(ani[0]) || 0;
        buffer[0x1821] = parseInt(ani[1]) || 0;
        buffer[0x1822] = parseInt(ani[2]) || 0;

        // ===== 0x1C00: Startup Messages =====
        this.encodeString(buffer, 0x1C00, settings.msg1 || '', 16);
        this.encodeString(buffer, 0x1C10, settings.msg2 || '', 16);
        this.encodeString(buffer, 0x1C20, settings.msg3 || '', 16);

        // ===== 0x1F20 block: Secondary settings =====
        // 0x1F20: MIC Gain [33]
        buffer[0x1F20] = settings.micGain || 0;

        // 0x1F28: Language [21]
        buffer[0x1F28] = settings.language || 0;

        // 0x1F29: Display [15]
        buffer[0x1F29] = settings.display || 0;

        // 0x1F2A: Menu Color [42]
        buffer[0x1F2A] = settings.menuColor || 0;

        // ===== 0x3000 block: Extended settings =====
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

    // Callback for disconnect events
    onDisconnect: null
};
