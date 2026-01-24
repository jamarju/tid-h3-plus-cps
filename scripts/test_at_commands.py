#!/usr/bin/env python3
"""
test_at_commands.py - Test AT commands on Tidradio H3 Plus via BLE

Discovers radio name, firmware version, and other info using AT commands.

Usage:
    uv run test_at_commands.py
"""

import asyncio
import sys
from bleak import BleakClient, BleakScanner

# BLE UUIDs (same as memory dump script)
SERVICE_UUID = "0000ff00-0000-1000-8000-00805f9b34fb"
CHAR_NOTIFY_UUID = "0000ff01-0000-1000-8000-00805f9b34fb"
CHAR_WRITE_UUID = "0000ff02-0000-1000-8000-00805f9b34fb"

# AT commands to test (based on ODMaster analysis)
AT_COMMANDS = [
    "AT+NAME?",      # Device name (confirmed in ODMaster)
    "AT+BAUD?",      # Baud rate (used in handshake)
    "AT+VER?",       # Firmware version (common AT command)
    "AT+VERSION?",   # Alternative version command
    "AT+MODEL?",     # Model name
    "AT+INFO?",      # Device info
    "AT+DMOSETVOLUME?",  # Volume query (these radios often use DMO commands)
]


class ATCommandTester:
    def __init__(self):
        self.response_ready = asyncio.Event()
        self.last_response = None
        self.all_responses = []

    def notification_handler(self, sender, data):
        """Handle notifications from the radio"""
        self.last_response = bytes(data)
        self.all_responses.append(bytes(data))
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

    async def send_at_command(self, client, command):
        """Send AT command and wait for response"""
        print(f"\n→ Sending: {command}")

        # Clear previous responses
        self.response_ready.clear()
        self.last_response = None

        # Send AT command with CR+LF terminator
        cmd_bytes = (command + "\r\n").encode('ascii')
        await client.write_gatt_char(CHAR_WRITE_UUID, cmd_bytes, response=False)

        # Wait for response with timeout
        try:
            await asyncio.wait_for(self.response_ready.wait(), timeout=1.0)

            if self.last_response:
                # Always show hex first
                print(f"← Response (hex):  {self.last_response.hex()}")
                print(f"← Length: {len(self.last_response)} bytes")

                # Try to decode as ASCII/UTF-8
                try:
                    decoded = self.last_response.decode('utf-8')
                    print(f"← Response (text): '{decoded}'")
                    print(f"← Text (repr):     {repr(decoded)}")
                except UnicodeDecodeError:
                    print(f"← Response (raw):  {self.last_response}")
            else:
                print("← No response received")

        except asyncio.TimeoutError:
            print("← Timeout (no response)")

        # Small delay between commands
        await asyncio.sleep(0.2)

    async def run(self):
        """Main execution flow"""
        address = await self.find_radio()

        print(f"\nConnecting to {address}...")
        async with BleakClient(address) as client:
            print(f"Connected: {client.is_connected}")

            # Start notifications
            await client.start_notify(CHAR_NOTIFY_UUID, self.notification_handler)
            print("Notifications started\n")
            print("=" * 60)

            # Test each AT command
            for cmd in AT_COMMANDS:
                await self.send_at_command(client, cmd)

            print("\n" + "=" * 60)

            # Stop notifications
            await client.stop_notify(CHAR_NOTIFY_UUID)

            # Summary
            print(f"\nTotal responses received: {len(self.all_responses)}")

            # Show any responses that look like text
            print("\n--- Text-like responses ---")
            for i, resp in enumerate(self.all_responses):
                try:
                    decoded = resp.decode('utf-8').strip()
                    if decoded and decoded.isprintable():
                        print(f"{i+1}. {decoded}")
                except:
                    pass


async def main():
    tester = ATCommandTester()
    try:
        await tester.run()
        print("\n✓ Test complete!")
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
