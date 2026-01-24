#!/usr/bin/env python3
"""
test_handshake_responses.py - Capture responses from each handshake step

Identifies which handshake command returns the firmware version.

Usage:
    uv run test_handshake_responses.py
"""

import asyncio
import sys
from bleak import BleakClient, BleakScanner

# BLE UUIDs
SERVICE_UUID = "0000ff00-0000-1000-8000-00805f9b34fb"
CHAR_NOTIFY_UUID = "0000ff01-0000-1000-8000-00805f9b34fb"
CHAR_WRITE_UUID = "0000ff02-0000-1000-8000-00805f9b34fb"


class HandshakeTester:
    def __init__(self):
        self.response_ready = asyncio.Event()
        self.last_response = None
        self.responses_log = []

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

        raise RuntimeError("No TD-H3 radio found.")

    async def send_command(self, client, cmd_bytes, description, wait_for_response=True):
        """Send command and optionally wait for response"""
        print(f"\n→ {description}")
        print(f"   Sending: {cmd_bytes.hex()}")

        # Clear previous response
        self.response_ready.clear()
        self.last_response = None

        # Send command
        await client.write_gatt_char(CHAR_WRITE_UUID, cmd_bytes, response=False)

        # Wait for response
        if wait_for_response:
            try:
                await asyncio.wait_for(self.response_ready.wait(), timeout=1.0)

                if self.last_response:
                    hex_str = self.last_response.hex()
                    print(f"← Response: {hex_str} ({len(self.last_response)} bytes)")

                    # Try to decode as text
                    try:
                        decoded = self.last_response.decode('ascii', errors='replace')
                        # Only show if it has printable characters
                        if any(32 <= b < 127 for b in self.last_response):
                            print(f"← Text:     '{decoded}'")
                            print(f"← Repr:     {repr(decoded)}")
                    except:
                        pass

                    # Log it
                    self.responses_log.append({
                        'command': description,
                        'cmd_bytes': cmd_bytes.hex(),
                        'response': self.last_response,
                        'response_hex': hex_str
                    })
                else:
                    print("← No response")

            except asyncio.TimeoutError:
                print("← Timeout")
        else:
            print("   (not waiting for response)")

        await asyncio.sleep(0.1)

    async def run(self):
        """Execute handshake step by step and capture responses"""
        address = await self.find_radio()

        print(f"\nConnecting to {address}...")
        async with BleakClient(address) as client:
            print(f"Connected: {client.is_connected}")

            # Start notifications
            await client.start_notify(CHAR_NOTIFY_UUID, self.notification_handler)
            print("Notifications started\n")
            print("=" * 60)
            print("HANDSHAKE SEQUENCE - STEP BY STEP")
            print("=" * 60)

            # Step 1: AT+BAUD?
            await self.send_command(
                client,
                b"AT+BAUD?\r\n",
                "Step 1: AT+BAUD?"
            )

            # Step 2: PVOJH handshake
            await self.send_command(
                client,
                bytes([0x50, 0x56, 0x4F, 0x4A, 0x48, 0x5C, 0x14]),
                "Step 2: PVOJH handshake (50 56 4F 4A 48 5C 14)"
            )

            # Step 3: Mode 0x02
            await self.send_command(
                client,
                bytes([0x02]),
                "Step 3: Mode 0x02"
            )

            # Step 4: Mode 0x06
            await self.send_command(
                client,
                bytes([0x06]),
                "Step 4: Mode 0x06"
            )

            print("\n" + "=" * 60)
            print("SUMMARY OF RESPONSES")
            print("=" * 60)

            for i, log in enumerate(self.responses_log, 1):
                print(f"\n{i}. {log['command']}")
                print(f"   Command:  {log['cmd_bytes']}")
                print(f"   Response: {log['response_hex']}")

                # Check if response has printable ASCII
                if any(32 <= b < 127 for b in log['response']):
                    decoded = log['response'].decode('ascii', errors='replace')
                    print(f"   Decoded:  '{decoded}'")

            # Stop notifications
            await client.stop_notify(CHAR_NOTIFY_UUID)

            # Identify version response
            print("\n" + "=" * 60)
            print("FIRMWARE VERSION ANALYSIS")
            print("=" * 60)

            for log in self.responses_log:
                resp = log['response']
                # Look for response that starts with 'P' and has ASCII digits
                if len(resp) > 0 and resp[0] == 0x50:  # 'P'
                    try:
                        # Try to decode, stopping at 0xFF
                        version_str = ""
                        for b in resp:
                            if b == 0xFF:
                                break
                            if 32 <= b < 127:
                                version_str += chr(b)

                        if version_str:
                            print(f"\n✓ Found version string from: {log['command']}")
                            print(f"  Version: {version_str}")
                    except:
                        pass


async def main():
    tester = HandshakeTester()
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
