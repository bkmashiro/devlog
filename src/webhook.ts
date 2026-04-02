export type WebhookType = 'slack' | 'discord' | 'generic'

export interface WebhookOptions {
  type?: WebhookType
  fetchImpl?: typeof fetch
}

export function detectWebhookType(url: string): WebhookType {
  if (url.includes('discord.com/api/webhooks')) {
    return 'discord'
  }

  if (url.includes('hooks.slack.com/')) {
    return 'slack'
  }

  return 'generic'
}

export function createSlackPayload(markdown: string): { text: string; blocks: Array<Record<string, unknown>> } {
  const sections = chunkText(markdown, 2900).map((text) => ({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text
    }
  }))

  return {
    text: markdown,
    blocks: sections
  }
}

export function createDiscordPayload(markdown: string): { content: string } {
  return { content: markdown }
}

export function createGenericPayload(markdown: string): { text: string } {
  return { text: markdown }
}

export async function deliverWebhook(url: string, markdown: string, options: WebhookOptions = {}): Promise<WebhookType> {
  const type = options.type ?? detectWebhookType(url)
  const fetchImpl = options.fetchImpl ?? fetch
  const payload = type === 'slack'
    ? createSlackPayload(markdown)
    : type === 'discord'
      ? createDiscordPayload(markdown)
      : createGenericPayload(markdown)

  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw new Error(`Webhook delivery failed with status ${response.status}`)
  }

  return type
}

function chunkText(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) {
    return [text]
  }

  const chunks: string[] = []
  let current = ''

  for (const line of text.split('\n')) {
    const candidate = current ? `${current}\n${line}` : line
    if (candidate.length <= maxLength) {
      current = candidate
      continue
    }

    if (current) {
      chunks.push(current)
    }

    current = line

    while (current.length > maxLength) {
      chunks.push(current.slice(0, maxLength))
      current = current.slice(maxLength)
    }
  }

  if (current) {
    chunks.push(current)
  }

  return chunks
}
