import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SessionDescriptionPayload } from '../interfaces/signaling-payload.interface';

class SessionDescriptionDto implements SessionDescriptionPayload {
  @IsString()
  @IsNotEmpty()
  @IsIn(['offer', 'answer', 'pranswer', 'rollback'])
  type!: 'offer' | 'answer' | 'pranswer' | 'rollback';

  @IsString()
  @IsNotEmpty()
  sdp!: string;
}

export class OfferDto {
  @IsString()
  @IsNotEmpty()
  roomId!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => SessionDescriptionDto)
  offer!: SessionDescriptionPayload;
}
