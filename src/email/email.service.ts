import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private resend: Resend;
    private readonly fromEmail: string;

    constructor () {
        this.fromEmail = process.env.FROM_EMAIL;
        this.resend = new Resend(process.env.RESEND_API_KEY);
    }

    async sendEmail(
        toEmail: string,
        subject: string,
        htmlPart: string,
    ): Promise<void> {
        const result = await this.resend.emails.send({
            from: this.fromEmail,
            to: toEmail,
            subject: subject,
            html: htmlPart,
        });
        const error = result.error;
        if (error === null) {
            this.logger.log(
                `Email sent to ${toEmail}. Result: ${JSON.stringify(result)}`,
            );
        } else {
            this.logger.error(`Failed to send email to ${toEmail}`, error);
            throw Error(error.message);
        }
    }
}