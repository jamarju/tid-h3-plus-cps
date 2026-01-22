/**
 * storage.js - File save/load operations for Tidradio H3 Plus CPS
 */

const Storage = {
    FILE_VERSION: '1.0',
    FILE_EXTENSION: '.h3p',

    /**
     * Save data to a JSON file
     * @param {Object} data - Data to save (channels and settings)
     * @param {string} filename - Suggested filename
     */
    async save(data, filename = 'tidradio_h3plus') {
        const exportData = {
            version: this.FILE_VERSION,
            device: 'TD-H3-Plus',
            timestamp: new Date().toISOString(),
            channels: data.channels,
            settings: data.settings,
            rawData: data.rawData || null
        };

        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });

        // Try File System Access API first (modern browsers)
        if ('showSaveFilePicker' in window) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: filename + this.FILE_EXTENSION,
                    types: [{
                        description: 'H3 Plus Config',
                        accept: { 'application/json': [this.FILE_EXTENSION, '.json'] }
                    }]
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                return { success: true, filename: handle.name };
            } catch (err) {
                if (err.name === 'AbortError') {
                    return { success: false, cancelled: true };
                }
                throw err;
            }
        }

        // Fallback for older browsers
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename + this.FILE_EXTENSION;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return { success: true, filename: a.download };
    },

    /**
     * Load data from a JSON file
     * @returns {Promise<Object>} Loaded data
     */
    async load() {
        // Try File System Access API first
        if ('showOpenFilePicker' in window) {
            try {
                const [handle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'H3 Plus Config',
                        accept: { 'application/json': [this.FILE_EXTENSION, '.json'] }
                    }]
                });
                const file = await handle.getFile();
                return await this.parseFile(file);
            } catch (err) {
                if (err.name === 'AbortError') {
                    return { success: false, cancelled: true };
                }
                throw err;
            }
        }

        // Fallback: use hidden file input
        return new Promise((resolve, reject) => {
            const input = document.getElementById('fileInput');

            const handleChange = async (e) => {
                input.removeEventListener('change', handleChange);
                const file = e.target.files[0];
                if (!file) {
                    resolve({ success: false, cancelled: true });
                    return;
                }
                try {
                    const result = await this.parseFile(file);
                    resolve(result);
                } catch (err) {
                    reject(err);
                }
                input.value = '';
            };

            input.addEventListener('change', handleChange);
            input.click();
        });
    },

    /**
     * Parse a loaded file
     * @param {File} file - File to parse
     * @returns {Promise<Object>} Parsed data
     */
    async parseFile(file) {
        const text = await file.text();
        let data;

        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error('Invalid JSON file');
        }

        // Validate file structure
        if (!this.validateData(data)) {
            throw new Error('Invalid file format');
        }

        return {
            success: true,
            filename: file.name,
            data: {
                channels: data.channels,
                settings: data.settings,
                rawData: data.rawData || null
            }
        };
    },

    /**
     * Validate loaded data structure
     * @param {Object} data - Data to validate
     * @returns {boolean} True if valid
     */
    validateData(data) {
        if (!data || typeof data !== 'object') return false;
        if (!data.channels || !Array.isArray(data.channels)) return false;
        if (!data.settings || typeof data.settings !== 'object') return false;

        // Validate channel count
        if (data.channels.length > 199) return false;

        // Validate each channel has required fields
        for (const ch of data.channels) {
            if (typeof ch.channel !== 'number') return false;
            if (ch.channel < 1 || ch.channel > 199) return false;
        }

        return true;
    },

    /**
     * Create default channel data
     * @param {number} channelNum - Channel number (1-199)
     * @returns {Object} Default channel object
     */
    createDefaultChannel(channelNum) {
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
            pttId: 'OFF',        // OFF, BOT, EOT, BOTH
            scanAdd: true,
            name: '',
            scramble: 0          // 0=off, 1-16=level
        };
    },

    /**
     * Create default settings
     * @returns {Object} Default settings object
     */
    createDefaultSettings() {
        return {
            lightControl: 2,
            squelchLevel: 5,
            voicePrompt: true,
            language: 0,
            tot: 3,
            save: 0,
            scanRev: 0,
            priorityTx: 0,
            dispLcdTx: true,
            dispLcdRx: true,
            autoLock: false,
            roger: 0,
            beep: true,
            shortKeyPf1: 0,
            longKeyPf1: 0,
            shortKeyPf2: 0,
            longKeyPf2: 0,
            voxGain: 0,
            voxDelay: 1,
            alarmMode: 0,
            tdr: false,
            rTone: 2,
            bl: false,
            sync: false,
            aChannelDisp: 0,
            bChannelDisp: 0,
            rpSte: 0,
            micGain: 5,
            breathLed: 0,
            dtmfSideTone: false,
            stun: false,
            kill: false,
            ponmgs: 0,
            msg1: '',
            msg2: '',
            msg3: '',
            dDcd: false,
            dHold: 0,
            dtmfSpeed: 2,
            brightness: 5,
            dRsp: 0,
            amBand: false
        };
    },

    /**
     * Create initial app data with defaults
     * @returns {Object} Initial data object
     */
    createInitialData() {
        const channels = [];
        for (let i = 1; i <= 199; i++) {
            channels.push(this.createDefaultChannel(i));
        }
        return {
            channels,
            settings: this.createDefaultSettings()
        };
    }
};
