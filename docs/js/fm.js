/**
 * fm.js - FM Channels grid for Tidradio H3 Plus CPS
 * Mimics the behavior of the regular channels grid
 */

const FMRadio = {
    // Grid state
    settings: null,
    fmChannels: [], // Array of 25 frequency values
    focusedCell: null,
    editingCell: null,

    // Column definitions
    columns: [
        { key: 'channel', label: 'CH', type: 'readonly', class: 'col-ch' },
        { key: 'frequency', label: 'Frequency (MHz)', type: 'frequency', class: 'col-fmfreq' }
    ],

    /**
     * Initialize FM grid
     * @param {Object} settings - Settings object with fmChannels array
     */
    init(settings) {
        this.settings = settings;
        this.fmChannels = settings.fmChannels || new Array(25).fill(0);
        this.render();
        this.attachEventListeners();
    },

    /**
     * Render the FM grid (25 rows)
     */
    render() {
        const tbody = document.getElementById('fmBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        for (let i = 0; i < 25; i++) {
            const tr = document.createElement('tr');
            tr.dataset.channel = i + 1;

            for (let colIdx = 0; colIdx < this.columns.length; colIdx++) {
                const col = this.columns[colIdx];
                const td = document.createElement('td');
                td.className = col.class || '';

                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = i + 1;
                cell.dataset.col = colIdx;
                cell.dataset.key = col.key;

                if (col.type === 'readonly') {
                    cell.classList.add('readonly');
                    cell.textContent = i + 1;
                } else {
                    cell.classList.add('editable');
                    cell.tabIndex = 0;
                    const freq = this.fmChannels[i] || 0;
                    cell.textContent = freq > 0 ? freq.toFixed(1) : '';
                }

                td.appendChild(cell);
                tr.appendChild(td);
            }

            tbody.appendChild(tr);
        }
    },

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        const grid = document.getElementById('fmGrid');
        if (!grid) return;

        // Track click timing for double-click detection
        let lastClickTime = 0;
        let lastClickCell = null;

        // Click to focus
        grid.addEventListener('click', (e) => {
            const cell = e.target.closest('.cell.editable');
            if (!cell) return;

            // Don't handle clicks on inputs when editing
            if (this.editingCell && e.target.tagName === 'INPUT') {
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

            this.focusCell(cell);
        });

        // Double-click to edit
        grid.addEventListener('dblclick', (e) => {
            const cell = e.target.closest('.cell.editable');
            if (!cell) return;

            // Don't re-edit if already editing this cell
            if (this.editingCell === cell) return;

            this.startEditing(cell);
        });

        // Keyboard navigation - attach to document for consistent behavior
        document.addEventListener('keydown', (e) => {
            // Only handle keyboard events when FM tab is active
            const fmPanel = document.getElementById('fmchannelsPanel');
            if (!fmPanel || !fmPanel.classList.contains('active')) return;

            if (this.editingCell) {
                this.handleEditingKeydown(e);
            } else if (this.focusedCell) {
                this.handleNavigationKeydown(e);
            }
        }, true);
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
        document.querySelectorAll('#fmGrid tr.selected').forEach(tr => {
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
            this.stopEditing(true);
        }

        this.editingCell = cell;
        cell.classList.add('editing');

        const row = parseInt(cell.dataset.row);
        const freq = this.fmChannels[row - 1] || 0;

        // Create input
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'cell-input';
        input.value = freq > 0 ? freq.toFixed(1) : '';
        input.placeholder = 'e.g. 90.5';

        cell.textContent = '';
        cell.appendChild(input);

        // Handle blur - commit value when focus leaves
        input.addEventListener('blur', () => {
            setTimeout(() => {
                if (this.editingCell === cell) {
                    this.stopEditing(true);
                }
            }, 100);
        });

        input.focus();
        input.select();
    },

    /**
     * Stop editing and optionally save
     * @param {boolean} save - Whether to save the value
     */
    stopEditing(save = true) {
        if (!this.editingCell) return;

        const cell = this.editingCell;
        const input = cell.querySelector('input');
        if (!input) return;

        const row = parseInt(cell.dataset.row);

        if (save) {
            const freq = parseFloat(input.value) || 0;

            // Validate frequency range
            if (freq > 0 && (freq < 87 || freq > 109)) {
                alert('FM frequency must be between 87.0 and 109.0 MHz');
                cell.classList.remove('editing');
                cell.textContent = this.fmChannels[row - 1] > 0 ? this.fmChannels[row - 1].toFixed(1) : '';
                this.editingCell = null;
                this.focusCell(cell);
                return;
            }

            this.fmChannels[row - 1] = freq;
            this.settings.fmChannels = this.fmChannels;
        }

        cell.classList.remove('editing');
        const freq = this.fmChannels[row - 1] || 0;
        cell.textContent = freq > 0 ? freq.toFixed(1) : '';
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
                this.moveToCell(e.shiftKey ? -1 : 1, 0); // Move left/right
                break;
        }
    },

    /**
     * Handle keydown when navigating (not editing)
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleNavigationKeydown(e) {
        if (!this.focusedCell) return;

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
                e.preventDefault();
                this.startEditing(this.focusedCell);
                break;
            case 'Delete':
                e.preventDefault();
                this.clearCell();
                break;
            case 'Home':
                e.preventDefault();
                this.moveToFirstCell();
                break;
            case 'End':
                e.preventDefault();
                this.moveToLastCell();
                break;
        }
    },

    /**
     * Move to a relative cell position
     * @param {number} deltaCol - Column delta
     * @param {number} deltaRow - Row delta
     */
    moveToCell(deltaCol, deltaRow) {
        if (!this.focusedCell) return;

        const currentRow = parseInt(this.focusedCell.dataset.row);
        const currentCol = parseInt(this.focusedCell.dataset.col);

        let newRow = currentRow + deltaRow;
        let newCol = currentCol + deltaCol;

        // Clamp to grid bounds
        newRow = Math.max(1, Math.min(25, newRow));
        newCol = Math.max(0, Math.min(this.columns.length - 1, newCol));

        // Skip readonly columns
        if (newCol === 0 && this.columns[0].type === 'readonly') {
            newCol = 1;
        }

        const newCell = document.querySelector(
            `#fmGrid .cell[data-row="${newRow}"][data-col="${newCol}"]`
        );

        if (newCell) {
            this.focusCell(newCell);
        }
    },

    /**
     * Move to first editable cell
     */
    moveToFirstCell() {
        const firstCell = document.querySelector('#fmGrid .cell.editable');
        if (firstCell) {
            this.focusCell(firstCell);
        }
    },

    /**
     * Move to last editable cell
     */
    moveToLastCell() {
        const cells = document.querySelectorAll('#fmGrid .cell.editable');
        if (cells.length > 0) {
            this.focusCell(cells[cells.length - 1]);
        }
    },

    /**
     * Clear the current cell
     */
    clearCell() {
        if (!this.focusedCell) return;

        const row = parseInt(this.focusedCell.dataset.row);
        this.fmChannels[row - 1] = 0;
        this.focusedCell.textContent = '';
    },

    /**
     * Update settings with new data
     * @param {Object} settings - New settings object
     */
    update(settings) {
        this.settings = settings;
        this.fmChannels = settings.fmChannels || new Array(25).fill(0);
        this.render();
        // Auto-focus first cell for keyboard navigation
        setTimeout(() => {
            const firstCell = document.querySelector('#fmGrid .cell.editable');
            if (firstCell) {
                this.focusCell(firstCell);
            }
        }, 100);
    },

    /**
     * Get current settings
     * @returns {Object} Settings object
     */
    getData() {
        return this.settings;
    },

    /**
     * Clear the FM grid
     */
    clear() {
        this.fmChannels = new Array(25).fill(0);
        this.render();
    }
};
