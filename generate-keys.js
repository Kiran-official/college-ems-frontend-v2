const webpush = require('web-push');

try {
  const vapidKeys = webpush.generateVAPIDKeys();
  console.log('\n--- NEW VAPID KEYS GENERATED ---');
  console.log('Copy these to your .env file:\n');
  console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"`);
  console.log(`VAPID_PRIVATE_KEY="${vapidKeys.privateKey}"`);
  console.log('\n--------------------------------');
  console.log('After updating .env, please RESTART your dev server.');
} catch (error) {
  console.error('Failed to generate VAPID keys. Ensure web-push is installed.');
  console.error(error);
}
