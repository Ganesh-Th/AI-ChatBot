import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../contexts/AuthContext';
import {
  createChat,
  listChats,
  getMessages,
  sendMessage,
  deleteChat,
} from '../api';
import './ChatPage.css';

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="message assistant typing-indicator-wrap">
      <div className="msg-avatar assistant-avatar">G</div>
      <div className="msg-bubble assistant-bubble">
        <div className="typing-dots">
          <span /><span /><span />
        </div>
      </div>
    </div>
  );
}

// ── Single message ────────────────────────────────────────────────────────────
function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`message ${isUser ? 'user' : 'assistant'}`}>
      {!isUser && <div className="msg-avatar assistant-avatar">G</div>}
      <div className={`msg-bubble ${isUser ? 'user-bubble' : 'assistant-bubble'}`}>
        {isUser ? (
          <p>{msg.content}</p>
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
        )}
      </div>
      {isUser && <div className="msg-avatar user-avatar">U</div>}
    </div>
  );
}

// ── Main ChatPage ─────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(scrollToBottom, [messages, sending, scrollToBottom]);

  // Load chat list
  const fetchChats = useCallback(async () => {
    try {
      const data = await listChats();
      setChats(data);
    } catch (_) {
      /* handled by interceptor */
    }
  }, []);

  useEffect(() => {
    fetchChats().finally(() => setLoadingChats(false));
  }, [fetchChats]);

  // Load messages when active chat changes
  useEffect(() => {
    if (!activeChatId) { setMessages([]); return; }
    setLoadingMessages(true);
    getMessages(activeChatId)
      .then(setMessages)
      .catch(() => {})
      .finally(() => setLoadingMessages(false));
  }, [activeChatId]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }, [input]);

  async function handleNewChat() {
    const chat = await createChat();
    setChats((prev) => [chat, ...prev]);
    setActiveChatId(chat.id);
    setMessages([]);
  }

  async function handleDeleteChat(e, chatId) {
    e.stopPropagation();
    await deleteChat(chatId);
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (activeChatId === chatId) {
      setActiveChatId(null);
      setMessages([]);
    }
  }

  async function handleSend() {
    if (!input.trim() || sending) return;

    // Ensure we have an active chat
    let chatId = activeChatId;
    if (!chatId) {
      const chat = await createChat();
      setChats((prev) => [chat, ...prev]);
      setActiveChatId(chat.id);
      chatId = chat.id;
    }

    const userText = input.trim();
    setInput('');
    setSending(true);

    // Optimistic user message
    const tempUserMsg = { id: 'temp-u', chat_id: chatId, role: 'user', content: userText, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const { user_message, assistant_message } = await sendMessage(chatId, userText);
      setMessages((prev) => [...prev.filter((m) => m.id !== 'temp-u'), user_message, assistant_message]);
      // Refresh chat list to update title & sort order
      fetchChats();
    } catch (err) {
      const errText = err?.response?.data?.detail || 'Something went wrong. Please try again.';
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== 'temp-u'),
        { id: 'err', chat_id: chatId, role: 'assistant', content: `⚠️ ${errText}`, created_at: new Date().toISOString() },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const activeChat = chats.find((c) => c.id === activeChatId);

  return (
    <div className="chat-root">
      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <svg viewBox="0 0 36 36" fill="none" className="logo-svg">
              <circle cx="18" cy="18" r="18" fill="url(#sg)" />
              <path d="M10 18h16M18 10v16" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="18" cy="18" r="4" fill="white" fillOpacity="0.9" />
              <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#7C3AED" /><stop offset="1" stopColor="#06B6D4" />
                </linearGradient>
              </defs>
            </svg>
            {sidebarOpen && <span className="sidebar-brand">GeminiChat</span>}
          </div>

          <button className="new-chat-btn" onClick={handleNewChat} title="New Chat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {sidebarOpen && <span>New Chat</span>}
          </button>
        </div>

        {sidebarOpen && (
          <div className="chat-list">
            {loadingChats ? (
              <div className="list-loading"><div className="spinner" /></div>
            ) : chats.length === 0 ? (
              <div className="no-chats">No conversations yet</div>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`chat-item ${chat.id === activeChatId ? 'active' : ''}`}
                  onClick={() => setActiveChatId(chat.id)}
                >
                  <svg className="chat-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="chat-item-title">{chat.title}</span>
                  <button
                    className="chat-delete-btn"
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    title="Delete"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        <div className="sidebar-footer">
          {sidebarOpen && (
            <div className="user-info">
              <div className="user-avatar">{user?.email?.[0]?.toUpperCase()}</div>
              <span className="user-email">{user?.email}</span>
            </div>
          )}
          <button className="logout-btn" onClick={handleLogout} title="Sign out">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <main className="chat-main">
        {/* Topbar */}
        <header className="chat-topbar">
          <button className="toggle-sidebar-btn" onClick={() => setSidebarOpen((v) => !v)} title="Toggle sidebar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <h1 className="topbar-title">
            {activeChat ? activeChat.title : 'GeminiChat'}
          </h1>
          <div className="topbar-badge">Powered by Gemini</div>
        </header>

        {/* Messages */}
        <div className="messages-area">
          {!activeChatId && messages.length === 0 && (
            <div className="welcome-state">
              <div className="welcome-icon">
                <svg viewBox="0 0 80 80" fill="none">
                  <circle cx="40" cy="40" r="40" fill="url(#wg)" />
                  <path d="M24 40h32M40 24v32" stroke="white" strokeWidth="4" strokeLinecap="round" />
                  <circle cx="40" cy="40" r="8" fill="white" fillOpacity="0.85" />
                  <defs>
                    <linearGradient id="wg" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#7C3AED" /><stop offset="1" stopColor="#06B6D4" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h2>Hello, {user?.email?.split('@')[0]}! 👋</h2>
              <p>Start a new conversation or select one from the sidebar.</p>
              <div className="suggestion-chips">
                {['Explain quantum computing', 'Write a Python script', 'Help me brainstorm ideas'].map((s) => (
                  <button key={s} className="chip" onClick={() => { setInput(s); textareaRef.current?.focus(); }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loadingMessages && (
            <div className="messages-loading"><div className="spinner" /></div>
          )}

          {!loadingMessages && messages.map((msg) => (
            <Message key={msg.id} msg={msg} />
          ))}

          {sending && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="input-area">
          <div className="input-wrapper">
            <textarea
              ref={textareaRef}
              className="chat-input"
              placeholder="Message Gemini… (Enter to send, Shift+Enter for newline)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={sending}
            />
            <button
              className={`send-btn ${input.trim() && !sending ? 'active' : ''}`}
              onClick={handleSend}
              disabled={!input.trim() || sending}
              title="Send"
            >
              {sending ? (
                <span className="btn-spinner" />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
          <p className="input-hint">Gemini can make mistakes. Verify important information.</p>
        </div>
      </main>
    </div>
  );
}
