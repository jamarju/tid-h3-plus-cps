# Future Considerations: Read Optimization

This document captures analysis and trade-offs for potential future optimizations.

## Current Approach

**Read**: Full 16KB memory read from radio
**Write**: Selective ranges based on mode (all/settings/channels)
**File Format**: JSON with full rawData array (16384 bytes)

## Optimized Read Analysis

### Potential Optimization
Read only the memory ranges that contain known data:
- 0x0000-0x13C0: Channels, names, settings
- 0x1800-0x18E0: Config area
- 0x1900-0x1980: Scan bitmap
- 0x1C00-0x1C40: Startup messages
- 0x1F20-0x1F40: Menu color, secondary settings
- 0x3000-0x3020: Extended settings

Total: ~5.5KB vs 16KB = **~35% of data, ~65% faster reads**

### Trade-offs

#### Pros
- Faster BLE transfers (significant for slow BLE connections)
- Reduced power consumption on radio side

#### Cons

1. **File Format Complexity**
   - Current: Simple contiguous 16KB blob
   - Optimized: Need offset→data mapping or sparse array
   - Breaks compatibility with existing saved files

2. **Save File Requires Full Data**
   - Save File writes complete 16KB to ensure file can be loaded on different radio
   - If we only read partial data, Save File would either:
     - Need to read full 16KB first (defeats optimization)
     - Save incomplete data (dangerous - file can't fully restore radio)

3. **Load File Data Loss Risk**
   - Load File replaces the entire rawData buffer
   - If user does: partial read → load file → write
   - Areas not in partial read would use file data (correct)
   - But areas only in file (not in read ranges) would be lost

4. **Debug Panel**
   - Debug hexdump shows full 16KB
   - Partial reads would show gaps or require UI changes

### Recommendation

**Keep full 16KB reads for now.**

The current BLE speed is acceptable, and the simplicity benefits outweigh the optimization gains:
- No file format complexity
- No data loss risks
- Debug panel works correctly
- Save/Load always consistent

### Future Reconsideration

Optimize reads if:
- BLE speed becomes a significant user pain point
- We implement a "quick edit" mode that doesn't use Save/Load files
- We version the file format to handle sparse data

In that case, consider:
1. Add a "Quick Read" button for editing without save capability
2. Keep "Full Read" for when user wants to save to file
3. Or implement sparse file format with version marker
