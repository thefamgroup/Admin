// entities/message.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum MessageSource { WHATSAPP='whatsapp', EMAIL='email', WEB='web' }
export enum MessageStatus { UNREAD='unread', READ='read', REPLIED='replied', ARCHIVED='archived' }

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() senderName: string;
  @Column({ nullable: true }) senderEmail: string;
  @Column({ nullable: true }) senderPhone: string;
  @Column({ type: 'enum', enum: MessageSource, default: MessageSource.WEB }) source: MessageSource;
  @Column({ type: 'enum', enum: MessageStatus, default: MessageStatus.UNREAD }) status: MessageStatus;
  @Column('text') body: string;
  @Column({ nullable: true }) subject: string;
  @Column({ nullable: true }) threadId: string;
  @Column({ nullable: true }) assignedTo: string;
  @Column({ nullable: true }) waFrom: string; // WhatsApp phone number for reply routing
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
