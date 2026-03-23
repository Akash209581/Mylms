
const http = require('http');
http.get('http://localhost:3001/superadmin/dashboard', (res) => {
  console.log('STATUS:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('DATA:', data));
}).on('error', e => console.error('ERROR:', e.message));
