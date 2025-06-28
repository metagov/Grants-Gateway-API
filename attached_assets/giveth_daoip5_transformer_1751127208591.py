import requests
import json
import os
from datetime import datetime
from typing import Dict, List, Any, Optional
import logging
from dataclasses import dataclass

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class GivethToDaoip5Config:
    """Configuration for the transformation process"""
    giveth_api_url: str = "https://mainnet.serve.giveth.io/graphql"
    output_dir: str = "daoip5_output"
    base_uri: str = "https://giveth.io"
    chunk_size: int = 100  # For pagination
    
class GivethDaoip5Transformer:
    def __init__(self, config: GivethToDaoip5Config):
        self.config = config
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'DAOIP5-Transformer/1.0'
        })
        
        # Create output directory
        os.makedirs(self.config.output_dir, exist_ok=True)
        
        # Funding mechanism mapping from Giveth to DAOIP-5
        self.funding_mechanism_map = {
            "quadratic": "Quadratic Funding",
            "direct": "Direct Grants", 
            "qf": "Quadratic Funding",
            "streaming": "Streaming Quadratic Funding",
            "bounty": "Bounties",
            "default": "Direct Grants"
        }
        
    def execute_graphql_query(self, query: str, variables: Dict = None) -> Dict:
        """Execute a GraphQL query against Giveth API"""
        payload = {
            "query": query,
            "variables": variables or {}
        }
        
        try:
            response = self.session.post(self.config.giveth_api_url, json=payload)
            response.raise_for_status()
            data = response.json()
            
            if "errors" in data:
                logger.error(f"GraphQL errors: {data['errors']}")
                raise Exception(f"GraphQL query failed: {data['errors']}")
                
            return data.get("data", {})
        except Exception as e:
            logger.error(f"Failed to execute GraphQL query: {e}")
            raise
    
    def fetch_projects(self, limit: int = None) -> List[Dict]:
        """Fetch all projects from Giveth"""
        query = """
        query GetProjects($limit: Int, $skip: Int) {
            allProjects(limit: $limit, skip: $skip) {
                projects {
                    id
                    title
                    slug
                    description
                    image
                    creationDate
                    updatedAt
                    status {
                        id
                        name
                        description
                    }
                    organization {
                        id
                        name
                        website
                        description
                    }
                    addresses {
                        address
                        chainType
                        isRecipient
                    }
                    socialMedia {
                        type
                        link
                    }
                    categories {
                        name
                        mainCategory {
                            title
                        }
                    }
                    donations {
                        id
                        amount
                        valueUsd
                        currency
                        transactionId
                        transactionNetworkId
                        createdAt
                        anonymous
                        user {
                            id
                            name
                        }
                    }
                    qfRounds {
                        id
                        name
                        isActive
                        beginDate
                        endDate
                        allocatedFund
                        roundUSDCapPerProject
                        roundUSDCapPerUserPerProject
                    }
                }
                totalCount
            }
        }
        """
        
        all_projects = []
        skip = 0
        batch_size = self.config.chunk_size
        
        while True:
            variables = {
                "limit": min(batch_size, limit - len(all_projects)) if limit else batch_size,
                "skip": skip
            }
            
            logger.info(f"Fetching projects batch {skip // batch_size + 1}")
            data = self.execute_graphql_query(query, variables)
            
            projects = data.get("allProjects", {}).get("projects", [])
            if not projects:
                break
                
            all_projects.extend(projects)
            skip += len(projects)
            
            if limit and len(all_projects) >= limit:
                all_projects = all_projects[:limit]
                break
                
            # If we got fewer projects than requested, we're done
            if len(projects) < batch_size:
                break
        
        logger.info(f"Fetched {len(all_projects)} total projects")
        return all_projects
    
    def fetch_qf_rounds(self) -> List[Dict]:
        """Fetch QF rounds (grant pools)"""
        query = """
        query GetQFRounds {
            qfArchivedRounds {
                qfRounds {
                    id
                    name
                    slug
                    description
                    isActive
                    beginDate
                    endDate
                    allocatedFund
                    roundUSDCapPerProject
                    roundUSDCapPerUserPerProject
                    network
                }
                totalCount
            }
        }
        """
        
        data = self.execute_graphql_query(query)
        rounds = data.get("qfArchivedRounds", {}).get("qfRounds", [])
        logger.info(f"Fetched {len(rounds)} QF rounds")
        return rounds
    
    def transform_to_caip10(self, address: str, network: str = "1") -> str:
        """Transform address to CAIP-10 format"""
        if not address:
            return ""
        # Default to Ethereum mainnet if network not specified
        chain_id = network if network else "1"
        return f"eip155:{chain_id}:{address}"
    
    def map_funding_mechanism(self, qf_round: Dict) -> str:
        """Map Giveth QF round to DAOIP-5 funding mechanism"""
        # Giveth primarily uses quadratic funding
        return "Quadratic Funding"
    
    def format_iso_date(self, date_str: str) -> str:
        """Format date string to ISO 8601"""
        if not date_str:
            return ""
        try:
            # Parse the date and ensure it's in ISO format
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            return dt.isoformat()
        except:
            return date_str
    
    def transform_grant_system(self) -> Dict:
        """Transform Giveth to DAOIP-5 Grant System format"""
        return {
            "@context": "http://www.daostar.org/schemas",
            "name": "Giveth",
            "type": "DAO",
            "grantPoolsURI": f"{self.config.base_uri}/grant-pools.json"
        }
    
    def transform_grant_pools(self, qf_rounds: List[Dict]) -> Dict:
        """Transform QF rounds to DAOIP-5 Grant Pools format"""
        grant_pools = []
        
        for round_data in qf_rounds:
            pool_id = self.transform_to_caip10(f"0x{round_data['id']}", "1")
            
            grant_pool = {
                "type": "GrantPool",
                "id": pool_id,
                "name": round_data.get("name", ""),
                "description": round_data.get("description", ""),
                "grantFundingMechanism": self.map_funding_mechanism(round_data),
                "isOpen": round_data.get("isActive", False),
                "closeDate": self.format_iso_date(round_data.get("endDate", "")),
                "applicationsURI": f"{self.config.base_uri}/applications/{round_data['id']}.json",
                "governanceURI": f"{self.config.base_uri}/rounds/{round_data['slug']}",
                "totalGrantPoolSize": [
                    {
                        "amount": str(round_data.get("allocatedFund", 0)),
                        "denomination": "USD"
                    }
                ],
                "email": "info@giveth.io",
                "image": f"{self.config.base_uri}/assets/giveth-logo.png"
            }
            
            grant_pools.append(grant_pool)
        
        return {
            "@context": "http://www.daostar.org/schemas",
            "name": "Giveth",
            "type": "DAO",
            "grantPools": grant_pools
        }
    
    def transform_projects(self, projects: List[Dict]) -> Dict:
        """Transform Giveth projects to DAOIP-5 Projects format"""
        transformed_projects = []
        
        for project in projects:
            # Get primary address
            primary_address = ""
            if project.get("addresses"):
                recipient_addr = next((addr for addr in project["addresses"] if addr.get("isRecipient")), None)
                if recipient_addr:
                    primary_address = recipient_addr.get("address", "")
            
            project_id = self.transform_to_caip10(primary_address) if primary_address else f"giveth:project:{project['id']}"
            
            # Transform social media
            socials = []
            if project.get("socialMedia"):
                for social in project["socialMedia"]:
                    socials.append({
                        "name": social.get("type", ""),
                        "value": social.get("link", "")
                    })
            
            transformed_project = {
                "type": "Project",
                "id": project_id,
                "name": project.get("title", ""),
                "description": project.get("description", ""),
                "contentURI": f"{self.config.base_uri}/project/{project.get('slug', project['id'])}",
                "email": "",  # Not available in Giveth API
                "membersURI": "",
                "attestationIssuersURI": f"{self.config.base_uri}/attestations/project/{project['id']}.json",
                "relevantTo": [],  # Would need to be populated based on QF round participation
                "image": project.get("image", ""),
                "coverImage": project.get("image", ""),
                "licenseURI": "",
                "socials": socials
            }
            
            transformed_projects.append(transformed_project)
        
        return {
            "@context": "http://www.daostar.org/schemas",
            "name": "Giveth Projects",
            "type": "Organization",
            "projects": transformed_projects
        }
    
    def transform_applications(self, projects: List[Dict], qf_rounds: List[Dict]) -> Dict:
        """Transform project-round relationships to DAOIP-5 Applications format"""
        applications_by_pool = {}
        
        # Create a lookup for rounds
        rounds_lookup = {round_data["id"]: round_data for round_data in qf_rounds}
        
        for project in projects:
            if not project.get("qfRounds"):
                continue
                
            primary_address = ""
            if project.get("addresses"):
                recipient_addr = next((addr for addr in project["addresses"] if addr.get("isRecipient")), None)
                if recipient_addr:
                    primary_address = recipient_addr.get("address", "")
            
            project_id = self.transform_to_caip10(primary_address) if primary_address else f"giveth:project:{project['id']}"
            
            for qf_round in project["qfRounds"]:
                round_id = qf_round["id"]
                pool_id = self.transform_to_caip10(f"0x{round_id}", "1")
                
                if pool_id not in applications_by_pool:
                    applications_by_pool[pool_id] = {
                        "type": "GrantPool",
                        "name": qf_round.get("name", ""),
                        "applications": []
                    }
                
                # Calculate funding amounts from donations
                total_asked = 0
                total_received = 0
                
                if project.get("donations"):
                    for donation in project["donations"]:
                        if donation.get("valueUsd"):
                            total_received += float(donation["valueUsd"])
                
                # Transform social media for application
                socials = []
                if project.get("socialMedia"):
                    platform_map = {
                        "twitter": "Twitter",
                        "github": "GitHub", 
                        "discord": "Discord",
                        "telegram": "Telegram",
                        "linkedin": "LinkedIn"
                    }
                    
                    for social in project["socialMedia"]:
                        platform = platform_map.get(social.get("type", "").lower(), social.get("type", ""))
                        if platform in ["Twitter", "Discord", "Telegram", "LinkedIn", "GitHub", "Farcaster", "Lens"]:
                            socials.append({
                                "platform": platform,
                                "url": social.get("link", "")
                            })
                
                application = {
                    "type": "GrantApplication",
                    "id": f"{pool_id}?proposal={project['id']}",
                    "grantPoolsURI": f"{self.config.base_uri}/grant-pools.json",
                    "grantPoolId": pool_id,
                    "grantPoolName": qf_round.get("name", ""),
                    "projectsURI": f"{self.config.base_uri}/projects.json",
                    "projectId": project_id,
                    "projectName": project.get("title", ""),
                    "createdAt": self.format_iso_date(project.get("creationDate", "")),
                    "contentURI": f"{self.config.base_uri}/project/{project.get('slug', project['id'])}",
                    "discussionsTo": "",
                    "licenseURI": "",
                    "isInactive": project.get("status", {}).get("name", "").lower() == "inactive",
                    "applicationCompletionRate": 100,  # Assume completed if in QF round
                    "socials": socials,
                    "fundsAsked": [
                        {
                            "amount": str(total_asked),
                            "denomination": "USD"
                        }
                    ],
                    "fundsAskedInUSD": str(total_asked),
                    "fundsApproved": [
                        {
                            "amount": str(total_received),
                            "denomination": "USD"
                        }
                    ],
                    "fundsApprovedInUSD": str(total_received),
                    "payoutAddress": {
                        "type": "EthereumAddress",
                        "value": primary_address
                    },
                    "status": "approved" if qf_round.get("isActive") else "completed",
                    "payouts": []
                }
                
                applications_by_pool[pool_id]["applications"].append(application)
        
        return {
            "@context": "http://www.daostar.org/schemas",
            "name": "Giveth",
            "type": "DAO",
            "grantPools": list(applications_by_pool.values())
        }
    
    def save_json_file(self, data: Dict, filename: str):
        """Save data to JSON file"""
        filepath = os.path.join(self.config.output_dir, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        logger.info(f"Saved {filename}")
    
    def run_transformation(self, project_limit: int = None):
        """Run the complete transformation process"""
        logger.info("Starting Giveth to DAOIP-5 transformation")
        
        try:
            # Fetch data from Giveth
            logger.info("Fetching projects...")
            projects = self.fetch_projects(limit=project_limit)
            
            logger.info("Fetching QF rounds...")
            qf_rounds = self.fetch_qf_rounds()
            
            # Transform to DAOIP-5 format
            logger.info("Transforming grant system...")
            grant_system = self.transform_grant_system()
            self.save_json_file(grant_system, "grant-system.json")
            
            logger.info("Transforming grant pools...")
            grant_pools = self.transform_grant_pools(qf_rounds)
            self.save_json_file(grant_pools, "grant-pools.json")
            
            logger.info("Transforming projects...")
            projects_data = self.transform_projects(projects)
            self.save_json_file(projects_data, "projects.json")
            
            logger.info("Transforming applications...")
            applications = self.transform_applications(projects, qf_rounds)
            self.save_json_file(applications, "applications.json")
            
            # Generate summary report
            summary = {
                "transformation_completed": datetime.now().isoformat(),
                "source": "Giveth API",
                "total_projects": len(projects),
                "total_grant_pools": len(qf_rounds),
                "total_applications": sum(len(pool["applications"]) for pool in applications["grantPools"]),
                "output_files": [
                    "grant-system.json",
                    "grant-pools.json", 
                    "projects.json",
                    "applications.json"
                ]
            }
            self.save_json_file(summary, "transformation-summary.json")
            
            logger.info("Transformation completed successfully!")
            logger.info(f"Output files saved to: {self.config.output_dir}")
            
        except Exception as e:
            logger.error(f"Transformation failed: {e}")
            raise

def main():
    """Main function to run the transformer"""
    config = GivethToDaoip5Config(
        output_dir="giveth_daoip5_output",
        base_uri="https://giveth.io"
    )
    
    transformer = GivethDaoip5Transformer(config)
    
    # Run transformation with optional project limit for testing
    # Remove or increase the limit for production use
    transformer.run_transformation(project_limit=50)

if __name__ == "__main__":
    main()
