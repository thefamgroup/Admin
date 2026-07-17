// dto/message.dto.ts
import { IsString, IsOptional, IsEnum, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageSource, MessageStatus } from '../entities/message.entity';

export class CreateMessageDto {
  @ApiProperty() @IsString() senderName: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() senderEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() senderPhone?: string;
  @ApiPropertyOptional({ enum: MessageSource }) @IsOptional() @IsEnum(MessageSource) source?: MessageSource;
  @ApiProperty() @IsString() body: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subject?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() threadId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() waFrom?: string;
}

export class UpdateMessageDto {
  @ApiPropertyOptional({ enum: MessageStatus }) @IsOptional() @IsEnum(MessageStatus) status?: MessageStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedTo?: string;
}
