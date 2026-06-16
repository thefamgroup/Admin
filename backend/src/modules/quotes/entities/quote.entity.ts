import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum QuoteStatus {
  DRAFT     = 'draft',
  SENT      = 'sent',
  ACCEPTED  = 'accepted',
  DECLINED  = 'declined',
  PAID      = 'paid',
  OVERDUE   = 'overdue',
}

@Entity('quotes')
export class Quote {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() clientName: string;
  @Column() clientEmail: string;
  @Column() clientPhone: string;
  @Column() serviceType: string;
  @Column() propertySize: string;
  @Column({ type: 'enum', enum: QuoteStatus, default: QuoteStatus.DRAFT }) status: QuoteStatus;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) subtotal: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) addonsTotal: number;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) total: number;
  @Column({ type: 'jsonb', nullable: true }) addons: { name: string; price: number }[];
  @Column({ nullable: true }) notes: string;
  @Column({ nullable: true }) stripePaymentLink: string;
  @Column({ type: 'timestamptz', nullable: true }) sentAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) paidAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) dueDate: Date;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
