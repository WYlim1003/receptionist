const { spawn } = require('child_process');
const http = require('http');

console.log('🚀 Setting up public URL for VoiceDesk Demo...');
console.log('   (This uses localtunnel to safely expose your local Vite dev server)');

// Ensure localtunnel is installed globally or locally
const lt = spawn('npx', ['localtunnel', '--port', '5173'], { shell: true, stdio: ['ignore', 'pipe', 'inherit'] });

lt.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(output);
  
  if (output.includes('your url is:')) {
    const url = output.split('your url is: ')[1].trim();
    console.log('\n======================================================');
    console.log('✅ YOUR PUBLIC DEMO URL IS READY:');
    console.log(`   👉  ${url}`);
    console.log('======================================================');
    console.log('\n⚠️  IMPORTANT NOTE FOR DEMO:');
    console.log('1. Open this URL on your phone or send it to others.');
    console.log('2. If you see a "Localtunnel warning" screen, just click "Click to Continue".');
    console.log('3. Ensure your Backend (npm run dev) and Frontend (npm run dev) are running locally!');
    console.log('\nPress Ctrl+C to close the tunnel when you are done.');
  }
});

lt.on('close', (code) => {
  console.log(`Tunnel closed with code ${code}`);
});
