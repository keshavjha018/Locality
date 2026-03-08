import { useState, useRef, useEffect } from 'react';
import './index.css';

// SVG Icons
const IconSend = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

const IconRefresh = ({ spinning }: { spinning?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: spinning ? 'spin 1s linear infinite' : 'none' }}>
    <polyline points="23 4 23 10 17 10"></polyline>
    <polyline points="1 20 1 14 7 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
    <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
  </svg>
);

const IconFile = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
    <polyline points="13 2 13 9 20 9"></polyline>
  </svg>
);

const IconUpload = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>
);

type Message = {
  id: string;
  role: 'user' | 'bot';
  content: string;
  sources?: string[];
  isTyping?: boolean;
};

function App() {
  const [backendReady, setBackendReady] = useState(false);
  const [documents, setDocuments] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState<string>('not_loaded');

  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'bot', content: 'Hello! I am Locality, your completely private, local AI assistant. Point me to a folder with your documents, hit sync, and ask me anything.' }
  ]);
  const [inputVal, setInputVal] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/documents');
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error("Failed to fetch documents");
    }
  };

  // Poll backend health until it's ready
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch('http://localhost:8080/api/health');
        if (res.ok) {
          setBackendReady(true);
          fetchDocuments();
        }
      } catch { /* not up yet */ }
    };
    if (!backendReady) {
      checkBackend();
      const interval = setInterval(checkBackend, 2000);
      return () => clearInterval(interval);
    }
  }, [backendReady]);

  // Poll model status every 3 seconds until ready
  useEffect(() => {
    const checkModel = async () => {
      try {
        const res = await fetch('http://localhost:8080/api/model-status');
        const data = await res.json();
        setModelStatus(data.status);
      } catch { /* backend not up yet */ }
    };
    checkModel();
    const interval = setInterval(() => {
      if (modelStatus !== 'ready') checkModel();
    }, 3000);
    return () => clearInterval(interval);
  }, [modelStatus]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setIsUploading(true);
    setSyncStatus(`Uploading ${file.name}...`);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:8080/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.status === 'success') {
        setSyncStatus(`Uploaded ${file.name}. Syncing into engine...`);
        // Refresh the documents list
        await fetchDocuments();
        setTimeout(() => setSyncStatus(null), 5000);
      } else {
        setSyncStatus(`Upload Error: ${data.message}`);
      }
    } catch (err) {
      setSyncStatus('Failed to connect to backend for upload.');
    } finally {
      setIsUploading(false);
      // reset file input
      e.target.value = '';
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus('Sync initiated. Analyzing files...');
    try {
      const res = await fetch('http://localhost:8080/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.status === 'error') {
        setSyncStatus(`Error: ${data.message}`);
      } else {
        setSyncStatus('Sync running in background! You can start chatting.');
        setTimeout(() => setSyncStatus(null), 5000);
      }
    } catch (err) {
      setSyncStatus('Failed to connect to backend.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputVal.trim()) return;

    const query = inputVal.trim();
    setInputVal('');

    // Add user message
    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: query }]);

    // Add typing placeholder
    const botMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: botMsgId, role: 'bot', content: '', isTyping: true }]);

    try {
      const res = await fetch('http://localhost:8080/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await res.json();

      setMessages(prev => prev.map(msg =>
        msg.id === botMsgId
          ? { ...msg, content: data.answer || "Sorry, I couldn't generate a response.", sources: data.sources, isTyping: false }
          : msg
      ));
    } catch (err) {
      setMessages(prev => prev.map(msg =>
        msg.id === botMsgId
          ? { ...msg, content: "Connection error. Is the Python backend running?", isTyping: false }
          : msg
      ));
    }
  };

  if (!backendReady) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-logo">🧠</div>
          <h1 className="loading-title">Locality</h1>
          <p className="loading-subtitle">Privacy-First Intelligence Engine</p>
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
          </div>
          <p className="loading-status">Initializing engine...</p>
          <p className="loading-hint">Loading AI models & vector database</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Settings Panel */}
      <aside className="sidebar glass-panel">
        <h2>
          ⚙️ Knowledge Base
        </h2>

        <div className="upload-zone">
          <input
            type="file"
            onChange={handleFileUpload}
            disabled={isUploading || isSyncing}
            accept=".pdf,.txt,.md,.csv,.json"
          />
          <div className="upload-icon">
            <IconUpload />
          </div>
          <p className="upload-text">
            <span>Click to browse</span> or drag & drop files here
          </p>
          <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
            Supports PDF, TXT, MD, CSV
          </p>
        </div>

        <button
          className="btn"
          onClick={handleSync}
          disabled={isSyncing || isUploading}
        >
          <IconRefresh spinning={isSyncing} />
          {isSyncing ? 'Syncing...' : 'Force Sync Engine'}
        </button>

        {syncStatus && (
          <p style={{ marginTop: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {syncStatus}
          </p>
        )}

        <div className="doc-list-container">
          <h3 className="doc-list-title">Tracked Documents ({documents.length})</h3>
          {documents.length > 0 ? (
            <div className="doc-list">
              {documents.map((doc, idx) => (
                <div key={idx} className="doc-item" title={doc}>
                  <div className="doc-icon"><IconFile /></div>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No documents added yet.</p>
          )}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <p><strong>Locality Core</strong></p>
          <p style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block',
              background: modelStatus === 'ready' ? '#10b981' : modelStatus === 'downloading' ? '#f59e0b' : modelStatus === 'error' ? '#ef4444' : '#6b7280',
              boxShadow: modelStatus === 'ready' ? '0 0 6px #10b981' : modelStatus === 'downloading' ? '0 0 6px #f59e0b' : 'none',
              animation: modelStatus === 'downloading' ? 'pulse 1.5s infinite' : 'none',
            }} />
            LLM: {modelStatus === 'ready' ? 'Qwen 2.5 Ready' : modelStatus === 'downloading' ? 'Downloading...' : modelStatus === 'error' ? 'Load Error' : 'Not Loaded'}
          </p>
          <p>Vector DB: ChromaDB</p>
          <p>Embeddings: MiniLM-L6</p>
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
        </div>
      </aside>

      {/* Main Chat Panel */}
      <main className="chat-container glass-panel">
        <header className="chat-header">
          <h1>Locality Intelligence Engine</h1>
          <div className="status-indicator">
            <div className="status-dot"></div>
            Engine Active
          </div>
        </header>

        <div className="messages-area">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-wrapper ${msg.role}`}>
              <div className={`message ${msg.role}`}>
                {msg.isTyping ? (
                  <div className="typing-dots">
                    <span></span><span></span><span></span>
                  </div>
                ) : (
                  msg.content
                )}

                {msg.sources && msg.sources.length > 0 && (
                  <div className="sources-list">
                    <strong>Sources:</strong>
                    <div>
                      {msg.sources.map((src, idx) => (
                        <span key={idx} className="source-item">{src.split('\\').pop() || src.split('/').pop()}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form className="input-area" onSubmit={handleSend}>
          <div className="input-container">
            <input
              type="text"
              className="chat-input"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Ask your private brain anything..."
            />
            <button
              type="submit"
              className="send-btn"
              disabled={!inputVal.trim() || messages.some(m => m.isTyping)}
            >
              <IconSend />
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default App;
