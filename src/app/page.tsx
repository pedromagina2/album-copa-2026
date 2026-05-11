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
        (payload) => {
          const updated =
            payload.new as Sticker

          setStickers((prev) =>
            prev.map((s) =>
              s.id === updated.id
                ? updated
                : s
            )
          )
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
    const updatedOwned =
      !sticker.owned

    setStickers((prev) =>
      prev.map((s) =>
        s.id === sticker.id
          ? {
              ...s,
              owned: updatedOwned
            }
          : s
      )
    )

    const { error } = await supabase
      .from('stickers')
      .update({
        owned: updatedOwned
      })
      .eq('id', sticker.id)

    if (error) {
      console.error(error)
    }
  }

  async function changeDuplicates(
    sticker: Sticker,
    amount: number
  ) {
    const value = Math.max(
      0,
      sticker.duplicates + amount
    )

    setStickers((prev) =>
      prev.map((s) =>
        s.id === sticker.id
          ? {
              ...s,
              duplicates: value
            }
          : s
      )
    )

    const { error } = await supabase
      .from('stickers')
      .update({
        duplicates: value
      })
      .eq('id', sticker.id)

    if (error) {
      console.error(error)
    }
  }

  const filtered = useMemo(() => {
    return stickers.filter((s) => {
      const matchesSearch =
        s.code
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        s.country
          .toLowerCase()
          .includes(search.toLowerCase())

      if (filter === 'owned') {
        return matchesSearch && s.owned
      }

      if (filter === 'missing') {
        return matchesSearch && !s.owned
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

    secoes.forEach((secao) => {
      groups[secao] = []
    })

    filtered.forEach((sticker) => {
      if (!groups[sticker.country]) {
        groups[sticker.country] = []
      }

      groups[sticker.country].push(sticker)
    })

    Object.keys(groups).forEach(
      (country) => {
        groups[country].sort((a, b) => {
          const numA =
            parseInt(
              a.code.replace(/\D/g, '')
            ) || 0

          const numB =
            parseInt(
              b.code.replace(/\D/g, '')
            ) || 0

          return numA - numB
        })
      }
    )

    return groups
  }, [filtered])

  const ownedCount = stickers.filter(
    (s) => s.owned
  ).length

  const totalDuplicates = stickers.reduce(
    (acc, s) => acc + s.duplicates,
    0
  )

  const percent = stickers.length
    ? (
        (ownedCount / stickers.length) *
        100
      ).toFixed(1)
    : '0'

  return (
    <main
      className={`
        min-h-screen
        transition-all duration-200 ease-out
        ${
          theme === 'dark'
            ? 'bg-zinc-950 text-white'
            : 'bg-zinc-100 text-black'
        }
      `}
    >
      <header
        className={`
          sticky
          top-0
          z-50
          backdrop-blur
          border-b
          ${
            theme === 'dark'
              ? 'bg-zinc-950/90 border-zinc-800'
              : 'bg-white/90 border-zinc-300'
          }
        `}
      >
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight">
                ⚽ Álbum Copa 2026
              </h1>

              <p className="text-zinc-400 mt-1 text-sm">
                {ownedCount} / {stickers.length}
                {' • '}
                {percent}%
                {' • '}
                🔁 {totalDuplicates}
              </p>
            </div>

            <button
              onClick={() =>
                setTheme(
                  theme === 'dark'
                    ? 'light'
                    : 'dark'
                )
              }
              className={`
                px-4
                py-2
                rounded-2xl
                font-bold
                transition-all duration-200 ease-out
                active:scale-95
                ${
                  theme === 'dark'
                    ? 'bg-zinc-800 hover:bg-zinc-700'
                    : 'bg-white border border-zinc-300 hover:bg-zinc-100'
                }
              `}
            >
              {theme === 'dark'
                ? '☀️ Claro'
                : '🌙 Escuro'}
            </button>
          </div>

          <div className="w-full h-4 bg-zinc-800/70 rounded-full overflow-hidden mt-4 border border-zinc-700">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
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
              setSearch(e.target.value)
            }
            className={`
              w-full
              mt-4
              p-4
              rounded-2xl
              border
              outline-none
              focus:border-emerald-500
              transition-all duration-200 ease-out
              ${
                theme === 'dark'
                  ? 'bg-zinc-900 border-zinc-800 text-white'
                  : 'bg-white border-zinc-300 text-black'
              }
            `}
          />

          <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
            <button
              onClick={() =>
                copyMissing(stickers)
              }
              className="
                px-4
                py-2
                rounded-2xl
                bg-blue-500
                text-white
                font-bold
                whitespace-nowrap
                active:scale-95
              "
            >
              📋 Faltantes
            </button>

            <button
              onClick={() =>
                copyDuplicates(stickers)
              }
              className="
                px-4
                py-2
                rounded-2xl
                bg-yellow-400
                text-black
                font-bold
                whitespace-nowrap
                active:scale-95
              "
            >
              🔁 Repetidas
            </button>
          </div>

          <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
            <FilterButton
              theme={theme}
              active={filter === 'all'}
              onClick={() =>
                setFilter('all')
              }
            >
              Todas
            </FilterButton>

            <FilterButton
              theme={theme}
              active={filter === 'owned'}
              onClick={() =>
                setFilter('owned')
              }
            >
              Tenho
            </FilterButton>

            <FilterButton
              theme={theme}
              active={filter === 'missing'}
              onClick={() =>
                setFilter('missing')
              }
            >
              Faltam
            </FilterButton>

            <FilterButton
              theme={theme}
              active={
                filter === 'duplicates'
              }
              onClick={() =>
                setFilter('duplicates')
              }
            >
              Repetidas
            </FilterButton>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        {Object.entries(grouped)
          .filter(
            ([_, list]) =>
              list.length > 0
          )

          .map(([country, list]) => {
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
                  className={`
                    sticky
                    top-[210px]
                    z-40
                    backdrop-blur
                    py-3
                    mb-4
                    border-b
                    ${
                      theme === 'dark'
                        ? 'bg-zinc-950/95 border-zinc-800'
                        : 'bg-zinc-100/95 border-zinc-300'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-black">
                        {country}
                      </h2>

                      <p className="text-zinc-400 text-sm">
                        {ownedCountry}/
                        {list.length}
                        {' • '}
                        {percentCountry}%
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="
                    grid
                    grid-cols-2
                    sm:grid-cols-3
                    md:grid-cols-4
                    lg:grid-cols-5
                    xl:grid-cols-6
                    2xl:grid-cols-7
                    gap-4
                  "
                >
                  {list.map((sticker) => (
                    <div
                      key={sticker.id}
                      className={`
                        rounded-[28px]
                        p-5
                        border
                        transition-all duration-200 ease-out
                        hover:scale-[1.02]
                        active:scale-[0.98]
                        ${
                          sticker.owned
                            ? `
                                bg-emerald-500/20
                                border-emerald-500
                                shadow-lg
                                shadow-emerald-500/20
                              `
                            : theme === 'dark'
                              ? 'bg-zinc-900 border-zinc-800'
                              : 'bg-white border-zinc-300 shadow-sm'
                        }
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-2xl font-black">
                            {sticker.code}
                          </p>

                          <p className="text-zinc-400 text-sm">
                            {
                              sticker.category
                            }
                          </p>
                        </div>

                        {sticker.owned && (
                          <div className="text-emerald-400 text-2xl font-black">
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
                        className={`
                          mt-4
                          w-full
                          py-3
                          rounded-2xl
                          font-bold
                          transition-all duration-200 ease-out
                          active:scale-95
                          ${
                            sticker.owned
                              ? `
                                  bg-emerald-500
                                  text-black
                                `
                              : theme === 'dark'
                                ? `
                                    bg-zinc-800
                                    hover:bg-zinc-700
                                  `
                                : `
                                    bg-zinc-200
                                    hover:bg-zinc-300
                                  `
                          }
                        `}
                      >
                        {sticker.owned
                          ? 'Tenho'
                          : 'Marcar'}
                      </button>

                      <div className="mt-4">
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
                            className="
                              flex-1
                              h-10
                              rounded-xl
                              bg-red-500
                              text-white
                              font-black
                              text-lg
                              active:scale-95
                            "
                          >
                            -
                          </button>

                          <div
                            className={`
                              w-12
                              h-10
                              rounded-xl
                              flex
                              items-center
                              justify-center
                              font-black
                              text-lg
                              ${
                                theme === 'dark'
                                  ? 'bg-zinc-800'
                                  : 'bg-zinc-200'
                              }
                            `}
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
                            className="
                              flex-1
                              h-10
                              rounded-xl
                              bg-emerald-500
                              text-black
                              font-black
                              text-lg
                              active:scale-95
                            "
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
    .map((s) => s.code)

  if (missing.length === 0) {
    alert('Nenhuma faltante!')
    return
  }

  const text =
    'FALTANTES 2026:\n\n' +
    missing.join(', ')

  navigator.clipboard.writeText(text)

  alert('Faltantes copiadas!')
}

function copyDuplicates(stickers: Sticker[]) {
  const duplicates = stickers
    .filter((s) => s.duplicates > 0)

    .map(
      (s) =>
        `${s.code}(x${s.duplicates})`
    )

  if (duplicates.length === 0) {
    alert('Nenhuma repetida!')
    return
  }

  const text =
    'REPETIDAS 2026:\n\n' +
    duplicates.join(', ')

  navigator.clipboard.writeText(text)

  alert('Repetidas copiadas!')
}

function FilterButton({
  children,
  active,
  onClick,
  theme
}: FilterProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4
        py-2
        rounded-2xl
        whitespace-nowrap
        font-bold
        transition-all duration-200 ease-out
        active:scale-95
        ${
          active
            ? `
                bg-emerald-500
                text-black
              `
            : theme === 'dark'
              ? `
                  bg-zinc-800
                  hover:bg-zinc-700
                `
              : `
                  bg-white
                  border
                  border-zinc-300
                  hover:bg-zinc-100
                `
        }
      `}
    >
      {children}
    </button>
  )
}