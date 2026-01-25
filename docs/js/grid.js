/**
 * grid.js - Editable channel grid for Tidradio H3 Plus CPS
 */

const Grid = {
    // Grid state
    channels: [],
    focusedCell: null,
    editingCell: null,
    clipboard: null,

    // Column definitions
    columns: [
        { key: 'channel', label: 'CH', type: 'readonly', class: 'col-ch' },
        { key: 'rxFreq', label: 'RX Freq', type: 'frequency', class: 'col-rxfreq' },
        { key: 'txFreq', label: 'TX Freq', type: 'frequency', class: 'col-txfreq' },
        { key: 'frequencyHop', label: 'Hop', type: 'boolean', class: 'col-hop' },
        { key: 'decode', label: 'Decode(RX)', type: 'tone', class: 'col-decode' },
        { key: 'encode', label: 'Encode(TX)', type: 'tone', class: 'col-encode' },
        { key: 'txPower', label: 'Power', type: 'select', options: ['LOW', 'HIGH'], class: 'col-power' },
        { key: 'bandwidth', label: 'BW', type: 'select', options: ['N', 'W'], class: 'col-bw' },
        { key: 'busyLock', label: 'Busy', type: 'boolean', class: 'col-busy' },
        { key: 'pttId', label: 'PTT ID', type: 'select', options: ['OFF', 'BOT', 'EOT', 'BOTH'], class: 'col-pttid' },
        { key: 'scanAdd', label: 'Scan', type: 'boolean', class: 'col-scan' },
        { key: 'name', label: 'Name', type: 'text', maxLength: 8, class: 'col-name' },
        { key: 'scramble', label: 'Scram', type: 'select', options: ['OFF', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16'], class: 'col-scramble' }
    ],

    // Tone options
    toneOptions: (() => {
        const options = ['OFF'];

        // CTCSS tones
        const ctcssTones = [
            '67.0', '69.3', '71.9', '74.4', '77.0', '79.7', '82.5', '85.4',
            '88.5', '91.5', '94.8', '97.4', '100.0', '103.5', '107.2', '110.9',
            '114.8', '118.8', '123.0', '127.3', '131.8', '136.5', '141.3', '146.2',
            '151.4', '156.7', '162.2', '167.9', '173.8', '179.9', '186.2', '192.8',
            '203.5', '206.5', '210.7', '218.1', '225.7', '229.1', '233.6', '241.8',
            '250.3', '254.1'
        ];
        options.push(...ctcssTones);

        // DCS codes - Normal (DXXXN) and Inverted (DXXXI)
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
        // Add normal DCS (DXXXN)
        options.push(...dcsCodes.map(c => 'D' + c + 'N'));
        // Add inverted DCS (DXXXI)
        options.push(...dcsCodes.map(c => 'D' + c + 'I'));

        return options;
    })(),

    /**
     * Initialize the grid
     * @param {Array} channels - Channel data array
     */
    init(channels) {
        this.channels = channels;
        this.render();
        this.attachEventListeners();
    },

    /**
     * Render the grid
     */
    render() {
        const tbody = document.getElementById('channelBody');
        tbody.innerHTML = '';

        for (const channel of this.channels) {
            const tr = document.createElement('tr');
            tr.dataset.channel = channel.channel;

            // Mark row as empty if no RX frequency
            const isEmpty = channel.rxFreq === 0;
            if (isEmpty) {
                tr.classList.add('empty-channel');
            }

            for (let colIdx = 0; colIdx < this.columns.length; colIdx++) {
                const col = this.columns[colIdx];
                const td = document.createElement('td');
                td.className = col.class || '';

                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = channel.channel;
                cell.dataset.col = colIdx;
                cell.dataset.key = col.key;

                if (col.type === 'readonly') {
                    cell.classList.add('readonly');
                    cell.textContent = channel[col.key];
                } else if (isEmpty && col.key !== 'rxFreq' && col.key !== 'txFreq') {
                    // Empty channel - only allow frequency editing
                    cell.classList.add('editable', 'disabled');
                    cell.tabIndex = 0;
                    cell.textContent = '';
                } else {
                    cell.classList.add('editable');
                    cell.tabIndex = 0;
                    cell.textContent = this.formatCellValue(channel[col.key], col);
                }

                td.appendChild(cell);
                tr.appendChild(td);
            }

            tbody.appendChild(tr);
        }
    },

    /**
     * Format a cell value for display
     * @param {*} value - Cell value
     * @param {Object} col - Column definition
     * @returns {string} Formatted value
     */
    formatCellValue(value, col) {
        switch (col.type) {
            case 'frequency':
                return value > 0 ? value.toFixed(5) : '';
            case 'boolean':
                return value ? 'ON' : 'OFF';
            default:
                // Handle scramble: number 0 = 'OFF', 1-16 = '1'-'16'
                if (col.key === 'scramble' && typeof value === 'number') {
                    return value === 0 ? 'OFF' : String(value);
                }
                return value !== null && value !== undefined ? String(value) : '';
        }
    },

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        const grid = document.getElementById('channelGrid');

        // Track click timing for double-click detection
        let lastClickTime = 0;
        let lastClickCell = null;

        // Click to focus (or toggle boolean cells)
        grid.addEventListener('click', (e) => {
            const cell = e.target.closest('.cell.editable');
            if (!cell || cell.classList.contains('disabled')) return;

            // Don't handle clicks on inputs/selects when editing
            if (this.editingCell && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) {
                return;
            }

            const now = Date.now();
            const isDoubleClick = (now - lastClickTime < 400) && (lastClickCell === cell);
            lastClickTime = now;
            lastClickCell = cell;

            // If this looks like a double-click, don't handle - let dblclick handler take over
            if (isDoubleClick) {
                return;
            }

            const colIdx = parseInt(cell.dataset.col);
            const col = this.columns[colIdx];

            // Boolean cells toggle on single click
            if (col.type === 'boolean') {
                this.toggleBoolean(cell);
            } else {
                this.focusCell(cell);
            }
        });

        // Double-click to edit
        grid.addEventListener('dblclick', (e) => {
            const cell = e.target.closest('.cell.editable');
            if (!cell || cell.classList.contains('disabled')) return;

            // Don't re-edit if already editing this cell
            if (this.editingCell === cell) return;

            const colIdx = parseInt(cell.dataset.col);
            const col = this.columns[colIdx];

            // For booleans, double-click also toggles (single clicks toggle too)
            if (col.type === 'boolean') {
                this.toggleBoolean(cell);
            } else {
                this.startEditing(cell);
            }
        });

        // Keyboard navigation - use capturing phase to handle before browser defaults
        grid.addEventListener('keydown', (e) => {
            if (this.editingCell) {
                this.handleEditingKeydown(e);
            } else if (this.focusedCell) {
                this.handleNavigationKeydown(e);
            }
        }, true);

        // Copy/Paste at document level
        document.addEventListener('copy', (e) => this.handleCopy(e));
        document.addEventListener('paste', (e) => this.handlePaste(e));
    },

    /**
     * Focus a cell
     * @param {HTMLElement} cell - Cell element
     */
    focusCell(cell) {
        if (this.focusedCell) {
            this.focusedCell.classList.remove('focused');
        }
        this.focusedCell = cell;
        cell.classList.add('focused');
        cell.focus();

        // Update row selection
        document.querySelectorAll('#channelGrid tr.selected').forEach(tr => {
            tr.classList.remove('selected');
        });
        cell.closest('tr').classList.add('selected');
    },

    /**
     * Toggle a boolean cell value
     * @param {HTMLElement} cell - Cell element
     */
    toggleBoolean(cell) {
        const row = parseInt(cell.dataset.row);
        const colIdx = parseInt(cell.dataset.col);
        const col = this.columns[colIdx];
        const channel = this.channels[row - 1];

        // Toggle the value
        channel[col.key] = !channel[col.key];

        // Update display
        cell.textContent = this.formatCellValue(channel[col.key], col);

        // Focus the cell for keyboard navigation
        this.focusCell(cell);
    },

    /**
     * Start editing a cell
     * @param {HTMLElement} cell - Cell element
     */
    startEditing(cell) {
        // Don't edit disabled cells
        if (cell.classList.contains('disabled')) return;

        if (this.editingCell) {
            this.stopEditing(false);
        }

        const row = parseInt(cell.dataset.row);
        const colIdx = parseInt(cell.dataset.col);
        const col = this.columns[colIdx];
        const channel = this.channels[row - 1];
        const value = channel[col.key];

        this.editingCell = cell;
        cell.classList.add('editing');

        let input;

        switch (col.type) {
            case 'frequency':
                input = document.createElement('input');
                input.type = 'text';
                input.value = value > 0 ? value.toFixed(5) : '';
                input.placeholder = '000.00000';
                break;

            case 'text':
                input = document.createElement('input');
                input.type = 'text';
                input.value = value || '';
                if (col.maxLength) input.maxLength = col.maxLength;
                break;

            case 'boolean':
                input = document.createElement('select');
                input.innerHTML = '<option value="false">OFF</option><option value="true">ON</option>';
                input.value = value ? 'true' : 'false';
                break;

            case 'select':
                input = document.createElement('select');
                for (const opt of col.options) {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.textContent = opt;
                    input.appendChild(option);
                }
                // Handle scramble: number 0 = 'OFF', 1-16 = '1'-'16'
                if (col.key === 'scramble' && typeof value === 'number') {
                    input.value = value === 0 ? 'OFF' : String(value);
                } else {
                    input.value = value;
                }
                break;

            case 'tone':
                input = document.createElement('select');
                for (const opt of this.toneOptions) {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.textContent = opt;
                    input.appendChild(option);
                }
                input.value = value || 'OFF';
                break;
        }

        cell.textContent = '';
        cell.appendChild(input);

        // Handle blur - commit value when focus leaves
        input.addEventListener('blur', () => {
            // Small delay to allow click handlers to run first
            setTimeout(() => {
                if (this.editingCell === cell) {
                    this.stopEditing(true);
                }
            }, 100);
        });

        // Handle change for selects - commit immediately on selection
        if (input.tagName === 'SELECT') {
            input.addEventListener('change', () => {
                this.stopEditing(true);
                this.moveToCell(0, 1); // Move down after selection
            });
        }

        input.focus();

        // For text inputs, select all text
        if (input.tagName === 'INPUT') {
            input.select();
        }

        // For selects, auto-expand the dropdown
        if (input.tagName === 'SELECT') {
            // Use showPicker for modern browsers, with a small delay for DOM stability
            requestAnimationFrame(() => {
                if (input.showPicker) {
                    try {
                        input.showPicker();
                    } catch {
                        // Ignore if showPicker fails (e.g., not triggered by user gesture)
                    }
                }
            });
        }
    },

    /**
     * Stop editing and optionally save
     * @param {boolean} save - Whether to save the value
     */
    stopEditing(save = true) {
        if (!this.editingCell) return;

        const cell = this.editingCell;
        const input = cell.querySelector('input, select');
        if (!input) return;

        const row = parseInt(cell.dataset.row);
        const colIdx = parseInt(cell.dataset.col);
        const col = this.columns[colIdx];
        const channel = this.channels[row - 1];

        // Capture empty state BEFORE saving new value
        const wasEmpty = channel.rxFreq === 0 && channel.txFreq === 0;

        if (save) {
            const rawValue = input.value;
            let newValue;

            switch (col.type) {
                case 'frequency':
                    newValue = parseFloat(rawValue) || 0;
                    break;
                case 'boolean':
                    newValue = rawValue === 'true';
                    break;
                default:
                    // Handle scramble: 'OFF' = 0, '1'-'16' = number
                    if (col.key === 'scramble') {
                        newValue = rawValue === 'OFF' ? 0 : parseInt(rawValue, 10);
                    } else {
                        newValue = rawValue;
                    }
            }

            channel[col.key] = newValue;

            // Handle frequency field edits - auto-populate defaults
            if (col.key === 'rxFreq' || col.key === 'txFreq') {
                const needsRerender = this.handleFrequencyEdit(channel, col.key, wasEmpty);
                if (needsRerender) {
                    this.editingCell = null;
                    this.render();
                    // Focus the RX freq column on the same row after clearing
                    this.moveTo(row, 1);
                    return; // Early return since render() clears editingCell
                }
            }
        }

        cell.classList.remove('editing');
        cell.textContent = this.formatCellValue(channel[col.key], col);
        this.editingCell = null;

        // Restore focus to the cell for keyboard navigation
        this.focusCell(cell);
    },

    /**
     * Handle keydown when editing
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleEditingKeydown(e) {
        switch (e.key) {
            case 'Enter':
                e.preventDefault();
                this.stopEditing(true);
                this.moveToCell(0, 1); // Move down
                break;
            case 'Escape':
                e.preventDefault();
                this.stopEditing(false);
                break;
            case 'Tab':
                e.preventDefault();
                this.stopEditing(true);
                this.moveToCell(e.shiftKey ? -1 : 1, 0);
                break;
        }
    },

    /**
     * Handle frequency field edit - auto-populate or clear channel
     * @param {Object} channel - Channel data
     * @param {string} editedKey - 'rxFreq' or 'txFreq'
     * @param {boolean} wasEmpty - Whether channel was empty before edit
     * @returns {boolean} True if re-render needed
     */
    handleFrequencyEdit(channel, editedKey, wasEmpty) {
        const rxFreq = channel.rxFreq;
        const txFreq = channel.txFreq;

        if (editedKey === 'rxFreq') {
            if (rxFreq > 0 && txFreq === 0) {
                // RX entered, TX empty → copy RX to TX
                channel.txFreq = rxFreq;
            }
            if (rxFreq === 0) {
                // RX cleared → clear entire channel
                this.clearChannelData(channel);
                return true; // needs re-render
            }
            if (wasEmpty && rxFreq > 0) {
                // Was empty, now has RX → populate defaults
                this.populateChannelDefaults(channel);
                return true; // needs re-render
            }
        }

        if (editedKey === 'txFreq') {
            if (txFreq > 0 && rxFreq === 0) {
                // TX entered, RX empty → copy TX to RX (makes channel valid)
                channel.rxFreq = txFreq;
                this.populateChannelDefaults(channel);
                return true; // needs re-render
            }
            // TX cleared alone: just leave it cleared, channel still valid if RX > 0
        }

        return false; // no re-render needed
    },

    /**
     * Populate default values for a new channel
     * @param {Object} channel - Channel data
     */
    populateChannelDefaults(channel) {
        // TX freq defaults to RX freq (no offset) if not already set
        if (channel.txFreq === 0) {
            channel.txFreq = channel.rxFreq;
        }
        // Other defaults are already set from getEmptyChannel() or should remain
    },

    /**
     * Clear all channel data (reset to empty)
     * @param {Object} channel - Channel data
     */
    clearChannelData(channel) {
        channel.rxFreq = 0;
        channel.txFreq = 0;
        channel.frequencyHop = false;
        channel.decode = 'OFF';
        channel.encode = 'OFF';
        channel.txPower = 'HIGH';
        channel.bandwidth = 'W';
        channel.busyLock = false;
        channel.pttId = 'OFF';
        channel.scanAdd = true;
        channel.name = '';
        channel.scramble = 0;
    },

    /**
     * Handle keydown for navigation
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleNavigationKeydown(e) {
        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                this.moveToCell(0, -1);
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.moveToCell(0, 1);
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.moveToCell(-1, 0);
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.moveToCell(1, 0);
                break;
            case 'Enter':
            case 'F2':
                e.preventDefault();
                this.startEditing(this.focusedCell);
                break;
            case 'Tab':
                e.preventDefault();
                this.moveToCell(e.shiftKey ? -1 : 1, 0);
                break;
            case 'Home':
                e.preventDefault();
                if (e.ctrlKey) {
                    this.moveTo(1, 1);
                } else {
                    this.moveTo(parseInt(this.focusedCell.dataset.row), 1);
                }
                break;
            case 'End':
                e.preventDefault();
                if (e.ctrlKey) {
                    this.moveTo(199, this.columns.length - 1);
                } else {
                    this.moveTo(parseInt(this.focusedCell.dataset.row), this.columns.length - 1);
                }
                break;
            case 'PageUp':
                e.preventDefault();
                this.moveToCell(0, -20);
                break;
            case 'PageDown':
                e.preventDefault();
                this.moveToCell(0, 20);
                break;
            case 'Delete':
                e.preventDefault();
                this.clearCell();
                break;
            default:
                // Start editing on any printable character
                if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                    this.startEditing(this.focusedCell);
                }
        }
    },

    /**
     * Move focus by delta
     * @param {number} dx - Column delta
     * @param {number} dy - Row delta
     */
    moveToCell(dx, dy) {
        if (!this.focusedCell) return;

        let row = parseInt(this.focusedCell.dataset.row);
        let col = parseInt(this.focusedCell.dataset.col);

        col += dx;
        row += dy;

        // Wrap columns, skip readonly
        if (col < 1) col = this.columns.length - 1;
        if (col >= this.columns.length) col = 1;

        // Clamp rows
        if (row < 1) row = 1;
        if (row > 199) row = 199;

        this.moveTo(row, col);
    },

    /**
     * Move to specific cell
     * @param {number} row - Row number (1-199)
     * @param {number} col - Column index
     */
    moveTo(row, col) {
        // Skip readonly columns
        if (this.columns[col].type === 'readonly') {
            col = 1;
        }

        const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        if (cell) {
            this.focusCell(cell);
            cell.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
    },

    /**
     * Clear the current cell
     */
    clearCell() {
        if (!this.focusedCell) return;

        const row = parseInt(this.focusedCell.dataset.row);
        const colIdx = parseInt(this.focusedCell.dataset.col);
        const col = this.columns[colIdx];
        const channel = this.channels[row - 1];

        // Capture state before clearing
        const wasEmpty = channel.rxFreq === 0 && channel.txFreq === 0;

        switch (col.type) {
            case 'frequency':
                channel[col.key] = 0;
                break;
            case 'boolean':
                channel[col.key] = false;
                break;
            case 'text':
                channel[col.key] = '';
                break;
            case 'select':
                // Handle scramble: clear to 0 (number), others to first option (string)
                if (col.key === 'scramble') {
                    channel[col.key] = 0;
                } else {
                    channel[col.key] = col.options[0];
                }
                break;
            case 'tone':
                channel[col.key] = 'OFF';
                break;
        }

        // Handle frequency clearing - may need to clear entire channel
        if (col.key === 'rxFreq' || col.key === 'txFreq') {
            const needsRerender = this.handleFrequencyEdit(channel, col.key, wasEmpty);
            if (needsRerender) {
                this.render();
                this.moveTo(row, colIdx);
                return;
            }
        }

        this.focusedCell.textContent = this.formatCellValue(channel[col.key], col);
    },

    /**
     * Handle copy event
     * @param {ClipboardEvent} e - Clipboard event
     */
    handleCopy(e) {
        if (!this.focusedCell || this.editingCell) return;

        const row = parseInt(this.focusedCell.dataset.row);
        const colIdx = parseInt(this.focusedCell.dataset.col);
        const col = this.columns[colIdx];
        const channel = this.channels[row - 1];

        const value = channel[col.key];
        const text = this.formatCellValue(value, col);

        e.clipboardData.setData('text/plain', text);
        e.clipboardData.setData('application/x-tidradio-cell', JSON.stringify({
            type: col.type,
            value: value
        }));
        e.preventDefault();
    },

    /**
     * Handle paste event
     * @param {ClipboardEvent} e - Clipboard event
     */
    handlePaste(e) {
        if (!this.focusedCell || this.editingCell) return;

        const row = parseInt(this.focusedCell.dataset.row);
        const colIdx = parseInt(this.focusedCell.dataset.col);
        const col = this.columns[colIdx];
        const channel = this.channels[row - 1];

        // Try rich format first
        const richData = e.clipboardData.getData('application/x-tidradio-cell');
        if (richData) {
            try {
                const { value } = JSON.parse(richData);
                channel[col.key] = value;
                this.focusedCell.textContent = this.formatCellValue(channel[col.key], col);
                e.preventDefault();
                return;
            } catch { }
        }

        // Fall back to text
        const text = e.clipboardData.getData('text/plain').trim();
        if (text) {
            let newValue;
            switch (col.type) {
                case 'frequency':
                    newValue = parseFloat(text) || 0;
                    break;
                case 'boolean':
                    newValue = text.toLowerCase() === 'on' || text === 'true' || text === '1';
                    break;
                case 'select':
                    // Handle scramble paste: convert to number
                    if (col.key === 'scramble') {
                        if (text.toUpperCase() === 'OFF') {
                            newValue = 0;
                        } else {
                            const num = parseInt(text, 10);
                            newValue = (num >= 0 && num <= 16) ? num : channel[col.key];
                        }
                    } else {
                        newValue = col.options.includes(text) ? text : channel[col.key];
                    }
                    break;
                case 'tone':
                    newValue = this.toneOptions.includes(text) ? text : channel[col.key];
                    break;
                default:
                    newValue = text;
            }

            channel[col.key] = newValue;
            this.focusedCell.textContent = this.formatCellValue(channel[col.key], col);
        }

        e.preventDefault();
    },

    /**
     * Update grid with new channel data
     * @param {Array} channels - New channel data
     */
    update(channels) {
        this.channels = channels;
        this.render();
        this.focusedCell = null;
        this.editingCell = null;
    },

    /**
     * Get current channel data
     * @returns {Array} Channel data
     */
    getData() {
        return this.channels;
    }
};
