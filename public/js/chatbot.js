/*
  RJMBook Chatbot Widget
  Modern Resort Concierge UI (Powered by Google Gemini AI)
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
        <!-- Floating Teaser Bubble -->
        <div class="chatbot-teaser" id="chatbot-teaser" style="display: none;">
          <div class="teaser-text">
            <strong>RJM Concierge</strong>
            <span>👋 Need help booking or have questions? Chat with our AI!</span>
          </div>
          <button type="button" class="teaser-close" aria-label="Dismiss">&times;</button>
        </div>

        <!-- Float Trigger Button -->
        <button class="chatbot-toggle" aria-label="Open resort concierge chat" title="Chat with RJM Concierge">
          <div class="toggle-icon-chat">
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              <path d="M12 7v.01"></path>
              <path d="M8 11v.01"></path>
              <path d="M16 11v.01"></path>
            </svg>
          </div>
          <div class="toggle-icon-close">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
          <span class="online-indicator-dot" title="Online"></span>
        </button>

        <!-- Chat Window -->
        <div class="chatbot-window" style="display: none;">
          <!-- Header -->
          <div class="chatbot-header">
            <div class="header-left">
              <div class="resort-avatar-wrap">
                <img src="/rjmlogo.jpg" alt="RJM Beach Resort" class="resort-avatar" onerror="this.src='/imgs/rjmlogo.jpg'">
                <span class="avatar-status-dot"></span>
              </div>
              <div class="header-titles">
                <h3 class="resort-title">RJM AI Concierge</h3>
                <p class="resort-status">
                  <span class="status-pulse"></span>
                  Online • Powered by Gemini AI
                </p>
              </div>
            </div>
            <div class="header-actions">
              <button type="button" class="chatbot-action-btn chatbot-fullscreen-btn" title="Toggle full screen" aria-label="Toggle full screen">
                <svg class="icon-expand" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <polyline points="9 21 3 21 3 15"></polyline>
                  <line x1="21" y1="3" x2="14" y2="10"></line>
                  <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
                <svg class="icon-minimize" style="display: none;" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="4 14 10 14 10 20"></polyline>
                  <polyline points="20 10 14 10 14 4"></polyline>
                  <line x1="14" y1="10" x2="21" y2="3"></line>
                  <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
              </button>
              <button type="button" class="chatbot-action-btn chatbot-restart-btn" title="Restart conversation / Start over" aria-label="Restart chat">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
              </button>
              <button type="button" class="chatbot-action-btn chatbot-close-btn" title="Close chat" aria-label="Close chat">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          <!-- Messages Container -->
          <div class="chatbot-messages">
            <div class="messages-list"></div>
          </div>

          <!-- Quick Action Chips -->
          <div class="chatbot-quick-actions">
            <button type="button" class="quick-chip" data-message="recommend">
              <span>🏠</span> Find a Room
            </button>
            <button type="button" class="quick-chip" data-message="Magkano ang rates ng rooms at cottages?">
              <span>💰</span> Rates & Pricing
            </button>
            <button type="button" class="quick-chip" data-message="May available bang cottage para sa 10 tao?">
              <span>🏖️</span> Cottages
            </button>
            <button type="button" class="quick-chip" data-message="check my booking">
              <span>🔍</span> Track Booking
            </button>
            <button type="button" class="quick-chip" data-message="What are your standard check-in times and amenities?">
              <span>🔑</span> Check-in & Policies
            </button>
          </div>

          <!-- Input Area -->
          <div class="chatbot-input-area">
            <form class="chatbot-form">
              <input
                type="text"
                class="chatbot-input"
                placeholder="Ask in English or Tagalog..."
                autocomplete="off"
                maxlength="1000"
              />
              <button type="submit" class="chatbot-send" aria-label="Send message" title="Send">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </form>
            <div class="chatbot-footer-caption">
              RJM Beach Resort • Bansud, Oriental Mindoro
            </div>
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    const toggleBtn = document.querySelector(".chatbot-toggle");
    const closeBtn = document.querySelector(".chatbot-close-btn");
    const fullscreenBtn = document.querySelector(".chatbot-fullscreen-btn");
    const restartBtn = document.querySelector(".chatbot-restart-btn");
    const form = document.querySelector(".chatbot-form");
    const quickChips = document.querySelectorAll(".quick-chip");
    const teaser = document.getElementById("chatbot-teaser");
    const teaserClose = document.querySelector(".teaser-close");

    toggleBtn?.addEventListener("click", () => this.toggleChat());
    closeBtn?.addEventListener("click", () => this.closeChat());
    fullscreenBtn?.addEventListener("click", () => this.toggleFullscreen());
    restartBtn?.addEventListener("click", () => this.restartConversation());
    form?.addEventListener("submit", (e) => this.handleFormSubmit(e));

    teaserClose?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (teaser) teaser.style.display = "none";
      sessionStorage.setItem("chatbot_teaser_dismissed", "true");
    });

    quickChips.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const msg = btn.getAttribute("data-message");
        if (msg) this.sendMessage(msg);
      });
    });

    // Show friendly teaser after 3 seconds if not dismissed
    if (!sessionStorage.getItem("chatbot_teaser_dismissed")) {
      setTimeout(() => {
        if (!this.isOpen && teaser) {
          teaser.style.display = "flex";
        }
      }, 3000);
    }

    // Keyboard shortcut (Alt+C)
    document.addEventListener("keydown", (e) => {
      if (e.altKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        this.toggleChat();
      }
    });
  }

  toggleChat() {
    this.isOpen ? this.closeChat() : this.openChat();
  }

  toggleFullscreen() {
    const chatWindow = document.querySelector(".chatbot-window");
    const btn = document.querySelector(".chatbot-fullscreen-btn");
    if (!chatWindow || !btn) return;

    const isFullscreen = chatWindow.classList.toggle("fullscreen");
    const expandIcon = btn.querySelector(".icon-expand");
    const minimizeIcon = btn.querySelector(".icon-minimize");

    if (expandIcon) expandIcon.style.display = isFullscreen ? "none" : "block";
    if (minimizeIcon) minimizeIcon.style.display = isFullscreen ? "block" : "none";
    btn.title = isFullscreen ? "Exit full screen" : "Full screen";
    btn.setAttribute("aria-label", btn.title);
  }

  openChat() {
    const chatWindow = document.querySelector(".chatbot-window");
    const toggleBtn = document.querySelector(".chatbot-toggle");
    const teaser = document.getElementById("chatbot-teaser");

    if (teaser) teaser.style.display = "none";

    chatWindow.style.display = "flex";
    toggleBtn.classList.add("active");
    this.isOpen = true;

    // Scroll to bottom
    const messagesContainer = document.querySelector(".chatbot-messages");
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    setTimeout(() => {
      document.querySelector(".chatbot-input")?.focus();
    }, 150);
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

      this.removeTypingIndicator();

      if (response.ok) {
        const data = await response.json();
        this.addMessageToUI(data.message, "bot");
      } else {
        this.addMessageToUI(
          "Paumanhin, nagkaroon po ng problema sa pagsagot. Pakisubukang muli o mag-message sa aming staff sa +63 919 378 9570.",
          "bot"
        );
      }
    } catch (error) {
      console.error("Chat error:", error);
      this.removeTypingIndicator();
      this.addMessageToUI(
        "Connection error. Please check your internet connection and try again.",
        "bot"
      );
    }
  }

  addMessageToUI(message, sender) {
    const messagesList = document.querySelector(".messages-list");
    if (!messagesList) return;

    const messageEl = document.createElement("div");
    messageEl.className = `message message-${sender}`;

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (sender === "bot") {
      messageEl.innerHTML = `
        <div class="message-avatar">
          <img src="/rjmlogo.jpg" alt="RJM AI" onerror="this.src='/imgs/rjmlogo.jpg'">
        </div>
        <div class="message-bubble-wrap">
          <div class="message-content">${this.formatMessage(message)}</div>
          <span class="message-time">${timeStr}</span>
        </div>
      `;
    } else {
      messageEl.innerHTML = `
        <div class="message-bubble-wrap">
          <div class="message-content">${this.formatMessage(message)}</div>
          <span class="message-time">${timeStr}</span>
        </div>
      `;
    }

    messagesList.appendChild(messageEl);

    // Scroll to bottom smoothly
    const messagesContainer = document.querySelector(".chatbot-messages");
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    this.messages.push({ sender, message, timestamp: new Date() });
  }

  formatMessage(message) {
    if (!message) return "";

    // Escape raw HTML
    let formatted = message
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Convert markdown headings (### Title) to bold text
    formatted = formatted.replace(/^#{1,6}\s+(.+)$/gm, "<strong>$1</strong>");

    // Convert bullets
    formatted = formatted.replace(/^[-*]\s+/gm, "• ");

    // Bold text **text**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Format resort booking paths into clickable action buttons/links
    formatted = formatted.replace(
      /\/bookings\/book\b/g,
      '<a href="/bookings/book" class="chat-inline-link"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg> Book Online Now</a>'
    );
    formatted = formatted.replace(
      /\/rooms\b/g,
      '<a href="/rooms" class="chat-inline-link">View Rooms</a>'
    );
    formatted = formatted.replace(
      /\/cottages\b/g,
      '<a href="/cottages" class="chat-inline-link">View Cottages</a>'
    );
    formatted = formatted.replace(
      /\/services\b/g,
      '<a href="/services" class="chat-inline-link">View Services</a>'
    );
    formatted = formatted.replace(
      /\/login\b/g,
      '<a href="/login" class="chat-inline-link">Sign In</a>'
    );

    // Format phone numbers
    formatted = formatted.replace(
      /\+63\s*919\s*378\s*9570/g,
      '<a href="tel:+639193789570" class="chat-contact-link">+63 919 378 9570</a>'
    );

    // Format emails
    formatted = formatted.replace(
      /rjm\.beachresortph@gmail\.com/g,
      '<a href="mailto:rjm.beachresortph@gmail.com" class="chat-contact-link">rjm.beachresortph@gmail.com</a>'
    );

    // Line breaks
    formatted = formatted.replace(/\n/g, "<br>");

    return formatted;
  }

  showTypingIndicator() {
    const messagesList = document.querySelector(".messages-list");
    if (!messagesList) return;

    this.removeTypingIndicator();

    const typingEl = document.createElement("div");
    typingEl.className = "message message-bot typing-indicator-wrap";
    typingEl.id = "typing-indicator";
    typingEl.innerHTML = `
      <div class="message-avatar">
        <img src="/rjmlogo.jpg" alt="RJM AI" onerror="this.src='/imgs/rjmlogo.jpg'">
      </div>
      <div class="message-bubble-wrap">
        <div class="message-content typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    messagesList.appendChild(typingEl);

    const messagesContainer = document.querySelector(".chatbot-messages");
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  removeTypingIndicator() {
    const typingEl = document.getElementById("typing-indicator");
    if (typingEl) typingEl.remove();
  }

  showWelcomeMessage() {
    setTimeout(() => {
      this.addMessageToUI(
        "👋 **Mabuhay! Welcome to RJM Beach Resort!**\n\nAko ang inyong personal AI Concierge. Puwede niyo akong tanungin tungkol sa:\n• **Rooms & Cottages** (rates at availability)\n• **Pool fees at Entrance rates**\n• **Check-in time at Resort amenities**\n• O i-type ang **'check my booking'** para i-track ang inyong reservation!\n\nAno po ang maitutulong ko sa inyo ngayong araw?",
        "bot"
      );
    }, 400);
  }

  restartConversation() {
    this.sendMessage("start over");
  }

  clearChat() {
    const messagesList = document.querySelector(".messages-list");
    if (messagesList) messagesList.innerHTML = "";
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
