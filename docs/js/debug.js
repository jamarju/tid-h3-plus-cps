/**
 * debug.js - Memory hex dump viewer for Tidradio H3 Plus
 *
 * Color coding:
 *   - Green (#aaff66): Known/mapped bytes
 *   - Default: Unknown bytes that are 0xFF (empty)
 *   - Red (#ffaaaa): Unknown bytes that are NOT 0xFF (mystery data)
 */

const Debug = {
    /**
     * Memory map definitions - describes what each byte/region means
     * Format: { start, end, description, type }
     * type: 'setting' | 'channel' | 'name' | 'bitmap' | 'string'
     */
    memoryMap: [
        // Early settings
        { start: 0x001F, end: 0x001F, description: 'Modulation [38]: 0=FM, 1=AM' },

        // Channels (0x0010 - 0x0C7F): 199 channels × 16 bytes
        ...Array.from({ length: 199 }, (_, i) => ({
            start: 0x0010 + i * 16,
            end: 0x0010 + i * 16 + 15,
            description: `Channel ${i + 1} data (16 bytes)`,
            type: 'channel',
            details: [
                { offset: 0, len: 4, desc: 'RX Frequency (BCD LE)' },
                { offset: 4, len: 4, desc: 'TX Frequency (BCD LE)' },
                { offset: 8, len: 2, desc: 'RX Tone (Decode)' },
                { offset: 10, len: 2, desc: 'TX Tone (Encode)' },
                { offset: 12, len: 1, desc: 'Scramble (0-16)' },
                { offset: 13, len: 1, desc: 'Flags: bit2=BusyLock, bit5=FreqHop, bit6-7=PTT ID' },
                { offset: 14, len: 1, desc: 'Flags: bit3=BW(inv), bit4=Power' },
                { offset: 15, len: 1, desc: 'Reserved' }
            ]
        })),

        // Function keys block (0x0C90-0x0C9F)
        { start: 0x0C91, end: 0x0C91, description: 'PF1 Short Press [27]' },
        { start: 0x0C92, end: 0x0C92, description: 'PF2 Short Press [29]' },
        { start: 0x0C94, end: 0x0C94, description: 'PF1 Long Press [28]' },
        { start: 0x0C95, end: 0x0C95, description: 'PF2 Long Press [30]' },
        { start: 0x0C98, end: 0x0C98, description: 'DCD [35]: 0=off, 1=on' },
        { start: 0x0C99, end: 0x0C99, description: 'D-HOLD [36]: 0=off, 1=5s, 2=10s, 3=15s' },
        { start: 0x0C9A, end: 0x0C9A, description: 'D-RSP [37]: 0=null, 1=ring, 2=reply, 3=both' },
        { start: 0x0C9B, end: 0x0C9B, description: 'DTMF Speed [34]: 0=80ms ... 7=150ms' },
        { start: 0x0C9D, end: 0x0C9D, description: 'Brightness [13]: INVERTED (display = 5 - value)' },

        // Main settings packed bytes (0x0CA0-0x0CAF)
        { start: 0x0CA0, end: 0x0CA0, description: 'Flags: bit1=DTMFST[19], bit6=DispLCD(RX), bit7=DispLCD(TX)' },
        { start: 0x0CA1, end: 0x0CA1, description: 'Flags: bit0=Voice[11], bit2=Beep[7], bit4=KeyLock[9], bit6-7=ScanMode (0=TO,1=CO,2=SE)' },
        { start: 0x0CA2, end: 0x0CA2, description: 'Flags: bit2=DispA[17], bit3=FMInt[26], bit4-5=ToneBurst[24], bit7=FMMode (0=VFO,1=CH)' },
        { start: 0x0CA3, end: 0x0CA3, description: 'Flags: bit2=DualWatch[10], bit4=DispB[18], bit6-7=PONMGS[14]' },
        { start: 0x0CA4, end: 0x0CA4, description: 'VFO A current channel' },
        { start: 0x0CA5, end: 0x0CA5, description: 'VFO B current channel' },
        { start: 0x0CA7, end: 0x0CA7, description: 'Flags: bit0-2=VOXLevel[3] (0=off,1-5=level), bit3=STUN, bit4=KILL' },
        { start: 0x0CA8, end: 0x0CA8, description: 'Step Freq [2]: upper nibble (0-8)' },
        { start: 0x0CA9, end: 0x0CA9, description: 'Squelch Level [1]: 0=off, 1-9=level' },
        { start: 0x0CAA, end: 0x0CAA, description: 'TOT [5]: 0=off, 1=30s ... 7=210s' },
        { start: 0x0CAB, end: 0x0CAB, description: 'Flags: bit6-7=Roger[6], bit4=200Tx, bit3=350Tx, bit2=500Tx' },
        { start: 0x0CAC, end: 0x0CAC, description: 'Power Save [8]: 0=off, 1-4=level' },
        { start: 0x0CAD, end: 0x0CAD, description: 'Backlight [12]: 0=always, 1=5s ... 4=30s' },
        { start: 0x0CAE, end: 0x0CAE, description: 'VOX Delay [4]: 0=1s, 1=2s, 2=3s' },
        { start: 0x0CAF, end: 0x0CAF, description: 'Flags: bit1=AM_BAND, bit4-7=BreathLED[32] (0=off,1=5s,2=10s,3=15s,4=30s)' },

        // FM Channels (0x0CD0-0x0D33): 25 channels × 4 bytes
        ...Array.from({ length: 25 }, (_, i) => ({
            start: 0x0CD0 + i * 4,
            end: 0x0CD0 + i * 4 + 3,
            description: `FM Channel ${i + 1} (4 bytes: 16-bit BCD freq in 0.1MHz + 2 padding)`,
            type: 'channel'
        })),

        // Channel names (0x0D40+): 199 names × 8 bytes
        ...Array.from({ length: 199 }, (_, i) => ({
            start: 0x0D40 + i * 8,
            end: 0x0D40 + i * 8 + 7,
            description: `Channel ${i + 1} name (8 chars)`,
            type: 'name'
        })),

        // ANI/ID block (0x1820-0x182F)
        { start: 0x1820, end: 0x1822, description: 'ANI-Edit [16]: 3 digits (0-9 each)' },

        // Channel valid bitmap (0x1900-0x1918)
        { start: 0x1900, end: 0x1918, description: 'Channel Valid bitmap: 199 channels, 1 bit each (1=valid/can cycle to, 0=empty)', type: 'bitmap' },

        // Scan bitmap (0x1920-0x1938)
        { start: 0x1920, end: 0x1938, description: 'Scan bitmap: 199 channels, 1 bit each (1=on, 0=off)', type: 'bitmap' },

        // FM Scan bitmap (0x1940-0x1943)
        { start: 0x1940, end: 0x1943, description: 'FM Scan bitmap: 25 FM channels, 1 bit each (1=on, 0=off)', type: 'bitmap' },

        // VFO A/B frequencies (0x1950-0x196F)
        { start: 0x1950, end: 0x195F, description: 'VFO A frequency (16 bytes, same structure as channels)', type: 'channel' },
        { start: 0x1960, end: 0x196F, description: 'VFO B frequency (16 bytes, same structure as channels)', type: 'channel' },

        // FM VFO frequency (0x1970-0x1971)
        { start: 0x1970, end: 0x1971, description: 'FM VFO frequency (16-bit BCD in 0.1MHz units)' },

        // Startup messages (0x1C00-0x1C2F)
        { start: 0x1C00, end: 0x1C0F, description: 'Startup Message 1 (16 chars)', type: 'string' },
        { start: 0x1C10, end: 0x1C1F, description: 'Startup Message 2 (16 chars)', type: 'string' },
        { start: 0x1C20, end: 0x1C2F, description: 'Startup Message 3 (16 chars)', type: 'string' },

        // Secondary settings (0x1F20-0x1F2F)
        { start: 0x1F20, end: 0x1F20, description: 'MIC Gain [33]: 0-9' },
        { start: 0x1F28, end: 0x1F28, description: 'Language [21]: 0=en, 1=cn, 2=tr, 3=ru, 4=de, 5=es, 6=it, 7=fr' },
        { start: 0x1F29, end: 0x1F29, description: 'Display [15]: 0=single, 1=dual, 2=classic' },
        { start: 0x1F2A, end: 0x1F2A, description: 'Menu Color [42]: 0-17' },
        { start: 0x1F2B, end: 0x1F2C, description: 'Scan Freq Range Upper: 16-bit little-endian (MHz)' },
        { start: 0x1F2D, end: 0x1F2D, description: 'Scan Freq Range Lower: 8-bit (MHz)' },
        { start: 0x1F2F, end: 0x1F2F, description: 'Scan Hang Time: (seconds * 2) - 1, range 0.5s-10.0s' },

        // Extended settings (0x3000+)
        { start: 0x3004, end: 0x3004, description: 'Active VFO: 0=A, 1=B' },
        { start: 0x300A, end: 0x300A, description: 'Flags: bit7=STE[23], bit4-5=AlarmMode[22]' },
        { start: 0x300B, end: 0x300B, description: 'PTT Delay [20]: bits0-5, value=(raw+1)*100ms' },
        { start: 0x300C, end: 0x300C, description: 'Talk Around [25]: 0=off, 1=on' }
    ],

    // Build a lookup table for fast access
    lookupTable: null,

    /**
     * Build lookup table: address -> description
     */
    buildLookupTable() {
        if (this.lookupTable) return;
        this.lookupTable = new Map();

        for (const entry of this.memoryMap) {
            for (let addr = entry.start; addr <= entry.end; addr++) {
                let desc = entry.description;

                // For channel data, provide byte-level detail
                if (entry.type === 'channel' && entry.details) {
                    const byteOffset = addr - entry.start;
                    const detail = entry.details.find(d => byteOffset >= d.offset && byteOffset < d.offset + d.len);
                    if (detail) {
                        desc = `CH${Math.floor((entry.start - 0x0010) / 16) + 1} byte ${byteOffset}: ${detail.desc}`;
                    }
                }

                // For channel names
                if (entry.type === 'name') {
                    const chNum = Math.floor((entry.start - 0x0D40) / 8) + 1;
                    const charIdx = addr - entry.start;
                    desc = `CH${chNum} name char ${charIdx}`;
                }

                // For scan bitmap
                if (entry.type === 'bitmap') {
                    const byteIdx = addr - 0x1920;
                    const startCh = byteIdx * 8 + 1;
                    const endCh = Math.min(startCh + 7, 199);
                    desc = `Scan bitmap: CH${startCh}-${endCh}`;
                }

                this.lookupTable.set(addr, desc);
            }
        }
    },

    /**
     * Check if an address is known/mapped
     */
    isKnown(addr) {
        this.buildLookupTable();
        return this.lookupTable.has(addr);
    },

    /**
     * Get description for an address (returns HTML)
     */
    getDescription(addr, value) {
        this.buildLookupTable();
        const addrStr = `0x${addr.toString(16).toUpperCase().padStart(4, '0')}`;
        const valStr = `0x${value.toString(16).toUpperCase().padStart(2, '0')} (${value})`;
        const desc = this.lookupTable.get(addr);

        if (desc) {
            // Check if this is a packed flags byte (contains bit descriptions)
            if (desc.includes('bit')) {
                return this.formatBitfieldTooltip(addrStr, desc, valStr, value);
            }
            return `<span class="tip-line">${addrStr}: ${this.escapeHtml(desc)}</span><span class="tip-line">Value: ${valStr}</span>`;
        }
        return `<span class="tip-line">${addrStr}: Unknown</span><span class="tip-line">Value: ${valStr}</span>`;
    },

    /**
     * Format a bitfield description into multiple lines
     */
    formatBitfieldTooltip(addrStr, desc, valStr, value) {
        // Parse "Flags: bit0=X, bit2=Y, bit4-5=Z" format
        const match = desc.match(/^([^:]+):\s*(.+)$/);
        if (!match) {
            return `<span class="tip-line">${addrStr}: ${this.escapeHtml(desc)}</span><span class="tip-line">Value: ${valStr}</span>`;
        }

        const label = match[1];
        const bitParts = match[2].split(/,\s*/);

        let html = `<span class="tip-line">${addrStr}: ${this.escapeHtml(label)}</span>`;
        html += `<span class="tip-line">Value: ${valStr} (binary: ${value.toString(2).padStart(8, '0')})</span>`;

        for (const part of bitParts) {
            // Parse bit descriptions like "bit0=Voice[11]" or "bit4-5=ToneBurst[24]"
            const bitMatch = part.match(/bit(\d+)(?:-(\d+))?=(.+)/);
            if (bitMatch) {
                const startBit = parseInt(bitMatch[1]);
                const endBit = bitMatch[2] ? parseInt(bitMatch[2]) : startBit;
                const name = bitMatch[3];

                // Extract the value for this bit range
                const mask = ((1 << (endBit - startBit + 1)) - 1) << startBit;
                const bitValue = (value & mask) >> startBit;

                html += `<span class="tip-bitfield">bit${startBit}${endBit !== startBit ? '-' + endBit : ''}: ${this.escapeHtml(name)} = ${bitValue}</span>`;
            } else {
                html += `<span class="tip-bitfield">${this.escapeHtml(part)}</span>`;
            }
        }

        return html;
    },

    /**
     * Escape HTML special characters
     */
    escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    /**
     * Render hex dump of memory data
     * @param {Uint8Array} data - Raw memory data
     */
    render(data) {
        const container = document.getElementById('hexdump');
        if (!container) return;
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="hexdump-placeholder">No data available</div>';
            return;
        }

        this.buildLookupTable();

        // Build HTML
        let html = '<table class="hexdump-table"><thead><tr><th>Offset</th>';
        for (let i = 0; i < 16; i++) {
            html += `<th>${i.toString(16).toUpperCase()}</th>`;
        }
        html += '<th>ASCII</th></tr></thead><tbody>';

        for (let row = 0; row < data.length; row += 16) {
            const offset = row.toString(16).toUpperCase().padStart(4, '0');
            html += `<tr><td class="hex-offset">0x${offset}</td>`;

            let ascii = '';
            for (let col = 0; col < 16; col++) {
                const addr = row + col;
                if (addr >= data.length) {
                    html += '<td></td>';
                    continue;
                }

                const value = data[addr];
                const hex = value.toString(16).toUpperCase().padStart(2, '0');
                const known = this.isKnown(addr);
                const tip = this.getDescription(addr, value);

                // Color coding
                let className = 'hex-byte';
                if (known) {
                    className += ' hex-known';
                } else if (value === 0xFF) {
                    className += ' hex-empty';
                } else {
                    className += ' hex-unknown';
                }

                // Encode HTML for data attribute (will be decoded when displayed)
                const encodedTip = tip.replace(/"/g, '&quot;');
                html += `<td class="${className}" data-tip="${encodedTip}">${hex}</td>`;

                // ASCII representation
                if (value >= 0x20 && value <= 0x7E) {
                    ascii += String.fromCharCode(value);
                } else {
                    ascii += '.';
                }
            }

            html += `<td class="hex-ascii">${ascii}</td></tr>`;
        }

        html += '</tbody></table>';
        container.innerHTML = html;
        this.initTooltip();
    },

    /**
     * Clear the hex dump display
     */
    clear() {
        const container = document.getElementById('hexdump');
        if (container) {
            container.innerHTML = '<div class="hexdump-placeholder">Read from radio to view memory dump</div>';
        }
    },

    /**
     * Initialize tooltip event listeners
     */
    initTooltip() {
        const container = document.getElementById('hexdump');
        if (!container) return;

        // Create tooltip element if it doesn't exist
        let tooltip = document.getElementById('hexTooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'hexTooltip';
            tooltip.className = 'hex-tooltip';
            document.body.appendChild(tooltip);
        }

        // Event delegation for hover
        container.addEventListener('mouseover', (e) => {
            if (e.target.classList.contains('hex-byte')) {
                const tipHtml = e.target.getAttribute('data-tip');
                if (tipHtml) {
                    tooltip.innerHTML = tipHtml;
                    tooltip.style.display = 'block';
                    this.positionTooltip(e, tooltip);
                }
            }
        });

        container.addEventListener('mousemove', (e) => {
            if (tooltip.style.display === 'block') {
                this.positionTooltip(e, tooltip);
            }
        });

        container.addEventListener('mouseout', (e) => {
            if (e.target.classList.contains('hex-byte')) {
                tooltip.style.display = 'none';
            }
        });
    },

    /**
     * Position tooltip near cursor (bounded to viewport)
     */
    positionTooltip(e, tooltip) {
        const x = e.clientX + 12;
        const y = e.clientY + 12;

        // Keep tooltip within viewport
        const rect = tooltip.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width - 20;
        const maxY = window.innerHeight - rect.height - 20;

        tooltip.style.left = Math.min(x, maxX) + 'px';
        tooltip.style.top = Math.min(y, maxY) + 'px';
    }
};
