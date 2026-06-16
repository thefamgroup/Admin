import {
  IsString, IsEmail, IsEnum, IsOptional,
  IsDateString, IsNumber, IsBoolean, MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { BookingStatus, ServiceType } from '../entities/booking.entity';

export class CreateBookingDto {
  @ApiProperty() @IsString() @MinLength(2) clientName: string;
  @ApiProperty() @IsEmail() clientEmail: string;
  @ApiProperty() @IsString() clientPhone: string;
  @ApiProperty() @IsString() address: string;
  @ApiPropertyOptional() @IsOptional() @IsString() postcode?: string;
  @ApiProperty({ enum: ServiceType }) @IsEnum(ServiceType) serviceType: ServiceType;
  @ApiProperty() @IsDateString() scheduledAt: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() price?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateBookingDto extends PartialType(CreateBookingDto) {
  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional() @IsEnum(BookingStatus) status?: BookingStatus;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean() depositPaid?: boolean;
}

export class BookingQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: BookingStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() to?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() limit?: number;
}
