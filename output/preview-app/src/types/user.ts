// [generated]
export interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

export interface CreateUserPayload {
  name: string;
  email: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
}
