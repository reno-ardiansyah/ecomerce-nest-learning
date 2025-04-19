import { QueryParamsDto } from '../dto/query-params.dto';

type BuildParamsOptions<T> = {
  searchFields?: (keyof T)[];
  showFields?: (keyof T)[];
  excludeFields?: (keyof T)[];
};

export function buildPrismaParams<T>(
  q: QueryParamsDto & Record<string, any>,
  options: BuildParamsOptions<T> = {},
) {
  const {
    skip,
    take = 10,
    sortBy,
    order = 'asc',
    search,
    show,
    ...customFilters
  } = q;

  const { searchFields = [], showFields = [], excludeFields = [] } = options;

  // -------------------- 🔍 WHERE --------------------
  const where: Record<string, any> = {
    ...customFilters,
    ...(search && searchFields.length
      ? {
          OR: searchFields.map((field) => ({
            [field]: { contains: search, mode: 'insensitive' },
          })),
        }
      : {}),
  };

  // -------------------- 📤 SELECT (SHOW) --------------------
  const safeFields = showFields.filter((f) => !excludeFields.includes(f));

  const requestedRaw: string[] = Array.isArray(show)
    ? (show as string[])
    : typeof show === 'string'
      ? (show as string).split(',').map((s: string) => s.trim())
      : [];

  const requested = requestedRaw.map((f) => f as keyof T);
  const selectedFields = requested.length
    ? requested.filter((f) => safeFields.includes(f))
    : safeFields;

  const select: Record<string, boolean> | undefined = selectedFields.length
    ? selectedFields.reduce(
        (acc, field) => {
          acc[field as string] = true;
          return acc;
        },
        {} as Record<string, boolean>,
      )
    : undefined;

  // -------------------- 🔀 ORDER BY --------------------
  const orderBy = sortBy ? { [sortBy]: order } : undefined;

  // -------------------- 🏗️ BUILD PARAMS --------------------
  return Object.assign(
    {},
    skip !== undefined && { skip },
    take !== undefined && { take },
    { where },
    orderBy && { orderBy },
    select && { select },
  );
}
