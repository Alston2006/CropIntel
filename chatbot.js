/**
 * CropIntel Chatbot - Frontend JavaScript
 * Real-time chat interface with RAG-powered market intelligence
 */

(() => {
    "use strict";

    // ─────────────────────────────────────────────
    // Configuration & State
    // ─────────────────────────────────────────────

    const API_BASE = "http://localhost:8000";
    const CHAT_API = `${API_BASE}/api/chat`;
    const HISTORY_API = `${API_BASE}/api/chat/history`;
    const CLEAR_API = `${API_BASE}/api/chat/clear`;

    // DOM Elements
    const $chatMessages = document.getElementById("chatMessages");
    const $chatInput = document.getElementById("chatInput");
    const $btnSend = document.getElementById("btnSend");
    const $typingIndicator = document.getElementById("typingIndicator");
    const $statusIndicator = document.querySelector(".status-indicator");
    const $statusText = document.querySelector(".status-text");
    const $errorMessage = document.getElementById("errorMessage");
    const $btnClearHistory = document.getElementById("btnClearHistory");
    const $chatContainer = document.querySelector(".chat-container");
    const $inputSuggestions = document.getElementById("inputSuggestions");

    // State
    let isLoading = false;
    let messageCount = 0;
    const MAX_MESSAGE_LENGTH = 500;
    const DEBOUNCE_DELAY = 300;

    // ─────────────────────────────────────────────
    // Utility Functions
    // ─────────────────────────────────────────────

    function setStatus(text, isError = false) {
        $statusText.textContent = text;
        $statusIndicator.classList.toggle("error", isError);
    }

    function showError(message, duration = 5000) {
        $errorMessage.textContent = message;
        $errorMessage.style.display = "block";
        $errorMessage.classList.remove("success");

        setTimeout(() => {
            $errorMessage.style.display = "none";
        }, duration);
    }

    function showSuccess(message, duration = 3000) {
        $errorMessage.textContent = message;
        $errorMessage.style.display = "block";
        $errorMessage.classList.add("success");

        setTimeout(() => {
            $errorMessage.style.display = "none";
        }, duration);
    }

    function debounce(func, delay) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    }

    function formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        });
    }

    function escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    // ─────────────────────────────────────────────
    // Message Display Functions
    // ─────────────────────────────────────────────

    function createMessageElement(role, content, context = null) {
        const container = document.createElement("div");
        container.className = `message-container ${role}`;

        const messageDiv = document.createElement("div");
        messageDiv.className = "message";

        const iconSpan = document.createElement("div");
        iconSpan.className = "message-icon";
        iconSpan.textContent = role === "user" ? "👨‍🌾" : "🌾";

        const contentDiv = document.createElement("div");
        contentDiv.className = "message-content";

        // Parse content for better formatting
        const formattedContent = formatMessageContent(content);
        contentDiv.innerHTML = formattedContent;

        // Add context badge if provided
        if (context) {
            const badge = document.createElement("div");
            badge.className = "context-badge";
            badge.textContent = `📊 Data points: ${context.data_points || 0}`;
            contentDiv.appendChild(badge);
        }

        messageDiv.appendChild(iconSpan);
        messageDiv.appendChild(contentDiv);
        container.appendChild(messageDiv);

        return container;
    }

    function formatMessageContent(text) {
        // Escape HTML first
        text = escapeHtml(text);

        // Convert markdown-like formatting
        text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        text = text.replace(/\*(.*?)\*/g, "<em>$1</em>");

        // Bold rupee amounts
        text = text.replace(/₹([\d,\.]+)/g, "<strong>₹$1</strong>");

        // Convert URLs to links
        text = text.replace(/https?:\/\/[^\s]+/g, '<a href="$&" target="_blank">$&</a>');

        // Convert new lines
        text = text.replace(/\n\n/g, "</p><p>");
        text = text.replace(/\n/g, "<br>");

        if (text.includes("<p>") === false && text.includes("<br>") === false) {
            text = `<p>${text}</p>`;
        }

        return text;
    }

    function scrollToBottom() {
        $chatMessages.scrollTop = $chatMessages.scrollHeight;
    }

    function showTypingIndicator() {
        $typingIndicator.style.display = "flex";
        scrollToBottom();
    }

    function hideTypingIndicator() {
        $typingIndicator.style.display = "none";
    }

    function showSuggestions() {
        if ($chatMessages.children.length === 1) {
            $inputSuggestions.style.display = "block";
        } else {
            $inputSuggestions.style.display = "none";
        }
    }

    // ─────────────────────────────────────────────
    // API Communication
    // ─────────────────────────────────────────────

    async function sendMessage(message) {
        if (!message.trim() || message.length > MAX_MESSAGE_LENGTH) {
            showError(`Message must be 1-${MAX_MESSAGE_LENGTH} characters`);
            return;
        }

        // Show user message
        const userMsg = createMessageElement("user", message);
        $chatMessages.appendChild(userMsg);
        messageCount++;
        scrollToBottom();

        // Update input
        $chatInput.value = "";
        $chatInput.focus();
        showSuggestions();

        isLoading = true;
        $btnSend.disabled = true;
        showTypingIndicator();
        setStatus("Analyzing market data...");

        try {
            const response = await fetch(CHAT_API, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ message }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Hide typing indicator
            hideTypingIndicator();

            // Display AI response
            const assistantMsg = createMessageElement(
                "assistant",
                data.response,
                data.context_used
            );
            $chatMessages.appendChild(assistantMsg);
            messageCount++;

            // Update status
            setStatus(`Ready (${messageCount} messages)`);
            showSuccess("✓ Response generated successfully");

        } catch (error) {
            console.error("[Chat Error]", error);
            hideTypingIndicator();

            let errorText = "Unable to get response. ";
            let statusText = "Error";

            if (error.message.includes("Failed to fetch")) {
                errorText = "Backend server is not running. Please start FastAPI on port 8000: python -m uvicorn price_api:app --reload";
                statusText = "Backend offline";
            } else if (error.message.includes("403")) {
                errorText = "API authentication failed. Check if GEMINI_API_KEY is set correctly.";
                statusText = "Auth error";
            } else if (error.message.includes("429")) {
                errorText = "Rate limit reached (60 requests/minute). Please wait a moment and try again.";
                statusText = "Rate limited";
            } else if (error.message.includes("400")) {
                errorText = "Invalid request. The backend returned a bad request error. Try rephrasing your question.";
                statusText = "Bad request";
            } else {
                errorText += error.message;
                statusText = "Error";
            }

            showError(errorText);
            setStatus(statusText, true);

            // Show detailed troubleshooting message
            const errorMsg = createMessageElement(
                "assistant",
                `⚠️ ${errorText}\n\n📋 Troubleshooting Steps:\n` +
                `1. Check backend is running on http://localhost:8000\n` +
                `2. Verify API key: $env:GEMINI_API_KEY | out-host\n` +
                `3. Check browser console (F12) for details\n` +
                `4. Verify database has data\n` +
                `5. Try again in a moment if rate limited`
            );
            $chatMessages.appendChild(errorMsg);

        } finally {
            isLoading = false;
            $btnSend.disabled = false;
            scrollToBottom();
        }
    }

    async function clearHistory() {
        if (!confirm("Clear all chat history and cache?")) {
            return;
        }

        try {
            const response = await fetch(CLEAR_API, {
                method: "POST"
            });

            if (response.ok) {
                // Clear messages except welcome
                const messages = $chatMessages.querySelectorAll(".message-container");
                messages.forEach((msg, index) => {
                    if (index > 0) {
                        msg.remove();
                    }
                });

                messageCount = 1;
                $chatInput.value = "";
                setStatus("Ready");
                showSuccess("✓ History cleared");
                showSuggestions();
            }
        } catch (error) {
            showError("Failed to clear history: " + error.message);
        }
    }

    async function refreshData() {
        setStatus("Refreshing market data...");
        try {
            const response = await fetch(`${API_BASE}/api/market/refresh`, {
                method: "POST"
            });

            if (response.ok) {
                setStatus("Ready - Data refreshed");
                showSuccess("✓ Market data updated");
            }
        } catch (error) {
            console.error("[Refresh Error]", error);
            showError("Failed to refresh data");
        }
    }

    // ─────────────────────────────────────────────
    // Event Listeners
    // ─────────────────────────────────────────────

    $btnSend.addEventListener("click", () => {
        const message = $chatInput.value.trim();
        if (message && !isLoading) {
            sendMessage(message);
        }
    });

    $chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !e.shiftKey && !isLoading) {
            e.preventDefault();
            const message = $chatInput.value.trim();
            if (message) {
                sendMessage(message);
            }
        }
    });

    $chatInput.addEventListener("keyup", debounce(() => {
        // Show/hide suggestions based on input
        showSuggestions();
    }, DEBOUNCE_DELAY));

    $chatInput.addEventListener("focus", () => {
        showSuggestions();
    });

    $chatInput.addEventListener("blur", () => {
        if ($chatInput.value.trim() === "") {
            setTimeout(() => {
                showSuggestions();
            }, 200);
        }
    });

    // Suggestion buttons
    document.querySelectorAll(".suggestion-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const query = btn.getAttribute("data-query");
            $chatInput.value = query;
            $chatInput.focus();
            sendMessage(query);
        });
    });

    // Clear history button
    $btnClearHistory.addEventListener("click", clearHistory);

    // Refresh button
    const $btnRefresh = document.getElementById("btnRefresh");
    if ($btnRefresh) {
        $btnRefresh.addEventListener("click", refreshData);
    }

    // ─────────────────────────────────────────────
    // Initialization
    // ─────────────────────────────────────────────

    window.addEventListener("load", () => {
        console.log("[CropIntel] Chat interface loaded");
        console.log("[CropIntel] API Base:", API_BASE);

        // Show initial suggestions
        showSuggestions();

        // Focus input
        $chatInput.focus();

        // Check backend connectivity
        setTimeout(async () => {
            try {
                const response = await fetch(`${API_BASE}/health`, {
                    method: "GET"
                });

                if (response.ok) {
                    const health = await response.json();
                    console.log("[CropIntel] Backend health:", health);
                    
                    if (health.ollama_status === "model_missing") {
                        setStatus("⚠️ Model not found", true);
                        showError("[WARN] Ollama model not found. Please run: ollama pull " + health.ollama_model);
                    } else if (health.ollama_status === "disconnected") {
                        setStatus("⚠️ Ollama offline", true);
                        showError("[WARN] Ollama server is not running. Please start Ollama or run 'ollama serve' in a new terminal.");
                    } else if (health.database_records === 0) {
                        setStatus("Ready (no data)", true);
                        showError("[WARN] No market data found. Run market_engine.py to populate the database.");
                    } else if (health.ollama_status === "ready") {
                        setStatus(`Ready (${health.database_records} records)`);
                        console.log("[CropIntel] System ready with Ollama + Market Data");
                    } else {
                        setStatus(`Connected (${health.database_records} records)`);
                    }
                } else {
                    setStatus("Backend error", true);
                    showError("Backend server returned an error: " + response.status);
                }
            } catch (error) {
                setStatus("Backend offline", true);
                console.warn("[CropIntel] Backend connection failed:", error.message);
                showError(
                    "[ERROR] Cannot connect to backend server.\n\n" +
                    "Please start FastAPI:\n" +
                    "python -m uvicorn price_api:app --reload --port 8000\n\n" +
                    `Backend URL: ${API_BASE}`
                );
            }
        }, 500);
    });

    // Prevent accidental page navigation
    window.addEventListener("beforeunload", (e) => {
        if (messageCount > 5) {
            e.preventDefault();
            e.returnValue = "";
        }
    });

    // Export functions for console access
    window.CropIntel = {
        sendMessage,
        clearHistory,
        refreshData,
        setStatus,
        showError,
        showSuccess
    };

    console.log("[CropIntel] Chatbot initialized. Type: CropIntel.sendMessage('Your question')");

})();
