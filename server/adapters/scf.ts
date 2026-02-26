import { BaseAdapter, DAOIP5System, DAOIP5GrantPool, DAOIP5Application, QueryFilters, PaginatedResult } from "./base";
import { pool } from "../db";

export class SCFAdapter extends BaseAdapter {
  constructor() {
    super("SCF", "database://silver_scf");
  }

  async getSystems(): Promise<DAOIP5System[]> {
    return [{
      "@context": "http://www.daostar.org/schemas",
      name: "SCF",
      type: "DAO",
      grantPoolsURI: "/api/v1/grantPools?system=scf",
      extensions: {
        "org.stellar.communityfund.systemMetadata": {
          platform: "scf",
          description: "Stellar Community Fund - Community-driven funding for Stellar ecosystem projects",
          website: "https://communityfund.stellar.org",
          supportedNetworks: ["stellar"],
          fundingMechanisms: ["community_vote", "direct_grants"],
          established: "2019"
        }
      }
    }];
  }

  async getSystem(id: string): Promise<DAOIP5System | null> {
    const systems = await this.getSystems();
    return systems[0] || null;
  }

  // --- Pools ---

  async getPools(filters?: QueryFilters): Promise<DAOIP5GrantPool[]> {
    try {
      const { sql, params } = this.buildPoolQuery(filters);
      const result = await pool.query(sql, params);
      return result.rows.map(row => this.mapRowToPool(row));
    } catch (error) {
      console.error("Error fetching SCF pools:", error);
      return [];
    }
  }

