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
        { key: 'pttId', label: 'PTT ID', type: 'boolean', class: 'col-pttid' },
        { key: 'scanAdd', label: 'Scan', type: 'boolean', class: 'col-scan' },
        { key: 'name', label: 'Name', type: 'text', maxLength: 8, class: 'col-name' },
        { key: 'scramble', label: 'Scram', type: 'boolean', class: 'col-scramble' }
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
        options.push(...dcsCodes.map(c => 'D' + c));

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
                return value !== null && value !== undefined ? String(value) : '';
        }
    },

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        const grid = document.getElementById('channelGrid');

        // Click to focus
        grid.addEventListener('click', (e) => {
            const cell = e.target.closest('.cell.editable');
            if (cell) {
                this.focusCell(cell);
            }
        });

        // Double-click to edit
        grid.addEventListener('dblclick', (e) => {
            const cell = e.target.closest('.cell.editable');
            if (cell) {
                this.startEditing(cell);
            }
        });

        // Keyboard navigation
        grid.addEventListener('keydown', (e) => {
            if (this.editingCell) {
                this.handleEditingKeydown(e);
            } else if (this.focusedCell) {
                this.handleNavigationKeydown(e);
            }
        });

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
     * Start editing a cell
     * @param {HTMLElement} cell - Cell element
     */
    startEditing(cell) {
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
                input.value = value;
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
        input.focus();
        input.select?.();
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
                    newValue = rawValue;
            }

            channel[col.key] = newValue;
        }

        cell.classList.remove('editing');
        cell.textContent = this.formatCellValue(channel[col.key], col);
        this.editingCell = null;
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
                channel[col.key] = col.options[0];
                break;
            case 'tone':
                channel[col.key] = 'OFF';
                break;
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
                    newValue = col.options.includes(text) ? text : channel[col.key];
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
