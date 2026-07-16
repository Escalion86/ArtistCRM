import { replaceLocalReference } from './localReferences'

describe('replaceLocalReference', () => {
  it('rewrites exact ids in nested objects and arrays', () => {
    expect(replaceLocalReference({
      clientId: 'local-client',
      otherContacts: [{ clientId: 'local-client' }],
      servicesIds: ['unchanged', 'local-client'],
    }, 'local-client', 'server-client')).toEqual({
      clientId: 'server-client',
      otherContacts: [{ clientId: 'server-client' }],
      servicesIds: ['unchanged', 'server-client'],
    })
  })

  it('does not replace partial string matches', () => {
    expect(replaceLocalReference('prefix-local-client', 'local-client', 'server-client'))
      .toBe('prefix-local-client')
  })
})
