import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('wa_sessions')
export class WaSession {
  @PrimaryColumn()
  phone: string; // E.164 format e.g. "447769240184"

  @Column({ default: 'IDLE' })
  state: string;

  @Column({ type: 'jsonb', nullable: true, default: {} })
  data: Record<string, any>; // accumulated form data during conversation

  @Column({ nullable: true })
  inboxMessageId: string; // linked inbox thread for agent handoff

  @Column({ nullable: true })
  activeJobRef: string; // short booking ref for employee job context

  @UpdateDateColumn()
  updatedAt: Date;
}
