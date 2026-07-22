import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { MobileEventCard } from './MobileEventCard'

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: () => null,
}))

describe('MobileEventCard', () => {
  it('показывает ключевые данные в иерархии PWA-карточки', () => {
    const onPress = jest.fn()
    const screen = render(
      <MobileEventCard
        event={{
          _id: 'event-1',
          status: 'active',
          eventType: 'Свадьба',
          eventDate: '2099-07-25T18:00:00+07:00',
          clientId: 'client-1',
          servicesIds: ['service-1', 'service-2'],
          contractSum: 30_000,
          waitDeposit: true,
          depositExpectedAmount: 15_000,
          depositDueAt: '2020-07-20T10:00:00+07:00',
          address: { town: 'Красноярск', street: 'Мира', house: '10' },
        }}
        client={{ _id: 'client-1', firstName: 'Анна', secondName: 'Иванова' }}
        services={[
          { _id: 'service-1', title: 'Ведение' },
          { _id: 'service-2', title: 'Аппаратура' },
        ]}
        transactions={[
          {
            _id: 'transaction-1',
            eventId: 'event-1',
            type: 'income',
            category: 'client_payment',
            amount: 10_000,
          },
        ]}
        testID="event-card"
        onPress={onPress}
      />
    )

    expect(screen.getByText('Свадьба • Ведение, Аппаратура')).toBeTruthy()
    expect(screen.getByText('Анна Иванова')).toBeTruthy()
    expect(screen.getByText('Красноярск, Мира, 10')).toBeTruthy()
    expect(screen.getByText(/Просрочен задаток:.*15.*000 ₽/)).toBeTruthy()
    expect(screen.getByText(/10.*000 ₽ \/ 30.*000 ₽/)).toBeTruthy()

    fireEvent.press(screen.getByTestId('event-card'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
