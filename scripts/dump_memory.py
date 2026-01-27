#!/usr/bin/env python3
"""
dump_memory.py - Dump memory from Tidradio H3 Plus via BLE

Usage:
    uv run dump_memory.py [output_file] [baseline_file] [--stop N]

Default output: memory_dump.bin (16KB raw binary)

If baseline_file is provided, compares on-the-fly and prints differences.
Use --stop N to stop after N mismatches (default: stop after 1st).
"""

import asyncio
import sys
import argparse
from bleak import BleakClient, BleakScanner
from pathlib import Path

# BLE UUIDs
SERVICE_UUID = "0000ff00-0000-1000-8000-00805f9b34fb"
CHAR_NOTIFY_UUID = "0000ff01-0000-1000-8000-00805f9b34fb"
CHAR_WRITE_UUID = "0000ff02-0000-1000-8000-00805f9b34fb"

# Protocol constants
MEMORY_START = 0x0000
MEMORY_END = 0x4000  # 16KB
CHUNK_SIZE = 32

# Memory ranges to read (skip most channels and empty regions for reverse engineering)
READ_RANGES = [
    (0x0000, 0x0340),  # Header + channels 1-50 (ch50 at ~0x0318)
    (0x0C90, 0x1F40),  # Settings, names, ANI, scan bitmap, VFO, startup msgs
    (0x3000, 0x3120),  # Extended settings
    # Skip: 0x0340-0x0C90 (channels 51-199)
    # Skip: 0x1F40-0x3000 (all 0xFF)
    # Skip: 0x3120-0x4000 (all 0xFF)
]

class H3PlusDumper:
    def __init__(self, baseline=None, stop_after=1):
        self.memory = bytearray(MEMORY_END)
        self.baseline = baseline  # Optional baseline for comparison
        self.stop_after = stop_after  # Number of mismatches before stopping
        self.response_ready = asyncio.Event()
        self.last_response = None
        self.diffs_found = []  # List of (addr, old, new) tuples

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

    async def handshake(self, client):
        """Perform connection handshake"""
        print("Performing handshake...")

        # Step 1: AT+BAUD?
        await client.write_gatt_char(CHAR_WRITE_UUID, b"AT+BAUD?\r\n", response=False)
        await asyncio.sleep(0.1)

        # Step 2: Send PVOJH handshake
        await client.write_gatt_char(CHAR_WRITE_UUID, bytes([0x50, 0x56, 0x4F, 0x4A, 0x48, 0x5C, 0x14]), response=False)
        await asyncio.sleep(0.1)

        # Step 3: Send mode 0x02
        await client.write_gatt_char(CHAR_WRITE_UUID, bytes([0x02]), response=False)
        await asyncio.sleep(0.05)

        # Step 4: Send mode 0x06
        await client.write_gatt_char(CHAR_WRITE_UUID, bytes([0x06]), response=False)
        await asyncio.sleep(0.2)

        # Clear any leftover responses from handshake
        self.response_ready.clear()
        self.last_response = None

        print("Handshake complete")

    async def read_chunk(self, client, addr):
        """Read 32 bytes at address"""
        addr_hi = (addr >> 8) & 0xFF
        addr_lo = addr & 0xFF

        # Clear previous response
        self.response_ready.clear()

        # Send read command: R + addrHi + addrLo + 0x20
        cmd = bytes([0x52, addr_hi, addr_lo, CHUNK_SIZE])
        await client.write_gatt_char(CHAR_WRITE_UUID, cmd, response=False)

        # Wait for response with timeout
        try:
            await asyncio.wait_for(self.response_ready.wait(), timeout=2.0)
        except asyncio.TimeoutError:
            raise RuntimeError(f"Timeout reading address 0x{addr:04X}")

        # Parse response: W + addrHi + addrLo + len + data
        data = self.last_response
        if not data or data[0] != 0x57:  # 'W'
            raise RuntimeError(f"Invalid response at 0x{addr:04X}: {data.hex() if data else 'None'}")

        resp_addr = (data[1] << 8) | data[2]
        resp_len = data[3]
        payload = data[4:4+resp_len]

        if resp_addr != addr:
            raise RuntimeError(f"Address mismatch: expected 0x{addr:04X}, got 0x{resp_addr:04X}")

        return payload

    async def dump_memory(self, client):
        """Dump memory (skipping empty 0xFF regions for speed)"""
        # Pre-fill with 0xFF
        self.memory[:] = b'\xFF' * MEMORY_END

        # Calculate total chunks to read
        total_bytes = sum(end - start for start, end in READ_RANGES)
        total_chunks = total_bytes // CHUNK_SIZE

        should_stop = False

        for range_start, range_end in READ_RANGES:
            if should_stop:
                break

            for addr in range(range_start, range_end, CHUNK_SIZE):
                chunk = await self.read_chunk(client, addr)
                self.memory[addr:addr+len(chunk)] = chunk

                # Compare with baseline if provided
                if self.baseline:
                    for offset in range(len(chunk)):
                        byte_addr = addr + offset
                        if chunk[offset] != self.baseline[byte_addr]:
                            self.diffs_found.append((byte_addr, self.baseline[byte_addr], chunk[offset]))
                            print(f"0x{byte_addr:04X}:0x{self.baseline[byte_addr]:02X}->0x{chunk[offset]:02X}")

                            # Check if we should stop
                            if self.stop_after and len(self.diffs_found) >= self.stop_after:
                                should_stop = True
                                break

                    if should_stop:
                        break

                await asyncio.sleep(0.03)  # Small delay between reads

        if self.baseline and not self.diffs_found:
            print("No differences found.")

        return bytes(self.memory)

    async def run(self, output_file):
        """Main execution flow"""
        address = await self.find_radio()

        print(f"Connecting to {address}...")
        async with BleakClient(address) as client:
            print(f"Connected: {client.is_connected}")

            # Start notifications
            await client.start_notify(CHAR_NOTIFY_UUID, self.notification_handler)

            # Perform handshake
            await self.handshake(client)

            # Dump memory
            memory = await self.dump_memory(client)

            # Stop notifications
            await client.stop_notify(CHAR_NOTIFY_UUID)

            # Save to file
            output_path = Path(output_file)
            output_path.write_bytes(memory)
            print(f"Saved {len(memory)} bytes to {output_path}")

            # Show memory statistics
            non_empty = sum(1 for b in memory if b != 0xFF)
            print(f"Non-empty bytes: {non_empty}/{len(memory)} ({non_empty/len(memory)*100:.1f}%)")


