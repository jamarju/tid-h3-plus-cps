#!/usr/bin/env python3
"""Debug AT command responses - show ALL data"""
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
        ascii_str = ''.join(chr(b) if 32 <= b < 127 else f'<{b:02x}>' for b in data)
        print(f"  << [{len(data)} bytes] {hex_str}")
        print(f"     ASCII: {ascii_str}")
        self.responses.append(data)

    async def find_radio(self):
        devices = await BleakScanner.discover(timeout=5.0)
        for device in devices:
            if device.name and device.name.startswith("TD-H3"):
                print(f"Found: {device.name}")
                return device.address
        raise RuntimeError("No TD-H3 radio found")

    async def test_command(self, client, cmd_str, add_crlf=True):
        cmd = cmd_str.encode()
        if add_crlf:
            cmd += b'\r\n'
        print(f"\n>> {cmd_str} (sending {len(cmd)} bytes)")
        self.responses = []
        await client.write_gatt_char(CHAR_WRITE_UUID, cmd, response=False)
        await asyncio.sleep(2.0)
        if not self.responses:
            print("  << NO RESPONSE")

    async def run(self):
        address = await self.find_radio()
        async with BleakClient(address) as client:
            print(f"Connected\n")
            await client.start_notify(CHAR_NOTIFY_UUID, self.notification_handler)

            # Try different formats
            await self.test_command(client, "AT+NAME?", add_crlf=True)
            await self.test_command(client, "AT+NAME?", add_crlf=False)
            await self.test_command(client, "AT+BAUD?", add_crlf=True)

            await client.stop_notify(CHAR_NOTIFY_UUID)

if __name__ == "__main__":
    asyncio.run(ATTester().run())
