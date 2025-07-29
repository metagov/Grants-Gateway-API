import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface IntegrationItem {
  name: string;
  type: string;
  status: 'active' | 'infrastructure' | 'coming-soon';
  color: string;
  description: string;
}

export default function IntegrationsSidebar() {
  const integrations: IntegrationItem[] = [
    {
      name: "Octant",
      type: "Type 1",
      status: "active",
      color: "green",
      description: "Direct API integration with real-time data transformation to DAOIP-5 format"
    },
    {
      name: "Giveth", 
      type: "Type 1",
      status: "active",
      color: "green",
      description: "GraphQL API integration with quadratic funding round data transformation"
    },
    {
      name: "Questbook",
      type: "Type 3", 
      status: "active",
      color: "purple",
      description: "Native DAOIP-5 endpoint at api.questbook.app/daoip-5 - health monitoring only"
    }
  ];

  const infrastructureServices: IntegrationItem[] = [
    {
      name: "KARMA GAP",
      type: "Infrastructure",
      status: "infrastructure", 
      color: "amber",
      description: "Cross-platform project UIDs for seamless project identification"
    },
    {
      name: "OSO",
      type: "Infrastructure", 
      status: "infrastructure",
      color: "amber",
      description: "Data lake infrastructure for developer activity and impact tracking"
    }
  ];

  const comingSoonSystems: IntegrationItem[] = [
    {
      name: "Stellar",
      type: "Type 1",
      status: "coming-soon",
      color: "yellow", 
      description: "Stellar blockchain ecosystem grants and funding programs"
    },
    {
      name: "Celo",
      type: "Type 1",
      status: "coming-soon", 
      color: "yellow",
      description: "Mobile-first blockchain platform for financial inclusion"
    },
    {
      name: "Arbitrum Foundation",
      type: "Type 1",
      status: "coming-soon",
      color: "yellow",
      description: "Layer 2 scaling solution grant programs and ecosystem funding"
    },
    {
      name: "Optimism", 
      type: "Type 1",
      status: "coming-soon",
      color: "yellow",
      description: "Optimistic rollup grants and RetroPGF funding rounds"
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      green: "bg-green-500",
      purple: "bg-purple-500", 
      amber: "bg-amber-500",
      yellow: "bg-yellow-500"
    };
    return colorMap[color as keyof typeof colorMap] || "bg-gray-500";
  };

  const IntegrationGroup = ({ 
    title, 
    items 
  }: { 
    title: string; 
    items: IntegrationItem[] 
  }) => (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {title}
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <Tooltip key={item.name}>
            <TooltipTrigger asChild>
              <div className="flex items-center text-xs text-gray-600 dark:text-gray-300 cursor-help hover:text-gray-800 dark:hover:text-gray-100 transition-colors px-3 py-1 rounded hover:bg-gray-50 dark:hover:bg-slate-700">
                <div className={`w-2 h-2 ${getColorClasses(item.color)} rounded-full mr-2 flex-shrink-0`}></div>
                <span>{item.name} ({item.type})</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p>{item.description}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );

  return (
    <div className="pt-6 space-y-6">
      <IntegrationGroup title="Integrations" items={integrations} />
      <IntegrationGroup title="Infrastructure" items={infrastructureServices} />
      <IntegrationGroup title="Coming Soon" items={comingSoonSystems} />
    </div>
  );
}