import { buildEventNavigationLinks, formatEventAddress } from './navigation'

describe('mobile event navigation', () => {
  it('formats venue details for the event card', () => {
    expect(formatEventAddress({
      town: 'Красноярск', street: 'Мира', house: '10', entrance: '2', floor: '4', flat: '401', comment: 'Вход со двора',
    })).toBe('Красноярск, Мира, 10\nподъезд 2, этаж 4, офис/кв. 401\nВход со двора')
  })

  it('creates encoded web fallbacks for both navigators', () => {
    const links = buildEventNavigationLinks({ town: 'Красноярск', street: '4 Продольная', house: '34/1' })
    expect(links).toHaveLength(2)
    expect(links[0].url).toContain(encodeURIComponent('Красноярск, 4 Продольная, 34/1'))
    expect(links[1].url).toContain(encodeURIComponent('Красноярск, 4 Продольная, 34/1'))
  })

  it('rejects unsafe custom links and falls back to a web search', () => {
    const links = buildEventNavigationLinks({ town: 'Красноярск', link2Gis: 'javascript:alert(1)' })
    expect(links[0].url).toMatch(/^https:\/\/2gis\.ru/)
  })
})

