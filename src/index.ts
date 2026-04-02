#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { Command } from 'commander'
import { addRepo, loadConfig, removeRepo } from './config.js'
import { getCommits, getConfiguredRepos, parseDate } from './git.js'
import { formatMarkdown, formatTerminal } from './formatter.js'
import { generateOverallStats, summarizeRepo } from './summarizer.js'

type FormatOption = 'markdown' | 'terminal'

const program = new Command()

program
  .name('devlog')
  .description('Analyze git commits across multiple repositories and generate daily development logs')
  .version('0.1.0')

program
  .command('generate')
  .option('--since <date>', 'Start date')
  .option('--until <date>', 'End date')
  .option('--repos <paths>', 'Comma-separated repo paths')
  .option('--output <file>', 'Save output to file')
  .option('--format <fmt>', 'markdown|terminal', 'terminal')
  .option('--no-chore', 'Skip chore/bump commits')
  .action(async (options: {
    since?: string
    until?: string
    repos?: string
    output?: string
    format: FormatOption
    chore: boolean
  }) => {
    const config = loadConfig()
    const since = options.since ?? config.defaultSince
    const until = options.until
    const repoPaths = options.repos
      ? options.repos.split(',').map((entry) => path.resolve(entry.trim())).filter(Boolean)
      : getConfiguredRepos()

    if (repoPaths.length === 0) {
      throw new Error('No repositories configured. Use `devlog add <repo-path>` first.')
    }

    const allCommits = await Promise.all(
      repoPaths.map(async (repoPath) => ({
        repoPath,
        commits: await getCommits(repoPath, since, until)
      }))
    )

    const summaries = allCommits
      .map(({ repoPath, commits }) => summarizeRepo(repoPath, commits, { includeChore: options.chore }))
      .filter((summary) => summary.commits.length > 0)

    const stats = generateOverallStats(summaries)
    const displayDate = parseDate(since)
    const output = options.format === 'markdown'
      ? formatMarkdown(summaries, stats, displayDate)
      : formatTerminal(summaries, stats, displayDate)

    if (options.output) {
      const outputPath = path.resolve(options.output)
      fs.mkdirSync(path.dirname(outputPath), { recursive: true })
      fs.writeFileSync(outputPath, output, 'utf8')
      process.stdout.write(`${outputPath}\n`)
      return
    }

    process.stdout.write(output)
  })

program
  .command('add')
  .argument('<repo-path>', 'Path to local git repository')
  .action((repoPath: string) => {
    addRepo(repoPath)
    process.stdout.write(`Added ${path.resolve(repoPath)}\n`)
  })

program
  .command('remove')
  .argument('<repo-path>', 'Path to local git repository')
  .action((repoPath: string) => {
    removeRepo(repoPath)
    process.stdout.write(`Removed ${path.resolve(repoPath)}\n`)
  })

program
  .command('list')
  .action(() => {
    const repos = getConfiguredRepos()
    if (repos.length === 0) {
      process.stdout.write('No repos configured.\n')
      return
    }

    process.stdout.write(`${repos.join('\n')}\n`)
  })

program
  .command('config')
  .action(() => {
    process.stdout.write(`${JSON.stringify(loadConfig(), null, 2)}\n`)
  })

await program.parseAsync(process.argv)
