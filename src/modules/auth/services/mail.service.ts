import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { AppException } from '../../../common/errors/app.exception';

@Injectable()
export class MailService {
  constructor(private readonly configService: ConfigService) {}

  async sendVerificationCode(email: string, code: string): Promise<void> {
    const transporter = this.createTransporter();
    const from = this.configService.get<string>('MAIL_FROM');
    const ttlMinutes = this.configService.get<number>(
      'EMAIL_VERIFICATION_TTL_MINUTES',
      10,
    );

    if (!from) {
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        message: 'MAIL_FROM is not configured.',
      });
    }

    await transporter.sendMail({
      from,
      to: email,
      subject: '[EUM] 이메일 인증번호',
      text: [
        `인증번호는 ${code}입니다.`,
        `인증번호는 ${ttlMinutes}분 동안 유효합니다.`,
        '본인이 요청하지 않았다면 이 메일을 무시해 주세요.',
      ].join('\n'),
    });
  }

  private createTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !port || !user || !pass) {
      throw new AppException('SERVER_TEMPORARY_ERROR', {
        message: 'SMTP configuration is incomplete.',
      });
    }

    const options: SMTPTransport.Options = {
      host,
      port,
      secure: this.configService.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user,
        pass,
      },
    };

    return nodemailer.createTransport(options);
  }
}
