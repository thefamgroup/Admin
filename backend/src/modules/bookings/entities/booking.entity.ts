import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum BookingStatus {
  PENDING    = 'pending',
  CONFIRMED  = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED  = 'completed',
  CANCELLED  = 'cancelled',
}

export enum ServiceType {
  REGULAR         = 'regular',
  DEEP            = 'deep',
  EOT             = 'eot',
  MOVE_IN_OUT     = 'move_in_out',
  OFFICE          = 'office',
  POST_CONSTRUCTION = 'post_construction',
  AIRBNB          = 'airbnb',
  INDUSTRIAL      = 'industrial',
}

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clientName: string;

  @Column()
  clientEmail: string;

  @Column()
  clientPhone: string;

  @Column()
  address: string;

  @Column({ nullable: true })
  postcode: string;

  @Column({ type: 'enum', enum: ServiceType })
  serviceType: ServiceType;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  @Column({ type: 'timestamptz' })
  scheduledAt: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  @Column({ nullable: true })
  assignedTo: string; // team member name (display)

  @Column({ nullable: true })
  assignedEmployeeId: string; // team member UUID for WhatsApp dispatch

  @Column({ nullable: true })
  notes: string;

  @Column({ default: false })
  depositPaid: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
