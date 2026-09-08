import assert from 'node:assert/strict'
import { mapDadataSuggestion } from '../server/dadataSuggest.mjs'

// Фикстура по образцу из официальной документации dadata.ru/api/suggest/address
const houseSuggestion = {
  value: 'г Самара, ул Ленинградская, д 12 к 2',
  unrestricted_value: 'г Самара, ул Ленинградская, д 12 к 2',
  data: {
    city: 'Самара',
    settlement: null,
    street_with_type: 'ул Ленинградская',
    street: 'Ленинградская',
    house: '12',
    block_type: 'к',
    block: '2',
    geo_lat: '53.2038',
    geo_lon: '50.1606',
  },
}
const mapped = mapDadataSuggestion(houseSuggestion)
assert.equal(mapped.label, 'г Самара, ул Ленинградская, д 12 к 2')
assert.deepEqual(mapped.address, {
  town: 'Самара',
  street: 'ул Ленинградская',
  house: '12 к 2',
  latitude: '53.2038',
  longitude: '50.1606',
})

// Населённый пункт вместо города, дом без корпуса, без координат
const settlementSuggestion = {
  value: 'Самарская обл, с Константиновка, ул Центральная, д 5',
  unrestricted_value: 'Самарская обл, с Константиновка, ул Центральная, д 5',
  data: {
    city: null,
    settlement: 'Константиновка',
    street_with_type: 'ул Центральная',
    street: 'Центральная',
    house: '5',
    block_type: null,
    block: null,
    geo_lat: null,
    geo_lon: null,
  },
}
const mapped2 = mapDadataSuggestion(settlementSuggestion)
assert.deepEqual(mapped2.address, {
  town: 'Константиновка',
  street: 'ул Центральная',
  house: '5',
  latitude: '',
  longitude: '',
})

console.log('checkDadataMapping: PASS')
