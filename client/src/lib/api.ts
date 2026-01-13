import { QueryFilters, ApiResponse, DAOIP5System, DAOIP5GrantPool, DAOIP5Project, DAOIP5Application } from "@/types/daoip5";

const API_BASE_URL = '/api/v1';

class ApiClient {
  private apiKey: string | null = null;

  setApiKey(key: string | null) {
    this.apiKey = key;
  }

  getApiKey(): string | null {
    return this.apiKey;
  }

  private async makeRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    
    const response = await fetch(url, {
      headers,
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      if (response.status === 401) {
        throw new Error('Unauthorized: Please enter a valid API key. Get one at /get-api-access');
      }
      throw new Error(error.message || error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  private buildQueryString(filters: QueryFilters): string {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    return params.toString();
  }

  // Grant Systems API
  async getSystems(filters?: QueryFilters): Promise<ApiResponse<DAOIP5System>> {
    const queryString = filters ? this.buildQueryString(filters) : '';
    return this.makeRequest(`/grantSystems${queryString ? `?${queryString}` : ''}`);
  }

  async getSystem(id: string, system?: string): Promise<DAOIP5System> {
    const queryString = system ? `?system=${system}` : '';
    return this.makeRequest(`/grantSystems/${id}${queryString}`);
  }

  // Grant Pools API
  async getPools(filters?: QueryFilters): Promise<ApiResponse<DAOIP5GrantPool>> {
    const queryString = filters ? this.buildQueryString(filters) : '';
    return this.makeRequest(`/grantPools${queryString ? `?${queryString}` : ''}`);
  }

  async getPool(id: string, system?: string): Promise<DAOIP5GrantPool> {
    const queryString = system ? `?system=${system}` : '';
    return this.makeRequest(`/grantPools/${id}${queryString}`);
  }

  // Grant Applications API
  async getApplications(filters?: QueryFilters): Promise<ApiResponse<DAOIP5Application>> {
    const queryString = filters ? this.buildQueryString(filters) : '';
    return this.makeRequest(`/grantApplications${queryString ? `?${queryString}` : ''}`);
  }

  async getApplication(id: string, system?: string): Promise<DAOIP5Application> {
    const queryString = system ? `?system=${system}` : '';
    return this.makeRequest(`/grantApplications/${id}${queryString}`);
  }

  // Execute a custom query for the query builder
  async executeQuery(entityType: string, filters: QueryFilters): Promise<any> {
    switch (entityType) {
      case 'grantSystems':
        return this.getSystems(filters);
      case 'grantPools':
        return this.getPools(filters);
      case 'grantApplications':
        return this.getApplications(filters);
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }
}

export const apiClient = new ApiClient();
