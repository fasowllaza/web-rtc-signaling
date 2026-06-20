import {
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IceCandidatePayload } from '../interfaces/signaling-payload.interface';

class IceCandidatePayloadDto implements IceCandidatePayload {
  @IsString()
  @IsOptional()
  candidate?: string;

  @IsString()
  @IsOptional()
  sdpMid?: string | null;

  @IsNumber()
  @IsOptional()
  sdpMLineIndex?: number | null;

  @IsString()
  @IsOptional()
  usernameFragment?: string | null;
}

export class IceCandidateDto {
  @IsString()
  @IsNotEmpty()
  roomId!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => IceCandidatePayloadDto)
  candidate!: IceCandidatePayload;
}
