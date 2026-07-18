const baseConfig = require('./app.json').expo

module.exports = ({ config }) => {
  const resolved = { ...baseConfig, ...config }
  const development = process.env.APP_VARIANT === 'development'

  if (!development) return resolved

  return {
    ...resolved,
    name: 'ArtistCRM Dev',
    scheme: 'artistcrm-dev',
    ios: {
      ...resolved.ios,
      bundleIdentifier: 'ru.escalion.artistcrm.dev',
    },
    android: {
      ...resolved.android,
      package: 'ru.escalion.artistcrm.dev',
    },
    extra: {
      ...resolved.extra,
      appVariant: 'development',
    },
  }
}

