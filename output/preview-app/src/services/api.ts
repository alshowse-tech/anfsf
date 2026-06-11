// [generated] Mock API with demo data for preview
import type { User, CreateUserPayload, UpdateUserPayload } from '../types/user';
import type { Role } from '../types/role';

const MOCK_USERS: User[] = [
  { id: '1', name: '张三', email: 'zhangsan@example.com', roles: ['管理员'] },
  { id: '2', name: '李四', email: 'lisi@example.com', roles: ['编辑'] },
  { id: '3', name: '王五', email: 'wangwu@example.com', roles: ['访客'] },
  { id: '4', name: '赵六', email: 'zhaoliu@example.com', roles: ['编辑', '审核员'] },
];

const MOCK_ROLES: Role[] = [
  { id: 'r1', name: '管理员', permissions: ['create', 'read', 'update', 'delete', 'manage_users'] },
  { id: 'r2', name: '编辑', permissions: ['create', 'read', 'update'] },
  { id: 'r3', name: '访客', permissions: ['read'] },
  { id: 'r4', name: '审核员', permissions: ['read', 'approve'] },
];

export async function fetchUsers(): Promise<User[]> { return [...MOCK_USERS]; }
export async function fetchUser(id: string): Promise<User> { return MOCK_USERS.find(u => u.id === id) || MOCK_USERS[0]; }
export async function createUser(payload: CreateUserPayload): Promise<User> { return { id: String(Date.now()), ...payload, roles: [] }; }
export async function updateUser(id: string, payload: UpdateUserPayload): Promise<User> { const u = MOCK_USERS.find(x => x.id === id) || MOCK_USERS[0]; return { ...u, ...payload }; }
export async function deleteUser(_id: string): Promise<void> {}
export async function fetchRoles(): Promise<Role[]> { return [...MOCK_ROLES]; }
export async function assignRole(_userId: string, _roleId: string): Promise<void> {}
export async function removeRole(_userId: string, _roleId: string): Promise<void> {}
