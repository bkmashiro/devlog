import assert from 'node:assert/strict'
import test from 'node:test'
import { createDiscordPayload, createSlackPayload, deliverWebhook, detectWebhookType } from '../src/webhook.js'

test('detectWebhookType identifies discord webhook URLs', () => {
  assert.equal(detectWebhookType('https://discord.com/api/webhooks/123/abc'), 'discord')
})

test('createSlackPayload wraps markdown in Block Kit sections', () => {
  const payload = createSlackPayload('# Dev Log\n\n- Added tests')
  assert.equal(payload.text, '# Dev Log\n\n- Added tests')
  assert.equal(payload.blocks.length, 1)
  assert.deepEqual(payload.blocks[0], {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '# Dev Log\n\n- Added tests'
    }
  })
})

test('createDiscordPayload sends markdown as content', () => {
  assert.deepEqual(createDiscordPayload('**hello**'), { content: '**hello**' })
})

test('deliverWebhook posts Slack JSON payload', async () => {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = []
  const fetchImpl: typeof fetch = async (url, init) => {
    calls.push({ url: String(url), init })
    return new Response(null, { status: 200 })
  }

  const type = await deliverWebhook('https://hooks.slack.com/services/test', '# Dev Log', { fetchImpl })
  assert.equal(type, 'slack')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://hooks.slack.com/services/test')
  assert.equal(calls[0].init?.method, 'POST')
  assert.equal((calls[0].init?.headers as Record<string, string>)['content-type'], 'application/json')
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), {
    text: '# Dev Log',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '# Dev Log'
        }
      }
    ]
  })
})

test('deliverWebhook posts Discord JSON payload', async () => {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = []
  const fetchImpl: typeof fetch = async (url, init) => {
    calls.push({ url: String(url), init })
    return new Response(null, { status: 204 })
  }

  const type = await deliverWebhook('https://discord.com/api/webhooks/test', '# Dev Log', { fetchImpl })
  assert.equal(type, 'discord')
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { content: '# Dev Log' })
})
