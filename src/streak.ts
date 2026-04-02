export interface RepoDayActivity {
  repoPath: string
  date: string
  commits: number
}

export interface StreakDay {
  date: string
  commits: number
  repos: number
  isBestDay: boolean
  brokeStreak: boolean
}

export interface StreakSummary {
  currentStreak: number
  longestStreak: {
    days: number
    start: string | null
    end: string | null
  }
  activeDays: number
  totalDays: number
  days: StreakDay[]
}

export function buildDailyCommitMap(activity: RepoDayActivity[]): Map<string, { commits: number; repos: Set<string> }> {
  const daily = new Map<string, { commits: number; repos: Set<string> }>()

  for (const entry of activity) {
    const current = daily.get(entry.date) ?? { commits: 0, repos: new Set<string>() }
    current.commits += entry.commits
    if (entry.commits > 0) {
      current.repos.add(entry.repoPath)
    }
    daily.set(entry.date, current)
  }

  return daily
}

export function summarizeStreak(activity: RepoDayActivity[], days: number, now: Date = new Date()): StreakSummary {
  return summarizeStreakWindow(activity, days, days, now)
}

export function summarizeStreakWindow(
  activity: RepoDayActivity[],
  analysisDays: number,
  displayDays: number,
  now: Date = new Date()
): StreakSummary {
  const normalizedToday = toDateOnly(now)
  const daily = buildDailyCommitMap(activity)
  const analysisWindow = buildDateWindow(analysisDays, normalizedToday)
  const displayWindow = analysisWindow.slice(-displayDays)
  const bestCommitCount = displayWindow.reduce((max, date) => Math.max(max, daily.get(date)?.commits ?? 0), 0)

  let currentStreak = 0
  for (let index = analysisWindow.length - 1; index >= 0; index -= 1) {
    const commits = daily.get(analysisWindow[index])?.commits ?? 0
    if (commits < 1) {
      break
    }
    currentStreak += 1
  }

  let longestDays = 0
  let longestStart: string | null = null
  let longestEnd: string | null = null
  let runLength = 0
  let runStart: string | null = null

  for (const date of analysisWindow) {
    const commits = daily.get(date)?.commits ?? 0
    if (commits > 0) {
      runLength += 1
      runStart ??= date
      if (runLength > longestDays) {
        longestDays = runLength
        longestStart = runStart
        longestEnd = date
      }
      continue
    }

    runLength = 0
    runStart = null
  }

  const dayRows = displayWindow
    .map((date) => {
      const entry = daily.get(date)
      const commits = entry?.commits ?? 0
      return {
        date,
        commits,
        repos: entry?.repos.size ?? 0,
        isBestDay: commits > 0 && commits === bestCommitCount,
        brokeStreak: commits === 0 && hasPriorActivity(displayWindow, daily, date)
      }
    })
    .reverse()

  return {
    currentStreak,
    longestStreak: {
      days: longestDays,
      start: longestStart,
      end: longestEnd
    },
    activeDays: dayRows.filter((entry) => entry.commits > 0).length,
    totalDays: displayDays,
    days: dayRows
  }
}

export function formatStreakSummary(summary: StreakSummary): string {
  const lines = [`${summary.currentStreak > 0 ? '🔥' : '○'} Current streak: ${summary.currentStreak} day${summary.currentStreak === 1 ? '' : 's'}`, '', `Last ${summary.totalDays} days:`]

  for (const day of summary.days) {
    const suffix: string[] = []
    if (day.isBestDay) {
      suffix.push('best day')
    }
    if (day.brokeStreak) {
      suffix.push('streak broken here')
    }

    lines.push(`  ${formatDayLabel(day.date)}  ${formatBar(day.commits)}  ${day.commits} commit${day.commits === 1 ? '' : 's'} (${day.repos} repo${day.repos === 1 ? '' : 's'})${suffix.length > 0 ? ` \u2190 ${suffix.join(', ')}` : ''}`)
  }

  const longest = summary.longestStreak.days > 0 && summary.longestStreak.start && summary.longestStreak.end
    ? `${summary.longestStreak.days} days (${formatDayLabel(summary.longestStreak.start)} - ${formatDayLabel(summary.longestStreak.end)})`
    : '0 days'

  const activePercent = Math.round((summary.activeDays / summary.totalDays) * 100)
  lines.push('')
  lines.push(`Longest streak: ${longest}`)
  lines.push(`Active days: ${summary.activeDays}/${summary.totalDays} (${activePercent}%)`)

  return `${lines.join('\n')}\n`
}

function hasPriorActivity(
  calendarDays: string[],
  daily: Map<string, { commits: number; repos: Set<string> }>,
  targetDate: string
): boolean {
  const index = calendarDays.indexOf(targetDate)
  return calendarDays.slice(0, index).some((date) => (daily.get(date)?.commits ?? 0) > 0)
}

function buildDateWindow(days: number, today: string): string[] {
  const end = new Date(`${today}T00:00:00Z`)
  const dates: string[] = []

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(end)
    date.setUTCDate(date.getUTCDate() - offset)
    dates.push(toDateOnly(date))
  }

  return dates
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function formatDayLabel(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    timeZone: 'UTC'
  }).format(new Date(`${date}T00:00:00Z`))
}

function formatBar(commits: number): string {
  if (commits < 1) {
    return '░'
  }

  if (commits <= 8) {
    return '█'.repeat(commits)
  }

  return '████+'
}
