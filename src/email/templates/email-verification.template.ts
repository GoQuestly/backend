export function generateEmailVerificationTemplate(userName: string, code: string, expirationMinutes: number): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            background-color: #f9f9f9;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #4CAF50;
            margin: 0;
        }
        .content {
            background-color: white;
            padding: 25px;
            border-radius: 8px;
            text-align: center;
        }
        .code-container {
            background-color: #f0f0f0;
            border: 2px dashed #4CAF50;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
        }
        .code {
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #4CAF50;
            font-family: 'Courier New', monospace;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
        .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 12px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✉️ GoQuestly</h1>
        </div>
        <div class="content">
            <h2>Email Verification</h2>
            <p>Hello ${userName},</p>
            <p>Thank you for registering! Please use the following verification code to confirm your email address:</p>
            
            <div class="code-container">
                <div class="code">${code}</div>
            </div>
            
            <div class="warning">
                <strong>⏰ Important:</strong> This code will expire in ${expirationMinutes} minutes.
            </div>
            
            <p>If you didn't create an account with GoQuestly, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>This is an automated message from GoQuestly. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} GoQuestly. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
}