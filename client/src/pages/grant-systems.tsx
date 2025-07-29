import { 
  CheckCircle, 
  Clock,
  Building,
  Heart,
  Star,
  Target,
  Layers,
  FileText,
  ExternalLink
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import octantLogo from "@/assets/octant-logo.png";
import givethLogo from "@/assets/giveth-logo.png";
import stellarLogo from "@/assets/stellar-logo.png";
import karmaGapLogo from "@/assets/karma-gap-logo.png";
import questbookLogo from "@/assets/questbook-logo.png";
import osoLogo from "@/assets/oso-logo.png";

export default function GrantSystemsPage() {
  const activeSystems = [
    {
      name: "Octant",
      logo: octantLogo,
      description: "Ethereum public goods funding platform with quadratic funding mechanisms.",
      detailedDescription: "Octant provides decentralized funding for Ethereum public goods through epochs-based quadratic funding rounds. Projects apply for funding and receive rewards based on community votes weighted by GLM token holdings.",
      status: "Active Integration",
      apiEndpoint: "/api/v1/systems?system=octant",
      website: "https://octant.app",
      features: ["Quadratic Funding", "GLM Token Voting", "90-day Epochs", "Public Goods Focus"]
    },
    {
      name: "Giveth",
      logo: givethLogo,
      description: "Platform for funding public goods projects with transparent donation tracking.",
      detailedDescription: "Giveth enables direct donations to verified public goods projects with full transparency. Features quadratic funding rounds and comprehensive project verification processes.",
      status: "Active Integration",
      apiEndpoint: "/api/v1/systems?system=giveth",
      website: "https://giveth.io",
      features: ["Direct Donations", "Project Verification", "QF Rounds", "Impact Tracking"]
    }
  ];

  const comingSoonSystems = [
    {
      name: "Stellar",
      logo: stellarLogo,
      description: "Open-source financial network enabling global access to financial services.",
      detailedDescription: "Stellar Development Foundation manages grants for projects building on the Stellar network, focusing on financial inclusion and cross-border payments.",
      status: "Coming Soon",
      website: "https://stellar.org",
      features: ["Financial Inclusion", "Cross-border Payments", "Developer Grants", "Network Growth"]
    },
    {
      name: "KARMA GAP",
      logo: karmaGapLogo,
      description: "Decentralized grant reporting and impact measurement platform.",
      detailedDescription: "KARMA GAP provides infrastructure for transparent grant reporting, milestone tracking, and impact measurement across Web3 ecosystems.",
      status: "Coming Soon",
      website: "https://karmahq.xyz",
      features: ["Impact Measurement", "Milestone Tracking", "Grant Reporting", "DAO Tools"]
    },
    {
      name: "Questbook",
      logo: questbookLogo,
      description: "Decentralized grant management platform for Web3 communities (Health Monitoring Only).",
      detailedDescription: "Questbook offers end-to-end grant management for DAOs and protocols. As a direct DAOIP-5 implementation, it's monitored for connectivity but not integrated into our unified API.",
      status: "Health Monitoring",
      website: "https://questbook.app",
      features: ["Direct DAOIP-5", "Grant Management", "DAO Integration", "Connectivity Monitoring"]
    },
    {
      name: "Open Source Observer",
      logo: osoLogo,
      description: "Data platform tracking impact and funding in open source ecosystems.",
      detailedDescription: "OSO provides comprehensive analytics on open source project funding, impact metrics, and ecosystem health across multiple blockchain networks.",
      status: "Coming Soon",
      website: "https://opensourceobserver.io",
      features: ["Impact Analytics", "Funding Tracking", "Ecosystem Metrics", "Data Insights"]
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4">Grant Systems</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Comprehensive overview of all supported and upcoming grant platforms in the OpenGrants Gateway ecosystem.
        </p>
      </div>

      {/* Mission Statement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 text-primary mr-2" />
            Our Mission
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
            The OpenGrants Gateway API democratizes access to grant funding data across the Ethereum ecosystem. 
            By standardizing grant information through the DAOIP-5 specification, we enable developers, researchers, 
            and organizations to build innovative tools that strengthen public goods funding and enhance transparency 
            in decentralized grant distribution.
          </p>
        </CardContent>
      </Card>

      {/* Active Integrations */}
      <div>
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
          Active Integrations ({activeSystems.length})
        </h2>
        <div className="grid gap-6">
          {activeSystems.map((system) => (
            <Card key={system.name} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-4 gap-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-white rounded-lg mb-4 flex items-center justify-center border">
                      <img src={system.logo} alt={system.name} className="w-12 h-12" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{system.name}</h3>
                    <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {system.status}
                    </Badge>
                  </div>
                  
                  <div className="md:col-span-2 space-y-3">
                    <p className="text-gray-600 dark:text-gray-300">{system.description}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{system.detailedDescription}</p>
                    
                    <div className="flex flex-wrap gap-2">
                      {system.features.map((feature) => (
                        <Badge key={feature} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(system.website, '_blank')}
                      className="flex items-center justify-center"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Visit Site
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => window.location.href = `/query-builder?system=${system.name.toLowerCase()}`}
                      className="flex items-center justify-center"
                    >
                      <Building className="h-3 w-3 mr-1" />
                      Test API
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Coming Soon */}
      <div>
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <Clock className="h-6 w-6 text-blue-500 mr-2" />
          Coming Soon ({comingSoonSystems.length})
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {comingSoonSystems.map((system) => (
            <Card key={system.name} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center border">
                    <img src={system.logo} alt={system.name} className="w-12 h-12" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">{system.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{system.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{system.detailedDescription}</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 justify-center">
                    {system.features.map((feature) => (
                      <Badge key={feature} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="space-y-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                      <Clock className="h-3 w-3 mr-1" />
                      {system.status}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => window.open(system.website, '_blank')}
                      className="flex items-center justify-center"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Learn More
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* API Overview */}
      <Card>
        <CardHeader>
          <CardTitle>API Integration Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">DAOIP-5 Entity Types</h3>
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                  <Building className="h-5 w-5 text-primary mr-3" />
                  <div>
                    <div className="font-medium">Grant Systems</div>
                    <div className="text-sm text-gray-500">Organizations managing grants</div>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                  <Layers className="h-5 w-5 text-primary mr-3" />
                  <div>
                    <div className="font-medium">Grant Pools</div>
                    <div className="text-sm text-gray-500">Funding pools with specific criteria</div>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                  <FileText className="h-5 w-5 text-primary mr-3" />
                  <div>
                    <div className="font-medium">Applications</div>
                    <div className="text-sm text-gray-500">Project applications to pools</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Integration Benefits</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li className="flex items-start">
                  <Star className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                  Unified API access across multiple grant platforms
                </li>
                <li className="flex items-start">
                  <Star className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                  DAOIP-5 compliant standardized responses
                </li>
                <li className="flex items-start">
                  <Star className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                  Real-time data synchronization and caching
                </li>
                <li className="flex items-start">
                  <Star className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                  Comprehensive pagination and filtering
                </li>
                <li className="flex items-start">
                  <Star className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                  Automated field mapping and data transformation
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}