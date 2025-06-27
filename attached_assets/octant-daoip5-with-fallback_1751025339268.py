def main():
    """Main execution function"""
    # Parse command line arguments
    args = parse_arguments()
    
    # Configuration
    config = OctantConfig(
        base_url=args.base_url,
        output_dir=args.output,
        max_retries=args.retries
    )
    
    # Create output directory
    os.makedirs(config.output_dir, exist_ok=True)
    
    # Initialize API client and converter
    api_client = OctantAPIClient(config)
    converter = DAOIP5Converter(api_client)
    
    try:
        # Get current epoch to determine range
        current_epoch = api_client.get_current_epoch()
        if current_epoch is None:
            logger.error("Could not fetch current epoch")
            return
        
        logger.info(f"Current epoch: {current_epoch}")
        
        # Determine epochs to process based on arguments
        epochs_to_process = determine_epochs_to_process(args, current_epoch)
        
        logger.info(f"Processing epochs: {epochs_to_process}")
        
        # Validate epoch numbers
        invalid_epochs = [e for e in epochs_to_process if e < 1 or e > current_epoch]
        if invalid_epochs:
            logger.warning(f"Invalid epoch numbers (must be 1-{current_epoch}): {invalid_epochs}")
            epochs_to_process = [e for e in epochs_to_process if e not in invalid_epochs]
        
        if not epochs_to_process:
            logger.error("No valid epochs to process")
            return
        
        # Generate grants system
        logger.info("Generating grants system...")
        grants_system = converter.generate_grants_system()
        with open(f"{config.output_dir}/grants_system.json", "w") as f:
            json.dump(grants_system, f, indent=2)
        
        # Generate grant pools
        logger.info("Generating grant pools...")
        grant_pools = converter.generate_grant_pools(epochs_to_process)
        with open(f"{config.output_dir}/grant_pools.json", "w") as f:
            json.dump(grant_pools, f, indent=2)
        
        # Generate projects
        logger.info("Generating projects...")
        projects = converter.generate_projects(epochs_to_process)
        with open(f"{config.output_dir}/projects.json", "w") as f:
            json.dump(projects, f, indent=2)
        
        # Generate applications for each epoch
        for epoch in epochs_to_process:
            logger.info(f"Generating applications for epoch {epoch}...")
            applications = converter.generate_applications(epoch)
            with open(f"{config.output_dir}/applications_epoch_{epoch}.json", "w") as f:
                json.dump(applications, f, indent=2)
        
        # Generate enhanced summary with metadata
        indexed_epoch_info = api_client.get_indexed_epoch()
        
        summary = {
            "conversion_completed_at": datetime.now().isoformat() + "Z",
            "epochs_processed": epochs_to_process,
            "total_epochs_processed": len(epochs_to_process),
            "current_epoch": current_epoch,
            "command_used": " ".join(sys.argv) if 'sys' in globals() else "python3 run.py",
            "files_generated": [
                "grants_system.json",
                "grant_pools.json", 
                "projects.json"
            ] + [f"applications_epoch_{epoch}.json" for epoch in epochs_to_process],
            "data_freshness": {
                "api_endpoint": config.base_url,
                "data_fetched_at": datetime.now().isoformat() + "Z",
                "sync_status": indexed_epoch_info if indexed_epoch_info else "unavailable"
            }
        }
        
        with open(f"{config.output_dir}/generation_summary.json", "w") as f:
            json.dump(summary, f, indent=2)
        
        logger.info(f"Successfully generated DAOIP-5 files in {config.output_dir}/")
        logger.info(f"Processed {len(epochs_to_process)} epochs: {epochs_to_process}")
        logger.info(f"Files: {summary['files_generated']}")
        
    except Exception as e:
        logger.error(f"Error during conversion: {e}")
        raise

if __name__ == "__main__":
    import sys
    main()#!/usr/bin/env python3
