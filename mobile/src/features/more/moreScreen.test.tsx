import React from 'react'
import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import MoreScreen from '../../../app/(tabs)/more'

const mockRefreshUser = jest.fn(() => Promise.resolve())
const mockRouterPush = jest.fn<void, [unknown]>()
const mockApiGet = jest.fn(() =>
  Promise.resolve({
    success: true as const,
    data: {
      account: {
        balance: 800,
        billingStatus: 'active',
        tariffActiveUntil: '2026-08-25T00:00:00.000Z',
        nextChargeAt: '2026-08-25T00:00:00.000Z',
        fundedMonths: 2,
        fundedUntil: '2026-10-25T00:00:00.000Z',
        unlimited: false,
      },
      currentTariff: {
        _id: 'tariff-id',
        title: 'DEV',
        price: 300,
        eventsPerMonth: 0,
        allowCalendarSync: true,
        allowStatistics: true,
        allowDocuments: true,
        allowTelephony: true,
        allowAi: true,
        allowAvitoIntegration: true,
        allowVkIntegration: true,
        allowPublicLeadApi: true,
      },
      tariffs: [],
    },
  })
)

jest.mock('expo-router', () => ({
  router: { push: (href: unknown) => mockRouterPush(href) },
  useFocusEffect: (callback: () => void) => callback(),
}))

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: () => null,
}))

jest.mock('../../shared/api/client', () => ({
  api: { get: () => mockApiGet() },
}))

jest.mock('../../shared/auth/AuthProvider', () => ({
  useAuth: () => ({
    refreshUser: mockRefreshUser,
    user: {
      _id: 'user-id',
      tenantId: 'tenant-id',
      firstName: 'Анна',
      secondName: 'Иванова',
      phone: '79000000000',
      email: '',
      role: 'user',
      tariffId: 'tariff-id',
      tariffTitle: 'Профи',
    },
  }),
}))

describe('MoreScreen tariff card', () => {
  beforeEach(() => {
    mockRefreshUser.mockClear()
    mockRouterPush.mockClear()
    mockApiGet.mockClear()
  })

  it('разделяет профиль и тариф с прогнозом баланса', async () => {
    const screen = render(<MoreScreen />)
    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByText('Профиль, реквизиты, активность')).toBeTruthy()
    expect(screen.queryByText('79000000000')).toBeNull()

    await waitFor(() => {
      expect(screen.getByText('Тариф: DEV')).toBeTruthy()
      expect(screen.getByText(/хватит до 25\.10\.2026/)).toBeTruthy()
    })

    fireEvent.press(screen.getByTestId('more-change-tariff'))

    expect(mockRouterPush).toHaveBeenCalledWith('/billing')
  })
})
