import { MaskLog } from '@kangjuhyup/rvlog';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class RegisterVoteAccountBody {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9_.-]+$/)
  username!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  @MaskLog({ type: 'full' })
  password!: string;

  @IsString() @IsNotEmpty() @MaxLength(64) name!: string;

  @IsEmail()
  @MaxLength(254)
  @MaskLog({ type: 'email' })
  email!: string;

  @IsString()
  @Matches(/^\+8210[0-9]{8}$/)
  @MaskLog({ type: 'phone' })
  phone!: string;
}
