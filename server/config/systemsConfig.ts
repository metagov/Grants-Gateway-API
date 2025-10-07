
export default {
  "__comment": "⚠️  SECURITY NOTICE: System enable/disable can only be done by manually editing this file. No API endpoints modify this configuration.",
  "activeSystems": [
    {
      "id": "octant",
      "name": "Octant",
      "displayName": "Octant (Golem)",
      "source": "opengrants",
      "type": "DAO",
      "enabled": true,
      "priority": 2,
      "metadata": {
        "description": "Quadratic funding for Ethereum public goods through ETH staking proceeds",
        "website": "https://octant.app",
        "apiEndpoint": "https://backend.mainnet.octant.app",
        "supportedNetworks": ["ethereum"],
        "fundingMechanisms": ["quadratic_funding"],
        "established": "2023",
        "compatibility": 100,
        "adapterClass": "OctantAdapter"
      }
    },
    {
      "id": "giveth",
      "name": "Giveth",
      "displayName": "Giveth",
      "source": "opengrants", 
      "type": "DAO",
      "enabled": true,
      "priority": 3,
      "metadata": {
        "description": "Donation platform for public goods and social impact projects",
        "website": "https://giveth.io",
        "apiEndpoint": "https://mainnet.serve.giveth.io/graphql",
        "supportedNetworks": ["ethereum"],
        "fundingMechanisms": ["donations", "quadratic_funding"],
        "established": "2016",
        "compatibility": 100,
        "adapterClass": "GivethAdapter"
      }
    },
    {
      "id": "scf",
      "name": "Stellar Community Fund",
      "displayName": "Stellar Community Fund",
      "source": "daoip5",
      "type": "Foundation",
      "enabled": true,
      "priority": 1,
      "metadata": {
        "description": "Community-driven funding for projects building on Stellar",
        "website": "https://communityfund.stellar.org",
        "apiEndpoint": "https://daoip5.daostar.org/stellar",
        "supportedNetworks": ["stellar"],
        "fundingMechanisms": ["direct_grants"],
        "established": "2018",
        "compatibility": 95,
        "staticDataPath": "/stellar"
      }
    },
    {
      "id": "celopg",
      "name": "Celo Public Goods",
      "displayName": "Celo Public Goods", 
      "source": "daoip5",
      "type": "Foundation",
      "enabled": true,
      "priority": 4,
      "status": "work_in_progress",
      "metadata": {
        "description": "Funding public goods in the Celo ecosystem through quadratic funding",
        "website": "https://celo.org",
        "apiEndpoint": "https://daoip5.daostar.org/celopg",
        "supportedNetworks": ["celo"],
        "fundingMechanisms": ["quadratic_funding", "direct_grants"],
        "established": "2020",
        "compatibility": 90,
        "staticDataPath": "/celopg"
      }
    },
    {
      "id": "optimism",
      "name": "Optimism RetroPGF",
      "displayName": "Optimism RetroPGF",
      "source": "daoip5",
      "type": "Foundation",
      "enabled": false,
      "priority": 5,
      "metadata": {
        "description": "Retroactive public goods funding on Optimism",
        "website": "https://optimism.io",
        "apiEndpoint": "https://daoip5.daostar.org/optimism",
        "supportedNetworks": ["optimism"],
        "fundingMechanisms": ["retroactive_funding"],
        "established": "2021",
        "compatibility": 85,
        "staticDataPath": "/optimism"
      }
    },
    {
      "id": "arbitrumfoundation",
      "name": "Arbitrum Foundation",
      "displayName": "Arbitrum Foundation",
      "source": "daoip5",
      "type": "Foundation",
      "enabled": false,
      "priority": 6,
      "metadata": {
        "description": "Supporting the Arbitrum ecosystem through grants",
        "website": "https://arbitrum.foundation",
        "apiEndpoint": "https://daoip5.daostar.org/arbitrumfoundation",
        "supportedNetworks": ["arbitrum"],
        "fundingMechanisms": ["direct_grants"],
        "established": "2021",
        "compatibility": 85,
        "staticDataPath": "/arbitrumfoundation"
      }
    }
  ],
  "sourceTypes": {
    "opengrants": {
      "name": "OpenGrants API",
      "baseUrl": "https://grants.daostar.org/api/v1",
      "proxyPrefix": "/api/proxy/opengrants",
      "realTimeData": true,
      "rateLimited": true
    },
    "daoip5": {
      "name": "DAOIP-5 Static Data",
      "baseUrl": "https://daoip5.daostar.org",
      "proxyPrefix": "/api/proxy/daoip5",
      "realTimeData": false,
      "rateLimited": false
    }
  },
  "features": {
    "autoDiscovery": true,
    "healthChecks": true,
    "dataValidation": true,
    "caching": true
  }
};
