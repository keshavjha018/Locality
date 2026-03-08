import { IconUpload, IconRefresh, IconFile, IconTrash } from './Icons';

interface SidebarProps {
    documents: string[];
    isSyncing: boolean;
    isUploading: boolean;
    syncStatus: string | null;
    modelStatus: string;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSync: () => void;
    handleDelete: (filename: string) => void;
}

export function Sidebar({
    documents,
    isSyncing,
    isUploading,
    syncStatus,
    modelStatus,
    handleFileUpload,
    handleSync,
    handleDelete
}: SidebarProps) {
    return (
        <aside className="sidebar glass-panel">
            <h2>⚙️ Knowledge Base</h2>

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
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{doc}</span>
                                <button
                                    onClick={() => handleDelete(doc)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', opacity: 0.7 }}
                                    onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
                                    onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                    title="Delete document"
                                >
                                    <IconTrash />
                                </button>
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
    );
}
