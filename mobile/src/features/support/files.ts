import type { SelectedSupportImage } from './types'

const ALLOWED_SUPPORT_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
export const SUPPORT_IMAGE_LIMIT = 5
export const SUPPORT_IMAGE_MAX_SIZE = 10 * 1024 * 1024

export const validateSelectedSupportImages = (
  existing: SelectedSupportImage[],
  selected: SelectedSupportImage[]
) => {
  if (existing.length + selected.length > SUPPORT_IMAGE_LIMIT) {
    return { ok: false as const, error: 'Можно прикрепить не более 5 изображений' }
  }
  if (selected.some((asset) => !ALLOWED_SUPPORT_IMAGE_TYPES.has(asset.mimeType))) {
    return { ok: false as const, error: 'Допустимы только JPEG, PNG и WebP' }
  }
  if (selected.some((asset) => asset.size <= 0 || asset.size > SUPPORT_IMAGE_MAX_SIZE)) {
    return { ok: false as const, error: 'Размер каждого изображения — не более 10 МБ' }
  }
  return { ok: true as const, images: [...existing, ...selected] }
}
