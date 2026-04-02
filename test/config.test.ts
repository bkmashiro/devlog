import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { addRepo, getConfigDir, getConfigPath, loadConfig, removeRepo, saveConfig } from '../src/config.js'

test('loadConfig returns defaults when config file is missing', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devlog-config-'))
  process.env.DEVLOG_CONFIG_DIR = tmpDir

  const config = loadConfig()
  assert.deepEqual(config.repos, [])
  assert.equal(config.defaultSince, 'yesterday')
  assert.equal(getConfigDir(), tmpDir)
})

test('saveConfig writes JSON to disk', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devlog-config-'))
  process.env.DEVLOG_CONFIG_DIR = tmpDir

  saveConfig({
    repos: ['/tmp/repo'],
    outputDir: '/tmp/out',
    defaultSince: '7 days ago'
  })

  const raw = fs.readFileSync(getConfigPath(), 'utf8')
  const parsed = JSON.parse(raw) as { repos: string[]; outputDir: string; defaultSince: string }
  assert.deepEqual(parsed.repos, ['/tmp/repo'])
  assert.equal(parsed.outputDir, '/tmp/out')
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
    defaultSince: 'yesterday'
  })
  removeRepo('/tmp/repo')

  const config = loadConfig()
  assert.deepEqual(config.repos, ['/tmp/other'])
})
