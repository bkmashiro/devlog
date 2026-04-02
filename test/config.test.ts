import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { addRepo, getConfigDir, getConfigPath, loadConfig, removeRepo, saveConfig, setWebhook } from '../src/config.js'

test('loadConfig returns defaults when config file is missing', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devlog-config-'))
  process.env.DEVLOG_CONFIG_DIR = tmpDir

  const config = loadConfig()
  assert.deepEqual(config.repos, [])
  assert.equal(config.defaultSince, 'yesterday')
  assert.equal(config.webhookUrl, null)
  assert.equal(getConfigDir(), tmpDir)
})

test('saveConfig writes JSON to disk', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devlog-config-'))
  process.env.DEVLOG_CONFIG_DIR = tmpDir

  saveConfig({
    repos: ['/tmp/repo'],
    outputDir: '/tmp/out',
    defaultSince: '7 days ago',
    webhookUrl: 'https://hooks.slack.com/services/test'
  })

  const raw = fs.readFileSync(getConfigPath(), 'utf8')
  const parsed = JSON.parse(raw) as { repos: string[]; outputDir: string; defaultSince: string; webhookUrl: string | null }
  assert.deepEqual(parsed.repos, ['/tmp/repo'])
  assert.equal(parsed.outputDir, '/tmp/out')
  assert.equal(parsed.webhookUrl, 'https://hooks.slack.com/services/test')
})

test('addRepo adds paths, saves config, and deduplicates entries', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devlog-config-'))
  process.env.DEVLOG_CONFIG_DIR = tmpDir

  addRepo('/tmp/repo')
  addRepo('/tmp/repo')

  const config = loadConfig()
  assert.deepEqual(config.repos, ['/tmp/repo'])
})

test('removeRepo removes configured repo', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devlog-config-'))
  process.env.DEVLOG_CONFIG_DIR = tmpDir

  saveConfig({
    repos: ['/tmp/repo', '/tmp/other'],
    outputDir: '/tmp/out',
    defaultSince: 'yesterday',
    webhookUrl: null
  })
  removeRepo('/tmp/repo')

  const config = loadConfig()
  assert.deepEqual(config.repos, ['/tmp/other'])
})

test('setWebhook stores the configured webhook URL', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devlog-config-'))
  process.env.DEVLOG_CONFIG_DIR = tmpDir

  setWebhook('https://discord.com/api/webhooks/test')

  const config = loadConfig()
  assert.equal(config.webhookUrl, 'https://discord.com/api/webhooks/test')
})
