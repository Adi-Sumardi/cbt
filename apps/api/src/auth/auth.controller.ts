import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

export class RegisterDto {
  @IsString() name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsString() role: string;
  nis?: string;
  jenjang?: string;
  kelas?: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.name, dto.email, dto.password, dto.role, dto.nis, dto.jenjang, dto.kelas);
  }
}
