import assert from 'node:assert/strict'
import test from 'node:test'
import { formatStreakSummary, summarizeStreak, type RepoDayActivity } from '../src/streak.js'

test('summarizeStreak calculates current and longest streak from activity', () => {
  const activity: RepoDayActivity[] = [
    { repoPath: '/repo-a', date: '2024-03-30', commits: 1 },
    { repoPath: '/repo-a', date: '2024-04-01', commits: 2 },
    { repoPath: '/repo-b', date: '2024-04-01', commits: 1 },
    { repoPath: '/repo-a', date: '2024-04-02', commits: 4 }
  ]

  const summary = summarizeStreak(activity, 4, new Date('2024-04-02T12:00:00Z'))
  assert.equal(summary.currentStreak, 2)
  assert.equal(summary.longestStreak.days, 2)
  assert.equal(summary.longestStreak.start, '2024-04-01')
  assert.equal(summary.longestStreak.end, '2024-04-02')
  assert.equal(summary.activeDays, 3)
})

test('summarizeStreak returns zero streak when there are no recent commits', () => {
  const summary = summarizeStreak([], 3, new Date('2024-04-02T12:00:00Z'))
  assert.equal(summary.currentStreak, 0)
  assert.equal(summary.longestStreak.days, 0)
  assert.equal(summary.activeDays, 0)
})

test('summarizeStreak treats a zero-commit day as a broken streak', () => {
  const activity: RepoDayActivity[] = [
    { repoPath: '/repo-a', date: '2024-03-31', commits: 3 },
    { repoPath: '/repo-a', date: '2024-04-02', commits: 1 }
  ]

  const summary = summarizeStreak(activity, 3, new Date('2024-04-02T12:00:00Z'))
  assert.equal(summary.currentStreak, 1)
  assert.equal(summary.days[1].date, '2024-04-01')
  assert.equal(summary.days[1].brokeStreak, true)
})

test('formatStreakSummary renders bars and summary lines', () => {
  const activity: RepoDayActivity[] = [
    { repoPath: '/repo-a', date: '2024-04-01', commits: 2 },
    { repoPath: '/repo-b', date: '2024-04-02', commits: 9 }
  ]

  const output = formatStreakSummary(summarizeStreak(activity, 2, new Date('2024-04-02T12:00:00Z')))
  assert.match(output, /Current streak: 2 days/)
  assert.match(output, /Apr 02  ████\+  9 commits \(1 repo\)/)
  assert.match(output, /Longest streak: 2 days/)
})
