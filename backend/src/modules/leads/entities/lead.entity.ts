import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum LeadStatus   { NEW='new', CONTACTED='contacted', QUOTED='quoted', WON='won', LOST='lost' }
export enum LeadSource   { WEBSITE='website', WHATSAPP='whatsapp', EMAIL='email', PHONE='phone', REFERRAL='referral' }

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column({ nullable: true }) email: string;
  @Column({ nullable: true }) phone: string;
  @Column({ nullable: true }) address: string;
  @Column({ nullable: true }) serviceInterest: string;
  @Column({ nullable: true }) propertyType: string;
  @Column({ type: 'enum', enum: LeadStatus, default: LeadStatus.NEW }) status: LeadStatus;
  @Column({ type: 'enum', enum: LeadSource, default: LeadSource.WEBSITE }) source: LeadSource;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) estimatedValue: number;
  @Column({ nullable: true }) notes: string;
  @Column({ nullable: true }) assignedTo: string;
  @Column({ type: 'timestamptz', nullable: true }) followUpAt: Date;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
