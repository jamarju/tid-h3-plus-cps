/**
 * main.js - Main application for Tidradio H3 Plus CPS
 */

const App = {
    // State
    connected: false,
    rawData: null,
    isReading: false,

    // UI Elements
    elements: {},

    /**
     * Initialize the application
     */
    init() {
        this.cacheElements();
        this.attachEventListeners();
        this.initializeData();
        this.updateUI();
        this.updateGridState();
    },

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            btnConnect: document.getElementById('btnConnect'),
            btnRead: document.getElementById('btnRead'),
            btnWrite: document.getElementById('btnWrite'),
            btnWriteDropdown: document.getElementById('btnWriteDropdown'),
            writeMenu: document.getElementById('writeMenu'),
            btnLoad: document.getElementById('btnLoad'),
            btnSave: document.getElementById('btnSave'),
            connectionStatus: document.getElementById('connectionStatus'),
            statusMessage: document.getElementById('statusMessage'),
            progressContainer: document.getElementById('progressContainer'),
            progressBar: document.getElementById('progressBar'),
            tabs: document.querySelectorAll('.tab'),
            panels: document.querySelectorAll('.panel'),
            gridContainer: document.getElementById('gridContainer'),
            gridDisabledMessage: document.getElementById('gridDisabledMessage'),
            settingsContainer: document.getElementById('settingsContainer'),
            settingsDisabledMessage: document.getElementById('settingsDisabledMessage'),
            fmContainer: document.getElementById('fmContainer'),
            fmDisabledMessage: document.getElementById('fmDisabledMessage'),
            debugContainer: document.getElementById('debugContainer'),
            debugDisabledMessage: document.getElementById('debugDisabledMessage')
        };
    },

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Connection
        this.elements.btnConnect.addEventListener('click', () => this.handleConnect());

        // Read/Write
        this.elements.btnRead.addEventListener('click', () => this.handleRead());
        this.elements.btnWrite.addEventListener('click', () => this.handleWrite('all'));

        // Write dropdown
        this.elements.btnWriteDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            this.elements.writeMenu.classList.toggle('show');
        });

        this.elements.writeMenu.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const mode = btn.dataset.mode;
                this.elements.writeMenu.classList.remove('show');
                this.handleWrite(mode);
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            this.elements.writeMenu.classList.remove('show');
        });

        // File operations
        this.elements.btnLoad.addEventListener('click', () => this.handleLoad());
        this.elements.btnSave.addEventListener('click', () => this.handleSave());

        // Tab switching
        this.elements.tabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // BLE disconnect callback
        BLE.onDisconnect = () => this.handleDisconnect();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleGlobalKeydown(e));
    },

    /**
     * Initialize UI components (empty until data is loaded)
     */
    initializeData() {
        // Create empty channels for grid structure
        const channels = [];
        for (let i = 1; i <= 199; i++) {
            channels.push({
                channel: i, rxFreq: 0, txFreq: 0, frequencyHop: false,
                decode: 'OFF', encode: 'OFF', txPower: 'HIGH', bandwidth: 'W',
                busyLock: false, pttId: 'OFF', scanAdd: true, name: '', scramble: 0
            });
        }
        // Empty settings
        const settings = {
            fmChannels: new Array(25).fill(0),
            fmVfoFreq: 0,
            fmMode: 0
        };

        Grid.init(channels);
        Settings.init(settings);
        FMRadio.init(settings);
    },

    /**
     * Update UI based on connection state
     */
    updateUI() {
        this.elements.btnRead.disabled = !this.connected;
        this.elements.btnWrite.disabled = !this.connected;
        this.elements.btnWriteDropdown.disabled = !this.connected;

        this.elements.connectionStatus.textContent = this.connected ? 'Connected' : 'Disconnected';
        this.elements.connectionStatus.classList.toggle('connected', this.connected);

        this.elements.btnConnect.textContent = this.connected ? 'Disconnect' : 'Connect';
    },

    /**
     * Handle connect/disconnect button
     */
    async handleConnect() {
        if (this.connected) {
            BLE.disconnect();
            return;
        }

        try {
            this.setStatus('Connecting...');
            await BLE.connect();
            this.connected = true;
            this.setStatus('Connected to ' + (BLE.device?.name || 'device'));
            this.updateUI();
        } catch (err) {
            if (err.name !== 'NotFoundError') {
                this.setStatus('Connection failed: ' + err.message);
            } else {
                this.setStatus('Ready');
            }
        }
    },

    /**
     * Handle BLE disconnect
     */
    handleDisconnect() {
        this.connected = false;
        this.setStatus('Disconnected');
        this.updateUI();
    },

    /**
     * Handle read from radio
     */
    async handleRead() {
        if (!this.connected) return;

        try {
            this.setStatus('Reading...');
            this.showProgress(true);
            this.isReading = true;
            this.updateGridState();

            const memory = await BLE.readMemory((progress) => {
                this.setProgress(progress);
            });

            this.rawData = memory;
            const data = BLE.parseMemory(memory);

            Grid.update(data.channels);
            Settings.update(data.settings);
            FMRadio.update(data.settings);
            Debug.render(memory);

            this.showProgress(false);
            this.isReading = false;
            this.updateGridState();
            this.setStatus('Read complete - ' + memory.length + ' bytes');
        } catch (err) {
            this.showProgress(false);
            this.isReading = false;
            this.updateGridState();
            this.setStatus('Read failed: ' + err.message);
        }
    },

    /**
     * Handle write to radio
     * @param {string} mode - Write mode: 'all', 'settings', or 'channels'
     */
    async handleWrite(mode = 'all') {
        if (!this.connected) return;

        // SAFETY: Require rawData from a prior read to preserve unmapped bytes
        if (!this.rawData) {
            this.setStatus('Error: Must read from radio first before writing');
            return;
        }

        try {
            // Validate settings
            const validation = Settings.validate();
            if (!validation.valid) {
                this.setStatus('Validation error: ' + validation.errors[0]);
                return;
            }

            const modeLabels = { all: 'all', settings: 'settings', channels: 'channels', fm: 'FM radio' };
            this.setStatus('Writing ' + modeLabels[mode] + '...');
            this.showProgress(true);

            const data = {
                channels: Grid.getData(),
                settings: Settings.getData(),
                rawData: this.rawData ? Array.from(this.rawData) : null
            };

            const memory = BLE.encodeMemory(data);

            await BLE.writeMemory(memory, (progress) => {
                this.setProgress(progress);
            }, mode);

            this.showProgress(false);
            this.setStatus('Write complete (' + modeLabels[mode] + ')');
        } catch (err) {
            this.showProgress(false);
            this.setStatus('Write failed: ' + err.message);
        }
    },

    /**
     * Handle load file (binary 16KB dump)
     */
    async handleLoad() {
        try {
            this.setStatus('Loading...');
            const result = await Storage.load();

            if (result.cancelled) {
                this.setStatus('Ready');
                return;
            }

            // Parse raw binary data
            this.rawData = result.rawData;
            const parsed = BLE.parseMemory(this.rawData);

            Grid.update(parsed.channels);
            Settings.update(parsed.settings);
            FMRadio.update(parsed.settings);
            Debug.render(this.rawData);

            this.updateGridState();
            this.setStatus('Loaded: ' + result.filename);
        } catch (err) {
            this.setStatus('Load failed: ' + err.message);
        }
    },

    /**
     * Handle save file (binary 16KB dump)
     */
    async handleSave() {
        try {
            if (!this.rawData) {
                this.setStatus('No data to save. Read from radio first.');
                return;
            }

            // Validate settings
            const validation = Settings.validate();
            if (!validation.valid) {
                this.setStatus('Validation error: ' + validation.errors[0]);
                return;
            }

            this.setStatus('Saving...');

            // Encode current UI state into rawData
            const encoded = BLE.encodeMemory({
                channels: Grid.getData(),
                settings: Settings.getData(),
                rawData: Array.from(this.rawData)
            });

            const result = await Storage.save(encoded);

            if (result.cancelled) {
                this.setStatus('Ready');
                return;
            }

            this.setStatus('Saved: ' + result.filename);
        } catch (err) {
            this.setStatus('Save failed: ' + err.message);
        }
    },

    /**
     * Switch active tab
     * @param {string} tabId - Tab ID to switch to
     */
    switchTab(tabId) {
        this.elements.tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });

        this.elements.panels.forEach(panel => {
            panel.classList.toggle('active', panel.id === tabId + 'Panel');
        });
    },

    /**
     * Handle global keyboard shortcuts
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleGlobalKeydown(e) {
        // Ctrl+S to save
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            this.handleSave();
        }

        // Ctrl+O to open
        if (e.ctrlKey && e.key === 'o') {
            e.preventDefault();
            this.handleLoad();
        }

        // Ctrl+1/2/3/4 to switch tabs
        if (e.ctrlKey && e.key === '1') {
            e.preventDefault();
            this.switchTab('settings');
        }
        if (e.ctrlKey && e.key === '2') {
            e.preventDefault();
            this.switchTab('channels');
        }
        if (e.ctrlKey && e.key === '3') {
            e.preventDefault();
            this.switchTab('fmchannels');
        }
        if (e.ctrlKey && e.key === '4') {
            e.preventDefault();
            this.switchTab('debug');
        }
    },

    /**
     * Set status message
     * @param {string} message - Status message
     */
    setStatus(message) {
        this.elements.statusMessage.textContent = message;
    },

    /**
     * Show/hide progress bar
     * @param {boolean} show - Show or hide
     */
    showProgress(show) {
        this.elements.progressContainer.style.display = show ? 'block' : 'none';
        if (!show) {
            this.elements.progressBar.style.width = '0%';
        }
    },

    /**
     * Set progress bar value
     * @param {number} progress - Progress 0-1
     */
    setProgress(progress) {
        this.elements.progressBar.style.width = (progress * 100) + '%';
    },

    /**
     * Update panels enabled/disabled state
     * Panels are disabled when no data has been loaded or during read operations
     */
    updateGridState() {
        const hasData = this.rawData !== null;
        const isDisabled = !hasData || this.isReading;

        // Update Save button
        this.elements.btnSave.disabled = !hasData;

        // Update all four panels
        this.elements.gridContainer.classList.toggle('disabled', isDisabled);
        this.elements.settingsContainer.classList.toggle('disabled', isDisabled);
        this.elements.fmContainer.classList.toggle('disabled', isDisabled);
        this.elements.debugContainer.classList.toggle('disabled', isDisabled);

        // Update messages
        if (this.isReading) {
            this.elements.gridDisabledMessage.textContent = 'Reading from radio...';
            this.elements.settingsDisabledMessage.textContent = 'Reading from radio...';
            this.elements.fmDisabledMessage.textContent = 'Reading from radio...';
            this.elements.debugDisabledMessage.textContent = 'Reading from radio...';
        } else if (!hasData) {
            this.elements.gridDisabledMessage.textContent = 'Read from radio or load a file to edit channels';
            this.elements.settingsDisabledMessage.textContent = 'Read from radio or load a file to edit settings';
            this.elements.fmDisabledMessage.textContent = 'Read from radio or load a file to edit FM settings';
            this.elements.debugDisabledMessage.textContent = 'Read from radio or load a file to view memory';
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
