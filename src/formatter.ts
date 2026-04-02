import chalk from 'chalk'
import type { OverallStats, RepoSummary } from './summarizer.js'

export function formatMarkdown(summaries: RepoSummary[], stats: OverallStats, date: string): string {
  if (summaries.length === 0) {
    return `# Dev Log - ${date}\n\nNo commits today.\n`
  }

  const lines: string[] = [`# Dev Log - ${date}`, '']

  for (const summary of summaries) {
    lines.push(`## ${summary.repo}`)
    if (summary.bulletPoints.length === 0) {
      lines.push('- No notable changes')
    } else {
      for (const bullet of summary.bulletPoints) {
        lines.push(`- ${bullet}`)
      }
    }
    lines.push('')
  }

  lines.push('## Summary')
  lines.push(`- ${stats.totalRepos} repos active today`)
  lines.push(`- ${stats.totalCommits} commits total`)
  lines.push(`- Net: +${stats.totalInsertions} lines added, -${stats.totalDeletions} removed`)
  if (stats.busiestFile) {
    lines.push(`- Busiest file: ${stats.busiestFile} (modified ${stats.busiestFileCount} times)`)
  }

  return `${lines.join('\n')}\n`
}

export function formatTerminal(summaries: RepoSummary[], stats: OverallStats, date: string): string {
  if (summaries.length === 0) {
    return `${chalk.bold('Dev Log')} ${chalk.dim(date)}\n\n${chalk.yellow('No commits today.')}\n`
  }

  const lines: string[] = [`${chalk.bold('Dev Log')} ${chalk.dim(date)}`, '']
  for (const summary of summaries) {
    lines.push(chalk.cyan(`## ${summary.repo}`))
    if (summary.bulletPoints.length === 0) {
      lines.push(chalk.dim('- No notable changes'))
    } else {
      for (const bullet of summary.bulletPoints) {
        lines.push(`- ${bullet}`)
      }
    }
    lines.push('')
  }

  lines.push(chalk.green('## Summary'))
  lines.push(`- ${stats.totalRepos} repos active today`)
  lines.push(`- ${stats.totalCommits} commits total`)
  lines.push(`- Net: +${stats.totalInsertions} lines added, -${stats.totalDeletions} removed`)
  if (stats.busiestFile) {
    lines.push(`- Busiest file: ${stats.busiestFile} (modified ${stats.busiestFileCount} times)`)
  }

  return `${lines.join('\n')}\n`
}
