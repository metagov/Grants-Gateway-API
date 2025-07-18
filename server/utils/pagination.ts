import { PaginationMeta } from "../../shared/schema";

export function createPaginationMeta(
  totalCount: number,
  limit: number,
  offset: number
): PaginationMeta {
  const totalPages = Math.ceil(totalCount / limit);
  const currentPage = Math.floor(offset / limit) + 1;
  
  return {
    totalCount,
    totalPages,
    currentPage,
    limit,
    offset,
    hasNext: offset + limit < totalCount,
    hasPrevious: offset > 0,
    nextPage: offset + limit < totalCount ? currentPage + 1 : undefined,
    previousPage: offset > 0 ? currentPage - 1 : undefined,
  };
}

export function parsePaginationParams(query: any): { limit: number; offset: number } {
  const limit = Math.min(Math.max(parseInt(query.limit as string) || 10, 1), 100);
  let offset = Math.max(parseInt(query.offset as string) || 0, 0);
  
  // Support page-based pagination as alternative to offset
  if (query.page && !query.offset) {
    const page = Math.max(parseInt(query.page as string) || 1, 1);
    offset = (page - 1) * limit;
  }
  
  return { limit, offset };
}