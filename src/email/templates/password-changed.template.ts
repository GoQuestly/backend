export const generatePasswordChangedEmailTemplate = (userName: string): string => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Changed</title>
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
        }
        .success-icon {
            text-align: center;
            font-size: 48px;
            margin: 20px 0;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
        .warning {
            background-color: #f8d7da;
            border-left: 4px solid #dc3545;
            padding: 12px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 GoQuestly</h1>
        </div>
        <div class="content">
            <div class="success-icon">✅</div>
            <h2 style="text-align: center;">Password Successfully Changed</h2>
            <p>Hello ${userName},</p>
            <p>Your password has been successfully changed. You can now log in with your new password.</p>
            <p>For security reasons, we recommend:</p>
            <ul>
                <li>Using a strong, unique password</li>
                <li>Not sharing your password with anyone</li>
            </ul>
        </div>
        <div class="footer">
            <p>This is an automated message from GoQuestly. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} GoQuestly. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
};
