import path from 'node:path'
import type { CommitInfo } from './git.js'

export interface RepoSummary {
  repo: string
  commits: CommitInfo[]
  totalInsertions: number
  totalDeletions: number
  topFiles: string[]
  bulletPoints: string[]
}

export interface OverallStats {
  totalRepos: number
  totalCommits: number
  totalInsertions: number
  totalDeletions: number
  busiestFile: string | null
  busiestFileCount: number
}

export interface SummarizeOptions {
  includeChore?: boolean
}

const SUBJECT_PREFIXES: Array<[string, string]> = [
  ['feat:', 'Added '],
  ['fix:', 'Fixed ']
]

export function summarizeRepo(repoPath: string, commits: CommitInfo[], options: SummarizeOptions = {}): RepoSummary {
  const includeChore = options.includeChore ?? true
  const filteredCommits = commits.filter((commit) => includeChore || !isChoreCommit(commit.subject))
  const totalInsertions = filteredCommits.reduce((sum, commit) => sum + commit.insertions, 0)
  const totalDeletions = filteredCommits.reduce((sum, commit) => sum + commit.deletions, 0)
  const topFiles = getTopFiles(filteredCommits)
  const bulletPoints = buildBulletPoints(filteredCommits)

  return {
    repo: path.basename(repoPath),
    commits: filteredCommits,
    totalInsertions,
    totalDeletions,
    topFiles,
    bulletPoints
  }
}

export function generateOverallStats(summaries: RepoSummary[]): OverallStats {
  const fileCounts = new Map<string, number>()
  let busiestFile: string | null = null
  let busiestFileCount = 0

  for (const summary of summaries) {
    for (const commit of summary.commits) {
      for (const file of commit.files) {
        const nextCount = (fileCounts.get(file) ?? 0) + 1
        fileCounts.set(file, nextCount)
        if (nextCount > busiestFileCount) {
          busiestFile = file
          busiestFileCount = nextCount
        }
      }
    }
  }

  return {
    totalRepos: summaries.length,
    totalCommits: summaries.reduce((sum, summary) => sum + summary.commits.length, 0),
    totalInsertions: summaries.reduce((sum, summary) => sum + summary.totalInsertions, 0),
    totalDeletions: summaries.reduce((sum, summary) => sum + summary.totalDeletions, 0),
    busiestFile,
    busiestFileCount
  }
}

function buildBulletPoints(commits: CommitInfo[]): string[] {
  if (commits.length === 0) {
    return []
  }

  const groupedCommitIndexes = new Set<number>()
  const bulletPoints: string[] = []
  const groupedModules = getGroupedModules(commits)

  for (const group of groupedModules) {
    bulletPoints.push(`Work on ${group.module} module (${group.count} commits)`)
    for (const index of group.indexes) {
      groupedCommitIndexes.add(index)
    }
  }

  for (const [index, commit] of commits.entries()) {
    if (groupedCommitIndexes.has(index)) {
      continue
    }

    const bullet = subjectToBullet(commit.subject)
    if (bullet) {
      bulletPoints.push(bullet)
    }
  }

  return dedupePreserveOrder(bulletPoints)
}

function getGroupedModules(commits: CommitInfo[]): Array<{ module: string; count: number; indexes: number[] }> {
  const groups = new Map<string, number[]>()

  commits.forEach((commit, index) => {
    const modules = new Set<string>()
    for (const file of commit.files) {
      const module = extractModuleName(file)
      if (module) {
        modules.add(module)
      }
    }

    for (const module of modules) {
      const indexes = groups.get(module) ?? []
      indexes.push(index)
      groups.set(module, indexes)
    }
  })

  return [...groups.entries()]
    .filter(([, indexes]) => indexes.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([module, indexes]) => ({ module, count: indexes.length, indexes }))
}

function extractModuleName(file: string): string | null {
  const parts = file.split('/').filter(Boolean)
  if (parts.length >= 2 && parts[0] === 'src') {
    return parts[1]
  }
  return null
}

function subjectToBullet(subject: string): string | null {
  const trimmed = subject.trim()
  if (!trimmed || isChoreCommit(trimmed)) {
    return null
  }

  for (const [prefix, replacement] of SUBJECT_PREFIXES) {
    if (trimmed.toLowerCase().startsWith(prefix)) {
      const normalized = normalizeActionText(trimmed.slice(prefix.length).trim(), replacement)
      return `${replacement}${normalized}`
    }
  }

  return capitalize(trimmed)
}

function isChoreCommit(subject: string): boolean {
  const trimmed = subject.trim().toLowerCase()
  return trimmed.startsWith('chore:') || trimmed.startsWith('bump')
}

function getTopFiles(commits: CommitInfo[]): string[] {
  const fileCounts = new Map<string, number>()
  for (const commit of commits) {
    const uniqueFiles = new Set(commit.files)
    for (const file of uniqueFiles) {
      fileCounts.set(file, (fileCounts.get(file) ?? 0) + 1)
    }
  }

  return [...fileCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([file]) => file)
}

function dedupePreserveOrder(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    if (seen.has(value)) {
      continue
    }
    seen.add(value)
    result.push(value)
  }
  return result
}

function capitalize(value: string): string {
  if (!value) {
    return value
  }
  return value[0].toUpperCase() + value.slice(1)
}

function normalizeActionText(value: string, replacement: string): string {
  let normalized = value.trim()
  if (replacement === 'Added ' && /^(add|added)\b/i.test(normalized)) {
    normalized = normalized.replace(/^(add|added)\b\s*/i, '')
  }
  if (replacement === 'Fixed ' && /^(fix|fixed)\b/i.test(normalized)) {
    normalized = normalized.replace(/^(fix|fixed)\b\s*/i, '')
  }
  return normalized ? normalized[0].toLowerCase() + normalized.slice(1) : normalized
}
