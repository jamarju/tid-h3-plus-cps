/* Smoke tests for the firmware 1.0.50 Morse settings mapping. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = {
    window: {},
    console,
    TextEncoder,
    Uint8Array,
    ArrayBuffer,
    Math,
    Number
};
vm.createContext(context);
vm.runInContext(`${fs.readFileSync('docs/js/ble.js', 'utf8')}\nwindow.BLE = BLE;`, context);
const BLE = context.window.BLE;

const morseWriteRange = BLE.WRITE_RANGES_SETTINGS.find(([start]) => start === 0x3000);
assert.equal(morseWriteRange[0], 0x3000);
assert.equal(morseWriteRange[1], 0x3024);

const baseline = new Uint8Array(0x4000).fill(0xFF);
baseline[0x3022] = 0x24; // Morse off, 12 WPM, 700 Hz
baseline[0x3023] = 0xFF; // Factory-default RX threshold sentinel

const parsed = BLE.parseSettings(baseline, 0x0CA0);
assert.equal(parsed.morseEnabled, false);
assert.equal(parsed.morseSpeed, 2);
assert.equal(parsed.morseTone, 2);
assert.equal(parsed.morseThreshold, 2);

const untouched = baseline.slice();
BLE.encodeSettings(untouched, 0, parsed);
assert.equal(untouched[0x3022], 0x24);
assert.equal(untouched[0x3023], 0xFF);

const legacy = baseline.slice();
legacy[0x3022] = 0xFF;
legacy[0x3023] = 0xFF;
const legacySettings = BLE.parseSettings(legacy, 0x0CA0);
const legacyRoundTrip = legacy.slice();
BLE.encodeSettings(legacyRoundTrip, 0, legacySettings);
assert.equal(legacyRoundTrip[0x3022], 0xFF);
assert.equal(legacyRoundTrip[0x3023], 0xFF);

const changed = {
    ...parsed,
    morseEnabled: true,
    morseSpeed: 3,
    morseTone: 1,
    morseThreshold: 4,
    morseThresholdTouched: true
};
const changedBuffer = baseline.slice();
BLE.encodeSettings(changedBuffer, 0, changed);
assert.equal(changedBuffer[0x3022], 0x17);
assert.equal(changedBuffer[0x3023], 0x04);

const second = {
    ...parsed,
    morseEnabled: true,
    morseSpeed: 4,
    morseTone: 2,
    morseThreshold: 0,
    morseThresholdTouched: true
};
const secondBuffer = baseline.slice();
BLE.encodeSettings(secondBuffer, 0, second);
assert.equal(secondBuffer[0x3022], 0x29);
assert.equal(secondBuffer[0x3023], 0x00);

console.log('morse settings tests passed');
