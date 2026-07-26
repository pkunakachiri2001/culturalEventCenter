/**
 * CultureFlow — Global Search Service
 */

import api from '@/services/api'

export interface SearchResultItem {
  id: string
  category: string
  title: string
  subtitle?: string | null
  url_path: string
  badge_label?: string | null
}

export interface GlobalSearchResponse {
  query: string
  total_results: number
  results: SearchResultItem[]
}

export async function executeGlobalSearch(query: string): Promise<GlobalSearchResponse> {
  const { data } = await api.get<GlobalSearchResponse>('/api/search', {
    params: { q: query },
  })
  return data
}
