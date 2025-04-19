// src/mail/mail.service.ts
import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendEmailVerification(email: string, token: string) {
    const verificationUrl = `http://localhost:3000/verify-email?token=${token}`;
    
    await this.mailerService.sendMail({
      to: email,
      subject: 'Verify your email',
      template: 'verify', 
      context: {
        url: verificationUrl,
      },
    });
  }

  async sendResetPassword(email: string, token: string) {
    const resetUrl = `http://localhost:3000/reset-password?token=${token}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Reset your password',
      template: 'reser-password',
      context: {
        url: resetUrl,
      }, 
    })
  }
}