"""
Octant API to DAOIP-5 Data Converter

This script fetches data from the Octant API and generates DAOIP-5 compliant JSON files
for grants management interoperability.

Usage:
    python3 run.py                    # Process all epochs from 1 to current
    python3 run.py --epoch 5          # Process only epoch 5
    python3 run.py --current          # Process only current epoch
    python3 run.py --latest           # Process only latest/most recent epoch
    python3 run.py --epochs 3,4,5     # Process specific epochs
"""

import json
import requests
import time
import os
import argparse
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class OctantConfig:
    """Configuration for Octant API endpoints"""
    base_url: str = "https://backend.mainnet.octant.app"
    output_dir: str = "./daoip5_output"
    max_retries: int = 3
    retry_delay: float = 1.0
    epochs_to_process: Optional[List[int]] = None  # None means all epochs

class OctantAPIClient:
    """Client for interacting with Octant API"""
    
    def __init__(self, config: OctantConfig):
        self.config = config
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'DAOIP-5-Converter/1.0',
            'Accept': 'application/json'
        })
    
    def _make_request(self, endpoint: str, allow_404_400: bool = False) -> Optional[Dict]:
        """Make HTTP request with retry logic"""
        url = f"{self.config.base_url}{endpoint}"
        
        for attempt in range(self.config.max_retries):
            try:
                logger.info(f"Fetching: {endpoint}")
                response = self.session.get(url, timeout=30)
                
                # Handle expected 400/404 errors gracefully (e.g., epoch not concluded)
                if allow_404_400 and response.status_code in [400, 404]:
                    logger.info(f"Expected {response.status_code} error for {endpoint} - epoch likely not concluded")
                    return None
                
                response.raise_for_status()
                return response.json()
            except requests.exceptions.RequestException as e:
                # Don't retry on 400/404 if they're expected
                if allow_404_400 and hasattr(e, 'response') and e.response is not None and e.response.status_code in [400, 404]:
                    logger.info(f"Expected {e.response.status_code} error for {endpoint} - epoch likely not concluded")
                    return None
                
                logger.warning(f"Request failed (attempt {attempt + 1}): {e}")
                if attempt < self.config.max_retries - 1:
                    time.sleep(self.config.retry_delay * (2 ** attempt))
                else:
                    logger.error(f"Failed to fetch {endpoint} after {self.config.max_retries} attempts")
                    return None
    
    def get_current_epoch(self) -> Optional[int]:
        """Get current epoch number"""
        data = self._make_request("/epochs/current")
        return data.get("currentEpoch") if data else None
    
    def get_epoch_info(self, epoch: int) -> Optional[Dict]:
        """Get detailed epoch information"""
        return self._make_request(f"/epochs/info/{epoch}")
    
    def get_epoch_status(self, epoch: int) -> Optional[Dict]:
        """Get epoch status (current, pending, finalized)"""
        return self._make_request(f"/snapshots/status/{epoch}")
    
    def get_projects_for_epoch(self, epoch: int) -> Optional[Dict]:
        """Get projects metadata for epoch"""
        return self._make_request(f"/projects/epoch/{epoch}")
    
    def get_project_details(self, epochs: List[int], search_phrases: str = "") -> Optional[Dict]:
        """Get detailed project information"""
        epochs_str = ",".join(map(str, epochs))
        return self._make_request(f"/projects/details?epochs={epochs_str}&searchPhrases={search_phrases}")
    
    def get_allocations_for_epoch(self, epoch: int, include_zero: bool = False) -> Optional[Dict]:
        """Get all allocations for an epoch"""
        return self._make_request(f"/allocations/epoch/{epoch}?includeZeroAllocations={include_zero}")
    
    def get_project_rewards(self, epoch: int) -> Optional[Dict]:
        """Get project rewards for epoch"""
        return self._make_request(f"/rewards/projects/epoch/{epoch}", allow_404_400=True)
    
    def get_merkle_tree(self, epoch: int) -> Optional[Dict]:
        """Get merkle tree for epoch rewards"""
        return self._make_request(f"/rewards/merkle_tree/{epoch}", allow_404_400=True)
    
    def get_chain_info(self) -> Optional[Dict]:
        """Get blockchain and contract information"""
        return self._make_request("/info/chain-info")
    
    def get_version_info(self) -> Optional[Dict]:
        """Get version and deployment information"""
        return self._make_request("/info/version")
    
    def get_eth_to_usd_rate(self, date: Optional[str] = None) -> Optional[float]:
        """
        Get ETH to USD exchange rate for a specific date or current rate
        
        Args:
            date: Date in YYYY-MM-DD format. If None, gets current rate.
        """
        try:
            if date:
                # Historical price for specific date
                url = f"https://api.coingecko.com/api/v3/coins/ethereum/history?date={date}"
                response = self.session.get(url, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    price = data.get("market_data", {}).get("current_price", {}).get("usd")
                    if price:
                        logger.info(f"Historical ETH/USD rate for {date}: ${price:,.2f}")
                        return float(price)
            else:
                # Current price
                url = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
                response = self.session.get(url, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    price = data.get("ethereum", {}).get("usd")
                    if price:
                        logger.info(f"Current ETH/USD rate: ${price:,.2f}")
                        return float(price)
                        
        except Exception as e:
            logger.warning(f"Could not fetch ETH/USD rate for {date or 'current'}: {e}")
        return None
    
    def get_eth_price_for_epoch_end(self, epoch: int) -> Optional[float]:
        """Get ETH price for when the epoch ended/was finalized"""
        try:
            # Calculate approximate epoch end date (90 days per epoch)
            epoch_0_start = datetime(2023, 10, 1)  # Approximate Octant start
            epoch_end = epoch_0_start + timedelta(days=(epoch + 1) * 90)
            date_str = epoch_end.strftime("%d-%m-%Y")  # CoinGecko format: DD-MM-YYYY
            
            return self.get_eth_to_usd_rate(date_str)
        except Exception as e:
            logger.warning(f"Could not calculate epoch {epoch} end date: {e}")
            return None

class DAOIP5Converter:
    """Converts Octant API data to DAOIP-5 format"""
    
    def __init__(self, api_client: OctantAPIClient):
        self.api = api_client
        self.chain_info = None
        self.version_info = None
        self.indexed_epoch_info = None
        self.eth_usd_rates = {}  # Store rates per epoch
    
    def _load_system_info(self):
        """Load chain and version information"""
        self.chain_info = self.api.get_chain_info()
        self.version_info = self.api.get_version_info()
        self.indexed_epoch_info = self.api.get_indexed_epoch()
    
    def _get_eth_rate_for_epoch(self, epoch: int) -> Optional[float]:
        """Get ETH/USD rate for a specific epoch, with caching"""
        if epoch in self.eth_usd_rates:
            return self.eth_usd_rates[epoch]
        
        # Try to get historical rate for epoch end date
        rate = self.api.get_eth_price_for_epoch_end(epoch)
        
        # Fallback to current rate if historical fails
        if not rate:
            logger.warning(f"Could not get historical rate for epoch {epoch}, using current rate")
            rate = self.api.get_eth_to_usd_rate()
        
        if rate:
            self.eth_usd_rates[epoch] = rate
        
        return rate
    
    def _wei_to_eth_str(self, wei_amount: str) -> str:
        """Convert wei amount string to ETH string"""
        try:
            wei_int = int(wei_amount)
            eth_amount = wei_int / 10**18
            return f"{eth_amount:.6f}".rstrip('0').rstrip('.')
        except (ValueError, TypeError):
            return "0"
    
    def _wei_to_usd_str(self, wei_amount: str, epoch: int) -> Optional[str]:
        """Convert wei amount string to USD string using epoch-specific rate"""
        eth_rate = self._get_eth_rate_for_epoch(epoch)
        if not eth_rate:
            return None
        
        try:
            wei_int = int(wei_amount)
            eth_amount = wei_int / 10**18
            usd_amount = eth_amount * eth_rate
            return f"{usd_amount:.2f}"
        except (ValueError, TypeError):
            return None
    
    def _get_data_freshness_metadata(self) -> Dict:
        """Generate metadata about data freshness and sync status"""
        current_time = datetime.now()
        
        metadata = {
            "data_fetched_at": current_time.isoformat() + "Z",
            "api_endpoint": self.api.config.base_url,
            "sync_status": {}
        }
        
        # Add sync status information
        if self.indexed_epoch_info:
            current_epoch = self.indexed_epoch_info.get("currentEpoch")
            indexed_epoch = self.indexed_epoch_info.get("indexedEpoch")
            
            metadata["sync_status"] = {
                "current_epoch_on_chain": current_epoch,
                "last_indexed_epoch": indexed_epoch,
                "indexing_lag": current_epoch - indexed_epoch if current_epoch and indexed_epoch else None,
                "is_fully_synced": current_epoch == indexed_epoch if current_epoch and indexed_epoch else None
            }
        
        # Add version information
        if self.version_info:
            metadata["backend_version"] = {
                "deployment_id": self.version_info.get("id"),
                "environment": self.version_info.get("env"),
                "chain": self.version_info.get("chain")
            }
        
        # Add chain information
        if self.chain_info:
            metadata["chain_info"] = {
                "chain_id": self.chain_info.get("chainId"),
                "chain_name": self.chain_info.get("chainName")
            }
        
        # Add ETH/USD rate information
        current_rate = self.api.get_eth_to_usd_rate()
        if current_rate or self.eth_usd_rates:
            rate_info = {
                "current_eth_usd_rate": current_rate,
                "rate_fetched_at": current_time.isoformat() + "Z",
                "rate_source": "CoinGecko API"
            }
            
            # Add historical rates if we have them
            if self.eth_usd_rates:
                rate_info["historical_rates_by_epoch"] = self.eth_usd_rates
            
            metadata["exchange_rates"] = rate_info
        
        return metadata
    
    def _generate_caip10_address(self, address: str) -> str:
        """Generate CAIP-10 formatted address"""
        if not self.chain_info:
            return f"eip155:1:{address}"  # Default to mainnet
        
        chain_id = self.chain_info.get("chainId", 1)
        return f"eip155:{chain_id}:{address}"
    
    def _calculate_epoch_dates(self, epoch: int) -> tuple:
        """Calculate epoch start and end dates (90-day epochs)"""
        # Octant epochs are 90 days, starting from a reference point
        epoch_duration_days = 90
        # Approximate start date for epoch 0
        epoch_0_start = datetime(2023, 10, 1)
        
        start_date = epoch_0_start + timedelta(days=epoch * epoch_duration_days)
        end_date = start_date + timedelta(days=epoch_duration_days)
        
        return start_date, end_date
    
    def generate_grants_system(self) -> Dict:
        """Generate DAOIP-5 grants system JSON"""
        self._load_system_info()
        
        system_data = {
            "@context": "http://www.daostar.org/schemas",
            "name": "Octant",
            "type": "Foundation",
            "description": "A decentralized grants platform using quadratic funding to support public goods",
            "grantPoolsURI": "./grant_pools.json",
            "website": "https://octant.app",
            "documentation": "https://docs.octant.app"
        }
        
        if self.chain_info:
            system_data["chainId"] = self.chain_info.get("chainId")
            system_data["chainName"] = self.chain_info.get("chainName")
        
        if self.version_info:
            system_data["version"] = self.version_info.get("id")
            system_data["environment"] = self.version_info.get("env")
        
        # Add data freshness metadata
        system_data["_metadata"] = self._get_data_freshness_metadata()
        
        return system_data
    
    def generate_grant_pools(self, epochs: List[int]) -> Dict:
        """Generate DAOIP-5 grant pools JSON for given epochs"""
        grant_pools = []
        
        for epoch in epochs:
            logger.info(f"Processing epoch {epoch}")
            
            # Get epoch information
            epoch_info = self.api.get_epoch_info(epoch)
            epoch_status = self.api.get_epoch_status(epoch)
            
            if not epoch_info or not epoch_status:
                logger.warning(f"Could not fetch data for epoch {epoch}")
                continue
            
            start_date, end_date = self._calculate_epoch_dates(epoch)
            pool_id = self._generate_caip10_address("0x0000000000000000000000000000000000000000") + f"?contractId={epoch}"
            
            grant_pool = {
                "type": "GrantPool",
                "id": pool_id,
                "name": f"Octant Epoch {epoch}",
                "description": f"Quadratic funding round for Octant epoch {epoch} - 90-day funding period supporting Ethereum public goods",
                "grantFundingMechanism": "Quadratic Funding",
                "isOpen": epoch_status.get("isCurrent", False),
                "closeDate": end_date.isoformat() + "Z",
                "applicationsURI": f"./applications_epoch_{epoch}.json",
                "governanceURI": "https://docs.octant.app/how-it-works/mechanism",
                "totalGrantPoolSize": [
                    {
                        "amount": epoch_info.get("totalRewards", "0"),
                        "denomination": "ETH"
                    }
                ],
                "epochMetadata": {
                    "stakingProceeds": epoch_info.get("stakingProceeds"),
                    "totalEffectiveDeposit": epoch_info.get("totalEffectiveDeposit"),
                    "vanillaIndividualRewards": epoch_info.get("vanillaIndividualRewards"),
                    "operationalCost": epoch_info.get("operationalCost"),
                    "matchedRewards": epoch_info.get("matchedRewards"),
                    "patronsRewards": epoch_info.get("patronsRewards"),
                    "totalWithdrawals": epoch_info.get("totalWithdrawals"),
                    "leftover": epoch_info.get("leftover"),
                    "ppf": epoch_info.get("ppf"),
                    "communityFund": epoch_info.get("communityFund")
                }
            }
            
            grant_pools.append(grant_pool)
        
        result = {
            "@context": "http://www.daostar.org/schemas",
            "name": "Octant",
            "type": "Foundation",
            "grantPools": grant_pools
        }
        
        # Add metadata using standard approach
        result["_metadata"] = self._get_data_freshness_metadata()
        result["_metadata"]["epochs_processed"] = epochs
        result["_metadata"]["total_grant_pools"] = len(grant_pools)
        
        return result
    
    def generate_projects(self, epochs: List[int]) -> Dict:
        """Generate DAOIP-5 projects JSON"""
        all_projects = {}
        
        for epoch in epochs:
            logger.info(f"Fetching projects for epoch {epoch}")
            
            # Get project metadata
            projects_data = self.api.get_projects_for_epoch(epoch)
            if not projects_data:
                continue
            
            project_addresses = projects_data.get("projectsAddresses", [])
            projects_cid = projects_data.get("projectsCid")
            
            # Get detailed project information
            project_details = self.api.get_project_details([epoch])
            
            # Create mapping for easier lookup
            detail_map = {}
            if project_details and "projectsDetails" in project_details:
                for detail in project_details["projectsDetails"]:
                    detail_map[detail.get("address")] = detail
            
            for address in project_addresses:
                if address not in all_projects:
                    project_id = self._generate_caip10_address(address) + "?proposalId=1"
                    
                    # Find project details
                    detail = detail_map.get(address, {})
                    project_name = detail.get("name", f"Project {address[:8]}...")
                    
                    project = {
                        "type": "Project",
                        "id": project_id,
                        "name": project_name,
                        "description": f"Public goods project participating in Octant quadratic funding",
                        "contentURI": f"ipfs://{projects_cid}" if projects_cid else None,
                        "relevantTo": [f"Octant Epoch {epoch}"],
                        "participatingEpochs": [epoch]
                    }
                    
                    all_projects[address] = project
                else:
                    # Add epoch to existing project
                    all_projects[address]["participatingEpochs"].append(epoch)
                    all_projects[address]["relevantTo"].append(f"Octant Epoch {epoch}")
        
        result = {
            "@context": "http://www.daostar.org/schemas",
            "name": "Octant Projects",
            "type": "ProjectRegistry",
            "projects": list(all_projects.values())
        }
        
        # Add metadata using standard approach  
        result["_metadata"] = self._get_data_freshness_metadata()
        result["_metadata"]["epochs_processed"] = epochs
        result["_metadata"]["total_projects"] = len(all_projects)
        result["_metadata"]["total_project_epoch_participations"] = sum(len(p["participatingEpochs"]) for p in all_projects.values())
        
        return result
    
    def generate_applications(self, epoch: int) -> Dict:
        """Generate DAOIP-5 applications JSON for an epoch"""
        logger.info(f"Generating applications for epoch {epoch}")
        
        # Get allocations and rewards data
        allocations_data = self.api.get_allocations_for_epoch(epoch)
        rewards_data = self.api.get_project_rewards(epoch)
        merkle_data = self.api.get_merkle_tree(epoch)
        
        applications = []
        epoch_concluded = True
        epoch_status = "completed"
        
        # Check if epoch has allocations
        if not allocations_data or not allocations_data.get("allocations"):
            epoch_concluded = False
            epoch_status = "no_allocations"
            logger.info(f"No allocations found for epoch {epoch} - epoch may not be concluded yet")
        
        # Check if rewards/merkle data is missing (indicates epoch not finalized)
        elif not rewards_data or not merkle_data:
            epoch_concluded = False
            epoch_status = "not_finalized"
            if not rewards_data and not merkle_data:
                logger.info(f"No rewards or merkle data for epoch {epoch} - epoch not finalized")
            elif not rewards_data:
                logger.info(f"No rewards data for epoch {epoch} - epoch not finalized")
            elif not merkle_data:
                logger.info(f"No merkle tree data for epoch {epoch} - epoch not finalized")
        
        # Return early for non-concluded epochs
        if not epoch_concluded:
            note_map = {
                "no_allocations": "This epoch has no allocations yet or has not been concluded",
                "not_finalized": "This epoch has allocations but has not been finalized yet (no rewards/merkle data available)"
            }
            
            result = {
                "@context": "http://www.daostar.org/schemas",
                "name": "Octant",
                "type": "Foundation",
                "grantPools": [
                    {
                        "type": "GrantPool",
                        "name": f"Octant Epoch {epoch}",
                        "applications": [],
                        "_note": note_map.get(epoch_status, "This epoch has not been concluded yet"),
                        "_epoch_status": epoch_status,
                        "_has_allocations": bool(allocations_data and allocations_data.get("allocations")),
                        "_has_rewards": bool(rewards_data),
                        "_has_merkle_tree": bool(merkle_data)
                    }
                ]
            }
            
            # Add metadata using standard approach
            result["_metadata"] = self._get_data_freshness_metadata()
            result["_metadata"]["epoch_processed"] = epoch
            result["_metadata"]["epoch_conclusion_status"] = epoch_status
            
            return result

        # Process allocations into applications for concluded epochs
        project_allocations = {}
        allocations = allocations_data.get("allocations", [])
        
        # Group allocations by project
        for allocation in allocations:
            project = allocation.get("project")
            donor = allocation.get("donor")
            amount = allocation.get("amount", "0")
            
            if project not in project_allocations:
                project_allocations[project] = {
                    "totalAllocated": 0,
                    "donors": [],
                    "allocations": []
                }
            
            project_allocations[project]["totalAllocated"] += int(amount)
            project_allocations[project]["donors"].append(donor)
            project_allocations[project]["allocations"].append(allocation)
        
        # Create applications
        app_counter = 1
        
        for project_address, data in project_allocations.items():
            # Find project rewards
            project_rewards = None
            if rewards_data and "rewards" in rewards_data:
                for reward in rewards_data["rewards"]:
                    if reward.get("address") == project_address:
                        project_rewards = reward
                        break
            
            # Determine application status
            status = "pending"
            if project_rewards:
                total_reward = int(project_rewards.get("allocated", "0")) + int(project_rewards.get("matched", "0"))
                if total_reward > 0:
                    status = "funded"
                elif int(project_rewards.get("allocated", "0")) > 0:
                    status = "approved"
            
            # Create payout information
            payouts = []
            if project_rewards and merkle_data:
                # Find merkle proof for this project
                for leaf in merkle_data.get("leaves", []):
                    if leaf.get("address") == project_address:
                        payouts.append({
                            "type": "OnchainTransaction",
                            "value": {
                                "amount": leaf.get("amount"),
                                "merkleRoot": merkle_data.get("root"),
                                "recipient": project_address
                            },
                            "proof": f"merkle_proof_epoch_{epoch}_{project_address}"
                        })
                        break
            
            application = {
                "type": "GrantApplication",
                "id": self._generate_caip10_address("0x0000000000000000000000000000000000000000") + f"?proposalId={app_counter}",
                "grantPoolId": self._generate_caip10_address("0x0000000000000000000000000000000000000000") + f"?contractId={epoch}",
                "grantPoolName": f"Octant Epoch {epoch}",
                "projectId": self._generate_caip10_address(project_address) + "?proposalId=1",
                "projectName": f"Project {project_address[:8]}...",
                "createdAt": datetime.now().isoformat() + "Z",
                "fundsAsked": [
                    {
                        "amount": "0",  # Octant doesn't have explicit ask amounts
                        "denomination": "ETH"
                    }
                ],
                "fundsApproved": [
                    {
                        "amount": str(data["totalAllocated"]),
                        "denomination": "ETH"
                    }
                ],
                "fundsApprovedInUSD": self._wei_to_usd_str(str(data["totalAllocated"]), epoch),
                "status": status,
                "payouts": payouts
            }
            
            # Add optional DAOIP-5 fields if data is available
            if project_rewards:
                matched_amount = project_rewards.get("matched", "0")
                total_amount = str(data["totalAllocated"] + int(matched_amount))
                
                # Add matched funding info using standard fields
                application["fundsApproved"].append({
                    "amount": matched_amount,
                    "denomination": "ETH",
                    "type": "matched_funding"
                })
                
                # Add USD conversion for matched funding
                matched_usd = self._wei_to_usd_str(matched_amount, epoch)
                if matched_usd:
                    application["fundsApprovedInUSD"] = self._wei_to_usd_str(total_amount, epoch)
            
            applications.append(application)
            app_counter += 1
        
        result = {
            "@context": "http://www.daostar.org/schemas",
            "name": "Octant",
            "type": "Foundation",
            "grantPools": [
                {
                    "type": "GrantPool",
                    "name": f"Octant Epoch {epoch}",
                    "applications": applications,
                    "_epoch_concluded": epoch_concluded,
                    "_epoch_status": epoch_status,
                    "_total_applications": len(applications),
                    "_has_allocations": True,
                    "_has_rewards": bool(rewards_data),
                    "_has_merkle_tree": bool(merkle_data)
                }
            ]
        }
        
        # Add metadata using only standard fields and underscore prefixed metadata
        result["_metadata"] = self._get_data_freshness_metadata()
        result["_metadata"]["epoch_processed"] = epoch
        result["_metadata"]["epoch_conclusion_status"] = epoch_status
        result["_metadata"]["data_completeness"] = {
            "has_allocations": True,
            "has_rewards": bool(rewards_data),
            "has_merkle_tree": bool(merkle_data),
            "total_projects_with_allocations": len(applications)
        }
        
        return result

def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description="Convert Octant API data to DAOIP-5 format",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python3 run.py                    # Process all epochs from 1 to current
    python3 run.py --epoch 5          # Process only epoch 5
    python3 run.py --current          # Process only current epoch
    python3 run.py --latest           # Process only latest/most recent epoch
    python3 run.py --epochs 3,4,5     # Process specific epochs (comma-separated)
    python3 run.py --output ./data    # Use custom output directory
        """
    )
    
    # Epoch selection options (mutually exclusive)
    epoch_group = parser.add_mutually_exclusive_group()
    epoch_group.add_argument(
        "--epoch", 
        type=int, 
        help="Process a specific epoch number"
    )
    epoch_group.add_argument(
        "--epochs", 
        type=str, 
        help="Process specific epochs (comma-separated, e.g., '3,4,5')"
    )
    epoch_group.add_argument(
        "--current", 
        action="store_true", 
        help="Process only the current epoch"
    )
    epoch_group.add_argument(
        "--latest", 
        action="store_true", 
        help="Process only the latest/most recent epoch (same as --current)"
    )
    
    # Configuration options
    parser.add_argument(
        "--output", 
        type=str, 
        default="./daoip5_output",
        help="Output directory (default: ./daoip5_output)"
    )
    parser.add_argument(
        "--base-url", 
        type=str, 
        default="https://backend.mainnet.octant.app",
        help="Octant API base URL (default: mainnet)"
    )
    parser.add_argument(
        "--retries", 
        type=int, 
        default=3,
        help="Number of API request retries (default: 3)"
    )
    
    return parser.parse_args()

def determine_epochs_to_process(args, current_epoch: int) -> List[int]:
    """Determine which epochs to process based on arguments"""
    if args.epoch is not None:
        return [args.epoch]
    elif args.epochs:
        try:
            epochs = [int(e.strip()) for e in args.epochs.split(",")]
            return sorted(set(epochs))  # Remove duplicates and sort
        except ValueError:
            raise ValueError("Invalid epochs format. Use comma-separated integers (e.g., '3,4,5')")
    elif args.current or args.latest:
        return [current_epoch]
    else:
        # Default: all epochs from 1 to current
        return list(range(1, current_epoch + 1))

def main():
    """Main execution function"""
    # Configuration
    config = OctantConfig()
    
    # Create output directory
    os.makedirs(config.output_dir, exist_ok=True)
    
    # Initialize API client and converter
    api_client = OctantAPIClient(config)
    converter = DAOIP5Converter(api_client)
    
    try:
        # Get current epoch to determine range
        current_epoch = api_client.get_current_epoch()
        if current_epoch is None:
            logger.error("Could not fetch current epoch")
            return
        
        logger.info(f"Current epoch: {current_epoch}")
        
        # Define epochs to process (current and all previous epochs down to 1)
        epochs_to_process = list(range(1, current_epoch + 1))
        
        logger.info(f"Processing epochs: {epochs_to_process}")
        
        # Generate grants system
        logger.info("Generating grants system...")
        grants_system = converter.generate_grants_system()
        with open(f"{config.output_dir}/grants_system.json", "w") as f:
            json.dump(grants_system, f, indent=2)
        
        # Generate grant pools
        logger.info("Generating grant pools...")
        grant_pools = converter.generate_grant_pools(epochs_to_process)
        with open(f"{config.output_dir}/grant_pools.json", "w") as f:
            json.dump(grant_pools, f, indent=2)
        
        # Generate projects
        logger.info("Generating projects...")
        projects = converter.generate_projects(epochs_to_process)
        with open(f"{config.output_dir}/projects.json", "w") as f:
            json.dump(projects, f, indent=2)
        
        # Generate applications for each epoch
        for epoch in epochs_to_process:
            logger.info(f"Generating applications for epoch {epoch}...")
            applications = converter.generate_applications(epoch)
            with open(f"{config.output_dir}/applications_epoch_{epoch}.json", "w") as f:
                json.dump(applications, f, indent=2)
        
        # Generate summary
        summary = {
            "generated_at": datetime.now().isoformat() + "Z",
            "epochs_processed": epochs_to_process,
            "current_epoch": current_epoch,
            "files_generated": [
                "grants_system.json",
                "grant_pools.json",
                "projects.json"
            ] + [f"applications_epoch_{epoch}.json" for epoch in epochs_to_process]
        }
        
        with open(f"{config.output_dir}/generation_summary.json", "w") as f:
            json.dump(summary, f, indent=2)
        
        logger.info(f"Successfully generated DAOIP-5 files in {config.output_dir}/")
        logger.info(f"Files: {summary['files_generated']}")
        
    except Exception as e:
        logger.error(f"Error during conversion: {e}")
        raise

if __name__ == "__main__":
    main()
