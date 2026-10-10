import twilio from 'twilio';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function provision() {
  try {
    console.log('Searching for available phone numbers in the US...');
    const local = await client.availablePhoneNumbers('US').local.list({limit: 1});
    
    if (!local || local.length === 0) {
      console.log('No available phone numbers found.');
      return;
    }

    const numberToBuy = local[0].phoneNumber;
    console.log(`Found available number: ${numberToBuy}. Attempting to purchase...`);

    const webhookUrl = process.env.BACKEND_URL + '/api/twilio/inbound';
    
    // Purchase and configure the number
    const purchasedNumber = await client.incomingPhoneNumbers.create({
      phoneNumber: numberToBuy,
      voiceUrl: webhookUrl,
      voiceMethod: 'POST'
    });

    console.log(`Successfully purchased and configured: ${purchasedNumber.phoneNumber}`);
    
    // Update .env file
    const envPath = '.env';
    let envContent = fs.readFileSync(envPath, 'utf8');
    envContent = envContent.replace(
      new RegExp(`TWILIO_PHONE_NUMBER=.*`),
      `TWILIO_PHONE_NUMBER=${purchasedNumber.phoneNumber}`
    );
    fs.writeFileSync(envPath, envContent);
    console.log('.env file updated with new phone number.');

  } catch (err) {
    console.error('Error provisioning number:', err.message);
    if (err.code === 21450 || err.message.includes('Trial accounts')) {
      console.error('It looks like your trial account limits number purchases or requires a verified address.');
    }
  }
}

provision();
