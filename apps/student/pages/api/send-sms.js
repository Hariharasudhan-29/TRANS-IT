export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { to, message } = req.body;

    if (!to || !message) {
        return res.status(400).json({ error: 'Missing phone number or message' });
    }

    // Standardize phone number for basic test (Remove spaces/dashes)
    const cleanNumber = to.replace(/[^0-9+]/g, '');

    console.log(`\n========= SMS NOTIFICATION EVENT =========`);
    console.log(`To: ${cleanNumber}`);
    console.log(`Message: ${message}`);
    console.log(`==========================================\n`);

    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER;
    const fast2smsKey = process.env.FAST2SMS_API_KEY;

    try {
        if (twilioSid && twilioToken && twilioFrom) {
            // Use Twilio API
            const formattedNumber = cleanNumber.startsWith('+') ? cleanNumber : `+91${cleanNumber}`;

            const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64'),
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    'To': formattedNumber,
                    'From': twilioFrom,
                    'Body': message
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to send via Twilio');
            return res.status(200).json({ success: true, provider: 'twilio', sid: data.sid });

        } else if (fast2smsKey) {
            // Use Fast2SMS API (Popular in India)
            const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
                method: 'POST',
                headers: {
                    'authorization': fast2smsKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    route: "q",
                    message: message,
                    language: "english",
                    flash: 0,
                    numbers: cleanNumber.replace('+91', '')
                })
            });

            const data = await response.json();
            if (!data.return) throw new Error(data.message || 'Failed to send via Fast2SMS');
            return res.status(200).json({ success: true, provider: 'fast2sms', reqId: data.request_id });

        } else {
            // No API Keys Configured -> Simulate Success for Sandbox/Dev
            console.warn('⚠️ No SMS API keys found in .env (TWILIO_ACCOUNT_SID or FAST2SMS_API_KEY). SMS was simulated successfully.');
            return res.status(200).json({
                success: true,
                simulated: true,
                message: "SMS simulated. Add API keys to .env to send real texts."
            });
        }
    } catch (error) {
        console.error('SMS Send Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
