# Integration Types Documentation

## Type 1: Source API Integration

### Overview
Direct integration with grant systems that provide REST or GraphQL APIs. Requires custom adapters to transform platform-specific data into DAOIP-5 format.

### Implementation Pattern
```typescript
export class SourceAPIAdapter extends BaseAdapter {
  constructor() {
    super('system-name', 'https://api.system.com');
  }

  async getGrantPools(): Promise<GrantPool[]> {
    const response = await fetch(`${this.baseUrl}/pools`);
    const data = await response.json();
    
    return data.map(pool => ({
      id: `daoip5:grantPool:${pool.chainId}:${pool.id}`,
      name: pool.name,
      description: pool.description,
      // Custom field mapping...
    }));
  }
}
```

### Examples
- **Octant**: REST API with epoch/project data
- **Giveth**: GraphQL API with QF round data

### Pros
- Real-time data access
- Rich metadata available
- Direct control over data freshness

### Cons
- Complex field mapping required
- API changes can break integration
- Rate limiting considerations

---

## Type 2: Direct DAOIP-5 Integration

### Overview
Grant systems that implement native DAOIP-5 endpoints, allowing direct passthrough with minimal transformation.

### Implementation Pattern
```typescript
export class DAOIP5Adapter extends BaseAdapter {
  constructor() {
    super('system-name', 'https://system.com/daoip-5');
  }

  async getGrantPools(): Promise<GrantPool[]> {
    const response = await fetch(`${this.baseUrl}/pools`);
    const data = await response.json();
    
    // Minimal validation and passthrough
    return this.validateDAOIP5Format(data.grantPools);
  }
}
```

### Examples
- **Questbook**: Direct DAOIP-5 endpoints

### Pros
- Minimal development effort
- Standardized data format
- Future-proof integration

### Cons
- Requires grant system to implement DAOIP-5
- Less control over data transformation

---

## Type 3: Static Data Integration

### Overview
Integration with grant systems that provide data exports (CSV, Airtable) which are converted to JSON and hosted on GitHub.

### Implementation Pattern
```typescript
export class StaticDataAdapter extends BaseAdapter {
  constructor() {
    super('system-name', 'https://raw.githubusercontent.com/org/repo/main');
  }

  async getGrantPools(): Promise<GrantPool[]> {
    const response = await fetch(`${this.baseUrl}/pools.json`);
    const data = await response.json();
    
    return data.map(this.transformStaticData);
  }

  private transformStaticData(row: any): GrantPool {
    // CSV to DAOIP-5 transformation
  }
}
```

### Data Pipeline
1. Grant system exports CSV/Airtable data
2. Automated script converts to DAOIP-5 JSON format
3. Files uploaded to GitHub repository
4. Adapter fetches from raw GitHub URLs
5. Optional: Scheduled refresh with caching

### Examples
- Legacy grant programs
- Manual grant tracking systems
- Historical data archives

### Pros
- Works with any data export format
- Simple hosting via GitHub
- Version controlled data history

### Cons
- Not real-time (scheduled updates)
- Manual data export process
- Limited query capabilities

---

## Type 4: Blockchain Integration

### Overview
Direct integration with on-chain grant systems through blockchain data indexing and smart contract interaction.

### Implementation Pattern
```typescript
export class BlockchainAdapter extends BaseAdapter {
  constructor(private web3Provider: Web3Provider, private contractAddress: string) {
    super('system-name', 'blockchain');
  }

  async getGrantPools(): Promise<GrantPool[]> {
    const contract = new Contract(this.contractAddress, ABI, this.web3Provider);
    const events = await contract.queryFilter('GrantPoolCreated');
    
    return events.map(event => ({
      id: `daoip5:grantPool:${event.args.chainId}:${event.args.poolId}`,
      name: event.args.name,
      totalGrantPoolSize: [{
        amount: ethers.utils.formatEther(event.args.amount),
        denomination: 'ETH'
      }],
      // Additional blockchain-specific data transformation
    }));
  }
}
```

### Use Cases
- **On-chain Grant Systems**: DAOs with smart contract-based grants
- **Multi-chain Protocols**: Systems deployed across multiple blockchains
- **NFT Grant Programs**: Grant systems using NFTs for applications/rewards
- **DeFi Grant Protocols**: Yield farming or liquidity mining grants

### Data Sources
- Smart contract events and state
- IPFS metadata for decentralized storage
- Subgraph data from The Graph Protocol
- Direct blockchain node queries

### Examples
- **Gitcoin Grants**: On-chain quadratic funding rounds
- **Optimism RetroPGF**: Retroactive public goods funding
- **ENS Grants**: Ethereum Name Service grant program
- **Stellar Community Fund**: Stellar blockchain ecosystem grants

### Implementation Considerations
- **Gas Costs**: Optimize read operations and use view functions
- **Rate Limiting**: Respect RPC endpoint limits
- **Data Freshness**: Balance real-time data with caching
- **Multi-chain**: Handle different chain configurations and gas tokens
- **IPFS Integration**: Fetch metadata from decentralized storage

### Pros
- Truly decentralized data source
- Transparent and verifiable
- Real-time on-chain data
- Interoperable across ecosystems

### Cons
- Technical complexity of blockchain integration
- Gas costs for data retrieval
- Network latency and reliability
- Requires blockchain infrastructure

---

## Integration Decision Tree

```
┌─ Grant System Type? ─┐
│                      │
├─ On-chain/Blockchain ── Type 4 (Blockchain Integration)
│
├─ Has live API? ─┬─ Can implement DAOIP-5? ── Yes ── Type 2
│                 │
│                 └─ No ── Type 1 (Source API)
│
└─ Static data only ── Type 3 (Static Data)
```

## Integration Type Summary

| Type | Best For | Examples | Complexity | Maintenance |
|------|----------|----------|------------|-------------|
| **Type 1** | REST/GraphQL APIs | Octant, Giveth | High | Medium |
| **Type 2** | DAOIP-5 endpoints | Questbook | Low | Low |
| **Type 3** | CSV/Static exports | Legacy systems | Medium | Low |
| **Type 4** | Blockchain/Smart contracts | Gitcoin, Optimism | High | Medium |

## Next Steps

For each integration type, refer to the specific implementation guides:
- [Type 1 Implementation Guide](./type1-implementation.md)
- [Type 2 Implementation Guide](./type2-implementation.md)
- [Type 3 Implementation Guide](./type3-implementation.md)
- [Type 4 Custom Solutions](./type4-custom.md)