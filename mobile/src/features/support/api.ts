import { api } from '../../shared/api/client'
import type { SelectedSupportImage, SupportCategory, SupportMessage, SupportStatus, SupportTicket } from './types'

type ListResponse = { success: true; data: SupportTicket[]; meta: { hasMore: boolean; nextCursor: string | null } }
type DetailResponse = { success: true; data: { ticket: SupportTicket; messages: SupportMessage[] }; meta: { hasMore: boolean; nextCursor: string | null } }

const appendImages = (form: FormData, images: SelectedSupportImage[]) => {
  images.forEach((image) => form.append('files', {
    uri: image.uri,
    name: image.name,
    type: image.mimeType,
  } as unknown as Blob))
}

export const listSupportTickets = (params: { status?: string; category?: string; cursor?: string } = {}) => {
  const query = new URLSearchParams()
  if (params.status) query.set('status', params.status)
  if (params.category) query.set('category', params.category)
  if (params.cursor) query.set('cursor', params.cursor)
  query.set('limit', '30')
  return api.get<ListResponse>(`/support-tickets?${query.toString()}`)
}

export const getSupportTicket = (ticketId: string, cursor?: string) =>
  api.get<DetailResponse>(`/support-tickets/${ticketId}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`)

export const createSupportTicket = (input: { category: SupportCategory; title: string; message: string; images: SelectedSupportImage[] }) => {
  const form = new FormData()
  form.append('category', input.category)
  form.append('title', input.title)
  form.append('message', input.message)
  appendImages(form, input.images)
  return api.upload<{ success: true; data: { ticket: SupportTicket; message: SupportMessage } }>('/support-tickets', form)
}

export const replySupportTicket = (ticketId: string, message: string, images: SelectedSupportImage[]) => {
  const form = new FormData()
  form.append('message', message)
  appendImages(form, images)
  return api.upload<{ success: true; data: { ticket: SupportTicket; message: SupportMessage } }>(`/support-tickets/${ticketId}/messages`, form)
}

export const markSupportTicketRead = (ticketId: string) =>
  api.post<{ success: true; data: SupportTicket }>(`/support-tickets/${ticketId}/read`)

export const updateSupportTicketStatus = (ticketId: string, status: SupportStatus) =>
  api.patch<{ success: true; data: SupportTicket }>(`/support-tickets/${ticketId}`, { status })

export const getSupportUnreadCount = () =>
  api.get<{ success: true; data: { unreadCount: number } }>('/support-tickets/summary')
