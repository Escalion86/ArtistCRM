'use client'

import { getNewsContentHtml } from '@helpers/newsRichText.mjs'

const NewsRichTextView = ({ newsItem, className = '' }) => {
  const content = getNewsContentHtml(newsItem)
  if (!content) return null

  return (
    <div
      className={`news-rich-text-content ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}

export default NewsRichTextView
