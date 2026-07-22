import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { api } from '../../shared/api/client'
import { AiUsagePanel } from './AiUsagePanel'

jest.mock('../../shared/api/client', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}))

const getMock = api.get as jest.Mock
const postMock = api.post as jest.Mock

describe('AiUsagePanel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getMock.mockImplementation((path: string) => {
      if (path === '/ai/settings') {
        return Promise.resolve({
          success: true,
          data: { markupCoefficient: 1.5, platformConfigured: true },
        })
      }
      if (path === '/ai/usage?scope=admin') {
        return Promise.resolve({
          success: true,
          data: {
            summary: {
              operations: 12,
              providerCost: 4,
              charged: 6,
              margin: 2,
              uncovered: 0,
            },
            breakdown: [],
            users: [],
          },
        })
      }
      return Promise.resolve({
        success: true,
        data: {
          balance: 100,
          requiredBalance: 1,
          available: true,
          platformConfigured: true,
          quotes: [
            {
              feature: 'voice_transcription',
              requiredBalance: 0.5,
              available: true,
            },
          ],
          summary: { operations: 2, charged: 1.25 },
          recent: [],
        },
      })
    })
    postMock.mockResolvedValue({
      success: true,
      data: { markupCoefficient: 2, platformConfigured: true },
    })
  })

  it('показывает расходы пользователя и developer-настройки', async () => {
    const screen = render(
      <AiUsagePanel activeProvider="artistcrm" isDeveloper />
    )

    await waitFor(() => {
      expect(screen.getByText('Администрирование')).toBeTruthy()
    })
    expect(screen.getByText('Общий ИИ доступен.')).toBeTruthy()
    expect(screen.getByText('Голосовой ввод')).toBeTruthy()
    expect(screen.getByText('Себестоимость')).toBeTruthy()

    fireEvent.changeText(screen.getByTestId('ai-markup-coefficient'), '2')
    fireEvent.press(screen.getByText('Сохранить коэффициент'))

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/ai/settings', {
        markupCoefficient: 2,
      })
    })
  })
})
