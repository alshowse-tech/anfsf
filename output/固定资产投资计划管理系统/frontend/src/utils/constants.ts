// [generated]
// TODO: implement application constants

export const PLAN_STATUS_OPTIONS = [
  { value: 'DRAFT', label: '草稿' },
  { value: 'ACTIVE', label: '进行中' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'CANCELLED', label: '已取消' },
] as const;

export const USER_ROLES = {
  ADMIN: 'ADMIN',
  USER: 'USER',
  VIEWER: 'VIEWER',
} as const;

export const API_ENDPOINTS = {
  PLANS: '/plans',
  AUTH: '/auth',
  USERS: '/users',
} as const;
