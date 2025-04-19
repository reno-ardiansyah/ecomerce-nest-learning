import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { users } from '@prisma/client';
import { RegisterUserDto } from './dto/register-user.dto';
import { randomBytes, randomUUID } from 'crypto';
import { MailService } from 'src/mail/mail.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly prisma: PrismaService,
  ) {}
  private readonly logger = new Logger(AuthService.name);

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

  async register(registerUserDto: RegisterUserDto): Promise<any> {
    const emailVerificationToken = randomBytes(32).toString('hex');
    const data = {
      ...registerUserDto,
      token: emailVerificationToken,
      token_expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24),
      role: 'customer',
    } as any;

    await this.mailService.sendEmailVerification(
      data.email,
      emailVerificationToken,
    );
    const result = await this.userService.create(data);

    const payload = { email: result.email, sub: result.id };
    const access_token = this.jwtService.sign(payload);
    return access_token;
  }

  async verifyEmail(token: string) {
    try {
      const user = await this.prisma.users.findFirst({
        where: {
          token,
          token_expires_at: {
            gte: new Date(),
          },
        },
      });

      if (!user) throw new BadRequestException('Token is invalid or expired.');

      await this.prisma.users.update({
        where: {
          id: user.id,
        },
        data: {
          token: null,
          token_expires_at: null,
          email_verified_at: new Date(Date.now()),
        },
      });

      return { message: 'success' };
    } catch (error) {
      throw new InternalServerErrorException('Something went wrong.');
    }
  }

  async sendResetPassword(email: string) {
    const user = await this.prisma.users.findUnique({ where: { email } });

    if (!user)
      return {
        message: 'If the email is registered, a reset link has been sent.',
      };

    const token = randomUUID();
    const expires = new Date(Date.now() + 1000 * 60 * 60);

    await this.prisma.users.update({
      where: { id: user.id },
      data: {
        token,
        token_expires_at: expires,
      },
    });

    await this.mailService.sendResetPassword(user.email, token);

    return { message: 'Reset password link sent.' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    try {
      const user = await this.prisma.users.findFirst({
        where: {
          token: resetPasswordDto.token,
          token_expires_at: {
            gte: new Date(),
          },
        },
      });

      if (!user) throw new BadRequestException('Token is invalid or expired.');
      const hashedPassword = await bcrypt.hash(resetPasswordDto.password, 10);
      await this.prisma.users.update({
        where: {id: user.id },
        data: {
          password_hash: hashedPassword,
          token: null,
          token_expires_at: null,
        }
      })
    } catch (error) {}
  }
}
