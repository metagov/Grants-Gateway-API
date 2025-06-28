# DAOIP-5 Field Mappings

This document describes how OpenGrants Gateway standardizes data from different grant systems (Octant and Giveth) to the DAOIP-5 specification.

## Grant Pool Mappings

### Required DAOIP-5 Fields

| DAOIP-5 Field | Type | Description |
|---------------|------|-------------|
| `@context` | string | Always `"http://www.daostar.org/schemas"` |
| `type` | string | Always `"GrantPool"` |
| `id` | string | CAIP-10 formatted identifier |
| `name` | string | Human-readable pool name |
| `description` | string | Detailed pool description |
| `grantFundingMechanism` | enum | Standardized funding mechanism |
| `isOpen` | boolean | Whether pool accepts applications |
| `applicationsURI` | string | URI to applications endpoint |

### Octant System Mappings

| Octant Field | DAOIP-5 Field | Transformation |
|--------------|---------------|----------------|
| `currentEpoch` | `id` | Format as CAIP-10: `eip155:1:0x{epoch_padded}` |
| N/A | `name` | Generate: `"Octant Epoch {epoch}"` |
| N/A | `description` | Generate detailed description with epoch info |
| N/A | `grantFundingMechanism` | Always `"Quadratic Funding"` |
| `currentEpoch == epoch` | `isOpen` | True if current epoch |
| Calculated | `closeDate` | 90-day epochs from Oct 1, 2023 |
| `leftover \| communityFund \| ppf` | `totalGrantPoolSize.amount` | Convert wei to ETH |
| N/A | `totalGrantPoolSize.denomination` | Always `"ETH"` |
| Calculated | `totalGrantPoolSizeUSD` | Convert ETH to USD using live rates |

### Giveth System Mappings

| Giveth Field | DAOIP-5 Field | Transformation |
|--------------|---------------|----------------|
| `qfRounds[].id` | `id` | Format as CAIP-10: `eip155:1:0x{id}` |
| `qfRounds[].name` | `name` | Direct mapping |
| `qfRounds[].description` | `description` | Use provided or generate |
| N/A | `grantFundingMechanism` | Always `"Quadratic Funding"` |
| `qfRounds[].isActive` | `isOpen` | Direct mapping |
| `qfRounds[].endDate` | `closeDate` | Format to ISO 8601 |
| `qfRounds[].allocatedFund` | `totalGrantPoolSize.amount` | Direct mapping |
| N/A | `totalGrantPoolSize.denomination` | Always `"USD"` |
| Direct | `totalGrantPoolSizeUSD` | Already in USD |

## Currency Standardization

### USD Conversion Strategy

All funding amounts are standardized to USD for consistency:

1. **Octant (ETH)**: Convert using real-time ETH/USD exchange rates
2. **Giveth (USD)**: Use direct USD amounts
3. **Cache**: 5-minute cache for exchange rates to avoid API limits
4. **Fallback**: Conservative fallback rate if APIs fail

### Exchange Rate Sources

Primary: CoinGecko API (free tier)
```
GET https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd
```

Fallback: CoinCap API
```
GET https://api.coincap.io/v2/assets/ethereum
```

## Project Mappings

### Octant Projects

| Octant Field | DAOIP-5 Field | Transformation |
|--------------|---------------|----------------|
| `address` | `id` | Format as CAIP-10 |
| `name` | `name` | Direct mapping |
| `description` | `description` | Direct mapping |
| `website` | `contentURI` | Direct mapping |
| `profileImageSmall` | `image` | Direct mapping |
| `socials` | `socials` | Transform to array format |

### Giveth Projects

| Giveth Field | DAOIP-5 Field | Transformation |
|--------------|---------------|----------------|
| `allProjects[].id` | `id` | Format as CAIP-10 |
| `allProjects[].title` | `name` | Direct mapping |
| `allProjects[].description` | `description` | Clean HTML/markdown |
| `allProjects[].slug` | `contentURI` | Generate Giveth URL |
| `allProjects[].image` | `image` | Direct mapping |
| `allProjects[].socialMedia[]` | `socials` | Transform array |

## Application Mappings

Applications represent project submissions to specific grant pools.

### Common Application Fields

| Source System | Application ID | Pool ID | Project ID |
|---------------|----------------|---------|------------|
| Octant | `{pool_id}-{project_address}` | Epoch CAIP-10 | Project CAIP-10 |
| Giveth | `{project_id}-{round_id}` | Round CAIP-10 | Project CAIP-10 |

## Quality Assurance

### Data Validation

1. **Required Fields**: All DAOIP-5 required fields must be present
2. **CAIP-10 Format**: All IDs follow CAIP-10 standard
3. **Date Format**: All dates in ISO 8601 format
4. **Currency**: All amounts include denomination
5. **URLs**: All URIs are valid and accessible

### Error Handling

1. **API Failures**: Graceful degradation with empty arrays
2. **Invalid Data**: Skip malformed records, log warnings
3. **Missing Fields**: Provide sensible defaults where possible
4. **Rate Limits**: Implement caching and retry logic

## Compliance Checklist

- [x] CAIP-10 addressing for all identifiers
- [x] Recognized funding mechanisms from DAOIP-5 spec
- [x] Required fields present in all responses
- [x] Consistent USD conversion for all funding amounts
- [x] ISO 8601 date formatting
- [x] Proper @context and type fields
- [x] Standardized social media format
- [x] Application URIs follow REST conventions
- [x] Governance URIs point to actual documentation
- [x] Error responses follow standard format

This standardization ensures that applications built on our API can work seamlessly with grant data from any supported system, while maintaining full compliance with the DAOIP-5 specification.