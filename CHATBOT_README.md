# RJMBook Chatbot Documentation

## Overview

The RJMBook Chatbot is a client-side chat widget that provides instant customer support for your resort booking application. It offers intelligent responses about rooms, pricing, bookings, services, and general hotel information.

## Features

- **Floating Chat Widget**: Appears in the bottom-right corner of your website
- **Intelligent Response System**: Context-aware responses based on keywords
- **Mobile Responsive**: Works perfectly on all device sizes
- **User Session Tracking**: Tracks conversations per user
- **Quick Action Buttons**: Pre-defined questions for common inquiries
- **Typing Indicator**: Shows when bot is "thinking"
- **Persistent Storage**: Stores user ID in localStorage for continuity
- **Keyboard Shortcut**: Press `Alt+C` to toggle chat

## Installation

The chatbot is already integrated into your RJMBook application. To use it:

### 1. Backend Setup
The chatbot controller and routes are already configured:
- Controller: `controllers/chatbotController.js`
- Routes: `routes/chatbot.js`
- API Endpoint: `POST /api/chatbot/message`

### 2. Frontend Setup
The chatbot widget is included via the partial:
- JavaScript: `public/js/chatbot.js`
- CSS: `public/css/chatbot.css`
- Partial: `views/partials/chatbot.xian`

### 3. Include in Views
Add the chatbot partial to any page:
```handlebars
{{> chatbot }}
```

This single line includes:
- The chat widget container
- CSS stylesheet
- JavaScript functionality

## How It Works

### Client-Side (Frontend)

**JavaScript Class**: `ChatbotWidget`

The widget initializes automatically and provides:
- **UI Management**: Opens/closes chat window
- **Message Handling**: Sends user messages to backend
- **Real-time Updates**: Displays bot responses instantly
- **Local Storage**: Maintains user session ID

**Key Methods**:
- `openChat()`: Opens the chat window
- `closeChat()`: Closes the chat window
- `sendMessage(message)`: Sends a message to the bot
- `addMessageToUI(message, sender)`: Displays message in chat
- `clearChat()`: Clears all messages

### Server-Side (Backend)

**Controller**: `chatbotController.js`

**Endpoint**: `POST /api/chatbot/message`

**Request Body**:
```json
{
  "message": "user's question",
  "userId": "unique user identifier"
}
```

**Response**:
```json
{
  "success": true,
  "message": "bot's response",
  "timestamp": "2026-05-04T10:00:00.000Z"
}
```

### Response Generation

The bot uses keyword matching to identify user intent and provide relevant responses. Categories include:

1. **Greetings**: "hello", "hi", "hey"
2. **Rooms & Cottages**: "room", "cottage", "accommodation"
3. **Pricing**: "price", "cost", "rate", "how much"
4. **Bookings**: "book", "reserve", "booking"
5. **Services**: "service", "facility", "amenities"
6. **Location**: "location", "where", "address"
7. **Contact**: "contact", "phone", "email", "call"
8. **FAQs**: Check-in times, WiFi, parking, pets, events

## Customization

### 1. Update Hotel Information

Edit `controllers/chatbotController.js` to update:

```javascript
// Location information
if (message.includes("location")) {
  return "📍 [Your updated location information]";
}

// Contact information
if (message.includes("contact")) {
  return "📞 Phone: [Your number]\nEmail: [Your email]";
}
```

### 2. Add Custom Responses

Add new keyword patterns in the `generateResponse()` function:

```javascript
// Example: Custom response for your resort name
if (message.includes("naruwan") || message.includes("resort")) {
  return "Welcome to Naruwan Resort! How can I help you today?";
}
```

### 3. Customize Styling

Edit `public/css/chatbot.css` to change:
- Colors: Update gradient colors (e.g., `#0891b2`)
- Size: Adjust widget dimensions
- Position: Change `bottom: 20px; right: 20px;` for different placement
- Fonts: Modify font families and sizes

Example color customization:

```css
.chatbot-toggle {
  background: linear-gradient(135deg, #YOUR_COLOR1 0%, #YOUR_COLOR2 100%);
}

.message-user .message-content {
  background: linear-gradient(135deg, #YOUR_COLOR1 0%, #YOUR_COLOR2 100%);
}
```

### 4. Modify Quick Actions

Edit the quick action buttons in `public/js/chatbot.js`:

```html
<div class="chatbot-quick-actions">
  <button type="button" class="quick-action" data-message="Your custom message">Your Button</button>
</div>
```

### 5. Change Widget Position

In `public/css/chatbot.css`, adjust:

```css
.chatbot-widget {
  bottom: 20px;  /* Distance from bottom */
  right: 20px;   /* Distance from right */
  /* Use 'left' instead of 'right' to position on left side */
}
```

## Integration with Database

Currently, the chatbot provides static responses. To enhance it with dynamic data:

### Example: Show Available Rooms

```javascript
// In chatbotController.js
if (message.includes("available")) {
  const rooms = await Room.findAll({ where: { isAvailable: true } });
  return `We have ${rooms.length} available rooms. ${rooms.map(r => r.name).join(', ')}`;
}
```

### Example: Check Booking Status

```javascript
if (message.includes("booking") || message.includes("reservation")) {
  if (userId) {
    const bookings = await Booking.findAll({ where: { guestId: userId } });
    // Return booking information
  }
}
```

## Advanced Features

### 1. Store Conversation History

