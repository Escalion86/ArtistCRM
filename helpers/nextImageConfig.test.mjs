import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const nextConfig = require('../next.config.js')
const { hasRemoteMatch } = require('next/dist/shared/lib/match-remote-pattern')

test('Next image config allows VK avatars but rejects arbitrary hosts', () => {
  const domains = nextConfig.images?.domains ?? []
  const patterns = nextConfig.images?.remotePatterns ?? []

  assert.equal(
    hasRemoteMatch(
      domains,
      patterns,
      new URL('https://sun4-20.vkuserphoto.ru/avatar.jpg')
    ),
    true
  )
  assert.equal(
    hasRemoteMatch(
      domains,
      patterns,
      new URL('https://example.com/avatar.jpg')
    ),
    false
  )
})
