// entities/team-member.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum MemberStatus { ACTIVE='active', INACTIVE='inactive', ON_LEAVE='on_leave' }
export enum MemberRole   { CLEANER='cleaner', SUPERVISOR='supervisor', DRIVER='driver' }

@Entity('team_members')
export class TeamMember {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() firstName: string;
  @Column() lastName: string;
  @Column({ unique: true }) email: string;
  @Column({ nullable: true }) phone: string;
  @Column({ type: 'enum', enum: MemberRole, default: MemberRole.CLEANER }) role: MemberRole;
  @Column({ type: 'enum', enum: MemberStatus, default: MemberStatus.ACTIVE }) status: MemberStatus;
  @Column({ type: 'decimal', precision: 6, scale: 2, default: 11.44 }) hourlyRate: number; // UK NMW 2024
  @Column({ default: false }) dbsChecked: boolean;
  @Column({ type: 'date', nullable: true }) dbsExpiry: Date;
  @Column({ nullable: true }) address: string;
  @Column({ nullable: true }) notes: string;
  @Column({ nullable: true }) whatsappPhone: string; // E.164 format e.g. "447769240184"
  @Column({ default: 0 }) totalJobsCompleted: number;
  @Column({ default: 0 }) totalJobsSent: number;
  @Column({ default: 0 }) totalJobsCancelled: number;
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 }) rating: number;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
