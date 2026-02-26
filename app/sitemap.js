const rawDomain = process.env.DOMAIN || 'https://artistcrm.ru'
const siteUrl = rawDomain.startsWith('http') ? rawDomain : `https://${rawDomain}`
const normalizedSiteUrl = siteUrl.replace(/\/$/, '')

export default function sitemap() {
  const now = new Date()
  return [
    {
      url: `${normalizedSiteUrl}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${normalizedSiteUrl}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${normalizedSiteUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${normalizedSiteUrl}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
  ]
}
