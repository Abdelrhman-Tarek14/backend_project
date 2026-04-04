import { Role } from '@prisma/client';
import { Exclude } from 'class-transformer';

export class UserEntity {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  isActive: boolean;
  isOnline: boolean;
  lastActive: Date | null;
  createdAt: Date;
  updatedAt: Date;
  leaderId: string | null;

  @Exclude()
  passwordHash?: string | null;

  @Exclude()
  hashedRefreshToken?: string | null;

  @Exclude()
  password?: string;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
