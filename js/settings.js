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

        // Selects
        this.setSelectValue('lightControl', this.settings.lightControl);
        this.setSelectValue('brightness', this.settings.brightness);
        this.setSelectValue('aChannelDisp', this.settings.aChannelDisp);
        this.setSelectValue('bChannelDisp', this.settings.bChannelDisp);
        this.setSelectValue('squelchLevel', this.settings.squelchLevel);
        this.setSelectValue('language', this.settings.language);
        this.setSelectValue('roger', this.settings.roger);
        this.setSelectValue('micGain', this.settings.micGain);
        this.setSelectValue('rTone', this.settings.rTone);
        this.setSelectValue('tot', this.settings.tot);
        this.setSelectValue('priorityTx', this.settings.priorityTx);
        this.setSelectValue('voxGain', this.settings.voxGain);
        this.setSelectValue('voxDelay', this.settings.voxDelay);
        this.setSelectValue('scanRev', this.settings.scanRev);
        this.setSelectValue('save', this.settings.save);
        this.setSelectValue('shortKeyPf1', this.settings.shortKeyPf1);
        this.setSelectValue('longKeyPf1', this.settings.longKeyPf1);
        this.setSelectValue('shortKeyPf2', this.settings.shortKeyPf2);
        this.setSelectValue('longKeyPf2', this.settings.longKeyPf2);
        this.setSelectValue('alarmMode', this.settings.alarmMode);
        this.setSelectValue('dtmfSpeed', this.settings.dtmfSpeed);
        this.setSelectValue('dHold', this.settings.dHold);
        this.setSelectValue('dRsp', this.settings.dRsp);
        this.setSelectValue('rpSte', this.settings.rpSte);
        this.setSelectValue('breathLed', this.settings.breathLed);
        this.setSelectValue('ponmgs', this.settings.ponmgs);

        // Checkboxes
        this.setCheckboxValue('dispLcdTx', this.settings.dispLcdTx);
        this.setCheckboxValue('dispLcdRx', this.settings.dispLcdRx);
        this.setCheckboxValue('voicePrompt', this.settings.voicePrompt);
        this.setCheckboxValue('beep', this.settings.beep);
        this.setCheckboxValue('tdr', this.settings.tdr);
        this.setCheckboxValue('autoLock', this.settings.autoLock);
        this.setCheckboxValue('dtmfSideTone', this.settings.dtmfSideTone);
        this.setCheckboxValue('dDcd', this.settings.dDcd);
        this.setCheckboxValue('stun', this.settings.stun);
        this.setCheckboxValue('kill', this.settings.kill);
        this.setCheckboxValue('bl', this.settings.bl);
        this.setCheckboxValue('sync', this.settings.sync);
        this.setCheckboxValue('amBand', this.settings.amBand);

        // Text inputs
        this.setTextValue('msg1', this.settings.msg1);
        this.setTextValue('msg2', this.settings.msg2);
        this.setTextValue('msg3', this.settings.msg3);
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
                const value = parseInt(el.value);
                this.settings[id] = isNaN(value) ? el.value : value;
            } else if (el.type === 'text') {
                this.settings[id] = el.value;
            }
        });
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
