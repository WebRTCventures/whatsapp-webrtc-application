# WhatsApp Voice API WebRTC Application

A Node.js webhook application that receives voice call events from WhatsApp Business API and establishes WebRTC connections to enable real-time voice calls between WhatsApp users and web clients.

## Features

- **WhatsApp Voice API Integration**: Receives and handles voice call webhooks from WhatsApp Business API
- **WebRTC Support**: Establishes peer-to-peer voice connections for real-time communication
- **Real-time Communication**: WebSocket-based communication between webhook and web client
- **Call Management**: Handle incoming calls, accept/reject functionality, and call termination
- **Web Interface**: Browser-based client for managing voice calls

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   WhatsApp      │    │   Node.js        │    │   Web Client    │
│   Business API  │───▶│   Webhook        │◀──▶│   (Browser)     │
│                 │    │   + WebSocket    │    │   + WebRTC      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Prerequisites

- Node.js 16+ and npm
- WhatsApp Business API account
- Valid webhook URL (publicly accessible)
- SSL certificate (required for WebRTC in production)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd whatsapp-webrtc-application
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your credentials:
   ```env
   VERIFY_TOKEN=your_webhook_verify_token
   WHATSAPP_TOKEN=your_whatsapp_access_token
   WHATSAPP_API_URL=https://graph.facebook.com/v24.0
   PORT=3000
   ```

## Configuration

### WhatsApp Business API Setup

1. **Create a WhatsApp Business App** in Meta for Developers
2. **Associate WhatsApp API with your App**. You'll be required to create a business portfolio if you don't have one, and a test number will be enabled for you.
2. **Configure your Webhook URL**: `https://yourdomain.com/`
3. **Set Verify Token**: Use the same token as in your `.env` file
4. **Subscribe to Events**: Enable `calls` webhook field
5. **Get Access Token for a System User in your Business Portfolio page**: Add to `WHATSAPP_TOKEN` in `.env`

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VERIFY_TOKEN` | Webhook verification token | Yes |
| `WHATSAPP_TOKEN` | WhatsApp Business API access token | Yes |
| `WHATSAPP_API_URL` | WhatsApp Graph API base URL | No (default: v24.0) |
| `PORT` | Server port | No (default: 3000) |

## Usage

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

The application will be available at:
- **Webhook endpoint**: `http://localhost:3000/`
- **Web client**: `http://localhost:3000/`

## API Endpoints

### GET /
- **Webhook Verification**: Handles WhatsApp webhook verification
- **Web Client**: Serves the browser-based call interface

### POST /
- **Webhook Handler**: Receives WhatsApp call events
- **Supported Events**:
  - `connect`: Incoming call notification
  - `terminate`: Call termination notification

## WebSocket Events

### Client → Server

```json
{
  "type": "call_response",
  "action": "pre_accept|accept|terminate",
  "callId": "call_id",
  "phoneNumberId": "phone_number_id",
  "sdp": "webrtc_session_description"
}
```

### Server → Client

**Incoming Call:**
```json
{
  "type": "incoming_call",
  "callId": "call_id",
  "phoneNumberId": "phone_number_id",
  "from": "caller_number",
  "to": "recipient_number",
  "sdp": "webrtc_offer",
  "timestamp": "iso_timestamp"
}
```

**Call Terminated:**
```json
{
  "type": "call_terminated",
  "callId": "call_id",
  "direction": "inbound|outbound",
  "status": "completed|failed",
  "duration": "call_duration_seconds"
}
```

## Call Flow

1. **Incoming Call**: WhatsApp sends webhook with call event & SDP Offer
2. **WebSocket Broadcast**: Server notifies connected web clients
3. **User Action**: Web client user accepts/rejects the call
4. **WebRTC Setup**: Browser establishes peer connection with SDP Answer
5. **Call Response**: Server sends pre_accept/accept to WhatsApp API
6. **Voice Connection**: Real-time audio communication via WebRTC
7. **Call End**: Either party terminates, webhook notifies termination

## File Structure

```
whatsapp-webrtc-application/
├── app.js                 # Main server application
├── package.json           # Dependencies and scripts
├── .env.example          # Environment variables template
├── public/
│   └── index.html        # Web client interface
└── README.md             # This documentation
```

## Dependencies

### Production
- **express**: Web framework for webhook handling
- **ws**: WebSocket library for real-time communication
- **axios**: HTTP client for WhatsApp API calls

### Development
- **nodemon**: Development server with auto-restart