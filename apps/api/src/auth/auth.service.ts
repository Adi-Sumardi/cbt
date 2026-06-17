import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Email atau password salah');
    }
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwt.sign(payload),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  async register(name: string, email: string, password: string, role: string, nis?: string, jenjang?: string, kelas?: string) {
    const hashed = await bcrypt.hash(password, 10);
    return this.users.create({ name, email, password: hashed, role: role as any, nis, jenjang, kelas });
  }
}
