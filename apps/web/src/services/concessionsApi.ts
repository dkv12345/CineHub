export type Concession = {
  id: string;
  externalId: string | null;
  name: string;
  description: string | null;
  category: 'COMBO' | 'POPCORN' | 'DRINK' | 'SNACK';
  imageUrl: string | null;
  price: number;
  minSeats: number;
  maxSeats: number;
  sortOrder: number;
};

export async function fetchConcessions(cinemaCode?: string, signal?: AbortSignal) {
  const query = new URLSearchParams({ chain: 'GALAXY' });
  if (cinemaCode) query.set('cinemaCode', cinemaCode);

  const response = await fetch(`/api/concessions?${query}`, { signal });
  if (!response.ok) {
    throw new Error(`Không thể tải danh sách bắp nước (HTTP ${response.status}).`);
  }

  const result: { data: Concession[] } = await response.json();
  if (!Array.isArray(result.data)) {
    throw new Error('Dữ liệu bắp nước từ máy chủ không hợp lệ.');
  }
  return result.data;
}
