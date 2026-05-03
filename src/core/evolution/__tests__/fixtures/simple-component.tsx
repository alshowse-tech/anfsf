import React, { useState } from 'react';

export interface UserProfileProps {
  name: string;
  email: string;
}

export function UserProfile({ name, email }: UserProfileProps) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div>
      <h1>{name}</h1>
      <p>{email}</p>
    </div>
  );
}

export class UserService {
  constructor(private userRepository: any) {}

  async findAll(): Promise<any[]> {
    return [];
  }

  async create(data: any): Promise<any> {
    return data;
  }
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  age?: number;
}

export function loginWorkflow(username: string, password: string) {
  // workflow function
}
