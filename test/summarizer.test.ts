import assert from 'node:assert/strict'
import test from 'node:test'
import { generateOverallStats, summarizeRepo } from '../src/summarizer.js'
import type { CommitInfo } from '../src/git.js'

function commit(overrides: Partial<CommitInfo> = {}): CommitInfo {
  return {
    hash: 'abc123',
    date: '2024-03-20T10:00:00Z',
    author: 'Alice',
    subject: 'feat: add login',
    body: '',
    filesChanged: 1,
    insertions: 1,
    deletions: 0,
    files: ['src/auth/login.ts'],
    ...overrides
  }
}

test('summarizeRepo groups repeated module work', () => {
  const summary = summarizeRepo('/tmp/repo', [
    commit({ hash: '1', files: ['src/auth/login.ts'] }),
    commit({ hash: '2', files: ['src/auth/session.ts'], subject: 'fix: auth token refresh' }),
    commit({ hash: '3', files: ['src/auth/user.ts'], subject: 'refine auth state' })
  ])

  assert(summary.bulletPoints.includes('Work on auth module (3 commits)'))
})

test('summarizeRepo rewrites feat and fix commit subjects', () => {
  const summary = summarizeRepo('/tmp/repo', [
    commit({ subject: 'feat: add login', files: ['src/login.ts'] }),
    commit({ hash: '2', subject: 'fix: null check', files: ['src/null.ts'] })
  ])

  assert(summary.bulletPoints.includes('Added login'))
  assert(summary.bulletPoints.includes('Fixed null check'))
})

test('summarizeRepo filters chore commits when no-chore is used', () => {
  const summary = summarizeRepo(
    '/tmp/repo',
    [
      commit({ subject: 'chore: bump deps', files: ['package.json'] }),
      commit({ hash: '2', subject: 'feat: add login', files: ['src/auth/login.ts'] })
    ],
    { includeChore: false }
  )

  assert.equal(summary.commits.length, 1)
  assert(!summary.bulletPoints.some((bullet) => bullet.includes('bump deps')))
})

test('summarizeRepo calculates totals and top files', () => {
  const summary = summarizeRepo('/tmp/repo', [
    commit({ hash: '1', insertions: 10, deletions: 2, files: ['src/store.ts'] }),
    commit({ hash: '2', insertions: 5, deletions: 1, files: ['src/store.ts'] }),
    commit({ hash: '3', insertions: 3, deletions: 4, files: ['src/other.ts'] })
  ])

  assert.equal(summary.totalInsertions, 18)
  assert.equal(summary.totalDeletions, 7)
  assert.equal(summary.topFiles[0], 'src/store.ts')
})

test('generateOverallStats aggregates repo totals and busiest file', () => {
  const repoOne = summarizeRepo('/tmp/repo-one', [
    commit({ hash: '1', files: ['src/store.ts'] }),
    commit({ hash: '2', files: ['src/store.ts'] }),
    commit({ hash: '3', files: ['src/other.ts'] }),
    commit({ hash: '4', files: ['src/other.ts'] }),
    commit({ hash: '5', files: ['src/other.ts'] }),
    commit({ hash: '6', files: ['src/other.ts'] }),
    commit({ hash: '7', files: ['src/other.ts'] }),
    commit({ hash: '8', files: ['src/other.ts'] }),
    commit({ hash: '9', files: ['src/other.ts'] }),
    commit({ hash: '10', files: ['src/other.ts'] })
  ])
  const repoTwo = summarizeRepo('/tmp/repo-two', [
    commit({ hash: '11', files: ['src/store.ts'] }),
    commit({ hash: '12', files: ['src/store.ts'] }),
    commit({ hash: '13', files: ['src/store.ts'] }),
    commit({ hash: '14', files: ['src/store.ts'] }),
    commit({ hash: '15', files: ['src/store.ts'] }),
    commit({ hash: '16', files: ['src/store.ts'] }),
    commit({ hash: '19', files: ['src/store.ts'] }),
    commit({ hash: '17', files: ['src/feature.ts'] }),
    commit({ hash: '18', files: ['src/feature.ts'] })
  ])

  const stats = generateOverallStats([repoOne, repoTwo])
  assert.equal(stats.totalRepos, 2)
  assert.equal(stats.totalCommits, 19)
  assert.equal(stats.busiestFile, 'src/store.ts')
  assert.equal(stats.busiestFileCount, 9)
})
