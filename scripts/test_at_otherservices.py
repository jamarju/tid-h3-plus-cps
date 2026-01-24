#!/usr/bin/env python3
"""Test AT commands on different BLE services"""
import asyncio
from bleak import BleakClient, BleakScanner

# Try different services
SERVICES = [
    ("0xae00", "0000ae01-0000-1000-8000-00805f9b34fb", "0000ae02-0000-1000-8000-00805f9b34fb"),
    ("0xae30", "0000ae01-0000-1000-8000-00805f9b34fb", "0000ae02-0000-1000-8000-00805f9b34fb"),
    ("0xaf00", "0000af01-0000-1000-8000-00805f9b34fb", "0000af02-0000-1000-8000-00805f9b34fb"),
]

class ATTester:
    def __init__(self):
        self.responses = []

    def notification_handler(self, sender, data):
        try:
            text = data.decode('ascii').strip()
            if text and not all(b == 0 for b in data):
                print(f"    << '{text}'")
        except:
            if not all(b == 0 for b in data):
                hex_str = ' '.join(f'{b:02x}' for b in data)
                print(f"    << {hex_str}")
        self.responses.append(data)

    async def find_radio(self):
        devices = await BleakScanner.discover(timeout=5.0)
        for device in devices:
            if device.name and device.name.startswith("TD-H3"):
                print(f"Found: {device.name}\n")
                return device.address
        raise RuntimeError("No TD-H3 radio found")

    async def test_service(self, client, name, write_uuid, notify_uuid):
        print(f"Testing service {name}:")
        print(f"  Write: {write_uuid}")
        print(f"  Notify: {notify_uuid}")

        self.responses = []

        try:
            await client.start_notify(notify_uuid, self.notification_handler)

            print("  >> AT+NAME?")
            await client.write_gatt_char(write_uuid, b"AT+NAME?\r\n", response=False)
            await asyncio.sleep(1.5)

            if not self.responses or all(all(b == 0 for b in r) for r in self.responses):
                print("    << (no meaningful response)")

            await client.stop_notify(notify_uuid)
        except Exception as e:
            print(f"    Error: {e}")

        print()

    async def run(self):
        address = await self.find_radio()
        async with BleakClient(address) as client:
            print(f"Connected\n")

            for name, write_uuid, notify_uuid in SERVICES:
                await self.test_service(client, name, write_uuid, notify_uuid)

if __name__ == "__main__":
    asyncio.run(ATTester().run())
