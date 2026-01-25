/**
 * settings.js - Settings panel for Tidradio H3 Plus CPS
 */

const Settings = {
    // Current settings
    settings: null,

    // Function key SHORT press options [27, 29] - different from long press!
    // Encoding: 0=none, 1=fm radio, 2=lamp, 3=tone, 4=alarm, 5=weather, 7=ptt2, 8=od ptt (gap at 6)
    shortKeyOptions: [
        { value: 0, label: 'None' },
        { value: 1, label: 'FM Radio' },
        { value: 2, label: 'Lamp' },
        { value: 3, label: 'Tone' },
        { value: 4, label: 'Alarm' },
        { value: 5, label: 'Weather' },
        { value: 7, label: 'PTT2' },
        { value: 8, label: 'OD PTT' }
    ],

    // Function key LONG press options [28, 30] - no ptt2/od ptt, has cancel sq
    // Encoding: 0=none, 1=fm radio, 2=lamp, 3=cancel sq, 4=tone, 5=alarm, 6=weather
    longKeyOptions: [
        { value: 0, label: 'None' },
        { value: 1, label: 'FM Radio' },
        { value: 2, label: 'Lamp' },
        { value: 3, label: 'Cancel SQ' },
        { value: 4, label: 'Tone' },
        { value: 5, label: 'Alarm' },
        { value: 6, label: 'Weather' }
    ],

    // Tone options (CTCSS + DCS normal + DCS inverted)
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
     * Initialize settings panel
     * @param {Object} settings - Settings object
     */
    init(settings) {
        this.settings = settings;
        this.populateKeySelects();
        this.populateToneSelects();
        this.loadToForm();
        this.attachEventListeners();
    },

    /**
     * Populate tone selects with CTCSS/DCS options
     */
    populateToneSelects() {
        const toneSelects = document.querySelectorAll('.tone-select');
        toneSelects.forEach(select => {
            select.innerHTML = '';
            for (const tone of this.toneOptions) {
                const option = document.createElement('option');
                option.value = tone;
                option.textContent = tone;
                select.appendChild(option);
            }
        });
    },

    /**
     * Populate function key selects with correct options (short vs long differ!)
     */
    populateKeySelects() {
        // Short press selects
        const shortSelects = document.querySelectorAll('#shortKeyPf1, #shortKeyPf2');
        shortSelects.forEach(select => {
            select.innerHTML = '';
            for (const opt of this.shortKeyOptions) {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.label;
                select.appendChild(option);
            }
        });

        // Long press selects - different options!
        const longSelects = document.querySelectorAll('#longKeyPf1, #longKeyPf2');
        longSelects.forEach(select => {
            select.innerHTML = '';
            for (const opt of this.longKeyOptions) {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.label;
                select.appendChild(option);
            }
        });
    },

    /**
     * Load settings to form
     */
    loadToForm() {
        if (!this.settings) return;

        // Selects - Display
        this.setSelectValue('display', this.settings.display);
        this.setSelectValue('lightControl', this.settings.lightControl);
        this.setSelectValue('brightness', this.settings.brightness);
        this.setSelectValue('aChannelDisp', this.settings.aChannelDisp);
        this.setSelectValue('bChannelDisp', this.settings.bChannelDisp);
        this.setSelectValue('menuColor', this.settings.menuColor);

        // Selects - Audio
        this.setSelectValue('squelchLevel', this.settings.squelchLevel);
        this.setSelectValue('language', this.settings.language);
        this.setSelectValue('roger', this.settings.roger);
        this.setSelectValue('micGain', this.settings.micGain);

        // Selects - Signal
        this.setSelectValue('toneBurst', this.settings.toneBurst);

        // Selects - TX Settings
        this.setSelectValue('stepFreq', this.settings.stepFreq);
        this.setSelectValue('tot', this.settings.tot);
        this.setSelectValue('pttDelay', this.settings.pttDelay);
        this.setSelectValue('modulation', this.settings.modulation);

        // Selects - VOX
        this.setSelectValue('voxGain', this.settings.voxGain);
        this.setSelectValue('voxDelay', this.settings.voxDelay);

        // Selects - Power Save
        this.setSelectValue('save', this.settings.save);

        // Selects - Scan
        this.setSelectValue('scanMode', this.settings.scanMode);
        this.setSelectValue('scanHangTime', this.settings.scanHangTime);

        // Selects - Repeater
        this.setSelectValue('rpSte', this.settings.rpSte);
        this.setSelectValue('rpToneDelay', this.settings.rpToneDelay);

        // Selects - Function Keys
        this.setSelectValue('shortKeyPf1', this.settings.shortKeyPf1);
        this.setSelectValue('longKeyPf1', this.settings.longKeyPf1);
        this.setSelectValue('shortKeyPf2', this.settings.shortKeyPf2);
        this.setSelectValue('longKeyPf2', this.settings.longKeyPf2);

        // Selects - Alarm
        this.setSelectValue('alarmMode', this.settings.alarmMode);

        // Selects - DTMF
        this.setSelectValue('dtmfSpeed', this.settings.dtmfSpeed);
        this.setSelectValue('dHold', this.settings.dHold);
        this.setSelectValue('dRsp', this.settings.dRsp);

        // Selects - Power On Message
        this.setSelectValue('ponmgs', this.settings.ponmgs);

        // Selects - LED
        this.setSelectValue('breathLed', this.settings.breathLed);

        // Checkboxes - Audio
        this.setCheckboxValue('voicePrompt', this.settings.voicePrompt);
        this.setCheckboxValue('beep', this.settings.beep);

        // Checkboxes - Signal
        this.setCheckboxValue('ste', this.settings.ste);
        this.setCheckboxValue('talkAround', this.settings.talkAround);
        this.setCheckboxValue('fmInterrupt', this.settings.fmInterrupt);

        // Checkboxes - TX
        this.setCheckboxValue('tx200', this.settings.tx200);
        this.setCheckboxValue('tx350', this.settings.tx350);
        this.setCheckboxValue('tx500', this.settings.tx500);

        // Checkboxes - Scan
        this.setCheckboxValue('tdr', this.settings.tdr);

        // Checkboxes - AM Band / Only CH Mode
        this.setCheckboxValue('amBand', this.settings.amBand);
        this.setCheckboxValue('onlyChMode', this.settings.onlyChMode);

        // Checkboxes - Security
        this.setCheckboxValue('stun', this.settings.stun);
        this.setCheckboxValue('kill', this.settings.kill);

        // Checkboxes - Power Save
        this.setCheckboxValue('autoLock', this.settings.autoLock);

        // Checkboxes - DTMF
        this.setCheckboxValue('dtmfSideTone', this.settings.dtmfSideTone);
        this.setCheckboxValue('dDcd', this.settings.dDcd);

        // Text inputs
        this.setTextValue('aniEdit', this.settings.aniEdit);
        this.setTextValue('msg1', this.settings.msg1);
        this.setTextValue('msg2', this.settings.msg2);
        this.setTextValue('msg3', this.settings.msg3);

        // Text inputs - Scan freq range
        this.setTextValue('scanFreqLower', this.settings.scanFreqLower);
        this.setTextValue('scanFreqUpper', this.settings.scanFreqUpper);

        // VFO Settings
        this.setSelectValue('activeVfo', this.settings.activeVfo);

        // VFO A
        const vfoA = this.settings.vfoA || {};
        this.setSelectValue('vfoAWorkMode', vfoA.workMode || 0);
        this.setNumberValue('vfoAChannel', vfoA.channel || 1);
        this.setTextValue('vfoARxFreq', vfoA.rxFreq ? vfoA.rxFreq.toFixed(5) : '');
        this.setTextValue('vfoAOffset', vfoA.offset ? vfoA.offset.toFixed(5) : '');
        this.setSelectValue('vfoAOffsetDir', vfoA.offsetDir || 'OFF');
        this.setTextValue('vfoARxTone', vfoA.rxTone || 'OFF');
        this.setTextValue('vfoATxTone', vfoA.txTone || 'OFF');
        this.setSelectValue('vfoABandwidth', vfoA.bandwidth || 'W');
        this.setSelectValue('vfoATxPower', vfoA.txPower || 'LOW');
        this.setSelectValue('vfoAScramble', vfoA.scramble || 0);
        this.setCheckboxValue('vfoABusyLock', vfoA.busyLock);

        // VFO B
        const vfoB = this.settings.vfoB || {};
        this.setSelectValue('vfoBWorkMode', vfoB.workMode || 0);
        this.setNumberValue('vfoBChannel', vfoB.channel || 1);
        this.setTextValue('vfoBRxFreq', vfoB.rxFreq ? vfoB.rxFreq.toFixed(5) : '');
        this.setTextValue('vfoBOffset', vfoB.offset ? vfoB.offset.toFixed(5) : '');
        this.setSelectValue('vfoBOffsetDir', vfoB.offsetDir || 'OFF');
        this.setTextValue('vfoBRxTone', vfoB.rxTone || 'OFF');
        this.setTextValue('vfoBTxTone', vfoB.txTone || 'OFF');
        this.setSelectValue('vfoBBandwidth', vfoB.bandwidth || 'W');
        this.setSelectValue('vfoBTxPower', vfoB.txPower || 'LOW');
        this.setSelectValue('vfoBScramble', vfoB.scramble || 0);
        this.setCheckboxValue('vfoBBusyLock', vfoB.busyLock);

        // Text inputs - TX Band Limits
        this.setTextValue('txVhfLow', this.settings.txVhfLow ? this.settings.txVhfLow.toFixed(1) : '');
        this.setTextValue('txVhfHigh', this.settings.txVhfHigh ? this.settings.txVhfHigh.toFixed(1) : '');
        this.setTextValue('txUhfLow', this.settings.txUhfLow ? this.settings.txUhfLow.toFixed(1) : '');
        this.setTextValue('txUhfHigh', this.settings.txUhfHigh ? this.settings.txUhfHigh.toFixed(1) : '');

        // DTMF - PTT ID Sequences
        this.setTextValue('dtmfBotCode', this.settings.dtmfBotCode || '');
        this.setTextValue('dtmfEotCode', this.settings.dtmfEotCode || '');

        // DTMF - Group Calling
        this.setSelectValue('dtmfGroupCode', this.settings.dtmfGroupCode !== undefined ? `0x${this.settings.dtmfGroupCode.toString(16).toUpperCase().padStart(2, '0')}` : '0x00');
        this.setTextValue('dtmfGroup1', this.settings.dtmfGroup1 || '');
        this.setTextValue('dtmfGroup2', this.settings.dtmfGroup2 || '');
        this.setTextValue('dtmfGroup3', this.settings.dtmfGroup3 || '');
        this.setTextValue('dtmfGroup4', this.settings.dtmfGroup4 || '');
        this.setTextValue('dtmfGroup5', this.settings.dtmfGroup5 || '');
        this.setTextValue('dtmfGroup6', this.settings.dtmfGroup6 || '');
        this.setTextValue('dtmfGroup7', this.settings.dtmfGroup7 || '');
        this.setTextValue('dtmfGroup8', this.settings.dtmfGroup8 || '');

        // DTMF - Remote Control
        this.setTextValue('dtmfStunCode', this.settings.dtmfStunCode || '');
        this.setTextValue('dtmfKillCode', this.settings.dtmfKillCode || '');
    },

    /**
     * Set select value
     * @param {string} id - Element ID
     * @param {*} value - Value to set
     */
    setSelectValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value ?? '';
    },

    /**
     * Set checkbox value
     * @param {string} id - Element ID
     * @param {boolean} value - Value to set
     */
    setCheckboxValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.checked = !!value;
    },

    /**
     * Set text input value
     * @param {string} id - Element ID
     * @param {string} value - Value to set
     */
    setTextValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value ?? '';
    },

    /**
     * Set number input value
     * @param {string} id - Element ID
     * @param {number} value - Value to set
     */
    setNumberValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value ?? '';
    },

    /**
     * Attach event listeners for form changes
     */
    attachEventListeners() {
        const container = document.getElementById('settingsContainer');

        container.addEventListener('change', (e) => {
            const el = e.target;
            const id = el.id;

            if (!id || !this.settings) return;

            // Handle VFO A/B fields (nested objects)
            if (id.startsWith('vfoA') && id !== 'activeVfo') {
                this.updateVFOField('vfoA', id.substring(4), el);
                return;
            }
            if (id.startsWith('vfoB')) {
                this.updateVFOField('vfoB', id.substring(4), el);
                return;
            }

            if (el.type === 'checkbox') {
                this.settings[id] = el.checked;
            } else if (el.tagName === 'SELECT') {
                // Handle hex values (like dtmfGroupCode)
                if (el.value.startsWith('0x')) {
                    this.settings[id] = parseInt(el.value, 16);
                } else {
                    const value = parseInt(el.value);
                    this.settings[id] = isNaN(value) ? el.value : value;
                }
            } else if (el.type === 'number') {
                const value = parseInt(el.value);
                this.settings[id] = isNaN(value) ? 0 : value;
            } else if (el.type === 'text') {
                // Check if it's a frequency field (TX band limits)
                if (id.startsWith('tx')) {
                    const freq = parseFloat(el.value);
                    this.settings[id] = isNaN(freq) ? 0 : freq;
                } else {
                    // DTMF codes - uppercase and trim
                    if (id.startsWith('dtmf')) {
                        this.settings[id] = el.value.toUpperCase().trim();
                    } else {
                        this.settings[id] = el.value;
                    }
                }
            }
        });

        this.initTooltips(container);
    },

    /**
     * Update a VFO field (handles nested vfoA/vfoB objects)
     * @param {string} vfoKey - 'vfoA' or 'vfoB'
     * @param {string} fieldName - Field name with first letter lowercase (e.g., 'RxFreq' -> 'rxFreq')
     * @param {HTMLElement} el - The form element
     */
    updateVFOField(vfoKey, fieldName, el) {
        // Ensure VFO object exists
        if (!this.settings[vfoKey]) {
            this.settings[vfoKey] = {};
        }

        // Convert field name: 'RxFreq' -> 'rxFreq', 'OffsetDir' -> 'offsetDir'
        const key = fieldName.charAt(0).toLowerCase() + fieldName.slice(1);

        if (el.type === 'checkbox') {
            this.settings[vfoKey][key] = el.checked;
        } else if (el.tagName === 'SELECT') {
            const value = parseInt(el.value);
            this.settings[vfoKey][key] = isNaN(value) ? el.value : value;
        } else if (el.type === 'number') {
            // Channel number field
            const value = parseInt(el.value);
            this.settings[vfoKey][key] = isNaN(value) ? 1 : value;
        } else if (el.type === 'text') {
            // Frequency/offset fields
            if (key.includes('Freq') || key === 'offset') {
                const freq = parseFloat(el.value);
                this.settings[vfoKey][key] = isNaN(freq) ? 0 : freq;
            } else {
                // Tone fields - uppercase
                this.settings[vfoKey][key] = el.value.toUpperCase().trim() || 'OFF';
            }
        }
    },

    /**
     * Initialize instant tooltips for settings labels
     */
    initTooltips(container) {
        // Create tooltip element if it doesn't exist
        let tooltip = document.getElementById('settingsTooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'settingsTooltip';
            tooltip.className = 'settings-tooltip';
            document.body.appendChild(tooltip);
        }

        // Get all labels with titles
        const labels = container.querySelectorAll('label[title]');

        labels.forEach(label => {
            const title = label.getAttribute('title');
            // Remove native title to prevent double tooltips
            label.removeAttribute('title');
            label.setAttribute('data-tip', title);

            label.addEventListener('mouseenter', (e) => {
                tooltip.textContent = label.getAttribute('data-tip');
                tooltip.style.display = 'block';
                this.positionTooltip(e, tooltip);
            });

            label.addEventListener('mousemove', (e) => {
                this.positionTooltip(e, tooltip);
            });

            label.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
            });
        });
    },

    /**
     * Position tooltip near cursor
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
    },

    /**
     * Update settings with new data
     * @param {Object} settings - New settings object
     */
    update(settings) {
        this.settings = settings;
        this.loadToForm();
    },

    /**
     * Get current settings
     * @returns {Object} Settings object
     */
    getData() {
        return this.settings;
    },

    /**
     * Validate settings
     * @returns {Object} Validation result { valid, errors }
     */
    validate() {
        const errors = [];

        // Check message lengths
        if (this.settings.msg1 && this.settings.msg1.length > 16) {
            errors.push('MSG1 must be 16 characters or less');
        }
        if (this.settings.msg2 && this.settings.msg2.length > 16) {
            errors.push('MSG2 must be 16 characters or less');
        }
        if (this.settings.msg3 && this.settings.msg3.length > 16) {
            errors.push('MSG3 must be 16 characters or less');
        }

        // Check numeric ranges (relaxed validation while mapping memory layout)
        if (this.settings.squelchLevel < 0 || this.settings.squelchLevel > 9) {
            errors.push('Squelch level must be 0-9');
        }
        // Note: micGain and brightness use defaults until offsets are verified

        return {
            valid: errors.length === 0,
            errors
        };
    }
};
