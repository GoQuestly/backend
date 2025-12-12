import { Injectable, Logger } from '@nestjs/common';
import { Client } from 'node-mailjet';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private mailjet: Client;
    private readonly fromEmail: string;
    private readonly fromName: string;

    constructor () {
        this.fromEmail = process.env.FROM_EMAIL;
        this.fromName = process.env.FROM_NAME || 'GoQuestly';
        this.mailjet = Client.apiConnect(
            process.env.MAILJET_API_KEY,
            process.env.MAILJET_API_SECRET,
        );
    }

    async sendEmail(
        toEmail: string,
        subject: string,
        htmlPart: string,
    ): Promise<void> {
        try {
            const result = await this.mailjet
                .post('send', { version: 'v3.1' })
                .request({
                    Messages: [
                        {
                            From: {
                                Email: this.fromEmail,
                                Name: this.fromName,
                            },
                            To: [
                                {
                                    Email: toEmail,
                                },
                            ],
                            Subject: subject,
                            HTMLPart: htmlPart,
                        },
                    ],
                });
            this.logger.log(
                `Email sent to ${toEmail}. Status: ${result.response.status}`,
            );
        } catch (error) {
            this.logger.error(`Failed to send email to ${toEmail}`, error);
            throw new Error(`Failed to send email: ${error.message}`);
        }
    }
}