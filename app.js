// Import Express.js and other dependencies
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const axios = require('axios');
const path = require('path');

// Create an Express app and HTTP server
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware to parse JSON bodies and serve static files
app.use(express.json());
app.use(express.static('public'));

// Set port and verify_token
const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;
const whatsappToken = process.env.WHATSAPP_TOKEN;
const whatsappApiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';

// Validate required environment variables
if (!whatsappToken) {
  console.error('WHATSAPP_TOKEN is required');
  process.exit(1);
}
if (!verifyToken) {
  console.error('VERIFY_TOKEN is required');
  process.exit(1);
}

// Store active WebSocket connections
let wsClients = new Set();

// Route for GET requests
app.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
});

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  // Basic origin validation for production
  const origin = req.headers.origin;
  if (process.env.NODE_ENV === 'production' && origin && !origin.includes(req.headers.host)) {
    ws.close(1008, 'Invalid origin');
    return;
  }
  
  console.log('Client connected via WebSocket');
  wsClients.add(ws);
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'call_response') {
        await handleCallResponse(data);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    wsClients.delete(ws);
    console.log('Client disconnected');
  });
});

// Handle call API responses
async function handleCallResponse(data) {
  const { action, callId, phoneNumberId, sdp } = data;
  
  const payload = {
    messaging_product: 'whatsapp',
    call_id: callId,
    action: action
  };
  
  if (sdp) {
    payload.session = {
      sdp_type: 'answer',
      sdp: sdp
    };
  }
  
  // Validate phoneNumberId to prevent SSRF
  if (!/^\d+$/.test(phoneNumberId)) {
    console.error('Invalid phone number ID format');
    return;
  }
  
  // Validate API URL to prevent SSRF
  const allowedHosts = ['graph.facebook.com'];
  const apiUrl = new URL(whatsappApiUrl);
  if (!allowedHosts.includes(apiUrl.hostname)) {
    console.error('Invalid API URL hostname');
    return;
  }
  
  try {
    const url = `${whatsappApiUrl}/${phoneNumberId}/calls`;
    await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    console.log(`Call ${action} sent successfully`);
  } catch (error) {
    console.error(`Error sending ${action}:`, error.response?.data || error.message);
  }
}

// Route for POST requests (webhook)
app.post('/', (req, res) => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`\n\nWebhook received ${timestamp}\n`);
  console.log(JSON.stringify(req.body, null, 2));
  
  // Handle call events
  if (req.body.entry?.[0]?.changes?.[0]?.field === 'calls') {
    const callData = req.body.entry[0].changes[0].value;
    const call = callData.calls[0];
    
    if (call.event === 'connect') {
      // Broadcast incoming call to all connected clients
      const callEvent = {
        type: 'incoming_call',
        callId: call.id,
        phoneNumberId: callData.metadata.phone_number_id,
        from: call.from,
        to: call.to,
        sdp: call.session?.sdp,
        timestamp: call.timestamp
      };
      
      wsClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(callEvent));
        }
      });
    } else if (call.event === 'terminate') {
      // Broadcast call termination
      const terminateEvent = {
        type: 'call_terminated',
        callId: call.id,
        direction: call.direction,
        status: call.status,
        duration: call.duration
      };
      
      wsClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(terminateEvent));
        }
      });
    }
  }
  
  res.status(200).end();
});

// Start the server
server.listen(port, () => {
  console.log(`\nServer listening on port ${port}`);
  console.log(`WebSocket server ready`);
  console.log(`Web client available at http://localhost:${port}\n`);
});