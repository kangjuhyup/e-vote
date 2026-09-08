import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';

export class SaveUserProfileBody {
  @IsString() @IsNotEmpty() @MaxLength(64) name!: string;
  @IsEmail() @MaxLength(254) email!: string;
  @IsString() @Matches(/^\+?[0-9]{7,15}$/) phone!: string;
}

export class RegisterUserProfileBody extends SaveUserProfileBody {
  @IsString() @IsNotEmpty() @MaxLength(64) tenantCode!: string;
  @IsString() @IsNotEmpty() @MaxLength(255) userPrincipalId!: string;
}
