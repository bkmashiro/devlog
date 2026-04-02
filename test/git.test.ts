import assert from 'node:assert/strict'
import test from 'node:test'
import { getCommits, parseDate, parseGitLogOutput, setGitCommandExecutorForTesting } from '../src/git.js'

test('parseDate handles yesterday', () => {
  const expected = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  assert.equal(parseDate('yesterday'), expected)
})

test('parseDate handles relative days', () => {
  const expected = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  assert.equal(parseDate('7 days ago'), expected)
})

test('parseDate passes through date-only input', () => {
  assert.equal(parseDate('2024-03-20'), '2024-03-20')
})

test('parseDate passes through ISO datetime', () => {
  assert.equal(parseDate('2024-03-20T00:00:00Z'), '2024-03-20T00:00:00Z')
})

test('parseGitLogOutput parses commit metadata and numstat lines', () => {
  const output = [
    'abc123|2024-03-20T10:00:00Z|Alice|feat: add login',
    '5\t3\tsrc/api.ts',
    '2\t0\tsrc/auth/login.ts',
    'def456|2024-03-20T11:00:00Z|Bob|fix: null check',
    '1\t1\tsrc/auth/session.ts'
  ].join('\n')

  const commits = parseGitLogOutput(output)
  assert.equal(commits.length, 2)
  assert.equal(commits[0].hash, 'abc123')
  assert.equal(commits[0].subject, 'feat: add login')
  assert.equal(commits[0].filesChanged, 2)
  assert.equal(commits[0].insertions, 7)
  assert.equal(commits[0].deletions, 3)
  assert.deepEqual(commits[0].files, ['src/api.ts', 'src/auth/login.ts'])
})

test('parseGitLogOutput skips merge-like numstat lines with dashes', () => {
  const output = [
    'abc123|2024-03-20T10:00:00Z|Alice|merge feature branch',
    '-\t-\tbinary.file'
  ].join('\n')

  const commits = parseGitLogOutput(output)
  assert.equal(commits.length, 1)
  assert.equal(commits[0].filesChanged, 0)
  assert.equal(commits[0].insertions, 0)
  assert.equal(commits[0].deletions, 0)
})

test('parseGitLogOutput returns empty array for empty log', () => {
  assert.deepEqual(parseGitLogOutput(''), [])
})

test('getCommits uses git log output from execSync', async () => {
  const mockOutput = 'abc123|2024-03-20T10:00:00Z|Alice|feat: add login\n5\t3\tsrc/api.ts\n'
  setGitCommandExecutorForTesting(() => mockOutput)

  try {
    const commits = await getCommits('/tmp/repo', '2024-03-20')
    assert.equal(commits.length, 1)
    assert.equal(commits[0].author, 'Alice')
    assert.equal(commits[0].files[0], 'src/api.ts')
  } finally {
    setGitCommandExecutorForTesting(null)
  }
})
