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

export default function Home() {
  const [stickers, setStickers] =
    useState<Sticker[]>([])

  const [search, setSearch] =
    useState('')

  const [filter, setFilter] =
    useState('all')

  const [theme, setTheme] =
    useState('dark')

  useEffect(() => {
    const saved =
      localStorage.getItem('theme')

    if (saved) {
      setTheme(saved)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(
      'theme',
      theme
    )
  }, [theme])

  async function fetchStickers() {
    const { data, error } =
      await supabase
        .from('stickers')
        .select('*')

    console.log('DATA:', data)
    console.log('ERROR:', error)

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
        {
          event: '*',
          schema: 'public',
          table: 'stickers'
        },
        () => {
          fetchStickers()
        }
      )

      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function toggleOwned(
    sticker: Sticker
  ) {
    const updated = stickers.map(
      (s) =>
        s.id === sticker.id
          ? {
              ...s,
              owned: !s.owned
            }
          : s
    )

    setStickers(updated)

    await supabase
      .from('stickers')
      .update({
        owned: !sticker.owned
      })
      .eq('id', sticker.id)
  }

  async function changeDuplicates(
    sticker: Sticker,
    amount: number
  ) {
    const value = Math.max(
      0,
      sticker.duplicates + amount
    )

    const updated = stickers.map(
      (s) =>
        s.id === sticker.id
          ? {
              ...s,
              duplicates: value
            }
          : s
    )

    setStickers(updated)

    await supabase
      .from('stickers')
      .update({
        duplicates: value
      })
      .eq('id', sticker.id)
  }

  const filtered = useMemo(() => {
    return stickers.filter((s) => {
      const matchesSearch =
        s.code
          ?.toLowerCase()
          .includes(
            search.toLowerCase()
          ) ||
        s.country
          ?.toLowerCase()
          .includes(
            search.toLowerCase()
          )

      if (filter === 'owned') {
        return (
          matchesSearch && s.owned
        )
      }

      if (filter === 'missing') {
        return (
          matchesSearch && !s.owned
        )
      }

      if (filter === 'duplicates') {
        return (
          matchesSearch &&
          s.duplicates > 0
        )
      }

      return matchesSearch
    })
  }, [stickers, search, filter])

  const grouped = useMemo(() => {
    const groups: Record<
      string,
      Sticker[]
    > = {}

    const stickerMap = new Map<
      string,
      Sticker
    >()

    filtered.forEach((s) => {
      stickerMap.set(
        s.code
          ?.trim()
          .toUpperCase(),
        s
      )
    })

    secoes.forEach((secao: any) => {
      const sectionName =
        secao.n || secao

      groups[sectionName] = []

      let ids: string[] = []

      if (secao.ids) {
        ids = [...secao.ids]
      }

      if (secao.p && secao.q) {
        for (
          let i = 1;
          i <= secao.q;
          i++
        ) {
          ids.push(
            `${secao.p}${i}`
          )
        }
      }

      ids.forEach((id) => {
        const sticker =
          stickerMap.get(
            id
              .trim()
              .toUpperCase()
          )

        if (sticker) {
          groups[
            sectionName
          ].push(sticker)
        }
      })
    })

    console.log(
      'GROUPED:',
      groups
    )

    return groups
  }, [filtered])

  const ownedCount = stickers.filter(
    (s) => s.owned
  ).length

  const totalDuplicates =
    stickers.reduce(
      (acc, s) =>
        acc + s.duplicates,
      0
    )

  const percent = stickers.length
    ? (
        (ownedCount /
          stickers.length) *
        100
      ).toFixed(1)
    : '0'

  return (
    <main
      className={`min-h-screen transition-all duration-300 ${
        theme === 'dark'
          ? 'bg-zinc-950 text-white'
          : 'bg-zinc-100 text-black'
      }`}
    >
      <header
        className={`sticky top-0 z-50 backdrop-blur border-b ${
          theme === 'dark'
            ? 'bg-zinc-950/90 border-zinc-800'
            : 'bg-white/90 border-zinc-300'
        }`}
      >
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black">
                ⚽ Álbum Copa 2026
              </h1>

              <p className="text-zinc-400 mt-1 text-sm">
                {ownedCount} /{' '}
                {stickers.length}
                {' • '}
                {percent}%
                {' • '}
                🔁{' '}
                {totalDuplicates}
              </p>
            </div>

            <button
              onClick={() =>
                setTheme(
                  theme ===
                    'dark'
                    ? 'light'
                    : 'dark'
                )
              }
              className={`px-4 py-2 rounded-2xl font-bold transition-all ${
                theme === 'dark'
                  ? 'bg-zinc-800'
                  : 'bg-white border border-zinc-300'
              }`}
            >
              {theme === 'dark'
                ? '☀️ Claro'
                : '🌙 Escuro'}
            </button>
          </div>

          <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden mt-4">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{
                width: `${percent}%`
              }}
            />
          </div>

          <input
            type="text"
            placeholder="Pesquisar figurinha..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            className={`w-full mt-4 p-4 rounded-2xl border outline-none ${
              theme === 'dark'
                ? 'bg-zinc-900 border-zinc-800'
                : 'bg-white border-zinc-300'
            }`}
          />

          <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
            <button
              onClick={() =>
                copyMissing(
                  stickers
                )
              }
              className="px-4 py-2 rounded-2xl bg-blue-500 font-bold whitespace-nowrap"
            >
              📋 Faltantes
            </button>

            <button
              onClick={() =>
                copyDuplicates(
                  stickers
                )
              }
              className="px-4 py-2 rounded-2xl bg-yellow-500 text-black font-bold whitespace-nowrap"
            >
              🔁 Repetidas
            </button>
          </div>

          <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
            <FilterButton
              active={
                filter === 'all'
              }
              onClick={() =>
                setFilter('all')
              }
            >
              Todas
            </FilterButton>

            <FilterButton
              active={
                filter ===
                'owned'
              }
              onClick={() =>
                setFilter(
                  'owned'
                )
              }
            >
              Tenho
            </FilterButton>

            <FilterButton
              active={
                filter ===
                'missing'
              }
              onClick={() =>
                setFilter(
                  'missing'
                )
              }
            >
              Faltam
            </FilterButton>

            <FilterButton
              active={
                filter ===
                'duplicates'
              }
              onClick={() =>
                setFilter(
                  'duplicates'
                )
              }
            >
              Repetidas
            </FilterButton>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-3">
        {Object.entries(grouped)
          .filter(
            ([_, list]) =>
              list.length > 0
          )
          .map(
            ([country, list]) => {
              const ownedCountry =
                list.filter(
                  (s) => s.owned
                ).length

              const percentCountry =
                (
                  (ownedCountry /
                    list.length) *
                  100
                ).toFixed(0)

              return (
                <section
                  key={country}
                  className="mb-10"
                >
                  <div
                    className={`sticky top-[220px] z-40 backdrop-blur py-3 mb-4 border-b ${
                      theme ===
                      'dark'
                        ? 'bg-zinc-950/95 border-zinc-800'
                        : 'bg-white/95 border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black">
                          {
                            country
                          }
                        </h2>

                        <p className="text-zinc-400 text-sm">
                          {
                            ownedCountry
                          }
                          /
                          {
                            list.length
                          }
                          {' • '}
                          {
                            percentCountry
                          }
                          %
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className="
                    grid
                    grid-cols-3
                    sm:grid-cols-4
                    md:grid-cols-5
                    lg:grid-cols-6
                    xl:grid-cols-7
                    2xl:grid-cols-8
                    gap-3
                  "
                  >
                    {list.map(
                      (
                        sticker
                      ) => (
                        <div
                          key={
                            sticker.id
                          }
                          className={`rounded-2xl p-3 border transition-all duration-200 ${
                            sticker.owned
                              ? 'bg-green-500/20 border-green-500 shadow-lg shadow-green-500/20'
                              : theme ===
                                'dark'
                              ? 'bg-zinc-900 border-zinc-800'
                              : 'bg-white border-zinc-300'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-lg sm:text-xl font-black">
                                {
                                  sticker.code
                                }
                              </p>

                              <p className="text-zinc-400 text-xs">
                                {
                                  sticker.category
                                }
                              </p>
                            </div>

                            {sticker.owned && (
                              <div className="text-green-400 text-xl font-black">
                                ✓
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() =>
                              toggleOwned(
                                sticker
                              )
                            }
                            className={`mt-3 w-full py-2 rounded-xl font-bold transition-all text-sm ${
                              sticker.owned
                                ? 'bg-green-500 text-black'
                                : theme ===
                                  'dark'
                                ? 'bg-zinc-800 hover:bg-zinc-700'
                                : 'bg-zinc-200 hover:bg-zinc-300'
                            }`}
                          >
                            {sticker.owned
                              ? 'Tenho'
                              : 'Marcar'}
                          </button>

                          <div className="mt-3">
                            <p className="text-xs text-zinc-400 mb-2 text-center">
                              Repetidas
                            </p>

                            <div className="flex items-center justify-between gap-2">
                              <button
                                onClick={() =>
                                  changeDuplicates(
                                    sticker,
                                    -1
                                  )
                                }
                                className="flex-1 h-9 rounded-xl bg-red-500 font-black text-lg"
                              >
                                -
                              </button>

                              <div
                                className={`w-10 h-9 rounded-xl flex items-center justify-center font-black ${
                                  theme ===
                                  'dark'
                                    ? 'bg-zinc-800'
                                    : 'bg-zinc-200'
                                }`}
                              >
                                {
                                  sticker.duplicates
                                }
                              </div>

                              <button
                                onClick={() =>
                                  changeDuplicates(
                                    sticker,
                                    1
                                  )
                                }
                                className="flex-1 h-9 rounded-xl bg-green-500 text-black font-black text-lg"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </section>
              )
            }
          )}
      </div>
    </main>
  )
}

type FilterProps = {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}

function copyMissing(
  stickers: Sticker[]
) {
  const orderMap = new Map<
    string,
    number
  >()

  let index = 0

  secoes.forEach((secao: any) => {
    if (secao.ids) {
      secao.ids.forEach(
        (id: string) => {
          orderMap.set(
            id
              .trim()
              .toUpperCase(),
            index++
          )
        }
      )
    }

    if (secao.p && secao.q) {
      for (
        let i = 1;
        i <= secao.q;
        i++
      ) {
        orderMap.set(
          `${secao.p}${i}`
            .trim()
            .toUpperCase(),
          index++
        )
      }
    }
  })

  const missing = stickers
    .filter((s) => !s.owned)

    .sort((a, b) => {
      return (
        (orderMap.get(
          a.code
            .trim()
            .toUpperCase()
        ) ?? 99999) -
        (orderMap.get(
          b.code
            .trim()
            .toUpperCase()
        ) ?? 99999)
      )
    })

    .map((s) => s.code)

  navigator.clipboard.writeText(
    'FALTANTES 2026:\n\n' +
      missing.join(', ')
  )

  alert('Faltantes copiadas!')
}

function copyDuplicates(
  stickers: Sticker[]
) {
  const duplicates = stickers
    .filter(
      (s) => s.duplicates > 0
    )

    .map(
      (s) =>
        `${s.code}(x${s.duplicates})`
    )

  navigator.clipboard.writeText(
    'REPETIDAS 2026:\n\n' +
      duplicates.join(', ')
  )

  alert('Repetidas copiadas!')
}

function FilterButton({
  children,
  active,
  onClick
}: FilterProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-2xl whitespace-nowrap font-bold transition-all ${
        active
          ? 'bg-green-500 text-black'
          : 'bg-zinc-800 hover:bg-zinc-700'
      }`}
    >
      {children}
    </button>
  )
}