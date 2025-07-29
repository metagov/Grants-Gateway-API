import { 
  Building, 
  CheckCircle, 
  Clock, 
  Circle,
  ExternalLink,
  Database,
  Layers,
  Activity
} from "lucide-react";
import octantLogo from "@/assets/octant-logo.png";
import givethLogo from "@/assets/giveth-logo.png";
import stellarLogo from "@/assets/stellar-logo.png";
import karmaGapLogo from "@/assets/karma-gap-logo.png";
import questbookLogo from "@/assets/questbook-logo.png";
import osoLogo from "@/assets/oso-logo.png";
import celoLogo from "@/assets/celo-logo.png";
import optimismLogo from "@/assets/optimism-logo.png";
import arbitrumLogo from "@/assets/arbitrum-logo.png";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function IntegrationsPage() {
  const activeIntegrations = [
    {
      id: "octant",
      name: "Octant",
      logo: octantLogo,
      type: "Type 1",
      description: "Ethereum public goods funding platform with quadratic funding mechanisms",
      status: "active",
      color: "green",
      endpoints: ["pools", "applications"],
      website: "https://octant.app"
    },
    {
      id: "giveth",
      name: "Giveth", 
      logo: givethLogo,
      type: "Type 1",
      description: "Donation platform for public goods and social impact projects",
      status: "active",
      color: "green",
      endpoints: ["pools", "applications"],
      website: "https://giveth.io"
    }
  ];

  const type3Integrations = [
    {
      id: "questbook",
      name: "Questbook",
      logo: questbookLogo,
      type: "Type 3",
      description: "Native DAOIP-5 endpoint for decentralized grants orchestration",
      status: "monitored",
      color: "purple",
      endpoints: ["health monitoring"],
      website: "https://questbook.app"
    }
  ];

  const infrastructureIntegrations = [
    {
      id: "karma-gap",
      name: "KARMA GAP",
      logo: karmaGapLogo,
      type: "Infrastructure",
      description: "Cross-platform project identification through unique UIDs",
      status: "active",
      color: "amber",
      endpoints: ["project UIDs"],
      website: "https://gap.karmahq.xyz"
    },
    {
      id: "oso",
      name: "OSO",
      logo: osoLogo,
      type: "Infrastructure",
      description: "Open Source Observer for impact tracking and metrics",
      status: "coming-soon",
      color: "blue",
      endpoints: ["impact metrics"],
      website: "https://www.opensource.observer"
    }
  ];

  const comingSoonIntegrations = [
    {
      id: "stellar",
      name: "Stellar",
      logo: stellarLogo,
      type: "Type 1",
      description: "Stellar blockchain ecosystem grants and funding programs",
      status: "coming-soon",
      color: "yellow",
      endpoints: ["pools", "applications"],
      website: "https://stellar.org"
    },
    {
      id: "celo",
      name: "Celo",
      logo: celoLogo,
      type: "Type 1", 
      description: "Mobile-first blockchain platform for financial inclusion",
      status: "coming-soon",
      color: "yellow",
      endpoints: ["pools", "applications"],
      website: "https://celo.org"
    },
    {
      id: "arbitrum",
      name: "Arbitrum Foundation",
      logo: arbitrumLogo,
      type: "Type 1",
      description: "Layer 2 scaling solution grant programs and ecosystem funding",
      status: "coming-soon", 
      color: "yellow",
      endpoints: ["pools", "applications"],
      website: "https://arbitrum.foundation"
    },
    {
      id: "optimism",
      name: "Optimism",
      logo: optimismLogo,
      type: "Type 1",
      description: "Optimistic rollup grants and RetroPGF funding rounds",
      status: "coming-soon",
      color: "yellow", 
      endpoints: ["pools", "applications"],
      website: "https://optimism.io"
    }
  ];

  const getStatusBadge = (status: string, color: string, type: string) => {
    const colorClasses = {
      green: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800",
      purple: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800",
      amber: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
      blue: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
      yellow: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800"
    };

    const fillColor = `fill-${color}-500`;
    
    return (
      <Badge variant="secondary" className={colorClasses[color as keyof typeof colorClasses]}>
        <Circle className={`h-3 w-3 mr-1 ${fillColor}`} />
        {type}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'monitored':
        return <Activity className="h-4 w-4 text-purple-500" />;
      case 'coming-soon':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Circle className="h-4 w-4 text-gray-500" />;
    }
  };

  const IntegrationCard = ({ integration }: { integration: any }) => (
    <Card className="hover:shadow-lg transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border shadow-sm">
              <img src={integration.logo} alt={integration.name} className="w-8 h-8" />
            </div>
            <div>
              <CardTitle className="text-lg">{integration.name}</CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                {getStatusBadge(integration.status, integration.color, integration.type)}
                {getStatusIcon(integration.status)}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => window.open(integration.website, '_blank')}>
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
          {integration.description}
        </p>
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Available Endpoints:
          </div>
          <div className="flex flex-wrap gap-1">
            {integration.endpoints.map((endpoint: string) => (
              <Badge key={endpoint} variant="outline" className="text-xs">
                {endpoint}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4">Grant Systems & Integrations</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Comprehensive overview of all grant platforms, infrastructure services, and monitoring systems integrated with OpenGrants Gateway.
        </p>
      </div>

      {/* Integration Types Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Layers className="h-5 w-5 text-primary mr-2" />
            Integration Types
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-green-700 dark:text-green-300">Type 1: API Integration</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Full data transformation from platform APIs to DAOIP-5 format
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-purple-700 dark:text-purple-300">Type 3: Endpoint Integration</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Native DAOIP-5 endpoints monitored for health and connectivity
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-amber-700 dark:text-amber-300">Infrastructure Services</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Supporting services for enhanced metadata and cross-platform features
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Integrations */}
      <div>
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
          Active Integrations ({activeIntegrations.length})
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {activeIntegrations.map((integration) => (
            <IntegrationCard key={integration.id} integration={integration} />
          ))}
        </div>
      </div>

      {/* Type 3 & Infrastructure */}
      <div>
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <Activity className="h-6 w-6 text-purple-500 mr-2" />
          Type 3 & Infrastructure ({type3Integrations.length + infrastructureIntegrations.length})
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {type3Integrations.map((integration) => (
            <IntegrationCard key={integration.id} integration={integration} />
          ))}
          {infrastructureIntegrations.map((integration) => (
            <IntegrationCard key={integration.id} integration={integration} />
          ))}
        </div>
      </div>

      {/* Coming Soon */}
      <div>
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <Clock className="h-6 w-6 text-yellow-500 mr-2" />
          Coming Soon ({comingSoonIntegrations.length})
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {comingSoonIntegrations.map((integration) => (
            <IntegrationCard key={integration.id} integration={integration} />
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 text-primary mr-2" />
            Integration Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{activeIntegrations.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Active APIs</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{type3Integrations.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Type 3 Systems</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">{infrastructureIntegrations.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Infrastructure</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{comingSoonIntegrations.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Coming Soon</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}