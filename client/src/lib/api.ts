import { QueryFilters, ApiResponse, DAOIP5System, DAOIP5GrantPool, DAOIP5Project, DAOIP5Application } from "@/types/daoip5";

const API_BASE_URL = '/api/v1';

class ApiClient {
  private async makeRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
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

  // Systems API
  async getSystems(filters?: QueryFilters): Promise<ApiResponse<DAOIP5System>> {
    const queryString = filters ? this.buildQueryString(filters) : '';
    return this.makeRequest(`/systems${queryString ? `?${queryString}` : ''}`);
  }

  async getSystem(id: string, system?: string): Promise<DAOIP5System> {
    const queryString = system ? `?system=${system}` : '';
    return this.makeRequest(`/systems/${id}${queryString}`);
  }

  // Pools API
  async getPools(filters?: QueryFilters): Promise<ApiResponse<DAOIP5GrantPool>> {
    const queryString = filters ? this.buildQueryString(filters) : '';
    return this.makeRequest(`/pools${queryString ? `?${queryString}` : ''}`);
  }

  async getPool(id: string, system?: string): Promise<DAOIP5GrantPool> {
    const queryString = system ? `?system=${system}` : '';
    return this.makeRequest(`/pools/${id}${queryString}`);
  }

  // Applications API
  async getApplications(filters?: QueryFilters): Promise<ApiResponse<DAOIP5Application>> {
    const queryString = filters ? this.buildQueryString(filters) : '';
    return this.makeRequest(`/applications${queryString ? `?${queryString}` : ''}`);
  }

  async getApplication(id: string, system?: string): Promise<DAOIP5Application> {
    const queryString = system ? `?system=${system}` : '';
    return this.makeRequest(`/applications/${id}${queryString}`);
  }

  // Execute a custom query for the query builder
  async executeQuery(entityType: string, filters: QueryFilters): Promise<any> {
    switch (entityType) {
      case 'systems':
        return this.getSystems(filters);
      case 'pools':
        return this.getPools(filters);
      case 'applications':
        return this.getApplications(filters);
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }
}

export const apiClient = new ApiClient();
