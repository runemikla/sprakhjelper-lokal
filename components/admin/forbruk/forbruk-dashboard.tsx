'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  AudioLines,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Cpu,
  Filter,
  Image as ImageIcon,
  Mic,
  MoreHorizontal,
  PieChart as PieChartIcon,
  Sigma,
  TextCursorInput,
  TextQuote,
} from 'lucide-react'
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { type ChartConfig, ChartContainer } from '@/components/ui/chart'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { USAGE_TOOLS, type UsageTool } from '@/lib/ai/usage'
import { estimateCost } from '@/lib/admin/priser'
import { cn } from '@/lib/utils'

// «Forbruk»: the KPI cards, chart over time, share per tool and the table of
// calls from the shadcnblocks Dashboard 5 block, with Språkhjelp's usage log
// (table ai_usage) and VLFK colours.

export interface DailyRow {
  day: string
  tool: string
  provider: string
  model: string
  kind: string
  calls: number
  input_tokens: number
  cached_tokens: number
  output_tokens: number
  units: number
}

export interface CallRow {
  id: number
  created_at: string
  tool: string
  provider: string
  model: string
  kind: string
  input_tokens: number
  cached_tokens: number
  output_tokens: number
  units: number
  ok: boolean
}

// One VLFK profile colour per tool, as in components/landing/verktoy-farger.ts.
const GROUP_COLORS: Record<string, string> = {
  Skrivehjelp: '#9ADBE8',
  Grammatikkøving: '#FDDA25',
  Lytteøving: '#B7DD79',
  'Lær ord': '#F8B5C4',
  Snakkebot: '#3CDBC0',
}
const OTHER_COLOR = '#CAA2DD'
// The two series in the chart over time.
const SERIES_COLORS = { a: '#00C7B1', b: '#E06287' }

const numberFormatter = new Intl.NumberFormat('nb-NO')
const compactFormatter = new Intl.NumberFormat('nb-NO', { notation: 'compact', maximumFractionDigits: 1 })
const dollarFormatter = new Intl.NumberFormat('nb-NO', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const smallDollarFormatter = new Intl.NumberFormat('nb-NO', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
})
const dayFormatter = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const timeFormatter = new Intl.DateTimeFormat('nb-NO', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Oslo',
})

const formatDollars = (value: number) => (value > 0 && value < 0.01 ? smallDollarFormatter : dollarFormatter).format(value)

function toolInfo(tool: string): { label: string; group: string } {
  return USAGE_TOOLS[tool as UsageTool] ?? { label: tool, group: 'Annet' }
}

const groupColor = (group: string) => GROUP_COLORS[group] ?? OTHER_COLOR

function percentChange(current: number, previous: number): number | null {
  if (!previous) return null
  return ((current - previous) / previous) * 100
}

// ---------------------------------------------------------------------------
// Period buttons
// ---------------------------------------------------------------------------

const PERIODS = [7, 30, 90] as const

