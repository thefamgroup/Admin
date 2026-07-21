import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  ADMIN  = 'admin',
  MANAGER = 'manager',
  STAFF  = 'staff',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false }) // never returned in queries by default
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.STAFF })
  role: UserRole;

  @Column('text', { array: true, default: [] })
  permissions: string[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  resetToken: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  resetTokenExpiry: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
