import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function update() {
  try {
    const numbers = await client.incomingPhoneNumbers.list();
    const myNumber = numbers.find(n => n.phoneNumber === process.env.TWILIO_PHONE_NUMBER);
    if (!myNumber) {
      console.log('Phone number not found in Twilio account.');
      return;
    }
    
    await client.incomingPhoneNumbers(myNumber.sid).update({
      voiceUrl: process.env.BACKEND_URL + '/api/twilio/inbound',
      smsUrl: process.env.BACKEND_URL + '/api/sms/reply',
      voiceMethod: 'POST',
      smsMethod: 'POST'
    });
    console.log('Successfully updated Twilio webhook for', myNumber.phoneNumber);
  } catch (err) {
    console.error(err);
  }
}
update();
