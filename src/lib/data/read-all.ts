import "server-only";

// PostgREST caps responses. Page deterministically instead of silently truncating
// metrics or the small dashboard dataset. The caller supplies a stable ID order.
export async function readAll<T>(page: (from: number, to: number) => PromiseLike<{
  data: T[] | null;
  error: { message: string } | null;
}>, label: string): Promise<T[]> {
  const rows: T[] = [];
  const pageSize = 500;
  for (;;) {
    const { data, error } = await page(rows.length, rows.length + pageSize - 1);
    if (error || !data) throw new Error(`Unable to load ${label}.`);
    rows.push(...data);
    // An empty page also handles projects configured with a smaller response cap.
    if (data.length === 0) return rows;
  }
}
