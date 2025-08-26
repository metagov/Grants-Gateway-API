// GitHub API client for fetching DAOIP-5 data from metagov/oss-funding repository
import { queryClient } from './queryClient';

export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string;
}

export interface DAOIP5Data {
  grantPoolId: string;
  grantPoolName: string;
  grantSystem: string;
  grantSystemId: string;
  totalGrantPoolSizeUSD?: number;
  grantFundingMechanism?: string;
  grantApplications?: any[];
  metadata?: any;
}

class GitHubDataFetcher {
  private readonly baseUrl = 'https://api.github.com';
  private readonly repoOwner = 'metagov';
  private readonly repoName = 'oss-funding';
  private readonly dataPath = 'daoip-5/json';
  private cache = new Map<string, any>();
  private cacheTimestamps = new Map<string, number>();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

  // Fetch list of JSON files from the repository
  async fetchFileList(): Promise<GitHubFile[]> {
    const cacheKey = 'github-file-list';
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const url = `${this.baseUrl}/repos/${this.repoOwner}/${this.repoName}/contents/${this.dataPath}`;
      console.log('🔄 Fetching DAOIP-5 files from GitHub:', url);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          // Add auth token if available (for higher rate limits)
          ...(import.meta.env.VITE_GITHUB_TOKEN && {
            'Authorization': `Bearer ${import.meta.env.VITE_GITHUB_TOKEN}`
          })
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const files: GitHubFile[] = await response.json();
      const jsonFiles = files.filter(file => 
        file.type === 'file' && 
        file.name.endsWith('.json')
      );

      this.setCache(cacheKey, jsonFiles);
      console.log(`✅ Found ${jsonFiles.length} DAOIP-5 JSON files`);
      
      return jsonFiles;
    } catch (error) {
      console.error('Failed to fetch GitHub file list:', error);
      return [];
    }
  }

  // Fetch content of a specific JSON file
  async fetchFileContent(downloadUrl: string): Promise<DAOIP5Data | null> {
    const cacheKey = `github-content-${downloadUrl}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      console.log('📥 Fetching DAOIP-5 data from:', downloadUrl);
      
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`);
      }

      const data = await response.json();
      this.setCache(cacheKey, data);
      
      return data;
    } catch (error) {
      console.error('Failed to fetch file content:', error);
      return null;
    }
  }

  // Fetch all DAOIP-5 data from the repository
  async fetchAllDAOIP5Data(): Promise<DAOIP5Data[]> {
    const cacheKey = 'all-daoip5-data';
    
    if (this.isCacheValid(cacheKey)) {
      console.log('📦 Using cached DAOIP-5 data from GitHub');
      return this.cache.get(cacheKey);
    }

    try {
      console.log('🔄 Fetching all DAOIP-5 data from GitHub repository...');
      
      // Get list of files
      const files = await this.fetchFileList();
      if (files.length === 0) {
        console.warn('No DAOIP-5 files found in repository');
        return [];
      }

      // Fetch content of each file in parallel (with limit)
      const batchSize = 5; // Process 5 files at a time to avoid rate limits
      const allData: DAOIP5Data[] = [];
      
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const batchPromises = batch.map(file => 
          this.fetchFileContent(file.download_url)
        );
        
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            allData.push(result.value);
            console.log(`✓ Loaded ${batch[index].name}`);
          } else {
            console.warn(`✗ Failed to load ${batch[index].name}`);
          }
        });
        
        // Small delay between batches to avoid rate limiting
        if (i + batchSize < files.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      this.setCache(cacheKey, allData);
      console.log(`✅ Successfully loaded ${allData.length} DAOIP-5 data files from GitHub`);
      
      // Also update React Query cache
      queryClient.setQueryData(['github-daoip5-data'], allData);
      
      return allData;
    } catch (error) {
      console.error('Failed to fetch all DAOIP-5 data:', error);
      return [];
    }
  }

  // Get data for a specific grant system
  async getSystemData(systemId: string): Promise<DAOIP5Data[]> {
    const allData = await this.fetchAllDAOIP5Data();
    return allData.filter(data => 
      data.grantSystemId === systemId || 
      data.grantSystem?.toLowerCase().includes(systemId.toLowerCase())
    );
  }

  // Get unique grant systems from the data
  async getUniqueSystems(): Promise<string[]> {
    const allData = await this.fetchAllDAOIP5Data();
    const systems = new Set<string>();
    
    allData.forEach(data => {
      if (data.grantSystem) {
        systems.add(data.grantSystem);
      }
    });
    
    return Array.from(systems);
  }

  // Get summary statistics
  async getSummaryStats(): Promise<{
    totalSystems: number;
    totalPools: number;
    totalFunding: number;
    totalApplications: number;
  }> {
    const allData = await this.fetchAllDAOIP5Data();
    
    const stats = {
      totalSystems: new Set(allData.map(d => d.grantSystem)).size,
      totalPools: allData.length,
      totalFunding: allData.reduce((sum, d) => 
        sum + (d.totalGrantPoolSizeUSD || 0), 0
      ),
      totalApplications: allData.reduce((sum, d) => 
        sum + (d.grantApplications?.length || 0), 0
      )
    };
    
    return stats;
  }

  // Cache management
  private isCacheValid(key: string): boolean {
    const timestamp = this.cacheTimestamps.get(key);
    if (!timestamp) return false;
    return Date.now() - timestamp < this.cacheTimeout;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, data);
    this.cacheTimestamps.set(key, Date.now());
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
    queryClient.invalidateQueries({ queryKey: ['github-daoip5-data'] });
  }
}

export const githubDataFetcher = new GitHubDataFetcher();