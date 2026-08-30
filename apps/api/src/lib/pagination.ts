import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export function paginationParams(input: PaginationInput) {
  const skip = (input.page - 1) * input.limit;
  return { skip, take: input.limit };
}

export function paginationMeta(total: number, input: PaginationInput) {
  return {
    page: input.page,
    limit: input.limit,
    total,
    totalPages: Math.ceil(total / input.limit),
  };
}
