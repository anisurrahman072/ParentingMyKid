import { IsString, Length } from 'class-validator';

export class SetParentalPinDto {
  @IsString()
  @Length(4, 4)
  pin!: string;
}

export class VerifyParentalPinDto {
  @IsString()
  @Length(4, 4)
  pin!: string;
}