  async getPool(id: string): Promise<DAOIP5GrantPool | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM public.silver_scf_grant_pools WHERE id = $1',
        [id]
      );
      if (result.rows.length === 0) return null;
      return this.mapRowToPool(result.rows[0]);
    } catch (error) {
      console.error("Error fetching SCF pool:", error);
      return null;
    }
  }

  async getPoolsPaginated(filters?: QueryFilters): Promise<PaginatedResult<DAOIP5GrantPool>> {
    try {
      const { whereClause, whereParams } = this.buildPoolWhereClause(filters);

      // Count query
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM public.silver_scf_grant_pools${whereClause}`,
        whereParams
      );
      const totalCount = parseInt(countResult.rows[0].count, 10);

      // Data query with LIMIT/OFFSET
      const limit = filters?.limit ?? 20;
      const offset = filters?.offset ?? 0;
      const dataParams = [...whereParams, limit, offset];
      const dataResult = await pool.query(
        `SELECT * FROM public.silver_scf_grant_pools${whereClause} ORDER BY id LIMIT $${whereParams.length + 1} OFFSET $${whereParams.length + 2}`,
        dataParams
      );

      return {
        data: dataResult.rows.map(row => this.mapRowToPool(row)),
        totalCount
      };
    } catch (error) {
      console.error("Error fetching paginated SCF pools:", error);
      return { data: [], totalCount: 0 };
    }
  }

  // --- Applications ---

  async getApplications(filters?: QueryFilters): Promise<DAOIP5Application[]> {
    try {
      const { sql, params } = this.buildApplicationQuery(filters);
      const result = await pool.query(sql, params);
      return result.rows.map(row => this.mapRowToApplication(row));
    } catch (error) {
      console.error("Error fetching SCF applications:", error);
      return [];
    }
  }

  async getApplication(id: string): Promise<DAOIP5Application | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM public.silver_scf_grant_applications WHERE id = $1',
        [id]
      );
      if (result.rows.length === 0) return null;
      return this.mapRowToApplication(result.rows[0]);
    } catch (error) {
      console.error("Error fetching SCF application:", error);
      return null;
    }
  }

  async getApplicationsPaginated(filters?: QueryFilters): Promise<PaginatedResult<DAOIP5Application>> {
    try {
      const { whereClause, whereParams } = this.buildApplicationWhereClause(filters);

      const countResult = await pool.query(
        `SELECT COUNT(*) FROM public.silver_scf_grant_applications${whereClause}`,
        whereParams
      );
      const totalCount = parseInt(countResult.rows[0].count, 10);

      const limit = filters?.limit ?? 20;
      const offset = filters?.offset ?? 0;
      const dataParams = [...whereParams, limit, offset];
      const dataResult = await pool.query(
        `SELECT * FROM public.silver_scf_grant_applications${whereClause} ORDER BY id LIMIT $${whereParams.length + 1} OFFSET $${whereParams.length + 2}`,
        dataParams
      );

      return {
        data: dataResult.rows.map(row => this.mapRowToApplication(row)),
        totalCount
      };
    } catch (error) {
      console.error("Error fetching paginated SCF applications:", error);
      return { data: [], totalCount: 0 };
    }
  }

  // --- Health Check ---

  async healthCheck(): Promise<{ status: string; endpoints: Record<string, boolean> }> {
    const endpoints: Record<string, boolean> = {
      silver_scf_grant_pools: false,
      silver_scf_grant_applications: false,
      silver_scf_projects: false
    };

    try {
      const tables = [
        'silver_scf_grant_pools',
        'silver_scf_grant_applications',
        'silver_scf_projects'
      ] as const;

      for (const table of tables) {
        try {
          const result = await pool.query(`SELECT COUNT(*) FROM public.${table}`);
          endpoints[table] = parseInt(result.rows[0].count, 10) > 0;
        } catch {
          endpoints[table] = false;
        }
      }

      const allHealthy = Object.values(endpoints).every(v => v);
      const anyHealthy = Object.values(endpoints).some(v => v);

      return {
        status: allHealthy ? 'healthy' : anyHealthy ? 'degraded' : 'down',
        endpoints
      };
    } catch (error) {
      console.error("SCF health check failed:", error);
      return { status: 'down', endpoints };
    }
  }

  // --- Private helpers ---

  private buildPoolWhereClause(filters?: QueryFilters): { whereClause: string; whereParams: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.isOpen !== undefined) {
      // isOpen is stored as text ('true'/'false') in the silver table
      conditions.push(`"isOpen" = $${paramIndex}`);
      params.push(String(filters.isOpen));
      paramIndex++;
    }

    if (filters?.mechanism) {
      conditions.push(`"grantFundingMechanism" = $${paramIndex}`);
      params.push(filters.mechanism);
      paramIndex++;
    }

    const whereClause = conditions.length > 0
      ? ` WHERE ${conditions.join(' AND ')}`
      : '';

    return { whereClause, whereParams: params };
  }

  private buildPoolQuery(filters?: QueryFilters): { sql: string; params: any[] } {
    const { whereClause, whereParams } = this.buildPoolWhereClause(filters);
    const limit = filters?.limit ?? 100;
    const offset = filters?.offset ?? 0;
    const params = [...whereParams, limit, offset];
    const sql = `SELECT * FROM public.silver_scf_grant_pools${whereClause} ORDER BY id LIMIT $${whereParams.length + 1} OFFSET $${whereParams.length + 2}`;
    return { sql, params };
  }

  private buildApplicationWhereClause(filters?: QueryFilters): { whereClause: string; whereParams: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.poolId) {
      conditions.push(`"grantPoolId" = $${paramIndex}`);
      params.push(filters.poolId);
      paramIndex++;
    }

    if (filters?.projectId) {
      conditions.push(`"projectId" = $${paramIndex}`);
      params.push(filters.projectId);
      paramIndex++;
    }

    if (filters?.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    const whereClause = conditions.length > 0
      ? ` WHERE ${conditions.join(' AND ')}`
      : '';

    return { whereClause, whereParams: params };
  }

  private buildApplicationQuery(filters?: QueryFilters): { sql: string; params: any[] } {
    const { whereClause, whereParams } = this.buildApplicationWhereClause(filters);
    const limit = filters?.limit ?? 100;
    const offset = filters?.offset ?? 0;
    const params = [...whereParams, limit, offset];
    const sql = `SELECT * FROM public.silver_scf_grant_applications${whereClause} ORDER BY id LIMIT $${whereParams.length + 1} OFFSET $${whereParams.length + 2}`;
    return { sql, params };
  }

  private parseJsonField(value: any): any {
    if (value == null) return undefined;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }

  private parseIsOpen(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return false;
  }

  private mapStatusToDAOIP5(status: string | null): "pending" | "in_review" | "approved" | "funded" | "rejected" | "completed" {
    if (!status) return "pending";
    const normalized = status.toLowerCase().trim();
    switch (normalized) {
      case 'approved': return 'approved';
      case 'awarded': return 'funded';
      case 'funded': return 'funded';
      case 'rejected': return 'rejected';
      case 'completed': return 'completed';
      case 'in_review':
      case 'in review':
      case 'under review':
        return 'in_review';
      default: return 'pending';
    }
  }

  private mapRowToPool(row: any): DAOIP5GrantPool {
    // Collect org.stellar.communityfund.* columns into extensions
    const scfExtensions: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      if (key.startsWith('org.stellar.communityfund.') && value != null) {
        scfExtensions[key] = value;
      }
    }

    const extensions: Record<string, any> = {};
    if (Object.keys(scfExtensions).length > 0) {
      extensions["org.stellar.communityfund"] = scfExtensions;
    }

    // Parse totalGrantPoolSize — stored as JSON string like [{"amount": 0.0, "token": "USD"}]
    let totalGrantPoolSize: Array<{ amount: string; denomination: string }> | undefined;
    const rawPoolSize = this.parseJsonField(row.totalGrantPoolSize);
    if (Array.isArray(rawPoolSize)) {
      totalGrantPoolSize = rawPoolSize.map((item: any) => ({
        amount: String(item.amount ?? item.value ?? 0),
        denomination: item.denomination ?? item.token ?? "USD"
      }));
    }

    // Parse requiredCredentials
    let requiredCredentials: string[] | undefined;
    const rawCredentials = this.parseJsonField(row.requiredCredentials);
    if (Array.isArray(rawCredentials)) {
      requiredCredentials = rawCredentials;
    }

    return {
      type: "GrantPool",
      id: row.id,
      name: row.name || "",
      description: row.description || "",
      grantFundingMechanism: row.grantFundingMechanism || "other",
      isOpen: this.parseIsOpen(row.isOpen),
      closeDate: row.closeDate || undefined,
      applicationsURI: row.applicationsURI || undefined,
      governanceURI: row.governanceURI || undefined,
      attestationIssuersURI: row.attestationIssuersURI || undefined,
      requiredCredentials,
      totalGrantPoolSize,
      email: row.email || undefined,
      image: row.image || row['org.stellar.communityfund.image'] || undefined,
      coverImage: row.coverImage || undefined,
      extensions: Object.keys(extensions).length > 0 ? extensions : undefined
    };
  }

  private mapRowToApplication(row: any): DAOIP5Application {
    // Collect io.scf.* columns into extensions
    const scfExtensions: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      if (key.startsWith('io.scf.') && value != null) {
        scfExtensions[key] = value;
      }
    }

    const extensions: Record<string, any> = {};
    if (Object.keys(scfExtensions).length > 0) {
      extensions["io.scf"] = scfExtensions;
    }

    // Parse socials — stored as JSON string
    let socials: Array<{ platform: string; url: string }> | undefined;
    const rawSocials = this.parseJsonField(row.socials);
    if (Array.isArray(rawSocials)) {
      socials = rawSocials.map((item: any) => ({
        platform: item.platform ?? item.name ?? "unknown",
        url: item.url ?? item.value ?? ""
      }));
    }

    // Parse fundsAsked
    let fundsAsked: Array<{ amount: string; denomination: string }> | undefined;
    const rawFundsAsked = this.parseJsonField(row.fundsAsked);
    if (Array.isArray(rawFundsAsked)) {
      fundsAsked = rawFundsAsked.map((item: any) => ({
        amount: String(item.amount ?? item.value ?? 0),
        denomination: item.denomination ?? item.token ?? "USD"
      }));
    }

    // Parse fundsApproved
    let fundsApproved: Array<{ amount: string; denomination: string }> | undefined;
    const rawFundsApproved = this.parseJsonField(row.fundsApproved);
    if (Array.isArray(rawFundsApproved)) {
      fundsApproved = rawFundsApproved.map((item: any) => ({
        amount: String(item.amount ?? item.value ?? 0),
        denomination: item.denomination ?? item.token ?? "USD"
      }));
    }

    // Parse payoutAddress
    let payoutAddress: { type: string; value: string } | undefined;
    const rawPayoutAddress = this.parseJsonField(row.payoutAddress);
    if (rawPayoutAddress && typeof rawPayoutAddress === 'object' && !Array.isArray(rawPayoutAddress)) {
      payoutAddress = {
        type: rawPayoutAddress.type ?? "StellarAddress",
        value: rawPayoutAddress.value ?? rawPayoutAddress.address ?? ""
      };
    } else if (typeof rawPayoutAddress === 'string' && rawPayoutAddress) {
      payoutAddress = { type: "StellarAddress", value: rawPayoutAddress };
    }

    // Parse payouts
    let payouts: Array<{ type: string; value: any; proof?: string }> | undefined;
    const rawPayouts = this.parseJsonField(row.payouts);
    if (Array.isArray(rawPayouts)) {
      payouts = rawPayouts;
    }

    return {
      type: "GrantApplication",
      id: row.id,
      grantPoolId: row.grantPoolId || "",
      grantPoolName: row.grantPoolName || undefined,
      projectId: row.projectId || "",
      projectName: row.name || undefined,
      createdAt: row.createdAt || undefined,
      contentURI: row.contentURI || undefined,
      discussionsTo: row.discussionTo || undefined,
      licenseURI: row.licenseURI || undefined,
      isInactive: row.isInactive === 'true' || row.isInactive === true || undefined,
      applicationCompletionRate: row.applicationCompletionRate ? parseFloat(row.applicationCompletionRate) : undefined,
      socials,
      fundsAsked,
      fundsAskedInUSD: row.fundsAskedInUSD != null ? String(row.fundsAskedInUSD) : undefined,
      fundsApproved,
      fundsApprovedInUSD: row.fundsApprovedInUSD != null ? String(row.fundsApprovedInUSD) : undefined,
      payoutAddress,
      status: this.mapStatusToDAOIP5(row.status),
      payouts,
      extensions: Object.keys(extensions).length > 0 ? extensions : undefined
    };
  }
}
