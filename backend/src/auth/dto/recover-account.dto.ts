import { IsEmail } from 'class-validator';

export class RecoverAccountDto {
  @IsEmail()
  email!: string;
}
