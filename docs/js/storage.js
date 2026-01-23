/**
 * storage.js - File save/load operations for Tidradio H3 Plus CPS
 *
 * File format: Raw 16KB binary dump of radio memory (.h3p)
 */

const Storage = {
    FILE_EXTENSION: '.h3p',
    MEMORY_SIZE: 16384,

    /**
     * Save raw memory to binary file
     * @param {Uint8Array} rawData - 16KB raw memory dump
     * @param {string} filename - Suggested filename
     */
    async save(rawData, filename = 'tidradio_h3plus') {
        if (!rawData || rawData.length !== this.MEMORY_SIZE) {
            throw new Error('Invalid data: expected 16KB memory dump');
        }

        const blob = new Blob([rawData], { type: 'application/octet-stream' });

        // Try File System Access API first (modern browsers)
        if ('showSaveFilePicker' in window) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: filename + this.FILE_EXTENSION,
                    types: [{
                        description: 'H3 Plus Memory Dump',
                        accept: { 'application/octet-stream': [this.FILE_EXTENSION] }
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
     * Load raw memory from binary file
     * @returns {Promise<Object>} Loaded data with rawData Uint8Array
     */
    async load() {
        // Try File System Access API first
        if ('showOpenFilePicker' in window) {
            try {
                const [handle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'H3 Plus Memory Dump',
                        accept: { 'application/octet-stream': [this.FILE_EXTENSION] }
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
     * Parse a loaded binary file
     * @param {File} file - File to parse
     * @returns {Promise<Object>} Parsed data with rawData
     */
    async parseFile(file) {
        const buffer = await file.arrayBuffer();
        const rawData = new Uint8Array(buffer);

        // Validate file size
        if (rawData.length !== this.MEMORY_SIZE) {
            throw new Error(`Invalid file size: expected ${this.MEMORY_SIZE} bytes, got ${rawData.length}`);
        }

        return {
            success: true,
            filename: file.name,
            rawData: rawData
        };
    }
};
