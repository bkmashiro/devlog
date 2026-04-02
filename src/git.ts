import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { loadConfig, getConfigDir } from './config.js'

export interface CommitInfo {
  hash: string
  date: string
  author: string
  subject: string
  body: string
  filesChanged: number
  insertions: number
  deletions: number
  files: string[]
}

interface MutableCommitInfo extends CommitInfo {}

const COMMIT_LINE_PATTERN = /^([0-9a-f]+)\|([^|]+)\|([^|]+)\|(.*)$/
const RELATIVE_DATE_PATTERN = /^(\d+)\s+days?\s+ago$/i
const ISO_DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const ISO_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T/
let gitCommandExecutor: (command: string) => string = (command) => execSync(command, { encoding: 'utf8' })

export function parseDate(input: string): string {
  const trimmed = input.trim()
  if (ISO_DATE_ONLY_PATTERN.test(trimmed) || ISO_DATETIME_PATTERN.test(trimmed)) {
    return trimmed
  }

  const now = new Date()
  if (trimmed.toLowerCase() === 'yesterday') {
    const date = new Date(now)
    date.setUTCDate(date.getUTCDate() - 1)
    return date.toISOString().slice(0, 10)
  }

  const relativeMatch = trimmed.match(RELATIVE_DATE_PATTERN)
  if (relativeMatch) {
    const days = Number(relativeMatch[1])
    const date = new Date(now)
    date.setUTCDate(date.getUTCDate() - days)
    return date.toISOString().slice(0, 10)
  }

  const parsed = new Date(trimmed)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString()
  }

  throw new Error(`Unsupported date input: ${input}`)
}

export function parseGitLogOutput(output: string): CommitInfo[] {
  const commits: MutableCommitInfo[] = []
  let currentCommit: MutableCommitInfo | null = null

  for (const line of output.split(/\r?\n/)) {
    if (!line.trim()) {
      continue
    }

    const commitMatch = line.match(COMMIT_LINE_PATTERN)
    if (commitMatch) {
      currentCommit = {
        hash: commitMatch[1],
        date: commitMatch[2],
        author: commitMatch[3],
        subject: commitMatch[4],
        body: '',
        filesChanged: 0,
        insertions: 0,
        deletions: 0,
        files: []
      }
      commits.push(currentCommit)
      continue
    }

    if (!currentCommit) {
      continue
    }

    const [insertionsRaw, deletionsRaw, ...fileParts] = line.split('\t')
    if (fileParts.length === 0) {
      continue
    }

    if (insertionsRaw === '-' || deletionsRaw === '-') {
      continue
    }

    const insertions = Number(insertionsRaw)
    const deletions = Number(deletionsRaw)
    const file = fileParts.join('\t')

    if (Number.isNaN(insertions) || Number.isNaN(deletions)) {
      continue
    }

    currentCommit.insertions += insertions
    currentCommit.deletions += deletions
    currentCommit.filesChanged += 1
    currentCommit.files.push(file)
  }

  return commits
}

export async function getCommits(repoPath: string, since: string, until?: string): Promise<CommitInfo[]> {
  const sinceDate = parseDate(since)
  const untilDate = until ? parseDate(until) : undefined
  const untilFlag = untilDate ? ` --until=${shellEscape(untilDate)}` : ''
  const command = `git -C ${shellEscape(repoPath)} log --since=${shellEscape(sinceDate)}${untilFlag} --format=%H\\|%aI\\|%an\\|%s --numstat`
  const output = gitCommandExecutor(command)
  return parseGitLogOutput(output)
}

export function getConfiguredRepos(): string[] {
  const configRepos = loadConfig().repos
  if (configRepos.length > 0) {
    return configRepos
  }

  const legacyPath = path.join(getConfigDir(), 'repos.json')
  if (!fs.existsSync(legacyPath)) {
    return []
  }

  const parsed = JSON.parse(fs.readFileSync(legacyPath, 'utf8')) as unknown
  return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : []
}

function shellEscape(value: string): string {
  return JSON.stringify(value)
}

export function setGitCommandExecutorForTesting(executor: ((command: string) => string) | null): void {
  gitCommandExecutor = executor ?? ((command) => execSync(command, { encoding: 'utf8' }))
}
