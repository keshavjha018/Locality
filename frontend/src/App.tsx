import './index.css';
import { useLocality } from './hooks/useLocality';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';

function App() {
  const {
    backendReady,
    documents,
    isSyncing,
    isUploading,
    syncStatus,
    modelStatus,
    messages,
    handleFileUpload,
    handleSync,
    handleDelete,
    handleSend
  } = useLocality();

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
      <Sidebar
        documents={documents}
        isSyncing={isSyncing}
        isUploading={isUploading}
        syncStatus={syncStatus}
        modelStatus={modelStatus}
        handleFileUpload={handleFileUpload}
        handleSync={handleSync}
        handleDelete={handleDelete}
      />

      <ChatArea
        messages={messages}
        handleSend={handleSend}
      />
    </div>
  );
}

export default App;
