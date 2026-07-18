import {
  formatPhoneForDisplay,
  formatRussianPhone,
  normalizeRussianPhone,
} from './phone'

describe('маска российского телефона', () => {
  it.each([
    ['89138370020', '+7 (913) 837-00-20'],
    ['79138370020', '+7 (913) 837-00-20'],
    ['9138370020', '+7 (913) 837-00-20'],
    ['+7 (913) 837-00-20', '+7 (913) 837-00-20'],
  ])('форматирует %s', (source, expected) => {
    expect(formatRussianPhone(source)).toBe(expected)
  })

  it('возвращает канонический номер для API', () => {
    expect(normalizeRussianPhone('+7 (913) 837-00-20')).toBe('79138370020')
  })

  it('не дублирует код страны при последовательном вводе', () => {
    expect(formatRussianPhone('+7 (91')).toBe('+7 (91')
  })

  it('воспринимает начальную восьмёрку как код страны', () => {
    expect(formatRussianPhone('8')).toBe('+7 ')
  })

  it('не принимает неполный номер', () => {
    expect(normalizeRussianPhone('+7 (913) 837')).toBe('')
  })

  it.each([
    ['79659103040', '+79659103040'],
    ['89659103040', '+79659103040'],
    ['9659103040', '+79659103040'],
    ['+79659103040', '+79659103040'],
  ])('добавляет плюс к отображаемому номеру %s', (source, expected) => {
    expect(formatPhoneForDisplay(source)).toBe(expected)
  })
})
