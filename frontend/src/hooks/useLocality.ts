import { useState, useEffect } from 'react';
import type { Message } from '../types';

export function useLocality() {
    const [backendReady, setBackendReady] = useState(false);
    const [documents, setDocuments] = useState<string[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [syncStatus, setSyncStatus] = useState<string | null>(null);
    const [modelStatus, setModelStatus] = useState<string>('not_loaded');

    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'bot', content: 'Hello! I am Locality, your completely private, local AI assistant. Point me to a folder with your documents, hit sync, and ask me anything.' }
    ]);

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
                await fetchDocuments();
                setTimeout(() => setSyncStatus(null), 5000);
            } else {
                setSyncStatus(`Upload Error: ${data.message}`);
            }
        } catch (err) {
            setSyncStatus('Failed to connect to backend for upload.');
        } finally {
            setIsUploading(false);
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
                setTimeout(fetchDocuments, 2000);
                setTimeout(() => {
                    fetchDocuments();
                    setSyncStatus(null);
                }, 5000);
            }
        } catch (err) {
            setSyncStatus('Failed to connect to backend.');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDelete = async (filename: string) => {
        if (!confirm(`Are you sure you want to delete ${filename}?`)) return;

        setSyncStatus(`Deleting ${filename}...`);
        try {
            const res = await fetch(`http://localhost:8080/api/documents/${filename}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (res.ok) {
                setSyncStatus(`Deleted ${filename}. Syncing changes...`);
                fetchDocuments();
                setTimeout(() => {
                    fetchDocuments();
                    setSyncStatus(null);
                }, 4000);
            } else {
                setSyncStatus(`Error deleting: ${data.message || 'Unknown error'}`);
            }
        } catch (err) {
            setSyncStatus('Failed to delete document.');
        }
    };

    const handleSend = async (query: string) => {
        if (!query.trim()) return;

        const userMsgId = Date.now().toString();
        setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: query }]);

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

    return {
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
    };
}
