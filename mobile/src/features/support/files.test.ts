import { validateSelectedSupportImages } from './files'
import type { SelectedSupportImage } from './types'

const image = (overrides: Partial<SelectedSupportImage> = {}): SelectedSupportImage => ({
  uri: 'file:///screen.png',
  name: 'screen.png',
  mimeType: 'image/png',
  size: 1024,
  ...overrides,
})

describe('support image selection', () => {
  test('accepts JPEG, PNG and WebP within limits', () => {
    expect(validateSelectedSupportImages([], [
      image({ mimeType: 'image/jpeg' }),
      image({ mimeType: 'image/png' }),
      image({ mimeType: 'image/webp' }),
    ]).ok).toBe(true)
  })

  test('rejects more than five images', () => {
    expect(validateSelectedSupportImages([], Array.from({ length: 6 }, () => image())).ok).toBe(false)
  })

  test('rejects unsupported and oversized files', () => {
    expect(validateSelectedSupportImages([], [image({ mimeType: 'image/gif' })]).ok).toBe(false)
    expect(validateSelectedSupportImages([], [image({ size: 10 * 1024 * 1024 + 1 })]).ok).toBe(false)
  })
})
