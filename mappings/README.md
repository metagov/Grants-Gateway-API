# Grant Systems DAOIP-5 Mappings

This directory contains comprehensive field mappings for all grant systems integrated into the grants gateway application. Each file documents how native grant system data is transformed to comply with the DAOIP-5 standard.

## Files

### Custom Adapters
- **`octant.json`** - Octant (Golem) quadratic funding system
- **`giveth.json`** - Giveth donation platform  
- **`questbook.json`** - Questbook grants management (placeholder implementation)

### DAOIP-5 Static Data
- **`celo.json`** - Celo Public Goods quadratic funding
- **`stellar.json`** - Stellar Community Fund direct grants
- **`optimism.json`** - Optimism RetroPGF retroactive funding
- **`arbitrum.json`** - Arbitrum Foundation ecosystem grants

## Mapping Structure

Each mapping file contains:

### System Level
- **daoip5_standard_fields**: Direct mappings to DAOIP-5 system schema
- **extensions**: System-specific metadata stored in extensions

### Pool Level  
- **native_to_daoip5**: Native field → DAOIP-5 field mappings
- **extensions**: Pool-specific metadata stored in extensions
- **date_mappings**: How dates are extracted and formatted

### Project Level
- **native_to_daoip5**: Project field mappings
- **social_mappings**: Social media link transformations
- **extensions**: Project-specific metadata

### Application Level
- **native_to_daoip5**: Application field mappings
- **extensions**: Application-specific metadata
- **status_mappings**: Status value transformations

## Key Differences

### Status Values
- **Custom Adapters**: Transform native status → DAOIP-5 standard
- **DAOIP-5 Static**: Use native DAOIP-5 status values
- **Celo Special Case**: Uses "submitted" status (treated as funded)

### Date Handling
- **Octant**: Hardcoded epoch close dates
- **Giveth**: GraphQL endDate → ISO 8601 closeDate
- **DAOIP-5 Static**: Native closeDate field

### Extensions Used
- **Octant**: `app.octant.*` namespace
- **Giveth**: `io.giveth.*` namespace  
- **Karma Integration**: `x-karmagap-uid` for all systems
- **DAOIP-5 Static**: Minimal extensions

## Status Value Mapping Summary

| System | Native Status | DAOIP-5 Status | Notes |
|--------|---------------|----------------|-------|
| Octant | allocation > 0 | funded | Binary based on allocation |
| Octant | allocation = 0 | pending | No funding received |
| Giveth | isActive=true | approved | Round is active |
| Giveth | isActive=false | completed | Round has ended |
| Celo | submitted | submitted | Celo-specific (treated as funded) |
| Stellar | Standard DAOIP-5 | Standard DAOIP-5 | Direct mapping |
| Others | Standard DAOIP-5 | Standard DAOIP-5 | Direct mapping |

## Chart Compatibility

The frontend charts recognize these status values as "funded/approved":
- `funded`, `approved`, `awarded`, `completed`, `submitted`

## Last Updated
2025-09-22