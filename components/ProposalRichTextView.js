'use client'

import { sanitizeProposalRichText } from '@helpers/proposalRichText'

const ProposalRichTextView = ({ html, className = '' }) => {
  const content = sanitizeProposalRichText(html)
  if (!content) return null
  return (
    <div
      className={`proposal-rich-text-content ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}

export default ProposalRichTextView
