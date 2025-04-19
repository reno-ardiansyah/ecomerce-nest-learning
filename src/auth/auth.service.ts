import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { users } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async signIn(email: string, pass: string): Promise<any> {
    const user = await this.userService.findOne(email);
    if (!user) throw new UnauthorizedException('User not found');

    const isPasswordValid = await this.verifyPassword(pass, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: user.email, sub: user.id };
    const access_token = this.jwtService.sign(payload);

    return access_token;
  }

  async verifyPassword(pass: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(pass, hashedPassword);
  }

  async me(id: number): Promise<users> {
    const user = await this.userService.findOne(id);
    if (!user) throw new UnauthorizedException('User not found');

    return user;
  }
}
