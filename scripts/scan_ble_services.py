#!/usr/bin/env python3
"""Scan all BLE services and characteristics on radio"""
import asyncio
from bleak import BleakClient, BleakScanner

async def scan_services():
    print("Scanning for TD-H3 radio...")
    devices = await BleakScanner.discover(timeout=5.0)

    radio = None
    for device in devices:
        if device.name and device.name.startswith("TD-H3"):
            print(f"Found: {device.name} [{device.address}]\n")
            radio = device
            break

    if not radio:
        print("No TD-H3 radio found")
        return

    async with BleakClient(radio.address) as client:
        print(f"Connected: {client.is_connected}\n")

        print("Services and Characteristics:")
        print("=" * 60)

        for service in client.services:
            print(f"\nService: {service.uuid}")
            print(f"  Description: {service.description}")

            for char in service.characteristics:
                props = []
                if "read" in char.properties:
                    props.append("READ")
                if "write" in char.properties:
                    props.append("WRITE")
                if "write-without-response" in char.properties:
                    props.append("WRITE_NO_RESP")
                if "notify" in char.properties:
                    props.append("NOTIFY")
                if "indicate" in char.properties:
                    props.append("INDICATE")

                print(f"  Characteristic: {char.uuid}")
                print(f"    Properties: {', '.join(props)}")
                print(f"    Description: {char.description}")

if __name__ == "__main__":
    asyncio.run(scan_services())
