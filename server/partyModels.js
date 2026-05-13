import { PRODUCTS } from './productContext'
import { getProductModel } from './productDbConnect'
import partyAssignmentsSchema from '@schemas/partyAssignmentsSchema'
import partyClientsSchema from '@schemas/partyClientsSchema'
import partyCompaniesSchema from '@schemas/partyCompaniesSchema'
import partyLocationsSchema from '@schemas/partyLocationsSchema'
import partyOrdersSchema from '@schemas/partyOrdersSchema'
import partyServicesSchema from '@schemas/partyServicesSchema'
import partyStaffSchema from '@schemas/partyStaffSchema'
import partyUsersSchema from '@schemas/partyUsersSchema'

export const PARTY_STAFF_ROLES = Object.freeze({
  OWNER: 'owner',
  ADMIN: 'admin',
  PERFORMER: 'performer',
})

export const getPartyCompanyModel = () =>
  getProductModel({
    product: PRODUCTS.PARTYCRM,
    name: 'PartyCompanies',
    schemaDefinition: partyCompaniesSchema,
    schemaOptions: { timestamps: true },
    configureSchema: (schema) => {
      schema.index({ tenantId: 1, status: 1 })
      schema.index({ title: 1 })
    },
  })

export const getPartyUserModel = () =>
  getProductModel({
    product: PRODUCTS.PARTYCRM,
    name: 'PartyUsers',
    schemaDefinition: partyUsersSchema,
    schemaOptions: { timestamps: true },
    configureSchema: (schema) => {
      schema.index({ phone: 1 }, { unique: true })
      schema.index({ email: 1 })
      schema.index({ status: 1 })
    },
  })

export const getPartyStaffModel = () =>
  getProductModel({
    product: PRODUCTS.PARTYCRM,
    name: 'PartyStaff',
    schemaDefinition: partyStaffSchema,
    schemaOptions: { timestamps: true },
    configureSchema: (schema) => {
      schema.index({ tenantId: 1, role: 1, status: 1 })
      schema.index({ tenantId: 1, phone: 1 })
      schema.index({ tenantId: 1, email: 1 })
      schema.index({ tenantId: 1, specialization: 1, status: 1 })
      schema.index({ tenantId: 1, linkStatus: 1 })
    },
  })

export const getPartyLocationModel = () =>
  getProductModel({
    product: PRODUCTS.PARTYCRM,
    name: 'PartyLocations',
    schemaDefinition: partyLocationsSchema,
    schemaOptions: { timestamps: true },
    configureSchema: (schema) => {
      schema.index({ tenantId: 1, status: 1, title: 1 })
    },
  })

export const getPartyClientModel = () =>
  getProductModel({
    product: PRODUCTS.PARTYCRM,
    name: 'PartyClients',
    schemaDefinition: partyClientsSchema,
    schemaOptions: { timestamps: true },
    configureSchema: (schema) => {
      schema.index({ tenantId: 1, status: 1, firstName: 1, secondName: 1 })
      schema.index({ tenantId: 1, phone: 1 })
      schema.index({ tenantId: 1, email: 1 })
    },
  })

export const getPartyAssignmentModel = () =>
  getProductModel({
    product: PRODUCTS.PARTYCRM,
    name: 'PartyAssignments',
    schemaDefinition: partyAssignmentsSchema,
    schemaOptions: { timestamps: true },
    configureSchema: (schema) => {
      schema.index({ tenantId: 1, eventId: 1 })
      schema.index({ tenantId: 1, staffId: 1 })
      schema.index({ tenantId: 1, eventId: 1, staffId: 1 }, { unique: true })
    },
  })

export const getPartyServiceModel = () =>
  getProductModel({
    product: PRODUCTS.PARTYCRM,
    name: 'PartyServices',
    schemaDefinition: partyServicesSchema,
    schemaOptions: { timestamps: true },
    configureSchema: (schema) => {
      schema.index({ tenantId: 1, status: 1, title: 1 })
      schema.index({ tenantId: 1, specialization: 1, status: 1 })
    },
  })

export const getPartyOrderModel = () =>
  getProductModel({
    product: PRODUCTS.PARTYCRM,
    name: 'PartyOrders',
    schemaDefinition: partyOrdersSchema,
    schemaOptions: { timestamps: true },
    configureSchema: (schema) => {
      schema.index({ tenantId: 1, eventDate: -1 })
      schema.index({ tenantId: 1, status: 1, eventDate: -1 })
      schema.index({ tenantId: 1, locationId: 1, eventDate: 1 })
      schema.index({ tenantId: 1, 'assignedStaff.staffId': 1, eventDate: 1 })
    },
  })
