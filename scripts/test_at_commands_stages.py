#!/usr/bin/env python3
"""
test_at_commands_stages.py - Test AT commands at different connection stages

Tests AT commands:
1. Immediately after connection (before any handshake)
2. After AT+BAUD? (partial handshake)
3. After full binary protocol handshake

Usage:
    uv run test_at_commands_stages.py
"""

import asyncio
import sys
from bleak import BleakClient, BleakScanner

# BLE UUIDs
SERVICE_UUID = "0000ff00-0000-1000-8000-00805f9b34fb"
CHAR_NOTIFY_UUID = "0000ff01-0000-1000-8000-00805f9b34fb"
CHAR_WRITE_UUID = "0000ff02-0000-1000-8000-00805f9b34fb"

# AT commands to test
AT_COMMANDS = [
    "AT+NAME?",
    "AT+VER?",
    "AT+VERSION?",
]


class ATStageTester:
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

        raise RuntimeError("No TD-H3 radio found.")

    async def send_at_command(self, client, command, description=""):
        """Send AT command and wait for response"""
        if description:
            print(f"\n→ {description}: {command}")
        else:
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
                hex_str = self.last_response.hex()
                print(f"← Hex: {hex_str} ({len(self.last_response)} bytes)")

                # Check if it's not all zeros
                if any(b != 0 for b in self.last_response):
                    try:
                        decoded = self.last_response.decode('utf-8')
                        print(f"← Text: '{decoded}'")
                        print(f"← Repr: {repr(decoded)}")
                    except UnicodeDecodeError:
                        print(f"← Raw: {self.last_response}")
                else:
                    print(f"← All zeros (no meaningful response)")
            else:
                print("← No response")

        except asyncio.TimeoutError:
            print("← Timeout")

        await asyncio.sleep(0.2)

    async def run(self):
        """Test AT commands at different stages"""
        address = await self.find_radio()

        print(f"\nConnecting to {address}...")
        async with BleakClient(address) as client:
            print(f"Connected: {client.is_connected}")

            # Start notifications
            await client.start_notify(CHAR_NOTIFY_UUID, self.notification_handler)
            print("Notifications started")

            # Stage 1: Immediately after connection
            print("\n" + "=" * 60)
            print("STAGE 1: Testing AT commands IMMEDIATELY after connection")
            print("=" * 60)
            for cmd in AT_COMMANDS:
                await self.send_at_command(client, cmd)

            # Stage 2: After AT+BAUD? (like in dump_memory.py)
            print("\n" + "=" * 60)
            print("STAGE 2: After AT+BAUD? command")
            print("=" * 60)
            await self.send_at_command(client, "AT+BAUD?", "Handshake step")
            await asyncio.sleep(0.2)

            for cmd in AT_COMMANDS:
                await self.send_at_command(client, cmd)

            # Stage 3: After binary protocol handshake
            print("\n" + "=" * 60)
            print("STAGE 3: After full binary protocol handshake")
            print("=" * 60)

            # Send PVOJH handshake
            print("\n→ Sending PVOJH handshake...")
            await client.write_gatt_char(CHAR_WRITE_UUID, bytes([0x50, 0x56, 0x4F, 0x4A, 0x48, 0x5C, 0x14]), response=False)
            await asyncio.sleep(0.1)

            # Send mode 0x02
            print("→ Sending mode 0x02...")
            await client.write_gatt_char(CHAR_WRITE_UUID, bytes([0x02]), response=False)
            await asyncio.sleep(0.05)

            # Send mode 0x06
            print("→ Sending mode 0x06...")
            await client.write_gatt_char(CHAR_WRITE_UUID, bytes([0x06]), response=False)
            await asyncio.sleep(0.1)

            print("Binary protocol handshake complete\n")

            for cmd in AT_COMMANDS:
                await self.send_at_command(client, cmd)

            print("\n" + "=" * 60)

            # Stop notifications
            await client.stop_notify(CHAR_NOTIFY_UUID)

            # Check if any responses had non-zero data
            print(f"\nTotal responses: {len(self.all_responses)}")
            non_zero_responses = [r for r in self.all_responses if any(b != 0 for b in r)]
            print(f"Responses with data: {len(non_zero_responses)}")

            if non_zero_responses:
                print("\n--- Non-zero responses ---")
                for i, resp in enumerate(non_zero_responses):
                    print(f"{i+1}. {resp.hex()}: {repr(resp)}")


async def main():
    tester = ATStageTester()
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
