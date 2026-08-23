import test from 'node:test'
import assert from 'node:assert/strict'
import { extractEscalionCloudUploadUrl, normalizeEscalionCloudUrl } from './escalionCloud.js'

test('Escalion Cloud URL accepts only HTTPS cloud.escalion.ru', () => {
  assert.equal(
    normalizeEscalionCloudUrl('/uploads/artistcrm/tenant/screen.png'),
    'https://cloud.escalion.ru/uploads/artistcrm/tenant/screen.png'
  )
  assert.equal(normalizeEscalionCloudUrl('http://cloud.escalion.ru/file.png'), '')
  assert.equal(normalizeEscalionCloudUrl('https://evil.example/file.png'), '')
  assert.equal(normalizeEscalionCloudUrl('javascript:alert(1)'), '')
})

test('Escalion Cloud upload response URL is normalized from supported shapes', () => {
  assert.equal(
    extractEscalionCloudUploadUrl({ fileUrl: 'https://cloud.escalion.ru/file.webp' }),
    'https://cloud.escalion.ru/file.webp'
  )
  assert.equal(extractEscalionCloudUploadUrl({ url: 'https://evil.example/file.webp' }), '')
})
