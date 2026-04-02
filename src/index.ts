#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { Command } from 'commander'
import { addRepo, loadConfig, removeRepo, setWebhook } from './config.js'
import { getCommits, getConfiguredRepos, getDailyCommitActivity, parseDate } from './git.js'
import { formatMarkdown, formatTerminal } from './formatter.js'
import { generateOverallStats, summarizeRepo } from './summarizer.js'
import { formatStreakSummary, summarizeStreakWindow, type RepoDayActivity } from './streak.js'
import { deliverWebhook, type WebhookType } from './webhook.js'

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
  .option('--webhook <url>', 'Send generated log to a webhook URL')
  .option('--webhook-type <type>', 'slack|discord|generic')
  .action(async (options: {
    since?: string
    until?: string
    repos?: string
    output?: string
    format: FormatOption
    chore: boolean
    webhook?: string
    webhookType?: WebhookType
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
    } else {
      process.stdout.write(output)
    }

    const webhookUrl = options.webhook ?? config.webhookUrl
    if (!webhookUrl) {
      return
    }

    process.stdout.write(`Generated dev log for ${displayDate}\n`)
    process.stdout.write('Sending to webhook...\n')
    const deliveredType = await deliverWebhook(webhookUrl, formatMarkdown(summaries, stats, displayDate), {
      type: options.webhookType
    })
    process.stdout.write(`✓ Delivered to ${formatWebhookLabel(deliveredType)}\n`)
  })

program
  .command('streak')
  .option('--days <days>', 'Show last N days', '14')
  .action(async (options: { days: string }) => {
    const days = Number.parseInt(options.days, 10)
    if (!Number.isInteger(days) || days < 1) {
      throw new Error('--days must be a positive integer')
    }

    const repoPaths = getConfiguredRepos()
    if (repoPaths.length === 0) {
      throw new Error('No repositories configured. Use `devlog add <repo-path>` first.')
    }

    const scanDays = Math.max(days, 30)
    const since = `${scanDays - 1} days ago`
    const activity = await Promise.all(
      repoPaths.map(async (repoPath) => ({
        repoPath,
        activity: await getDailyCommitActivity(repoPath, since)
      }))
    )

    const flattened: RepoDayActivity[] = activity.flatMap(({ repoPath, activity: entries }) =>
      entries.map((entry) => ({
        repoPath,
        date: entry.date,
        commits: entry.commits
      }))
    )

    const summary = summarizeStreakWindow(flattened, scanDays, days)
    process.stdout.write(formatStreakSummary(summary))
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

const configCommand = program
  .command('config')
  .action(() => {
    process.stdout.write(`${JSON.stringify(loadConfig(), null, 2)}\n`)
  })

configCommand
  .command('set-webhook')
  .argument('<url>', 'Webhook URL')
  .action((url: string) => {
    setWebhook(url)
    process.stdout.write(`Stored webhook ${url}\n`)
  })

await program.parseAsync(process.argv)

function formatWebhookLabel(type: WebhookType): string {
  return type === 'generic' ? 'webhook' : type[0].toUpperCase() + type.slice(1)
}