async def main():
    parser = argparse.ArgumentParser(
        description='Dump memory from Tidradio H3 Plus via BLE',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  uv run dump_memory.py output.bin                    # Simple dump
  uv run dump_memory.py new.bin baseline.bin          # Compare, show all diffs
  uv run dump_memory.py new.bin baseline.bin --stop 1 # Compare, stop after 1st diff
  uv run dump_memory.py new.bin baseline.bin --stop 5 # Compare, stop after 5 diffs
        """
    )
    parser.add_argument('output_file', nargs='?', default='memory_dump.bin',
                        help='Output file (default: memory_dump.bin)')
    parser.add_argument('baseline_file', nargs='?', default=None,
                        help='Baseline file for comparison (optional)')
    parser.add_argument('--stop', type=int, default=0, metavar='N',
                        help='Stop after N mismatches (default: 0 = no limit)')

    args = parser.parse_args()

    # Load baseline if provided
    baseline = None
    if args.baseline_file:
        baseline_path = Path(args.baseline_file)
        if not baseline_path.exists():
            print(f"✗ Error: Baseline file not found: {args.baseline_file}")
            sys.exit(1)
        baseline = bytearray(baseline_path.read_bytes())
        if len(baseline) != MEMORY_END:
            print(f"✗ Error: Baseline file size mismatch (expected {MEMORY_END}, got {len(baseline)})")
            sys.exit(1)
        print(f"Loaded baseline: {args.baseline_file}")

    # If no baseline, ignore --stop flag
    stop_after = args.stop if baseline else None

    dumper = H3PlusDumper(baseline=baseline, stop_after=stop_after)
    try:
        await dumper.run(args.output_file)
        print("\n✓ Success!")
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
