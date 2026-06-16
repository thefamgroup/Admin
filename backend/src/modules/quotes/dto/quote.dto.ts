import { IsString, IsEmail, IsNumber, IsOptional, IsEnum, IsArray, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { QuoteStatus } from '../entities/quote.entity';

export class CreateQuoteDto {
  @ApiProperty() @IsString() clientName: string;
  @ApiProperty() @IsEmail() clientEmail: string;
  @ApiProperty() @IsString() clientPhone: string;
  @ApiProperty() @IsString() serviceType: string;
  @ApiProperty() @IsString() propertySize: string;
  @ApiProperty() @IsNumber() @Min(0) subtotal: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() addonsTotal?: number;
  @ApiProperty() @IsNumber() @Min(0) total: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() addons?: { name: string; price: number }[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?: string;
}

export class UpdateQuoteDto extends PartialType(CreateQuoteDto) {
  @ApiPropertyOptional({ enum: QuoteStatus }) @IsOptional() @IsEnum(QuoteStatus) status?: QuoteStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() stripePaymentLink?: string;
}