function PeriodPicker({ days }: { days: number }) {
  return (
    <div className="inline-flex rounded-md border bg-white p-0.5" role="group" aria-label="Velg periode">
      {PERIODS.map((p) => (
        <Link
          key={p}
          href={`/admin/forbruk?dager=${p}`}
          aria-current={p === days ? 'page' : undefined}
          className={cn(
            'rounded px-3 py-1.5 text-sm font-medium transition-colors',
            p === days ? 'bg-vlfk-ink text-white' : 'text-vlfk-ink-muted hover:bg-vlfk-surface-muted hover:text-vlfk-ink'
          )}
        >
          {p} dager
        </Link>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// KPI cards
// ---------------------------------------------------------------------------

interface Totals {
  calls: number
  input: number
  output: number
  cost: number
  images: number
  characters: number
  seconds: number
}

function totalsOf(rows: DailyRow[]): Totals {
  const t: Totals = { calls: 0, input: 0, output: 0, cost: 0, images: 0, characters: 0, seconds: 0 }
  for (const r of rows) {
    t.calls += r.calls
    t.input += r.input_tokens
    t.output += r.output_tokens
    t.cost += estimateCost(r)
    if (r.kind === 'bilde') t.images += r.units
    if (r.kind === 'lyd') t.characters += r.units
    if (r.kind === 'tale') t.seconds += r.units
  }
  return t
}

function StatsCards({ current, previous }: { current: Totals; previous: Totals }) {
  const stats = [
    { title: 'KI-kall', icon: Sigma, value: current.calls, prev: previous.calls, format: numberFormatter.format },
    { title: 'Tokens inn', icon: TextCursorInput, value: current.input, prev: previous.input, format: numberFormatter.format },
    { title: 'Tokens ut', icon: TextQuote, value: current.output, prev: previous.output, format: numberFormatter.format },
    { title: 'Anslått kostnad', icon: CircleDollarSign, value: current.cost, prev: previous.cost, format: formatDollars },
  ]
  return (
    <div className="rounded-xl border bg-white">
      <div className="grid grid-cols-2 divide-border lg:grid-cols-4 lg:divide-x [&>*:nth-child(-n+2)]:border-b lg:[&>*:nth-child(-n+2)]:border-b-0 [&>*:nth-child(odd)]:border-r lg:[&>*:nth-child(odd)]:border-r-0">
        {stats.map((stat) => {
          const change = percentChange(stat.value, stat.prev)
          return (
            <div key={stat.title} className="space-y-3 p-4 sm:space-y-4 sm:p-6">
              <div className="flex items-center gap-1.5 text-vlfk-ink-muted">
                <stat.icon className="size-4" aria-hidden="true" />
                <span className="text-xs font-medium sm:text-sm">{stat.title}</span>
              </div>
              <p className="text-xl font-semibold tracking-tight text-vlfk-ink tabular-nums sm:text-[28px]">
                {stat.format(stat.value)}
              </p>
              <p className="flex flex-wrap items-center gap-2 text-xs text-vlfk-ink-muted">
                {change === null ? (
                  <span>Ingen tall fra før</span>
                ) : (
                  <>
                    <span
                      className={cn(
                        'rounded-sm px-1.5 py-0.5 font-medium text-vlfk-ink',
                        change > 0 ? 'bg-vlfk-lys-rosa' : 'bg-vlfk-lysegronn'
                      )}
                    >
                      {change > 0 ? '+' : ''}
                      {change.toFixed(1).replace('.', ',')} %
                    </span>
                    <span className="hidden sm:inline">mot perioden før</span>
                  </>
                )}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chart over time
// ---------------------------------------------------------------------------

type Metric = 'tokens' | 'kall' | 'kostnad'

const METRIC_LABELS: Record<Metric, string> = {
  tokens: 'Tokens inn og ut',
  kall: 'Antall kall',
  kostnad: 'Anslått kostnad',
}

interface DayPoint {
  day: string
  label: string
  a: number
  b: number
}

function dayRange(days: number, end: string): string[] {
  const out: string[] = []
  const last = new Date(`${end}T00:00:00Z`)
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(last)
    d.setUTCDate(d.getUTCDate() - i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

function seriesFor(metric: Metric, rows: DailyRow[], days: string[]): DayPoint[] {
  const byDay = new Map(days.map((d) => [d, { a: 0, b: 0 }]))
  for (const r of rows) {
    const point = byDay.get(r.day)
    if (!point) continue
    if (metric === 'tokens') {
      point.a += r.input_tokens
      point.b += r.output_tokens
    } else if (metric === 'kall') {
      if (r.kind === 'tekst') point.a += r.calls
      else point.b += r.calls
    } else {
      if (r.kind === 'tekst') point.a += estimateCost(r)
      else point.b += estimateCost(r)
    }
  }
  return days.map((day) => ({ day, label: dayFormatter.format(new Date(`${day}T00:00:00Z`)), ...byDay.get(day)! }))
}

const SERIES_LABELS: Record<Metric, { a: string; b: string }> = {
  tokens: { a: 'Tokens inn', b: 'Tokens ut' },
  kall: { a: 'Tekst', b: 'Bilde, lyd og tale' },
  kostnad: { a: 'Tekst', b: 'Bilde, lyd og tale' },
}

function ChartTooltip({
  active,
  payload,
  label,
  metric,
}: {
  active?: boolean
  payload?: { dataKey?: string | number; value?: number | string }[]
  label?: string | number
  metric: Metric
}) {
  if (!active || !payload?.length) return null
  const format = metric === 'kostnad' ? formatDollars : numberFormatter.format
  return (
    <div className="rounded-lg border bg-white p-2 shadow-lg sm:p-3">
      <p className="mb-1.5 text-xs font-medium text-vlfk-ink sm:text-sm">{label}</p>
      <div className="space-y-1">
        {(['a', 'b'] as const).map((key) => (
          <div key={key} className="flex items-center gap-2 text-xs sm:text-sm">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: SERIES_COLORS[key] }} />
            <span className="text-vlfk-ink-muted">{SERIES_LABELS[metric][key]}:</span>
            <span className="font-medium text-vlfk-ink tabular-nums">
              {format(Number(payload.find((p) => p.dataKey === key)?.value ?? 0))}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const usageChartConfig = {
  a: { label: 'a', color: SERIES_COLORS.a },
  b: { label: 'b', color: SERIES_COLORS.b },
} satisfies ChartConfig

function UsageOverTimeChart({ rows, days, end }: { rows: DailyRow[]; days: number; end: string }) {
  const [metric, setMetric] = React.useState<Metric>('tokens')
  const [hovered, setHovered] = React.useState<'a' | 'b' | null>(null)
  const data = React.useMemo(() => seriesFor(metric, rows, dayRange(days, end)), [metric, rows, days, end])
  const total = data.reduce((sum, d) => sum + d.a + d.b, 0)
  const format = metric === 'kostnad' ? formatDollars : numberFormatter.format
  const tickFormat = (v: number) => (metric === 'kostnad' ? `$${compactFormatter.format(v)}` : compactFormatter.format(v))

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 rounded-xl border bg-white p-4 sm:gap-6 sm:p-6">
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-xl font-semibold leading-tight tracking-tight text-vlfk-ink tabular-nums sm:text-2xl">
            {format(total)}
          </p>
          <p className="text-xs text-vlfk-ink-muted">
            {METRIC_LABELS[metric]}, siste {days} dager
          </p>
        </div>
        <div className="flex items-center gap-3 sm:gap-5">
          {(['a', 'b'] as const).map((key) => (
            <div
              key={key}
              className={cn('flex items-center gap-1.5 transition-opacity', hovered && hovered !== key && 'opacity-40')}
              onMouseEnter={() => setHovered(key)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className="size-2.5 rounded-full sm:size-3" style={{ backgroundColor: SERIES_COLORS[key] }} />
              <span className="text-xs text-vlfk-ink-muted">{SERIES_LABELS[metric][key]}</span>
            </div>
          ))}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" aria-label="Velg hva grafen viser">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Vis</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(Object.keys(METRIC_LABELS) as Metric[]).map((key) => (
              <DropdownMenuCheckboxItem key={key} checked={metric === key} onCheckedChange={() => setMetric(key)}>
                {METRIC_LABELS[key]}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="h-[220px] w-full min-w-0 sm:h-[260px] lg:h-[300px]">
        <ChartContainer config={usageChartConfig} className="aspect-auto h-full w-full">
          <AreaChart data={data} margin={{ left: 4, right: 8, top: 4 }}>
            <defs>
              {(['a', 'b'] as const).map((key) => (
                <linearGradient key={key} id={`forbruk-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SERIES_COLORS[key]} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={SERIES_COLORS[key]} stopOpacity={0.04} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke="#e5e5e2" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} dy={8} minTickGap={16} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} width={44} tickFormatter={tickFormat} />
            <Tooltip content={<ChartTooltip metric={metric} />} cursor={{ strokeOpacity: 0.2 }} />
            {(['a', 'b'] as const).map((key) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={SERIES_COLORS[key]}
                strokeWidth={hovered === key ? 3 : 2}
                fill={`url(#forbruk-${key})`}
                fillOpacity={!hovered || hovered === key ? 1 : 0.3}
                strokeOpacity={!hovered || hovered === key ? 1 : 0.3}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Share per tool (donut) and per model
// ---------------------------------------------------------------------------

function PerToolChart({ rows }: { rows: DailyRow[] }) {
  const [active, setActive] = React.useState<number | null>(null)
  const groups = React.useMemo(() => {
    const byGroup = new Map<string, { cost: number; calls: number }>()
    for (const r of rows) {
      const g = toolInfo(r.tool).group
      const entry = byGroup.get(g) ?? { cost: 0, calls: 0 }
      entry.cost += estimateCost(r)
      entry.calls += r.calls
      byGroup.set(g, entry)
    }
    return [...byGroup.entries()]
      .map(([name, v]) => ({ name, ...v, color: groupColor(name) }))
      .sort((a, b) => b.cost - a.cost)
  }, [rows])
  const total = groups.reduce((sum, g) => sum + g.cost, 0)

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-md border">
          <PieChartIcon className="size-4 text-vlfk-ink-muted" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-medium text-vlfk-ink sm:text-base">Kostnad per verktøy</p>
          <p className="text-xs text-vlfk-ink-muted">Anslag for perioden</p>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="py-6 text-center text-sm text-vlfk-ink-muted">Ingen kall i perioden.</p>
      ) : (
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="relative size-[120px] shrink-0 sm:size-[140px]">
            <ChartContainer config={{}} className="aspect-square h-full w-full">
              <PieChart>
                <Pie
                  data={groups}
                  dataKey="cost"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="92%"
                  paddingAngle={2}
                  strokeWidth={0}
                  onMouseEnter={(_: unknown, index: number) => setActive(index)}
                  onMouseLeave={() => setActive(null)}
                >
                  {groups.map((g, i) => (
                    <Cell key={g.name} fill={g.color} fillOpacity={active === null || active === i ? 1 : 0.4} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs font-semibold text-vlfk-ink tabular-nums sm:text-sm">{formatDollars(total)}</span>
              <span className="text-[10px] text-vlfk-ink-muted">Totalt</span>
            </div>
          </div>
          <ul className="flex flex-1 flex-col gap-2 sm:gap-2.5">
            {groups.map((g, i) => (
              <li
                key={g.name}
                className={cn(
                  'flex items-center justify-between gap-2 transition-opacity',
                  active !== null && active !== i && 'opacity-50'
                )}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
              >
                <span className="flex items-center gap-2 text-xs text-vlfk-ink sm:text-sm">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: g.color }} />
                  {g.name}
                </span>
                <span className="flex items-center gap-2 text-xs tabular-nums">
                  <span className="font-medium text-vlfk-ink">{formatDollars(g.cost)}</span>
                  <span className="w-10 text-right text-vlfk-ink-muted">
                    {total ? Math.round((g.cost / total) * 100) : 0} %
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function MediaCard({ totals }: { totals: Totals }) {
  const items = [
    { icon: ImageIcon, label: 'Bilder laget', value: numberFormatter.format(totals.images) },
    { icon: AudioLines, label: 'Tegn lest opp', value: numberFormatter.format(totals.characters) },
    { icon: Mic, label: 'Minutter tale til tekst', value: numberFormatter.format(Math.round(totals.seconds / 6) / 10) },
  ]
  return (
    <div className="rounded-xl border bg-white p-4 sm:p-5">
      <p className="mb-3 text-sm font-medium text-vlfk-ink sm:text-base">Bilder, lyd og tale</p>
      <ul className="grid grid-cols-3 gap-2">
        {items.map(({ icon: Icon, label, value }) => (
          <li key={label} className="rounded-lg bg-vlfk-surface-muted p-3">
            <Icon className="mb-2 size-4 text-vlfk-ink-muted" aria-hidden="true" />
            <p className="text-lg font-semibold text-vlfk-ink tabular-nums">{value}</p>
            <p className="text-[11px] leading-tight text-vlfk-ink-muted sm:text-xs">{label}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PerModelCard({ rows }: { rows: DailyRow[] }) {
  const models = React.useMemo(() => {
    const byModel = new Map<string, { tokens: number; calls: number; cost: number; provider: string }>()
    for (const r of rows) {
      const m = byModel.get(r.model) ?? { tokens: 0, calls: 0, cost: 0, provider: r.provider }
      m.tokens += r.input_tokens + r.output_tokens
      m.calls += r.calls
      m.cost += estimateCost(r)
      byModel.set(r.model, m)
    }
    return [...byModel.entries()].sort((a, b) => b[1].cost - a[1].cost).slice(0, 6)
  }, [rows])

  return (
    <div className="rounded-xl border bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Cpu className="size-4 text-vlfk-ink-muted" aria-hidden="true" />
        <p className="text-sm font-medium text-vlfk-ink sm:text-base">Per modell</p>
      </div>
      {models.length === 0 ? (
        <p className="text-sm text-vlfk-ink-muted">Ingen kall i perioden.</p>
      ) : (
        <ul className="divide-y text-xs sm:text-sm">
          {models.map(([model, m]) => (
            <li key={model} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="block truncate font-medium text-vlfk-ink">{model}</span>
                <span className="text-vlfk-ink-muted">
                  {numberFormatter.format(m.calls)} kall · {compactFormatter.format(m.tokens)} tokens
                </span>
              </span>
              <span className="shrink-0 font-medium text-vlfk-ink tabular-nums">{formatDollars(m.cost)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// The calls (the «Recent Transactions» table of the block)
// ---------------------------------------------------------------------------

function amountOf(call: CallRow): string {
  if (call.kind === 'bilde') return `${call.units} bilde`
  if (call.kind === 'lyd' && call.provider === 'google') return `${numberFormatter.format(call.units)} tegn`
  if (call.kind === 'tale') return `${call.units} s tale`
  return `${numberFormatter.format(call.input_tokens)} / ${numberFormatter.format(call.output_tokens)}`
}

function CallsTable({ calls }: { calls: CallRow[] }) {
  const [group, setGroup] = React.useState<string>('alle')
  const [page, setPage] = React.useState(1)
  const pageSize = 10
  const groups = React.useMemo(() => [...new Set(calls.map((c) => toolInfo(c.tool).group))].sort(), [calls])
  const filtered = React.useMemo(
    () => (group === 'alle' ? calls : calls.filter((c) => toolInfo(c.tool).group === group)),
    [calls, group]
  )
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const shown = filtered.slice((page - 1) * pageSize, page * pageSize)
  React.useEffect(() => setPage(1), [group])

  return (
    <div className="rounded-xl border bg-white">
      <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md border">
            <ClipboardList className="size-4 text-vlfk-ink-muted" aria-hidden="true" />
          </span>
          <span className="text-sm font-medium text-vlfk-ink sm:text-base">Siste kall</span>
          <span className="ml-1 inline-flex items-center rounded-md bg-vlfk-surface-muted px-2 py-1 text-xs font-medium text-vlfk-ink-muted">
            {filtered.length}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 sm:h-9">
              <Filter className="size-3.5 sm:size-4" aria-hidden="true" />
              <span className="hidden sm:inline">{group === 'alle' ? 'Alle verktøy' : group}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Vis verktøy</DropdownMenuLabel>
            <DropdownMenuCheckboxItem checked={group === 'alle'} onCheckedChange={() => setGroup('alle')}>
              Alle verktøy
            </DropdownMenuCheckboxItem>
            {groups.map((g) => (
              <DropdownMenuCheckboxItem key={g} checked={group === g} onCheckedChange={() => setGroup(g)}>
                {g}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="px-4 pb-4 pt-3 sm:px-6">
        <Table>
          <TableHeader>
            <TableRow className="bg-vlfk-surface-muted hover:bg-vlfk-surface-muted">
              <TableHead className="text-xs text-vlfk-ink-muted sm:text-sm">Tid</TableHead>
              <TableHead className="text-xs text-vlfk-ink-muted sm:text-sm">Verktøy</TableHead>
              <TableHead className="hidden text-xs text-vlfk-ink-muted sm:text-sm md:table-cell">Modell</TableHead>
              <TableHead className="text-right text-xs text-vlfk-ink-muted sm:text-sm">
                <span className="hidden sm:inline">Tokens inn / ut</span>
                <span className="sm:hidden">Mengde</span>
              </TableHead>
              <TableHead className="text-right text-xs text-vlfk-ink-muted sm:text-sm">Kostnad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-20 text-center text-sm text-vlfk-ink-muted">
                  Ingen kall i perioden.
                </TableCell>
              </TableRow>
            ) : (
              shown.map((call) => {
                const info = toolInfo(call.tool)
                return (
                  <TableRow key={call.id}>
                    <TableCell className="whitespace-nowrap text-xs text-vlfk-ink-muted sm:text-sm">
                      {timeFormatter.format(new Date(call.created_at))}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      <span className="flex items-center gap-2">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: groupColor(info.group) }} />
                        <span className="text-vlfk-ink">{info.label}</span>
                        {!call.ok && (
                          <span className="rounded-sm bg-vlfk-rod-oransje/20 px-1.5 py-0.5 text-[10px] font-medium text-vlfk-ink">
                            Feilet
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-xs text-vlfk-ink-muted sm:text-sm md:table-cell">{call.model}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-xs text-vlfk-ink tabular-nums sm:text-sm">
                      {amountOf(call)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-xs text-vlfk-ink tabular-nums sm:text-sm">
                      {formatDollars(estimateCost(call))}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-vlfk-ink-muted sm:px-6">
        <span>
          {filtered.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filtered.length)} av {filtered.length}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-7"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            aria-label="Forrige side"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-7"
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            aria-label="Neste side"
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

export function ForbrukDashboard({
  days,
  today,
  daily,
  calls,
}: {
  days: number
  // Today's date in Oslo (YYYY-MM-DD), the last day in the chart.
  today: string
  daily: DailyRow[]
  calls: CallRow[]
}) {
  const start = dayRange(days, today)[0]
  const current = daily.filter((r) => r.day >= start)
  const previous = daily.filter((r) => r.day < start)
  const totals = totalsOf(current)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold text-vlfk-ink sm:text-2xl">Forbruk</h2>
          <p className="max-w-3xl text-sm text-vlfk-ink-muted sm:text-base">
            Tokens og kall til språkmodellene, bilder og lyd. Kostnaden er et anslag ut fra listeprisene; fakturaen
            ligger i Azure- og Google Cloud-portalen.
          </p>
        </div>
        <PeriodPicker days={days} />
      </div>

      <StatsCards current={totals} previous={totalsOf(previous)} />

      <div className="flex flex-col gap-4 sm:gap-6 xl:flex-row">
        <UsageOverTimeChart rows={current} days={days} end={today} />
        <div className="flex w-full flex-col gap-4 xl:w-[410px]">
          <PerToolChart rows={current} />
          <MediaCard totals={totals} />
        </div>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row">
        <div className="min-w-0 flex-1">
          <CallsTable calls={calls} />
        </div>
        <div className="xl:w-[360px]">
          <PerModelCard rows={current} />
        </div>
      </div>
    </div>
  )
}
