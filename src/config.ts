import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export interface DevlogConfig {
  repos: string[]
  outputDir: string
  defaultSince: string
}

const DEFAULT_OUTPUT_DIR = path.join(os.homedir(), 'devlog-output')
const DEFAULT_CONFIG_DIR_NAME = '.devlog'
const CONFIG_FILENAME = 'config.json'

export function getConfigDir(): string {
  return process.env.DEVLOG_CONFIG_DIR ?? path.join(os.homedir(), DEFAULT_CONFIG_DIR_NAME)
}

export function getConfigPath(): string {
  return path.join(getConfigDir(), CONFIG_FILENAME)
}

export function getDefaultConfig(): DevlogConfig {
  return {
    repos: [],
    outputDir: DEFAULT_OUTPUT_DIR,
    defaultSince: 'yesterday'
  }
}

export function loadConfig(): DevlogConfig {
  const configPath = getConfigPath()
  if (!fs.existsSync(configPath)) {
    return getDefaultConfig()
  }

  const raw = fs.readFileSync(configPath, 'utf8')
  const parsed = JSON.parse(raw) as Partial<DevlogConfig>

  return {
    repos: Array.isArray(parsed.repos) ? parsed.repos : [],
    outputDir: typeof parsed.outputDir === 'string' ? parsed.outputDir : DEFAULT_OUTPUT_DIR,
    defaultSince: typeof parsed.defaultSince === 'string' ? parsed.defaultSince : 'yesterday'
  }
}

export function saveConfig(config: DevlogConfig): void {
  fs.mkdirSync(getConfigDir(), { recursive: true })
  fs.writeFileSync(getConfigPath(), `${JSON.stringify(config, null, 2)}\n`, 'utf8')
}

export function addRepo(repoPath: string): void {
  const absolutePath = path.resolve(repoPath)
  const config = loadConfig()
  if (!config.repos.includes(absolutePath)) {
    config.repos.push(absolutePath)
    saveConfig(config)
  }
}

export function removeRepo(repoPath: string): void {
  const absolutePath = path.resolve(repoPath)
  const config = loadConfig()
  config.repos = config.repos.filter((entry) => entry !== absolutePath)
  saveConfig(config)
}
