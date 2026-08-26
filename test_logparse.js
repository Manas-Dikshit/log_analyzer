const p = require('@v0idd0/logparse/src/parser');

// Test JSON
const jsonLine = '{"timestamp":"2026-08-22T12:00:01Z","level":"error","message":"Connection failed"}';
console.log('JSON:', JSON.stringify(p.parseLine(jsonLine)));

// Test Nginx
const nginxLine = '127.0.0.1 - - [22/Aug/2026:12:00:01 +0000] "GET /api HTTP/1.1" 500 1234 "-" "curl"';
console.log('Nginx:', JSON.stringify(p.parseLine(nginxLine)));

// Test Apache
const apacheLine = '127.0.0.1 - - [22/Aug/2026:12:00:01 +0000] "GET /api HTTP/1.1" 200 1234';
console.log('Apache:', JSON.stringify(p.parseLine(apacheLine)));

// Test bulk parse
const multiLog = [
  '2026-08-22 12:00:01 INFO Starting application',
  '2026-08-22 12:00:02 ERROR Database connection failed',
  '{"timestamp":"2026-08-22T12:00:03Z","level":"error","message":"Timeout connecting to DB"}',
  '127.0.0.1 - - [22/Aug/2026:12:00:04 +0000] "GET /health HTTP/1.1" 503 0 "-" "monitor"',
  '<13>Aug 22 12:00:05 host sshd[1234]: Connection refused from 10.0.0.1',
  '2026-08-22 12:00:06,456 - myapp - ERROR - Failed to connect to database',
].join('\n');
const entries = p.parseString(multiLog);
console.log('Bulk entries:', entries.length);
entries.forEach((e, i) => console.log(`  [${i}] format=${e.format} level=${e.level} msg=${e.message}`));

// Test normalizeMessage
console.log('Normalize:', p.normalizeMessage('Failed for user 12345 and UUID a1b2c3d4-e5f6-7890-abcd-ef1234567890'));
console.log('Normalize IP:', p.normalizeMessage('Connection from 192.168.1.100 rejected'));
console.log('Normalize hex:', p.normalizeMessage('Segfault at address 0x7fff12345678'));

// Test countByLevel
console.log('CountByLevel:', JSON.stringify(p.countByLevel(entries)));

// Test topMessages
const errors = p.filterByLevel(entries, ['error']);
console.log('TopMessages:', JSON.stringify(p.topMessages(errors, 5)));

// Test bucketEvents
console.log('Buckets:', JSON.stringify(p.bucketEvents(entries, 3600000)));
