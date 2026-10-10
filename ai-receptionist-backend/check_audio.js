import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('whatsapp-mcp-ts/data/whatsapp.db');

// Check columns in messages table
const cols = db.prepare("PRAGMA table_info(messages)").all();
console.log('Message columns:', cols.map(c => c.name).join(', '));

// Get sample audio messages - all columns
const rows = db.prepare("SELECT * FROM messages WHERE content LIKE '%Audio%' ORDER BY timestamp DESC LIMIT 3").all();
console.log('\nSample audio messages:');
console.log(JSON.stringify(rows, null, 2));

// Also check what the media folder looks like
import { readdirSync, existsSync } from 'node:fs';
const mediaDir = 'whatsapp-mcp-ts/media';
if (existsSync(mediaDir)) {
  const files = readdirSync(mediaDir).slice(0, 10);
  console.log('\nMedia folder files:', files);
} else {
  console.log('\nMedia folder does not exist:', mediaDir);
}
