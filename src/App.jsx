import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { FiCopy, FiEdit2, FiVolume2 } from "react-icons/fi";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Initial AI greeting
  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        text: (
          <>
            I'm a demo ChatGPT clone built by{" "}
            <span style={{ fontWeight: "bold", color: "#0b5cff" }}>
              Adeel Ahmad
            </span>
            . How can I help you today?
          </>
        ),
      },
    ]);
  }, []);

  // Auto scroll on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Send message
  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:8080/chat", {
        prompt: input,
      });

      const reply = res.data.reply;
      typeMessage(reply);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Something went wrong." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Typing effect for AI messages
  const typeMessage = (text) => {
    let index = 0;
    const aiMessage = { role: "assistant", text: "" };
    setMessages((prev) => [...prev, aiMessage]);

    const interval = setInterval(() => {
      index++;
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...aiMessage,
          text: text.slice(0, index),
        };
        return updated;
      });

      if (index >= text.length) clearInterval(interval);
    }, 20);
  };

  // Edit user message
  const editMessage = (index) => {
    const msg = messages[index];
    if (msg.role === "user") {
      setInput(msg.text);
      // Remove user message AND last assistant message
      setMessages((prev) => prev.filter((_, i) => i !== index && i !== prev.length - 1));
    }
  };

  // Copy message
  const copyMessage = (text) => {
    navigator.clipboard.writeText(text);
    alert("Message copied!");
  };

  // Text-to-speech
  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.pitch = 1;
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div style={styles.container}>
      <div style={styles.chatWrapper}>
        <div style={styles.chatHeader}>AI Agent ChatGPT</div>

        <div style={styles.chatBox}>
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                ...styles.message,
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                background: msg.role === "user" ? "#0b5cffcc" : "#2b2b2bcc",
              }}
            >
              <div>{msg.text}</div>
              {/* Icons below each message */}
              <div style={styles.icons}>
                <FiVolume2
                  style={styles.icon}
                  title="Voice"
                  onClick={() => speakText(msg.text)}
                />
                {msg.role === "user" && (
                  <FiEdit2
                    style={styles.icon}
                    title="Edit"
                    onClick={() => editMessage(i)}
                  />
                )}
                <FiCopy
                  style={styles.icon}
                  title="Copy"
                  onClick={() => copyMessage(msg.text)}
                />
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ ...styles.message, background: "#2b2b2bcc" }}>
              Adeel Typing…
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        <div style={styles.inputContainer}>
          <input
            style={styles.input}
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button style={styles.button} onClick={sendMessage}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    width: "100vw",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundImage:
      "url('https://images.unsplash.com/photo-1612831455543-b6b0d7b5c7f7?auto=format&fit=crop&w=1950&q=80')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    fontFamily: "system-ui, sans-serif",
  },
  chatWrapper: {
    display: "flex",
    flexDirection: "column",
    width: "95%",
    maxWidth: 600,
    height: "95%",
    borderRadius: 12,
    background: "rgba(18,18,18,0.85)",
    boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
    backdropFilter: "blur(8px)",
  },
  chatHeader: {
    padding: 16,
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    borderBottom: "1px solid #5f4040ff",
    color: "#fff",
  },
  chatBox: {
    flex: 1,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    overflowY: "auto",
  },
  message: {
    maxWidth: "70%",
    padding: "12px 14px",
    borderRadius: 12,
    fontSize: 15,
    lineHeight: 1.5,
    color: "#fff",
    wordBreak: "break-word",
    position: "relative",
  },
  icons: {
    display: "flex",
    gap: 10,
    marginTop: 6,
  },
  icon: {
    cursor: "pointer",
    color: "#fff",
    fontSize: 18,
  },
  inputContainer: {
    display: "flex",
    padding: 12,
    gap: 10,
    borderTop: "1px solid #333",
  },
  input: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    border: "none",
    outline: "none",
    fontSize: 15,
    background: "#1e1e1ecc",
    color: "#fff",
  },
  button: {
    padding: "0 18px",
    borderRadius: 8,
    border: "none",
    background: "#0b5cff",
    color: "#fff",
    cursor: "pointer",
  },
};

export default App;
