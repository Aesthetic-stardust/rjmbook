/*
  RJMBook Chatbot Widget
  Client-side chat interface with real-time messaging and room recommendations
*/

class ChatbotWidget {
  constructor(options = {}) {
    this.apiEndpoint = options.apiEndpoint || "/api/chatbot/message";
    this.containerId = options.containerId || "chatbot-container";
    this.isOpen = false;
    this.messages = [];
    this.userId = this.generateUserId();
    this.init();
  }

  init() {
    this.createWidgetHTML();
    this.attachEventListeners();
    this.showWelcomeMessage();
  }

  generateUserId() {
    let userId = localStorage.getItem("chatbot_user_id");
    if (!userId) {
      userId = "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem("chatbot_user_id", userId);
    }
    return userId;
  }

  createWidgetHTML() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`Container with id "${this.containerId}" not found`);
      return;
    }

    container.innerHTML = `
      <div class="chatbot-widget">
        <!-- Chat Button (Float) -->
        <button class="chatbot-toggle" aria-label="Open chat">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span class="notification-badge" style="display: none;">1</span>
        </button>

        <!-- Chat Window -->
        <div class="chatbot-window" style="display: none;">
          <!-- Header -->
          <div class="chatbot-header">
            <div class="header-content">
              <h3>🏖️ RJM Beach Resort Chat</h3>
              <p class="status">Your personal booking assistant</p>
            </div>
            <button class="chatbot-close" aria-label="Close chat">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Messages Container -->
          <div class="chatbot-messages">
            <div class="messages-list"></div>
          </div>

          <!-- Input Area -->
          <div class="chatbot-input-area">
            <form class="chatbot-form">
              <input
                type="text"
                class="chatbot-input"
                placeholder="Type 'recommend' or 'check my booking'..."
                autocomplete="off"
              />
              <button type="submit" class="chatbot-send" aria-label="Send message">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </form>
            <div class="chatbot-quick-actions">
              <button type="button" class="quick-action" data-message="recommend">Find a Room</button>
              <button type="button" class="quick-action" data-message="Show me the prices">Pricing</button>
              <button type="button" class="quick-action" data-message="Book a cottage">Book Now</button>
              <button type="button" class="quick-action" data-message="check my booking">Check Booking</button>
            </div>
          </div>

          <!-- Powered by note -->
          <div class="chatbot-footer">
            Powered by RJM Beach Resort AI
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    const toggleBtn = document.querySelector(".chatbot-toggle");
    const closeBtn = document.querySelector(".chatbot-close");
    const form = document.querySelector(".chatbot-form");
    const quickActions = document.querySelectorAll(".quick-action");

    toggleBtn?.addEventListener("click", () => this.toggleChat());
    closeBtn?.addEventListener("click", () => this.closeChat());
    form?.addEventListener("submit", (e) => this.handleFormSubmit(e));

    quickActions.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const message = btn.getAttribute("data-message");
        this.sendMessage(message);
      });
    });

    // Attach keyboard shortcut (Alt+C)
    document.addEventListener("keydown", (e) => {
      if (e.altKey && e.key === "c") {
        e.preventDefault();
        this.toggleChat();
      }
    });
  }

  toggleChat() {
    this.isOpen ? this.closeChat() : this.openChat();
  }

  openChat() {
    const chatWindow = document.querySelector(".chatbot-window");
    const toggleBtn = document.querySelector(".chatbot-toggle");

    chatWindow.style.display = "flex";
    toggleBtn.classList.add("active");
    this.isOpen = true;

    // Hide notification badge
    const badge = document.querySelector(".notification-badge");
    if (badge) badge.style.display = "none";

    // Focus input
    setTimeout(() => {
      document.querySelector(".chatbot-input")?.focus();
    }, 100);
  }

  closeChat() {
    const chatWindow = document.querySelector(".chatbot-window");
    const toggleBtn = document.querySelector(".chatbot-toggle");

    chatWindow.style.display = "none";
    toggleBtn.classList.remove("active");
    this.isOpen = false;
  }

  handleFormSubmit(e) {
    e.preventDefault();
    const input = document.querySelector(".chatbot-input");
    const message = input.value.trim();

    if (message) {
      this.sendMessage(message);
      input.value = "";
    }
  }

  async sendMessage(message) {
    // Add user message to UI
    this.addMessageToUI(message, "user");

    // Show typing indicator
    this.showTypingIndicator();

    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message,
          userId: this.userId,
        }),
      });

      // Remove typing indicator
      this.removeTypingIndicator();

      if (response.ok) {
        const data = await response.json();
        this.addMessageToUI(data.message, "bot");
      } else {
        this.addMessageToUI(
          "Sorry, I couldn't process your message. Please try again.",
          "bot"
        );
      }
    } catch (error) {
      console.error("Chat error:", error);
      this.removeTypingIndicator();
      this.addMessageToUI(
        "Connection error. Please check your internet and try again.",
        "bot"
      );
    }
  }

  addMessageToUI(message, sender) {
    const messagesList = document.querySelector(".messages-list");
    const messageEl = document.createElement("div");
    messageEl.className = `message message-${sender}`;

    const contentEl = document.createElement("div");
    contentEl.className = "message-content";
    
    // Parse markdown-style formatting
    const formattedMessage = this.formatMessage(message);
    contentEl.innerHTML = formattedMessage;

    messageEl.appendChild(contentEl);
    messagesList.appendChild(messageEl);

    // Scroll to bottom
    const messagesContainer = document.querySelector(".chatbot-messages");
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Store message
    this.messages.push({ sender, message, timestamp: new Date() });
  }

  // Format message with basic markdown support
  formatMessage(message) {
    // Escape HTML first
    let formatted = message
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Bold text **text**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
  }

  showTypingIndicator() {
    const messagesList = document.querySelector(".messages-list");
    const typingEl = document.createElement("div");
    typingEl.className = "message message-bot typing-indicator";
    typingEl.innerHTML = `
      <div class="message-content">
        <span></span><span></span><span></span>
      </div>
    `;
    typingEl.id = "typing-indicator";
    messagesList.appendChild(typingEl);

    const messagesContainer = document.querySelector(".chatbot-messages");
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  removeTypingIndicator() {
    const typingEl = document.getElementById("typing-indicator");
    if (typingEl) {
      typingEl.remove();
    }
  }

  showWelcomeMessage() {
    // Delay welcome message to appear naturally
    setTimeout(() => {
      this.addMessageToUI(
        "👋 Hello! I'm the RJM Beach Resort Chat Assistant. I can help you find the perfect room for your stay!\n\nType **'recommend'** for personalized room suggestions, or **'check my booking'** to look up your reservation status.",
        "bot"
      );
    }, 500);
  }

  // Export chat history
  exportChat() {
    return JSON.stringify(this.messages, null, 2);
  }

  // Clear chat history
  clearChat() {
    const messagesList = document.querySelector(".messages-list");
    messagesList.innerHTML = "";
    this.messages = [];
    this.showWelcomeMessage();
  }
}

// Initialize chatbot when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.chatbot = new ChatbotWidget({
      containerId: "chatbot-container",
      apiEndpoint: "/api/chatbot/message"
    });
  });
} else {
  window.chatbot = new ChatbotWidget({
    containerId: "chatbot-container",
    apiEndpoint: "/api/chatbot/message"
  });
}
