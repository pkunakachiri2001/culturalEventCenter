/**
 * CultureFlow — Global Search Page
 * Fast categorized search across all system records.
 */

import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, ArrowRight, UserCheck, School, Calendar, Receipt, Sparkles, Filter } from 'lucide-react'
import { Card, Input, Badge, Skeleton } from '@/components/ui'
import { executeGlobalSearch, type SearchResultItem } from '@/services/search'
import { cn } from '@/utils'

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const initialQuery = searchParams.get('q') || ''

  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [loading, setLoading] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>('')

  const handleSearch = async (qText: string) => {
    if (!qText.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const data = await executeGlobalSearch(qText.trim())
      setResults(data.results)
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery)
    }
  }, [initialQuery])

  const filteredResults = categoryFilter
    ? results.filter((r) => r.category === categoryFilter)
    : results

  return (
    <div className="animate-fade-in space-y-6">
      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Search className="w-6 h-6 text-teal-400" />
            Global Search Workspace
          </h1>
          <p className="page-subtitle">Search across visitors, partner schools, bookings, receipts, and AI scans.</p>
        </div>
      </div>

      {/* ── Search Bar Input ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 bg-gray-900/60 p-4 rounded-xl border border-gray-800">
        <Input
          placeholder="Search by name, phone, receipt number, school, QR pass..."
          leftIcon={<Search className="w-5 h-5 text-teal-400" />}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSearchParams({ q: e.target.value })
            handleSearch(e.target.value)
          }}
          className="w-full text-base"
        />
      </div>

      {/* ── Category Filter Pills ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {['', 'visitor', 'school', 'booking', 'visit', 'payment', 'digitized'].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors',
              categoryFilter === cat
                ? 'bg-teal-600/30 text-teal-300 border border-teal-500/30'
                : 'bg-gray-800/60 text-gray-400 hover:text-gray-200'
            )}
          >
            {cat ? cat : 'All Categories'}
          </button>
        ))}
      </div>

      {/* ── Search Results List ─────────────────────────────────────────────── */}
      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-gray-300">
              {query ? 'No matching records found' : 'Type a query above to search'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/60">
            {filteredResults.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(item.url_path)}
                className="p-4 hover:bg-gray-800/30 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-800 text-teal-400 shrink-0">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-100 text-sm flex items-center gap-2">
                      {item.title}
                      {item.badge_label && <Badge variant="teal">{item.badge_label}</Badge>}
                    </h3>
                    {item.subtitle && <p className="text-xs text-gray-400 mt-0.5">{item.subtitle}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs text-teal-400 font-semibold">
                  <span>View Details</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function getCategoryIcon(cat: string) {
  switch (cat) {
    case 'visitor':
      return <UserCheck className="w-4 h-4" />
    case 'school':
      return <School className="w-4 h-4" />
    case 'booking':
      return <Calendar className="w-4 h-4" />
    case 'payment':
      return <Receipt className="w-4 h-4" />
    case 'digitized':
      return <Sparkles className="w-4 h-4" />
    default:
      return <Search className="w-4 h-4" />
  }
}
