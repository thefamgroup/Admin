// dto/team-member.dto.ts
import { IsString, IsEmail, IsOptional, IsEnum, IsNumber, IsBoolean, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { MemberRole, MemberStatus } from '../entities/team-member.entity';

export class CreateTeamMemberDto {
  @ApiProperty() @IsString() firstName: string;
  @ApiProperty() @IsString() lastName: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() whatsappPhone?: string;
  @ApiPropertyOptional({ enum: MemberRole }) @IsOptional() @IsEnum(MemberRole) role?: MemberRole;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(11.44) hourlyRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() dbsChecked?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dbsExpiry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateTeamMemberDto extends PartialType(CreateTeamMemberDto) {
  @ApiPropertyOptional({ enum: MemberStatus }) @IsOptional() @IsEnum(MemberStatus) status?: MemberStatus;
}
