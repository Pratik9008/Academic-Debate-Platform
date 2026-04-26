const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/ai/bot',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test'
  }
};

const req = http.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => { console.log(`BODY: ${data}`); });
});

req.on('error', e => {
  console.error(`problem with request: ${e.message}`);
});

req.write(JSON.stringify({ userMessage: "Hello", history: [] }));
req.end();
