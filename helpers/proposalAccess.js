export const canUseProposalBuilder = (user) => user?.role === 'dev'

export const PROPOSAL_BUILDER_ACCESS_ERROR =
  'Коммерческие предложения временно доступны только разработчику'
