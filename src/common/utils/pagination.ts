export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PrismaPagination {
  skip: number;
  take: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function parsePagination(query: Record<string, any>): PaginationParams {
  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  let limit = parseInt(query.limit as string, 10) || 10;

  if (limit < 1) {
    limit = 10;
  }
  if (limit > 100) {
    limit = 100;
  }

  return { page, limit };
}

export function getPrismaPagination(params: PaginationParams): PrismaPagination {
  return {
    skip: (params.page - 1) * params.limit,
    take: params.limit,
  };
}

export function getPaginationMeta(
  params: PaginationParams,
  totalCount: number
): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(totalCount / params.limit));

  return {
    page: params.page,
    limit: params.limit,
    totalCount,
    totalPages,
    hasNextPage: params.page < totalPages,
    hasPreviousPage: params.page > 1,
  };
}
