import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { 
  FiCopy, 
  FiEdit2, 
  FiVolume2, 
  FiSend, 
  FiMic, 
  FiMicOff,
  FiTrash2,
  FiMoon,
  FiSun,
  FiMenu,
  FiX,
  FiPlus,
  FiRefreshCw,
  FiChevronLeft
} from "react-icons/fi";
import { 
  BsStars, 
  BsLightningFill, 
  BsRobot,
  BsCheck2 
} from "react-icons/bs";
import { MdAutoAwesome } from "react-icons/md";

function App() {
  // State management
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [speechRecognition, setSpeechRecognition] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [model, setModel] = useState("gpt-3.5-turbo");
  const [temperature, setTemperature] = useState(0.7);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState("");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const chatEndRef = useRef(null);
  const textAreaRef = useRef(null);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Models configuration
  const models = [
    { id: "gpt-3.5-turbo", name: "GPT-3.5", icon: <BsLightningFill />, color: "#10A37F" },
    { id: "gpt-4", name: "GPT-4", icon: <BsStars />, color: "#AB68FF" },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo", icon: <MdAutoAwesome />, color: "#FF6B35" },
  ];

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };
      
      recognition.onerror = () => {
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      setSpeechRecognition(recognition);
    }
  }, []);

  // Initial AI greeting
  useEffect(() => {
    const greetingMessage = {
      role: "assistant",
      text: "Hello! I'm Adeel Agent AI Assistant. How can I help you today?",
      timestamp: new Date().toISOString(),
      id: Date.now()
    };
    
    const newConversation = {
      id: Date.now(),
      title: "New Chat",
      messages: [greetingMessage],
      createdAt: new Date().toISOString(),
      model: model
    };
    
    setConversations([newConversation]);
    setMessages([greetingMessage]);
    setCurrentConversationId(newConversation.id);
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "auto";
      textAreaRef.current.style.height = Math.min(textAreaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  // Start/stop voice input
  const toggleVoiceInput = () => {
    if (!speechRecognition) {
      alert("Voice input is not supported in your browser");
      return;
    }
    
    if (isListening) {
      speechRecognition.stop();
      setIsListening(false);
    } else {
      speechRecognition.start();
      setIsListening(true);
    }
  };

  // Create new chat
  const createNewChat = () => {
    const newConversation = {
      id: Date.now(),
      title: "New Chat",
      messages: [],
      createdAt: new Date().toISOString(),
      model: model
    };
    
    const greetingMessage = {
      role: "assistant",
      text: "Hello! I'm Adeel Agent. What can I help you with?",
      timestamp: new Date().toISOString(),
      id: Date.now() + 1
    };
    
    newConversation.messages.push(greetingMessage);
    setConversations(prev => [newConversation, ...prev]);
    setMessages([greetingMessage]);
    setCurrentConversationId(newConversation.id);
    setInput("");
    
    if (isMobile) {
      setShowMobileMenu(false);
      setSidebarOpen(false);
    }
  };

  // Load conversation
  const loadConversation = (conversationId) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setMessages(conversation.messages);
      setCurrentConversationId(conversationId);
      setModel(conversation.model);
    }
    
    if (isMobile) {
      setShowMobileMenu(false);
      setSidebarOpen(false);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      role: "user",
      text: input,
      timestamp: new Date().toISOString(),
      id: Date.now()
    };
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:8080/chat", {
        prompt: input,
        model: model,
        temperature: temperature,
        conversationHistory: updatedMessages.slice(-10).map(msg => ({
          role: msg.role,
          content: msg.text
        }))
      });

      const reply = res.data.reply;
      await typeMessage(reply);
      
      // Update conversation
      const aiMessage = {
        role: "assistant",
        text: reply,
        timestamp: new Date().toISOString(),
        id: Date.now() + 1
      };
      
      const finalMessages = [...updatedMessages, aiMessage];
      
      // Update conversation title if first user message
      const conversationIndex = conversations.findIndex(c => c.id === currentConversationId);
      if (conversationIndex !== -1) {
        const updatedConversations = [...conversations];
        if (updatedConversations[conversationIndex].messages.length === 1) {
          updatedConversations[conversationIndex].title = input.substring(0, 20) + (input.length > 20 ? "..." : "");
        }
        updatedConversations[conversationIndex].messages = finalMessages;
        updatedConversations[conversationIndex].updatedAt = new Date().toISOString();
        setConversations(updatedConversations);
      }
      
    } catch (err) {
      console.error("Error:", err);
      const errorMessage = {
        role: "assistant",
        text: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date().toISOString(),
        id: Date.now() + 1
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Typing effect
  const typeMessage = (text) => {
    return new Promise((resolve) => {
      let index = 0;
      const aiMessage = {
        role: "assistant",
        text: "",
        timestamp: new Date().toISOString(),
        id: Date.now()
      };
      
      setMessages(prev => [...prev, aiMessage]);

      const interval = setInterval(() => {
        index++;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...aiMessage,
            text: text.slice(0, index)
          };
          return updated;
        });

        if (index >= text.length) {
          clearInterval(interval);
          resolve();
        }
      }, 20);
    });
  };

  // Regenerate response
  const regenerateResponse = async () => {
    if (messages.length < 2) return;
    
    const lastUserMessage = messages.filter(m => m.role === "user").pop();
    if (!lastUserMessage) return;
    
    setMessages(prev => prev.filter((_, i) => i !== prev.length - 1));
    setInput(lastUserMessage.text);
    await sendMessage();
  };

  // Edit message
  const startEdit = (index) => {
    setEditingIndex(index);
    setEditText(messages[index].text);
  };

  const saveEdit = async () => {
    if (editingIndex === null) return;
    
    const updatedMessages = [...messages];
    updatedMessages[editingIndex].text = editText;
    updatedMessages[editingIndex].edited = true;
    setMessages(updatedMessages);
    
    if (messages[editingIndex].role === "user" && editingIndex === messages.length - 2) {
      const nextMessage = messages[editingIndex + 1];
      if (nextMessage && nextMessage.role === "assistant") {
        setMessages(prev => prev.slice(0, editingIndex + 1));
        await sendMessage();
      }
    }
    
    setEditingIndex(null);
    setEditText("");
  };

  // Copy message with feedback
  const copyMessage = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  // Text-to-speech
  const speakText = (text) => {
    if (!window.speechSynthesis) {
      alert("Text-to-speech not supported in your browser");
      return;
    }
    
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.pitch = 1;
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  };

  // Delete conversation
  const deleteConversation = (id, e) => {
    e.stopPropagation();
    setConversations(prev => prev.filter(c => c.id !== id));
    if (currentConversationId === id) {
      if (conversations.length > 1) {
        loadConversation(conversations[1].id);
      } else {
        createNewChat();
      }
    }
  };

  // Clear all conversations
  const clearAllConversations = () => {
    if (window.confirm("Delete all conversations?")) {
      setConversations([]);
      setMessages([]);
      createNewChat();
    }
  };

  // Mobile menu toggle
  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        sendMessage();
      }
      if (e.key === 'Escape') {
        setEditingIndex(null);
        setShowMobileMenu(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [input, messages]);

  // Render message content
  const renderMessageContent = (text, index) => {
    if (editingIndex === index) {
      return (
        <div style={styles.editContainer}>
          <textarea
            style={styles.editTextarea}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            autoFocus
            rows={3}
          />
          <div style={styles.editButtons}>
            <button style={styles.saveButton} onClick={saveEdit}>
              <BsCheck2 /> Save
            </button>
            <button style={styles.cancelButton} onClick={() => setEditingIndex(null)}>
              <FiX /> Cancel
            </button>
          </div>
        </div>
      );
    }
    
    // Simple markdown-like formatting
    const formattedText = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br />');
    
    return <div dangerouslySetInnerHTML={{ __html: formattedText }} />;
  };

  // Mobile sidebar/menu
  const MobileMenu = () => (
    <div style={{
      ...styles.mobileMenu,
      transform: showMobileMenu ? 'translateX(0)' : 'translateX(-100%)'
    }}>
      <div style={styles.mobileMenuHeader}>
        <h3 style={styles.mobileMenuTitle}>Chat History</h3>
        <button style={styles.closeMobileMenu} onClick={toggleMobileMenu}>
          <FiX />
        </button>
      </div>
      
      <button style={styles.mobileNewChatButton} onClick={createNewChat}>
        <FiPlus /> New Chat
      </button>
      
      <div style={styles.mobileConversationList}>
        {conversations.map(conversation => (
          <div
            key={conversation.id}
            style={{
              ...styles.mobileConversationItem,
              background: currentConversationId === conversation.id 
                ? (darkMode ? '#2d2d2d' : '#e5e5e5') 
                : 'transparent'
            }}
            onClick={() => loadConversation(conversation.id)}
          >
            <BsRobot style={{ marginRight: 10, fontSize: 16 }} />
            <span style={styles.mobileConversationTitle}>
              {conversation.title}
            </span>
            <FiTrash2 
              style={styles.mobileDeleteConversation}
              onClick={(e) => deleteConversation(conversation.id, e)}
              title="Delete"
            />
          </div>
        ))}
      </div>
      
      <div style={styles.mobileMenuFooter}>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          style={styles.mobileModelSelect}
        >
          {models.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        
        <button 
          style={styles.mobileDarkModeButton}
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? <FiSun /> : <FiMoon />}
          {darkMode ? " Light Mode" : " Dark Mode"}
        </button>
        
        <button 
          style={styles.mobileClearButton}
          onClick={clearAllConversations}
        >
          <FiTrash2 /> Clear All
        </button>
      </div>
    </div>
  );

  return (
    <div style={{
      ...styles.container,
      background: darkMode ? '#343541' : '#ffffff',
      color: darkMode ? '#ffffff' : '#000000'
    }}>
      {/* Mobile Menu Overlay */}
      {isMobile && (
        <>
          <MobileMenu />
          {showMobileMenu && (
            <div 
              style={styles.mobileMenuOverlay}
              onClick={toggleMobileMenu}
            />
          )}
        </>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && sidebarOpen && (
        <div style={{
          ...styles.sidebar,
          background: darkMode ? '#202123' : '#f7f7f8',
          borderRight: `1px solid ${darkMode ? '#4d4d4f' : '#e5e5e5'}`
        }}>
          <div style={styles.sidebarHeader}>
            <button style={styles.newChatButton} onClick={createNewChat}>
              <FiPlus /> New chat
            </button>
            <button style={styles.closeSidebar} onClick={() => setSidebarOpen(false)}>
              <FiX />
            </button>
          </div>
          
          <div style={styles.conversationList}>
            {conversations.map(conversation => (
              <div
                key={conversation.id}
                style={{
                  ...styles.conversationItem,
                  background: currentConversationId === conversation.id 
                    ? (darkMode ? '#2d2d2d' : '#e5e5e5') 
                    : 'transparent'
                }}
                onClick={() => loadConversation(conversation.id)}
              >
                <BsRobot style={{ marginRight: 10, fontSize: 14 }} />
                <span style={styles.conversationTitle}>{conversation.title}</span>
                <FiTrash2 
                  style={styles.deleteConversation}
                  onClick={(e) => deleteConversation(conversation.id, e)}
                  title="Delete conversation"
                />
              </div>
            ))}
          </div>
          
          <div style={styles.sidebarFooter}>
            <div style={styles.modelSelector}>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                style={{
                  ...styles.modelSelect,
                  background: darkMode ? '#40414f' : '#ffffff',
                  color: darkMode ? '#ffffff' : '#000000'
                }}
              >
                {models.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            
            <button 
              style={styles.darkModeButton}
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? <FiSun /> : <FiMoon />}
              {darkMode ? " Light Mode" : " Dark Mode"}
            </button>
            
            <button style={styles.clearButton} onClick={clearAllConversations}>
              <FiTrash2 /> Clear All
            </button>
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div style={styles.mainContent}>
        {/* Header */}
        <div style={{
          ...styles.header,
          borderBottom: `1px solid ${darkMode ? '#4d4d4f' : '#e5e5e5'}`,
          height: isMobile ? '50px' : '60px',
          padding: isMobile ? '10px 15px' : '16px'
        }}>
          {isMobile ? (
            <>
              <button style={styles.mobileMenuButton} onClick={toggleMobileMenu}>
                <FiMenu />
              </button>
              <div style={styles.mobileHeaderCenter}>
                <span style={styles.mobileTitle}>Adeel Agent</span>
                <div style={styles.mobileModelBadge}>
                  {models.find(m => m.id === model)?.icon}
                </div>
              </div>
              <button 
                style={styles.mobileIconButton}
                onClick={() => setDarkMode(!darkMode)}
              >
                {darkMode ? <FiSun size={18} /> : <FiMoon size={18} />}
              </button>
            </>
          ) : (
            <>
              {!sidebarOpen && (
                <button style={styles.menuButton} onClick={() => setSidebarOpen(true)}>
                  <FiMenu />
                </button>
              )}
              
              <div style={styles.headerCenter}>
                <div style={styles.modelBadge}>
                  {models.find(m => m.id === model)?.icon}
                  <span style={{ marginLeft: 8 }}>{models.find(m => m.id === model)?.name}</span>
                </div>
              </div>
              
              <div style={styles.headerRight}>
                <button 
                  style={styles.iconButton}
                  onClick={() => setDarkMode(!darkMode)}
                  title={darkMode ? "Light mode" : "Dark mode"}
                >
                  {darkMode ? <FiSun /> : <FiMoon />}
                </button>
                <button 
                  style={styles.iconButton}
                  onClick={regenerateResponse}
                  disabled={loading || messages.length < 2}
                  title="Regenerate response"
                >
                  <FiRefreshCw />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Chat messages */}
        <div style={styles.chatContainer}>
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                ...styles.messageWrapper,
                background: msg.role === 'assistant' 
                  ? (darkMode ? '#444654' : '#f7f7f8') 
                  : 'transparent',
                padding: isMobile ? '12px 15px' : '20px 0'
              }}
            >
              <div style={{
                ...styles.messageContainer,
                maxWidth: isMobile ? '100%' : '48rem',
                gap: isMobile ? '12px' : '20px'
              }}>
                <div style={styles.avatar}>
                  {msg.role === 'user' ? (
                    <div style={{
                      ...styles.avatarIcon,
                      background: '#0b5cff',
                      width: isMobile ? '28px' : '36px',
                      height: isMobile ? '28px' : '36px',
                      fontSize: isMobile ? '12px' : '14px'
                    }}>U</div>
                  ) : (
                    <div style={{
                      ...styles.avatarIcon,
                      background: '#10A37F',
                      width: isMobile ? '28px' : '36px',
                      height: isMobile ? '28px' : '36px'
                    }}>
                      <BsRobot size={isMobile ? 14 : 16} />
                    </div>
                  )}
                </div>
                
                <div style={styles.messageContent}>
                  <div style={{
                    fontSize: isMobile ? '14px' : '16px',
                    lineHeight: '1.6'
                  }}>
                    {renderMessageContent(msg.text, i)}
                  </div>
                  
                  {/* Message actions - Always visible on mobile */}
                  <div style={{
                    ...styles.messageActions,
                    opacity: isMobile ? 1 : 0,
                    marginTop: isMobile ? '8px' : '12px'
                  }}>
                    <span style={{
                      ...styles.timestamp,
                      fontSize: isMobile ? '10px' : '12px'
                    }}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                      {msg.edited && " (edited)"}
                    </span>
                    
                    <div style={styles.actionButtons}>
                      <button
                        style={styles.actionButton}
                        onClick={() => speakText(msg.text)}
                        title="Read aloud"
                      >
                        <FiVolume2 size={isMobile ? 14 : 16} />
                      </button>
                      
                      {msg.role === 'user' && (
                        <button
                          style={styles.actionButton}
                          onClick={() => startEdit(i)}
                          title="Edit message"
                        >
                          <FiEdit2 size={isMobile ? 14 : 16} />
                        </button>
                      )}
                      
                      <button
                        style={styles.actionButton}
                        onClick={() => copyMessage(msg.text, i)}
                        title="Copy message"
                      >
                        {copiedIndex === i ? 
                          <BsCheck2 size={isMobile ? 14 : 16} /> : 
                          <FiCopy size={isMobile ? 14 : 16} />
                        }
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div style={{
              ...styles.typingIndicator,
              maxWidth: isMobile ? '100%' : '48rem',
              padding: isMobile ? '15px' : '20px 0'
            }}>
              <div style={styles.avatar}>
                <div style={{
                  ...styles.avatarIcon,
                  background: '#10A37F',
                  width: isMobile ? '28px' : '36px',
                  height: isMobile ? '28px' : '36px'
                }}>
                  <BsRobot size={isMobile ? 14 : 16} />
                </div>
              </div>
              <div style={styles.typingDots}>
                <div style={styles.typingDot} />
                <div style={styles.typingDot} />
                <div style={styles.typingDot} />
              </div>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Input area */}
        <div style={{
          ...styles.inputWrapper,
          padding: isMobile ? '15px' : '20px'
        }}>
          <div style={styles.inputArea}>
            <div style={styles.inputControls}>
              {!isMobile && (
                <button
                  style={{
                    ...styles.voiceButton,
                    background: isListening ? '#ff4444' : 'transparent'
                  }}
                  onClick={toggleVoiceInput}
                  title={isListening ? "Stop listening" : "Voice input"}
                >
                  {isListening ? <FiMicOff /> : <FiMic />}
                </button>
              )}
              
              <textarea
                ref={textAreaRef}
                style={{
                  ...styles.textarea,
                  background: darkMode ? '#40414f' : '#ffffff',
                  color: darkMode ? '#ffffff' : '#000000',
                  border: `1px solid ${darkMode ? '#565869' : '#c5c5d2'}`,
                  fontSize: isMobile ? '14px' : '16px',
                  padding: isMobile ? '10px' : '12px',
                  borderRadius: isMobile ? '20px' : '12px',
                  minHeight: isMobile ? '40px' : '24px',
                  maxHeight: '120px'
                }}
                placeholder="Message Adeel Agent..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                rows={1}
              />
              
              <div style={styles.sendButtonContainer}>
                {isMobile && (
                  <button
                    style={{
                      ...styles.mobileVoiceButton,
                      background: isListening ? '#ff4444' : 'transparent'
                    }}
                    onClick={toggleVoiceInput}
                    title={isListening ? "Stop listening" : "Voice input"}
                  >
                    {isListening ? <FiMicOff size={18} /> : <FiMic size={18} />}
                  </button>
                )}
                
                <button
                  style={{
                    ...styles.sendButton,
                    opacity: input.trim() ? 1 : 0.5,
                    cursor: input.trim() ? 'pointer' : 'default',
                    width: isMobile ? '40px' : '48px',
                    height: isMobile ? '40px' : '48px',
                    padding: isMobile ? '8px' : '12px'
                  }}
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                >
                  {loading ? (
                    <div style={{
                      ...styles.spinner,
                      width: isMobile ? '16px' : '20px',
                      height: isMobile ? '16px' : '20px'
                    }} />
                  ) : (
                    <FiSend size={isMobile ? 18 : 20} />
                  )}
                </button>
              </div>
            </div>
            
            {!isMobile && (
              <div style={styles.inputFooter}>
                <span style={styles.disclaimer}>
                  Adeel Agent can make mistakes. Consider checking important information.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Responsive Styles
const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
  },
  // Mobile Menu Styles
  mobileMenu: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '280px',
    height: '100vh',
    background: '#202123',
    zIndex: 1000,
    transition: 'transform 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
  },
  mobileMenuOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 999,
  },
  mobileMenuHeader: {
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #4d4d4f',
  },
  mobileMenuTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
  },
  closeMobileMenu: {
    background: 'transparent',
    border: 'none',
    color: '#ffffff',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '5px',
  },
  mobileNewChatButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '20px',
    padding: '12px',
    background: 'linear-gradient(135deg, #0b5cff 0%, #0b5cffcc 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    gap: '8px',
  },
  mobileConversationList: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 20px',
  },
  mobileConversationItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '8px',
    fontSize: '14px',
    transition: 'background 0.2s',
  },
  mobileConversationTitle: {
    flex: 1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontSize: '13px',
  },
  mobileDeleteConversation: {
    opacity: 0.7,
    cursor: 'pointer',
    padding: '4px',
    fontSize: '16px',
  },
  mobileMenuFooter: {
    padding: '20px',
    borderTop: '1px solid #4d4d4f',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  mobileModelSelect: {
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #565869',
    background: '#40414f',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
  },
  mobileDarkModeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px',
    background: '#40414f',
    color: '#ffffff',
    border: '1px solid #565869',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  mobileClearButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px',
    background: 'transparent',
    color: '#ff4444',
    border: '1px solid #ff4444',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  // Desktop Sidebar
  sidebar: {
    width: '260px',
    display: 'flex',
    flexDirection: 'column',
    '@media (max-width: 768px)': {
      display: 'none',
    },
  },
  sidebarHeader: {
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  newChatButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px',
    background: 'linear-gradient(135deg, #0b5cff 0%, #0b5cffcc 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    flex: 1,
    marginRight: '8px',
    gap: '8px',
  },
  closeSidebar: {
    background: 'transparent',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '20px',
    padding: '8px',
  },
  conversationList: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px',
  },
  conversationItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    borderRadius: '6px',
    cursor: 'pointer',
    marginBottom: '4px',
    fontSize: '14px',
    transition: 'background 0.2s',
    '&:hover': {
      background: '#2d2d2d',
    },
  },
  conversationTitle: {
    flex: 1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontSize: '13px',
  },
  deleteConversation: {
    opacity: 0,
    transition: 'opacity 0.2s',
    cursor: 'pointer',
    padding: '4px',
    fontSize: '16px',
  },
  sidebarFooter: {
    padding: '16px',
    borderTop: '1px solid #4d4d4f',
  },
  modelSelector: {
    marginBottom: '16px',
  },
  modelSelect: {
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #565869',
    fontSize: '14px',
    outline: 'none',
  },
  darkModeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '10px',
    background: 'transparent',
    color: 'inherit',
    border: '1px solid #565869',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    marginBottom: '10px',
  },
  clearButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '10px',
    background: 'transparent',
    color: '#ff4444',
    border: '1px solid #ff4444',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  // Main Content
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    boxSizing: 'border-box',
    flexShrink: 0,
  },
  mobileMenuButton: {
    background: 'transparent',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '20px',
    padding: '8px',
    marginRight: '10px',
  },
  mobileHeaderCenter: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  mobileTitle: {
    fontSize: '16px',
    fontWeight: '600',
  },
  mobileModelBadge: {
    background: '#10A37F',
    color: 'white',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
  },
  mobileIconButton: {
    background: 'transparent',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    padding: '8px',
  },
  menuButton: {
    background: 'transparent',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '20px',
    padding: '8px',
    marginRight: '16px',
  },
  headerCenter: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
  },
  modelBadge: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 12px',
    background: '#10A37F',
    color: 'white',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '500',
  },
  headerRight: {
    display: 'flex',
    gap: '8px',
  },
  iconButton: {
    background: 'transparent',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '18px',
    padding: '8px',
    borderRadius: '6px',
    transition: 'background 0.2s',
    '&:hover': {
      background: 'rgba(255,255,255,0.1)',
    },
  },
  chatContainer: {
    flex: 1,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    '@media (max-width: 768px)': {
      padding: '10px 15px',
    },
    '@media (min-width: 769px)': {
      padding: '20px',
    },
  },
  messageWrapper: {
    '@media (max-width: 768px)': {
      padding: '12px 0',
    },
    '@media (min-width: 769px)': {
      padding: '20px 0',
    },
    '&:hover .messageActions': {
      opacity: 1,
    },
  },
  messageContainer: {
    margin: '0 auto',
    display: 'flex',
    '@media (max-width: 768px)': {
      gap: '12px',
      maxWidth: '100%',
    },
    '@media (min-width: 769px)': {
      gap: '20px',
      maxWidth: '48rem',
    },
  },
  avatar: {
    flexShrink: 0,
  },
  avatarIcon: {
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
  },
  messageContent: {
    flex: 1,
    minWidth: 0,
  },
  messageActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'opacity 0.2s',
    '@media (max-width: 768px)': {
      opacity: 1,
      marginTop: '8px',
    },
  },
  timestamp: {
    opacity: 0.6,
    '@media (max-width: 768px)': {
      fontSize: '10px',
    },
    '@media (min-width: 769px)': {
      fontSize: '12px',
    },
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
  },
  actionButton: {
    background: 'transparent',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    opacity: 0.6,
    transition: 'opacity 0.2s',
    '&:hover': {
      opacity: 1,
    },
    '@media (max-width: 768px)': {
      opacity: 0.8,
    },
  },
  editContainer: {
    marginTop: '8px',
  },
  editTextarea: {
    width: '100%',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #565869',
    background: 'transparent',
    color: 'inherit',
    fontSize: '16px',
    lineHeight: '1.6',
    resize: 'vertical',
    minHeight: '80px',
    marginBottom: '12px',
    outline: 'none',
  },
  editButtons: {
    display: 'flex',
    gap: '8px',
  },
  saveButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    background: '#10A37F',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  cancelButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    background: 'transparent',
    color: 'inherit',
    border: '1px solid #565869',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  typingIndicator: {
    display: 'flex',
    alignItems: 'center',
    margin: '0 auto',
    '@media (max-width: 768px)': {
      gap: '15px',
      maxWidth: '100%',
      padding: '15px 0',
    },
    '@media (min-width: 769px)': {
      gap: '20px',
      maxWidth: '48rem',
      padding: '20px 0',
    },
  },
  typingDots: {
    display: 'flex',
    gap: '4px',
  },
  typingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#10A37F',
    animation: 'typing 1.4s infinite ease-in-out',
    '&:nth-child(2)': {
      animationDelay: '0.2s',
    },
    '&:nth-child(3)': {
      animationDelay: '0.4s',
    },
  },
  inputWrapper: {
    borderTop: '1px solid #4d4d4f',
    flexShrink: 0,
    '@media (max-width: 768px)': {
      padding: '15px',
    },
    '@media (min-width: 769px)': {
      padding: '20px',
    },
  },
  inputArea: {
    margin: '0 auto',
    '@media (min-width: 769px)': {
      maxWidth: '48rem',
    },
  },
  inputControls: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '12px',
  },
  voiceButton: {
    background: 'transparent',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '20px',
    padding: '12px',
    borderRadius: '6px',
    flexShrink: 0,
    '@media (max-width: 768px)': {
      display: 'none',
    },
  },
  mobileVoiceButton: {
    background: 'transparent',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '18px',
    padding: '8px',
    borderRadius: '50%',
    flexShrink: 0,
    '@media (min-width: 769px)': {
      display: 'none',
    },
  },
  textarea: {
    flex: 1,
    resize: 'none',
    outline: 'none',
    fontFamily: 'inherit',
    lineHeight: '1.6',
  },
  sendButtonContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    '@media (max-width: 768px)': {
      gap: '4px',
    },
  },
  sendButton: {
    background: 'linear-gradient(135deg, #0b5cff 0%, #0b5cffcc 100%)',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.2s',
    flexShrink: 0,
  },
  spinner: {
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  inputFooter: {
    marginTop: '12px',
    textAlign: 'center',
    '@media (max-width: 768px)': {
      display: 'none',
    },
  },
  disclaimer: {
    fontSize: '12px',
    opacity: 0.6,
  },
};

// Add keyframes for animations
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`, styleSheet.cssRules.length);
styleSheet.insertRule(`
  @keyframes typing {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.6; }
    30% { transform: translateY(-4px); opacity: 1; }
  }
`, styleSheet.cssRules.length);
styleSheet.insertRule(`
  .conversation-item:hover .delete-conversation {
    opacity: 1;
  }
`, styleSheet.cssRules.length);

export default App;