export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

// TODO: implement user creation payload
export interface CreateUserRequest {
  name: string;
  email: string;
}

// TODO: implement user update payload
export interface UpdateUserRequest {
  name?: string;
  email?: string;
}