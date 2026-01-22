/**
 * main.js - Main application for Tidradio H3 Plus CPS
 */

const App = {
    // State
    connected: false,
    rawData: null,

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
    },

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            btnConnect: document.getElementById('btnConnect'),
            btnRead: document.getElementById('btnRead'),
            btnWrite: document.getElementById('btnWrite'),
            btnLoad: document.getElementById('btnLoad'),
            btnSave: document.getElementById('btnSave'),
            connectionStatus: document.getElementById('connectionStatus'),
            statusMessage: document.getElementById('statusMessage'),
            progressContainer: document.getElementById('progressContainer'),
            progressBar: document.getElementById('progressBar'),
            tabs: document.querySelectorAll('.tab'),
            panels: document.querySelectorAll('.panel')
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
        this.elements.btnWrite.addEventListener('click', () => this.handleWrite());

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
     * Initialize data with defaults
     */
    initializeData() {
        const data = Storage.createInitialData();
        Grid.init(data.channels);
        Settings.init(data.settings);
    },

    /**
     * Update UI based on connection state
     */
    updateUI() {
        this.elements.btnRead.disabled = !this.connected;
        this.elements.btnWrite.disabled = !this.connected;

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

            const memory = await BLE.readMemory((progress) => {
                this.setProgress(progress);
            });

            this.rawData = memory;
            const data = BLE.parseMemory(memory);

            Grid.update(data.channels);
            Settings.update(data.settings);
            Debug.render(memory);

            this.showProgress(false);
            this.setStatus('Read complete - ' + memory.length + ' bytes');
        } catch (err) {
            this.showProgress(false);
            this.setStatus('Read failed: ' + err.message);
        }
    },

    /**
     * Handle write to radio
     */
    async handleWrite() {
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

            this.setStatus('Writing...');
            this.showProgress(true);

            const data = {
                channels: Grid.getData(),
                settings: Settings.getData(),
                rawData: this.rawData ? Array.from(this.rawData) : null
            };

            const memory = BLE.encodeMemory(data);

            await BLE.writeMemory(memory, (progress) => {
                this.setProgress(progress);
            });

            this.showProgress(false);
            this.setStatus('Write complete');
        } catch (err) {
            this.showProgress(false);
            this.setStatus('Write failed: ' + err.message);
        }
    },

    /**
     * Handle load file
     */
    async handleLoad() {
        try {
            this.setStatus('Loading...');
            const result = await Storage.load();

            if (result.cancelled) {
                this.setStatus('Ready');
                return;
            }

            Grid.update(result.data.channels);
            Settings.update(result.data.settings);
            this.rawData = result.data.rawData ? new Uint8Array(result.data.rawData) : null;

            if (this.rawData) {
                Debug.render(this.rawData);
            }

            this.setStatus('Loaded: ' + result.filename);
        } catch (err) {
            this.setStatus('Load failed: ' + err.message);
        }
    },

    /**
     * Handle save file
     */
    async handleSave() {
        try {
            // Validate settings
            const validation = Settings.validate();
            if (!validation.valid) {
                this.setStatus('Validation error: ' + validation.errors[0]);
                return;
            }

            this.setStatus('Saving...');

            const data = {
                channels: Grid.getData(),
                settings: Settings.getData(),
                rawData: this.rawData ? Array.from(this.rawData) : null
            };

            const result = await Storage.save(data);

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

        // Ctrl+1/2/3 to switch tabs
        if (e.ctrlKey && e.key === '1') {
            e.preventDefault();
            this.switchTab('channels');
        }
        if (e.ctrlKey && e.key === '2') {
            e.preventDefault();
            this.switchTab('settings');
        }
        if (e.ctrlKey && e.key === '3') {
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
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
