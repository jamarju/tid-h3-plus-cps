#!/usr/bin/env python3
"""Test AT commands on fresh connection - mimic ODMaster"""
import asyncio
from bleak import BleakClient, BleakScanner

SERVICE_UUID = "0000ff00-0000-1000-8000-00805f9b34fb"
CHAR_NOTIFY_UUID = "0000ff01-0000-1000-8000-00805f9b34fb"
CHAR_WRITE_UUID = "0000ff02-0000-1000-8000-00805f9b34fb"

class ATTester:
    def __init__(self):
        self.responses = []

    def notification_handler(self, sender, data):
        hex_str = ' '.join(f'{b:02x}' for b in data)
        try:
            ascii_str = data.decode('ascii').strip()
            print(f"  << {ascii_str}")
            print(f"     (hex: {hex_str})")
        except:
            ascii_str = ''.join(chr(b) if 32 <= b < 127 else f'<{b:02x}>' for b in data)
            print(f"  << {hex_str}")
            print(f"     (ascii: {ascii_str})")
        self.responses.append(data)

    async def find_radio(self):
        devices = await BleakScanner.discover(timeout=5.0)
        for device in devices:
            if device.name and device.name.startswith("TD-H3"):
                print(f"Found: {device.name}")
                return device.address
        raise RuntimeError("No TD-H3 radio found")

    async def test_sequence(self, client):
        self.responses = []

        # Try AT+BAUD? first (like ODMaster might do)
        print("\n>> AT+BAUD?")
        await client.write_gatt_char(CHAR_WRITE_UUID, b"AT+BAUD?\r\n", response=False)
        await asyncio.sleep(1.0)

        # Then try AT+NAME?
        print("\n>> AT+NAME?")
        await client.write_gatt_char(CHAR_WRITE_UUID, b"AT+NAME?\r\n", response=False)
        await asyncio.sleep(1.0)

        # Try AT+VERSION?
        print("\n>> AT+VERSION?")
        await client.write_gatt_char(CHAR_WRITE_UUID, b"AT+VERSION?\r\n", response=False)
        await asyncio.sleep(1.0)

    async def run(self):
        address = await self.find_radio()
        async with BleakClient(address) as client:
            print(f"Connected (NO handshake, fresh BLE)\n")
            await client.start_notify(CHAR_NOTIFY_UUID, self.notification_handler)

            await self.test_sequence(client)

            await client.stop_notify(CHAR_NOTIFY_UUID)

if __name__ == "__main__":
    asyncio.run(ATTester().run())
