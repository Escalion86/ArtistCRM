import test from 'node:test'
import assert from 'node:assert/strict'
import { moveServicesFromGroupToUngrouped } from './serviceGroups.js'

test('moveServicesFromGroupToUngrouped moves matching services to no group', () => {
  const services = [
    { _id: 'service-1', title: 'Фото', groupId: 'group-1' },
    { _id: 'service-2', title: 'Видео', groupId: 'group-2' },
    { _id: 'service-3', title: 'Ведущий', groupId: null },
  ]

  assert.deepEqual(moveServicesFromGroupToUngrouped(services, 'group-1'), [
    { _id: 'service-1', title: 'Фото', groupId: null },
    { _id: 'service-2', title: 'Видео', groupId: 'group-2' },
    { _id: 'service-3', title: 'Ведущий', groupId: null },
  ])
})
