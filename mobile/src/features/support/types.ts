export type SupportCategory = 'bug' | 'idea' | 'question'
export type SupportStatus = 'open' | 'in_progress' | 'resolved'

export type SupportAttachment = {
  url: string
  name: string
  size: number
  type: string
  uploadedAt: string
}

export type SupportMessage = {
  id: string
  authorId: string
  authorRole: 'user' | 'developer'
  authorLabel: string
  body: string
  attachments: SupportAttachment[]
  createdAt: string
}

export type SupportTicket = {
  id: string
  tenantId?: string
  createdBy?: string
  createdByLabel: string
  category: SupportCategory
  title: string
  status: SupportStatus
  lastMessageAt: string
  lastMessageByRole: 'user' | 'developer'
  unread: boolean
  createdAt: string
  updatedAt: string
}

export type SelectedSupportImage = {
  uri: string
  name: string
  mimeType: string
  size: number
}
