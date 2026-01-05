import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { FiCopy, FiEdit2, FiVolume2, FiSend, FiMic, FiMicOff, FiTrash2, FiMoon, FiSun, FiMenu, FiX, FiPlus, FiRefreshCw } from "react-icons/fi";
import { BsStars, BsLightningFill, BsRobot, BsCheck2 } from "react-icons/bs";
import { MdAutoAwesome } from "react-icons/md";
import "./App.css";

function App() {
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
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState("");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const chatEndRef = useRef(null);
  const textAreaRef = useRef(null);

  const models = [
    { id: "gpt-3.5-turbo", name: "GPT-3.5", icon: <BsLightningFill />, color: "#10A37F" },
    { id: "gpt-4", name: "GPT-4", icon: <BsStars />, color: "#AB68FF" },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo", icon: <MdAutoAwesome />, color: "#FF6B35" },
  ];

  // Check mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Speech recognition
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";
      recognition.onresult = (e) => { 
        const transcript = e.results[0][0].transcript;
        setInput(transcript); 
        setIsListening(false); 
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
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
      model: "gpt-3.5-turbo" 
    };
    setConversations([newConversation]);
    setMessages([greetingMessage]);
    setCurrentConversationId(newConversation.id);
  }, []);

  // Auto-scroll
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") sendMessage();
      if (e.key === "Escape") { 
        setEditingIndex(null); 
        setShowMobileMenu(false); 
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [input, messages]);

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

  const createNewChat = () => {
    const newConversation = { 
      id: Date.now(), 
      title: "New Chat", 
      messages: [], 
      createdAt: new Date().toISOString(), 
      model 
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

  const loadConversation = (conversationId) => {
    const conv = conversations.find(c => c.id === conversationId);
    if (!conv) return;
    setMessages(conv.messages);
    setCurrentConversationId(conversationId);
    setModel(conv.model);
    if (isMobile) { 
      setShowMobileMenu(false); 
      setSidebarOpen(false); 
    }
  };

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
      // یہاں آپ کے local IP address استعمال کریں
      const backendUrl = `http://${window.location.hostname}:8080`;
      const res = await axios.post(`${backendUrl}/chat`, { 
        prompt: input, 
        model, 
        conversationHistory: updatedMessages.slice(-10).map(msg => ({ 
          role: msg.role, 
          content: msg.text 
        })) 
      });
      
      const reply = res.data.reply;
      await typeMessage(reply);

      const aiMessage = { 
        role: "assistant", 
        text: reply, 
        timestamp: new Date().toISOString(), 
        id: Date.now() + 1 
      };
      const finalMessages = [...updatedMessages, aiMessage];

      // Update conversation
      const convIndex = conversations.findIndex(c => c.id === currentConversationId);
      if (convIndex !== -1) {
        const updatedConversations = [...conversations];
        if (updatedConversations[convIndex].messages.length === 1) {
          updatedConversations[convIndex].title = input.substring(0, 20) + (input.length > 20 ? "..." : "");
        }
        updatedConversations[convIndex].messages = finalMessages;
        updatedConversations[convIndex].updatedAt = new Date().toISOString();
        setConversations(updatedConversations);
      }

    } catch (err) {
      console.error("Error:", err);
      const errorMessage = { 
        role: "assistant", 
        text: "Sorry, I encountered an error. Please check your connection and try again.", 
        timestamp: new Date().toISOString(), 
        id: Date.now() + 1 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally { 
      setLoading(false); 
    }
  };

  const typeMessage = (text) => {
    return new Promise(resolve => {
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
          updated[updated.length - 1] = { ...aiMessage, text: text.slice(0, index) }; 
          return updated; 
        });
        if (index >= text.length) { 
          clearInterval(interval); 
          resolve(); 
        }
      }, 20);
    });
  };

  const regenerateResponse = async () => {
    if (messages.length < 2) return;
    const lastUser = [...messages].reverse().find(m => m.role === "user");
    if (!lastUser) return;
    
    // Remove last assistant response
    setMessages(prev => prev.slice(0, -1));
    setInput(lastUser.text);
    await sendMessage();
  };

  const startEdit = (i) => { 
    setEditingIndex(i); 
    setEditText(messages[i].text); 
  };
  
  const saveEdit = async () => {
    if (editingIndex === null) return;
    const updatedMessages = [...messages];
    updatedMessages[editingIndex].text = editText;
    updatedMessages[editingIndex].edited = true;
    setMessages(updatedMessages);
    
    // If editing last user message, regenerate response
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

  const copyMessage = (text, index) => { 
    navigator.clipboard.writeText(text); 
    setCopiedIndex(index); 
    setTimeout(() => setCopiedIndex(null), 1500); 
  };
  
  const speakText = (text) => { 
    if (!window.speechSynthesis) {
      alert("Text-to-speech is not supported in your browser");
      return;
    }
    if (speechSynthesis.speaking) speechSynthesis.cancel(); 
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.pitch = 1;
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance); 
  };
  
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
  
  const clearAllConversations = () => { 
    if (window.confirm("Are you sure you want to delete all conversations?")) { 
      setConversations([]); 
      setMessages([]); 
      createNewChat(); 
    } 
  };
  
  const toggleMobileMenu = () => setShowMobileMenu(!showMobileMenu);

  const renderMessageContent = (text, index) => {
    if (editingIndex === index) return (
      <div className="edit-container">
        <textarea 
          className="edit-textarea"
          value={editText} 
          onChange={e => setEditText(e.target.value)} 
          autoFocus 
          rows={3}
        />
        <div className="edit-buttons">
          <button className="save-button" onClick={saveEdit}>
            <BsCheck2 /> Save
          </button>
          <button className="cancel-button" onClick={() => setEditingIndex(null)}>
            <FiX /> Cancel
          </button>
        </div>
      </div>
    );
    
    const formatted = text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, "<code>$1</code>")
      .replace(/\n/g, "<br/>");
    return <div dangerouslySetInnerHTML={{ __html: formatted }}/>;
  };

  // Mobile sidebar component
  const MobileMenu = () => (
    <>
      <div 
        className="mobile-menu-overlay" 
        style={{ display: showMobileMenu ? 'block' : 'none' }}
        onClick={toggleMobileMenu}
      />
      <div 
        className="mobile-menu" 
        style={{ transform: showMobileMenu ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        <div className="mobile-menu-header">
          <h3 className="mobile-menu-title">Chat History</h3>
          <button className="close-mobile-menu" onClick={toggleMobileMenu}>
            <FiX />
          </button>
        </div>
        
        <button className="mobile-new-chat-button" onClick={createNewChat}>
          <FiPlus /> New Chat
        </button>
        
        <div className="mobile-conversation-list">
          {conversations.map(conversation => (
            <div
              key={conversation.id}
              className={`mobile-conversation-item ${currentConversationId === conversation.id ? 'active' : ''}`}
              onClick={() => loadConversation(conversation.id)}
            >
              <BsRobot className="conversation-icon" />
              <span className="mobile-conversation-title">
                {conversation.title}
              </span>
              <FiTrash2 
                className="mobile-delete-conversation"
                onClick={(e) => deleteConversation(conversation.id, e)}
                title="Delete"
              />
            </div>
          ))}
        </div>
        
        <div className="mobile-menu-footer">
          <select
            className="mobile-model-select"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            {models.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          
          <button 
            className="mobile-dark-mode-button"
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? <FiSun /> : <FiMoon />}
            {darkMode ? " Light Mode" : " Dark Mode"}
          </button>
          
          <button 
            className="mobile-clear-button"
            onClick={clearAllConversations}
          >
            <FiTrash2 /> Clear All
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className={`app-container ${darkMode ? 'dark' : 'light'}`}>
      {/* Mobile Menu */}
      {isMobile && <MobileMenu />}

      {/* Desktop Sidebar */}
      {!isMobile && sidebarOpen && (
        <div className="sidebar">
          <div className="sidebar-header">
            <button className="new-chat-button" onClick={createNewChat}>
              <FiPlus /> New chat
            </button>
            <button className="close-sidebar" onClick={() => setSidebarOpen(false)}>
              <FiX />
            </button>
          </div>
          
          <div className="conversation-list">
            {conversations.map(conversation => (
              <div
                key={conversation.id}
                className={`conversation-item ${currentConversationId === conversation.id ? 'active' : ''}`}
                onClick={() => loadConversation(conversation.id)}
              >
                <BsRobot className="conversation-icon" />
                <span className="conversation-title">{conversation.title}</span>
                <FiTrash2 
                  className="delete-conversation"
                  onClick={(e) => deleteConversation(conversation.id, e)}
                  title="Delete conversation"
                />
              </div>
            ))}
          </div>
          
          <div className="sidebar-footer">
            <div className="model-selector">
              <select
                className="model-select"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                {models.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            
            <button 
              className="dark-mode-button"
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? <FiSun /> : <FiMoon />}
              {darkMode ? " Light Mode" : " Dark Mode"}
            </button>
            
            <button className="clear-button" onClick={clearAllConversations}>
              <FiTrash2 /> Clear All
            </button>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="main-content">
        {/* Header */}
        <div className="header">
          {isMobile ? (
            <>
              <button className="mobile-menu-button" onClick={toggleMobileMenu}>
                <FiMenu />
              </button>
              <div className="mobile-header-center">
                <span className="mobile-title">Adeel Agent</span>
                <div className="mobile-model-badge">
                  {models.find(m => m.id === model)?.icon}
                </div>
              </div>
              <button 
                className="mobile-icon-button"
                onClick={() => setDarkMode(!darkMode)}
              >
                {darkMode ? <FiSun /> : <FiMoon />}
              </button>
            </>
          ) : (
            <>
              {!sidebarOpen && (
                <button className="menu-button" onClick={() => setSidebarOpen(true)}>
                  <FiMenu />
                </button>
              )}
              
              <div className="header-center">
                <div className="model-badge">
                  {models.find(m => m.id === model)?.icon}
                  <span>{models.find(m => m.id === model)?.name}</span>
                </div>
              </div>
              
              <div className="header-right">
                <button 
                  className="icon-button"
                  onClick={() => setDarkMode(!darkMode)}
                  title={darkMode ? "Light mode" : "Dark mode"}
                >
                  {darkMode ? <FiSun /> : <FiMoon />}
                </button>
                <button 
                  className="icon-button"
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

        {/* Chat Messages */}
        <div className="chat-container">
          {messages.map((msg, i) => (
            <div
              key={msg.id}
              className={`message-wrapper ${msg.role === 'assistant' ? 'assistant' : 'user'}`}
            >
              <div className="message-container">
                <div className="avatar">
                  {msg.role === 'user' ? (
                    <div className="avatar-icon user-avatar">U</div>
                  ) : (
                    <div className="avatar-icon assistant-avatar">
                      <BsRobot />
                    </div>
                  )}
                </div>
                
                <div className="message-content">
                  <div className="message-text">
                    {renderMessageContent(msg.text, i)}
                  </div>
                  
                  {/* Message Actions */}
                  <div className="message-actions">
                    <span className="timestamp">
                      {new Date(msg.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                      {msg.edited && " (edited)"}
                    </span>
                    
                    <div className="action-buttons">
                      <button
                        className="action-button"
                        onClick={() => speakText(msg.text)}
                        title="Read aloud"
                      >
                        <FiVolume2 />
                      </button>
                      
                      {msg.role === 'user' && (
                        <button
                          className="action-button"
                          onClick={() => startEdit(i)}
                          title="Edit message"
                        >
                          <FiEdit2 />
                        </button>
                      )}
                      
                      <button
                        className="action-button"
                        onClick={() => copyMessage(msg.text, i)}
                        title="Copy message"
                      >
                        {copiedIndex === i ? <BsCheck2 /> : <FiCopy />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="typing-indicator">
              <div className="avatar">
                <div className="avatar-icon assistant-avatar">
                  <BsRobot />
                </div>
              </div>
              <div className="typing-dots">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="input-wrapper">
          <div className="input-area">
            <div className="input-controls">
              {!isMobile && (
                <button
                  className={`voice-button ${isListening ? 'listening' : ''}`}
                  onClick={toggleVoiceInput}
                  title={isListening ? "Stop listening" : "Voice input"}
                >
                  {isListening ? <FiMicOff /> : <FiMic />}
                </button>
              )}
              
              <textarea
                ref={textAreaRef}
                className="textarea"
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
              
              <div className="send-button-container">
                {isMobile && (
                  <button
                    className={`mobile-voice-button ${isListening ? 'listening' : ''}`}
                    onClick={toggleVoiceInput}
                    title={isListening ? "Stop listening" : "Voice input"}
                  >
                    {isListening ? <FiMicOff /> : <FiMic />}
                  </button>
                )}
                
                <button
                  className="send-button"
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                >
                  {loading ? (
                    <div className="spinner" />
                  ) : (
                    <FiSend />
                  )}
                </button>
              </div>
            </div>
            
            {!isMobile && (
              <div className="input-footer">
                <span className="disclaimer">
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

export default App;