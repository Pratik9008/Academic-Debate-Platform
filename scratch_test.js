const fetch = require('node-fetch');

async function test() {
  try {
    // Assuming we need a token, but let's just see if it's a 401 or 500
    // If it's 401, we know the server is up.
    // To bypass auth for a second, let's just call the open /chat endpoint
    const res = await fetch("http://localhost:3000/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hello" })
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Body:", text);
  } catch(e) {
    console.log("Fetch error:", e);
  }
}
test();
