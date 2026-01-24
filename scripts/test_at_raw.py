#!/usr/bin/env python3
"""Test AT commands WITHOUT handshake (raw BLE mode)"""
import asyncio
from bleak import BleakClient, BleakScanner

SERVICE_UUID = "0000ff00-0000-1000-8000-00805f9b34fb"
CHAR_NOTIFY_UUID = "0000ff01-0000-1000-8000-00805f9b34fb"
CHAR_WRITE_UUID = "0000ff02-0000-1000-8000-00805f9b34fb"

class ATTester:
    def __init__(self):
        self.responses = []

    def notification_handler(self, sender, data):
        try:
            text = data.decode('ascii').strip()
            if text:
                print(f"  << {text}")
        except:
            print(f"  << {data.hex()}")
        self.responses.append(data)

    async def find_radio(self):
        print("Scanning for TD-H3 radio...")
        devices = await BleakScanner.discover(timeout=5.0)
        for device in devices:
            if device.name and device.name.startswith("TD-H3"):
                print(f"Found: {device.name} [{device.address}]")
                return device.address
        raise RuntimeError("No TD-H3 radio found")

    async def test_command(self, client, cmd):
        print(f"\n>> {cmd}")
        self.responses = []
        await client.write_gatt_char(CHAR_WRITE_UUID, cmd.encode() + b'\r\n', response=False)
        await asyncio.sleep(1.5)

    async def run(self):
        address = await self.find_radio()

        async with BleakClient(address) as client:
            print(f"Connected: {client.is_connected}\n")
            await client.start_notify(CHAR_NOTIFY_UUID, self.notification_handler)

            # NO HANDSHAKE - just send AT commands directly
            commands = [
                "AT",
                "AT+NAME?",
                "AT+VERSION?",
                "AT+VER?",
            ]

            for cmd in commands:
                await self.test_command(client, cmd)

            await client.stop_notify(CHAR_NOTIFY_UUID)

if __name__ == "__main__":
    tester = ATTester()
    asyncio.run(tester.run())
