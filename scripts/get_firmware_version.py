#!/usr/bin/env python3
"""
get_firmware_version.py - Get firmware version from Tidradio H3 Plus

Returns firmware version string by sending Mode 0x02 command after PVOJH handshake.

Usage:
    uv run get_firmware_version.py
"""

import asyncio
import sys
from bleak import BleakClient, BleakScanner

# BLE UUIDs
SERVICE_UUID = "0000ff00-0000-1000-8000-00805f9b34fb"
CHAR_NOTIFY_UUID = "0000ff01-0000-1000-8000-00805f9b34fb"
CHAR_WRITE_UUID = "0000ff02-0000-1000-8000-00805f9b34fb"


class FirmwareVersionReader:
    def __init__(self):
        self.response_ready = asyncio.Event()
        self.last_response = None

    def notification_handler(self, sender, data):
        """Handle notifications from the radio"""
        self.last_response = bytes(data)
        self.response_ready.set()

    async def find_radio(self):
        """Find TD-H3 radio via BLE scan"""
        print("Scanning for TD-H3 radio...")
        devices = await BleakScanner.discover(timeout=5.0)

        for device in devices:
            if device.name and device.name.startswith("TD-H3"):
                print(f"Found: {device.name} [{device.address}]")
                return device.address

        raise RuntimeError("No TD-H3 radio found. Make sure it's powered on and in range.")

    async def wait_for_response(self, timeout=1.0):
        """Wait for notification response"""
        self.response_ready.clear()
        self.last_response = None

        try:
            await asyncio.wait_for(self.response_ready.wait(), timeout=timeout)
            return self.last_response
        except asyncio.TimeoutError:
            return None

    async def get_firmware_version(self):
        """Get firmware version from radio"""
        address = await self.find_radio()

        print(f"Connecting to {address}...")
        async with BleakClient(address) as client:
            print(f"Connected: {client.is_connected}")

            # Start notifications
            await client.start_notify(CHAR_NOTIFY_UUID, self.notification_handler)

            # Step 1: AT+BAUD? (part of standard handshake)
            await client.write_gatt_char(CHAR_WRITE_UUID, b"AT+BAUD?\r\n", response=False)
            await self.wait_for_response()
            await asyncio.sleep(0.1)

            # Step 2: PVOJH handshake
            await client.write_gatt_char(CHAR_WRITE_UUID, bytes([0x50, 0x56, 0x4F, 0x4A, 0x48, 0x5C, 0x14]), response=False)
            await self.wait_for_response()
            await asyncio.sleep(0.1)

            # Step 3: Mode 0x02 - This returns the firmware version!
            print("Requesting firmware version...")
            await client.write_gatt_char(CHAR_WRITE_UUID, bytes([0x02]), response=False)
            response = await self.wait_for_response()

            # Stop notifications
            await client.stop_notify(CHAR_NOTIFY_UUID)

            # Parse firmware version from response
            if response and len(response) > 0 and response[0] == 0x50:  # 'P'
                # Extract ASCII string until 0xFF
                version = ""
                for b in response:
                    if b == 0xFF:
                        break
                    if 32 <= b < 127:  # Printable ASCII
                        version += chr(b)

                if version:
                    return version

            raise RuntimeError("Failed to read firmware version from radio")


async def main():
    reader = FirmwareVersionReader()
    try:
        version = await reader.get_firmware_version()
        print(f"\n{'='*60}")
        print(f"Firmware Version: {version}")
        print(f"{'='*60}")
        print("\n✓ Success!")
        return 0
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        return 1
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
