import assert from 'node:assert/strict'
import test from 'node:test'
import { formatMarkdown, formatTerminal } from '../src/formatter.js'
import type { OverallStats, RepoSummary } from '../src/summarizer.js'

const summary: RepoSummary = {
  repo: 'repo-one',
  commits: [],
  totalInsertions: 10,
  totalDeletions: 2,
  topFiles: ['src/store.ts'],
  bulletPoints: ['Added login']
}

const stats: OverallStats = {
  totalRepos: 1,
  totalCommits: 3,
  totalInsertions: 10,
  totalDeletions: 2,
  busiestFile: 'src/store.ts',
  busiestFileCount: 2
}

test('formatMarkdown renders repo headers, bullets, summary, and date', () => {
  const output = formatMarkdown([summary], stats, '2024-03-20')
  assert(output.includes('## repo-one'))
  assert(output.includes('- Added login'))
  assert(output.includes('## Summary'))
  assert(output.includes('2024-03-20'))
})

test('formatMarkdown renders empty day message', () => {
  const output = formatMarkdown([], {
    totalRepos: 0,
    totalCommits: 0,
    totalInsertions: 0,
    totalDeletions: 0,
    busiestFile: null,
    busiestFileCount: 0
  }, '2024-03-20')

  assert(output.includes('No commits today'))
})

test('formatTerminal matches markdown content when ANSI is stripped', () => {
  const terminal = formatTerminal([summary], stats, '2024-03-20')
  const stripped = terminal.replace(/\u001B\[[0-9;]*m/g, '')
  assert(stripped.includes('## repo-one'))
  assert(stripped.includes('- Added login'))
  assert(stripped.includes('## Summary'))
  assert(stripped.includes('2024-03-20'))
})