Modify the controller to save messages:

```javascript
// In sendMessage() function
await ChatMessage.create({
  userId,
  message,
  response: botResponse,
  timestamp: new Date()
});
```

### 2. Sentiment Analysis

Add emotion detection to provide better responses:

```javascript
const sentiment = analyseSentiment(message); // Use npm library
if (sentiment.score < -0.5) {
  return "😟 I'm sorry to hear that. How can I help improve your experience?";
}
```

### 3. Integration with AI Services

Connect to external AI providers:

```javascript
const openAI = require('openai');
const response = await openAI.createCompletion({
  prompt: `You are a helpful resort chatbot. User: ${message}`,
  // ... other options
});
```

## Troubleshooting

### Chatbot Not Appearing

1. Check that `views/partials/chatbot.xian` is included in your view
2. Verify files exist:
   - `public/js/chatbot.js`
   - `public/css/chatbot.css`
3. Check browser console for errors (F12)

### Messages Not Being Sent

1. Verify the API endpoint: `/api/chatbot/message`
2. Check Network tab in DevTools (F12)
3. Ensure Express server is running
4. Verify `routes/chatbot.js` is properly imported in `routes/index.js`

### Styling Issues

1. Clear browser cache (Ctrl+Shift+Del)
2. Verify CSS file loaded (check Network tab)
3. Ensure Tailwind CSS is configured globally

## Database Integration Example

To enhance the chatbot with real data:

```javascript
// In controllers/chatbotController.js

async function generateResponse(message, userId) {
  // Get room count from database
  const roomCount = await Room.count();
  const serviceCount = await Service.count();
  
  if (message.includes("room")) {
    return `We have ${roomCount} beautiful cottages. Would you like to book one?`;
  }
  
  if (message.includes("service")) {
    return `We offer ${serviceCount} premium services. Which interests you?`;
  }
}
```

## Performance Tips

1. **Cache Responses**: Store common responses in Redis for faster retrieval
2. **Lazy Load**: Only load chatbot script on pages that need it
3. **Optimize Images**: Compress images for bot responses
4. **Rate Limiting**: Limit messages to prevent abuse

## Security Considerations

1. **Input Validation**: Sanitize user input before processing
2. **Rate Limiting**: Implement request throttling
3. **Authentication**: For personalized responses, verify user identity
4. **CORS**: Ensure proper CORS headers if calling external APIs

## API Reference

### POST /api/chatbot/message

Send a message to the chatbot.

**Request**:
```bash
curl -X POST http://localhost:3000/api/chatbot/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are your room prices?",
    "userId": "user_123"
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "💰 Our rates vary by room type and season...",
  "timestamp": "2026-05-04T10:00:00.000Z"
}
```

### GET /api/chatbot/history

Retrieve chat history for a user.

**Request**:
```bash
curl http://localhost:3000/api/chatbot/history
```

**Response**:
```json
{
  "success": true,
  "message": "Chat history retrieved",
  "history": []
}
```

## Support

For issues or questions:
1. Check this documentation
2. Review the code comments
3. Check browser console (F12) for errors
4. Review Network tab for API calls

## Intelligent Room Recommendations

The chatbot now features a conversational room recommendation system that guides guests to the perfect accommodation.

### How It Works

1. **User initiates**: Type "recommend", "suggest", or "find me a room"
2. **Chatbot asks**: Group size (number of guests)
3. **Chatbot asks**: Stay type (day/night/flexible)
4. **Chatbot asks**: Budget range
5. **Chatbot recommends**: Top 3 matching rooms with details

### Example Conversation

```
User: recommend
Bot: 🏠 I'd love to help you find the perfect accommodation! 
     How many guests will be staying?

User: 5 guests
Bot: Great! 5 guests noted. When are you planning to stay?
     • Type "day" for daytime (8AM - 5PM)
     • Type "night" for overnight (24 hours)
     • Type "flexible" if either works

User: night
Bot: Overnight stay! What's your budget range?

User: 5000
Bot: 🎯 Top Recommendations for You
     📋 Your preferences: 5 guests | Budget: ₱5,000 | Night trip
     
     ⭐ 1. Family Hut (Best Match!)
        📌 Cottage • Up to 6 guests
        💰 ₱4,500 (Night rate)
        ✓ Within budget | ✓ Comfortable for 5 guests
        🎁 Amenities: Air conditioning, Private bathroom, Kitchenette
```

### Recommendation Algorithm

The recommendation engine scores rooms based on:

1. **Budget Match** (30 points if within budget, -20 if over)
2. **Capacity Match** (30 points if fits guests, -50 if too small)
3. **Preference Bonuses** for optimal fit

Rooms are ranked by score and top 3 are displayed with:
- Room name and category
- Capacity and pricing
- Match indicators (✓ fits criteria, ⚠ slight mismatch, ✗ doesn't fit)
- Available amenities

### Resetting Conversation

Users can type "restart", "reset", or "start over" to begin a new recommendation session.

## Future Enhancements

- [x] Intelligent room recommendations
- [ ] Multi-language support
- [ ] Machine learning for improved responses
- [ ] Integration with external AI APIs
- [ ] Voice input/output
- [ ] Admin dashboard for analytics
- [ ] Custom training data
- [ ] Integration with CRM systems
- [ ] Real agent escalation

---

**Last Updated**: May 13, 2026
**Version**: 2.0.0
