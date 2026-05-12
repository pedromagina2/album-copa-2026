'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { secoes } from '@/data/secoes'

type Sticker = {
  id: number
  code: string
  country: string
  owned: boolean
  duplicates: number
  category: string
}

const ORDER_MAP = new Map<string, number>()
let orderIndex = 0

secoes.forEach((secao: any) => {
  if (secao.ids) {
    secao.ids.forEach((id: string) => {
      ORDER_MAP.set(id.replace(/\s/g, ''), orderIndex++)
    })
  }
  if (secao.p && secao.q) {
    for (let i = 1; i <= secao.q; i++) {
      ORDER_MAP.set(`${secao.p}${i}`.replace(/\s/g, ''), orderIndex++)
    }
  }
})

export default function Home() {
  const [stickers, setStickers] = useState<Sticker[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved) {
      setTheme(saved)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('theme', theme)
  }, [theme])

  async function fetchStickers() {
    const { data, error } = await supabase
      .from('stickers')
      .select('*')
      .order('id')

    if (error) {
      console.error(error)
      return
    }

    setStickers(data || [])
  }

  useEffect(() => {
    fetchStickers()

    const channel = supabase
      .channel('stickers-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stickers' },
        () => {
          fetchStickers()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function toggleOwned(sticker: Sticker) {
    const updated = stickers.map((s) =>
      s.id === sticker.id ? { ...s, owned: !s.owned } : s
    )

    setStickers(updated)

    await supabase
      .from('stickers')
      .update({ owned: !sticker.owned })
      .eq('id', sticker.id)
  }

  async function changeDuplicates(sticker: Sticker, amount: number) {
    const value = Math.max(0, sticker.duplicates + amount)

    const updated = stickers.map((s) =>
      s.id === sticker.id ? { ...s, duplicates: value } : s
    )

    setStickers(updated)

    await supabase
      .from('stickers')
      .update({ duplicates: value })
      .eq('id', sticker.id)
  }

  const filtered = useMemo(() => {
    return stickers.filter((s) => {
      const matchesSearch =
        s.code.toLowerCase().includes(search.toLowerCase()) ||
        s.country.toLowerCase().includes(search.toLowerCase())

      if (filter === 'owned') return matchesSearch && s.owned
      if (filter === 'missing') return matchesSearch && !s.owned
      if (filter === 'duplicates') return matchesSearch && s.duplicates > 0

      return matchesSearch
    })
  }, [stickers, search, filter])

  const grouped = useMemo(() => {
    const groups: Record<string, Sticker[]> = {}

    secoes.forEach((secao: any) => {
      if (typeof secao === 'string') {
        groups[secao] = []
      }
    })

    const sorted = [...filtered].sort((a, b) => {
      const orderA = ORDER_MAP.get(a.code.replace(/\s/g, '')) ?? a.id
      const orderB = ORDER_MAP.get(b.code.replace(/\s/g, '')) ?? b.id
      return orderA - orderB
    })

    sorted.forEach((sticker) => {
      if (!groups[sticker.country]) {
        groups[sticker.country] = []
      }
      groups[sticker.country].push(sticker)
    })

    return groups
  }, [filtered])

  const ownedCount = stickers.filter((s) => s.owned).length
  const totalDuplicates = stickers.reduce((acc, s) => acc + s.duplicates, 0)
  const percent = stickers.length ? ((ownedCount / stickers.length) * 100).toFixed(1) : '0'

  const subTextColor = theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'

  return (
    <main
      className={`min-h-screen transition-all duration-300 ${theme === 'dark' ? 'bg-zinc-950 text-white' : 'bg-zinc-50 text-zinc-900'
        }`}
    >
      <header
        className={`sticky top-0 z-50 backdrop-blur-md border-b ${theme === 'dark' ? 'bg-zinc-950/80 border-zinc-800' : 'bg-white/80 border-zinc-200'
          }`}
      >
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">⚽ Álbum 2026</h1>
              <p className={`mt-1 text-sm font-medium ${subTextColor}`}>
                {ownedCount} / {stickers.length} {' • '} {percent}% {' • '} 🔁 {totalDuplicates}
              </p>
            </div>

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`p-3 sm:px-5 sm:py-2.5 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${theme === 'dark'
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
                  : 'bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-900 shadow-sm'
                }`}
            >
              {theme === 'dark' ? '☀️ Claro' : '🌙 Escuro'}
            </button>
          </div>

          <div className={`w-full h-2.5 rounded-full overflow-hidden mt-5 ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
            <div
              className="h-full bg-green-500 transition-all duration-500 rounded-full"
              style={{ width: `${percent}%` }}
            />
          </div>

          <input
            type="text"
            placeholder="Pesquisar figurinha ou país..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full mt-5 p-4 rounded-2xl border outline-none font-medium transition-all ${theme === 'dark'
                ? 'bg-zinc-900 border-zinc-800 focus:border-zinc-600'
                : 'bg-white border-zinc-200 focus:border-zinc-400 shadow-sm'
              }`}
          />

          <div className="flex gap-2 mt-5 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => copyMissing(stickers)}
              className="px-5 py-2.5 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-bold whitespace-nowrap shadow-sm shadow-blue-500/20 transition-colors"
            >
              📋 Copiar Faltantes
            </button>

            <button
              onClick={() => copyDuplicates(stickers)}
              className="px-5 py-2.5 rounded-2xl bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-bold whitespace-nowrap shadow-sm shadow-yellow-500/20 transition-colors"
            >
              🔁 Copiar Repetidas
            </button>
          </div>

          <div className="flex gap-2 mt-2 overflow-x-auto pb-2 scrollbar-hide">
            <FilterButton theme={theme} active={filter === 'all'} onClick={() => setFilter('all')}>
              Todas
            </FilterButton>
            <FilterButton theme={theme} active={filter === 'owned'} onClick={() => setFilter('owned')}>
              Tenho
            </FilterButton>
            <FilterButton theme={theme} active={filter === 'missing'} onClick={() => setFilter('missing')}>
              Faltam
            </FilterButton>
            <FilterButton theme={theme} active={filter === 'duplicates'} onClick={() => setFilter('duplicates')}>
              Repetidas
            </FilterButton>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {Object.entries(grouped).map(([country, list]) => {
          if (list.length === 0) return null

          const ownedCountry = list.filter((s) => s.owned).length
          const percentCountry = ((ownedCountry / list.length) * 100).toFixed(0)

          return (
            <section key={country} className="mb-12">
              <div
                className={`sticky top-[260px] sm:top-[280px] z-40 backdrop-blur-md py-3 mb-5 border-b ${theme === 'dark' ? 'bg-zinc-950/90 border-zinc-800' : 'bg-zinc-50/90 border-zinc-200'
                  }`}
              >
                <div className="flex items-end justify-between">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">{country}</h2>
                  <p className={`text-sm font-bold ${subTextColor}`}>
                    {ownedCountry}/{list.length} {' • '} {percentCountry}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3 sm:gap-4">
                {list.map((sticker) => (
                  <div
                    key={sticker.id}
                    className={`rounded-2xl p-4 border transition-all duration-200 flex flex-col ${sticker.owned
                        ? 'bg-green-500/10 border-green-500 shadow-md shadow-green-500/10'
                        : theme === 'dark'
                          ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                          : 'bg-white border-zinc-200 shadow-sm hover:border-zinc-300'
                      }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-xl font-black">{sticker.code}</p>
                        <p className={`text-xs font-semibold ${subTextColor}`}>{sticker.category}</p>
                      </div>

                      {sticker.owned && (
                        <div className="text-green-500 text-xl font-black">✓</div>
                      )}
                    </div>

                    <button
                      onClick={() => toggleOwned(sticker)}
                      className={`mt-auto w-full py-2.5 rounded-xl font-bold transition-all text-sm ${sticker.owned
                          ? 'bg-green-500 text-white shadow-sm shadow-green-500/20'
                          : theme === 'dark'
                            ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
                            : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
                        }`}
                    >
                      {sticker.owned ? 'Tenho' : 'Marcar'}
                    </button>

                    <div className="mt-4 pt-3 border-t border-dashed border-zinc-500/30">
                      <p className={`text-[11px] uppercase font-bold text-center mb-2 tracking-wider ${subTextColor}`}>
                        Repetidas
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => changeDuplicates(sticker, -1)}
                          className="flex-1 h-9 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-black text-lg transition-colors flex items-center justify-center"
                        >
                          -
                        </button>
                        <div
                          className={`w-10 h-9 rounded-xl flex items-center justify-center font-black text-sm ${theme === 'dark' ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-900'
                            }`}
                        >
                          {sticker.duplicates}
                        </div>
                        <button
                          onClick={() => changeDuplicates(sticker, 1)}
                          className="flex-1 h-9 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 font-black text-lg transition-colors flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}

type FilterProps = {
  children: React.ReactNode
  active: boolean
  onClick: () => void
  theme: string
}

function copyMissing(stickers: Sticker[]) {
  const missing = stickers
    .filter((s) => !s.owned)
    .sort((a, b) => {
      const orderA = ORDER_MAP.get(a.code.replace(/\s/g, '')) ?? a.id
      const orderB = ORDER_MAP.get(b.code.replace(/\s/g, '')) ?? b.id
      return orderA - orderB
    })
    .map((s) => s.code)

  navigator.clipboard.writeText('FALTANTES 2026:\n\n' + missing.join(', '))
  alert('Faltantes copiadas!')
}

function copyDuplicates(stickers: Sticker[]) {
  const duplicates = stickers
    .filter((s) => s.duplicates > 0)
    .sort((a, b) => {
      const orderA = ORDER_MAP.get(a.code.replace(/\s/g, '')) ?? a.id
      const orderB = ORDER_MAP.get(b.code.replace(/\s/g, '')) ?? b.id
      return orderA - orderB
    })
    .map((s) => `${s.code}(x${s.duplicates})`)

  navigator.clipboard.writeText('REPETIDAS 2026:\n\n' + duplicates.join(', '))
  alert('Repetidas copiadas!')
}

function FilterButton({ children, active, onClick, theme }: FilterProps) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 rounded-2xl whitespace-nowrap font-bold transition-all text-sm ${active
          ? 'bg-zinc-900 text-white dark:bg-white dark:text-black shadow-md'
          : theme === 'dark'
            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            : 'bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-600 shadow-sm'
        }`}
    >
      {children}
    </button>
  )
}