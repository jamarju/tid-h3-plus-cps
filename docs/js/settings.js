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

    /**
     * Initialize settings panel
     * @param {Object} settings - Settings object
     */
    init(settings) {
        this.settings = settings;
        this.populateKeySelects();
        this.loadToForm();
        this.attachEventListeners();
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

        // Text inputs - VFO frequencies
        this.setTextValue('vfoARxFreq', this.settings.vfoARxFreq ? this.settings.vfoARxFreq.toFixed(5) : '');
        this.setTextValue('vfoATxFreq', this.settings.vfoATxFreq ? this.settings.vfoATxFreq.toFixed(5) : '');
        this.setTextValue('vfoAOffset', this.settings.vfoAOffset ? this.settings.vfoAOffset.toFixed(5) : '');
        this.setTextValue('vfoBRxFreq', this.settings.vfoBRxFreq ? this.settings.vfoBRxFreq.toFixed(5) : '');
        this.setTextValue('vfoBTxFreq', this.settings.vfoBTxFreq ? this.settings.vfoBTxFreq.toFixed(5) : '');
        this.setTextValue('vfoBOffset', this.settings.vfoBOffset ? this.settings.vfoBOffset.toFixed(5) : '');

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
     * Attach event listeners for form changes
     */
    attachEventListeners() {
        const container = document.getElementById('settingsContainer');

        container.addEventListener('change', (e) => {
            const el = e.target;
            const id = el.id;

            if (!id || !this.settings) return;

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
                // Check if it's a frequency field (VFO or TX band limits)
                if ((id.includes('vfo') && (id.includes('Freq') || id.includes('Offset'))) || id.startsWith('tx')) {
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
