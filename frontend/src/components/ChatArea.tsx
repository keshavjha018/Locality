import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { IconSend } from './Icons';
import type { Message } from '../types';

interface ChatAreaProps {
    messages: Message[];
    handleSend: (query: string) => void;
}

export function ChatArea({ messages, handleSend }: ChatAreaProps) {
    const [inputVal, setInputVal] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const onSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        handleSend(inputVal);
        setInputVal('');
    };

    return (
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
                                <div className="markdown-content">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>
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

            <form className="input-area" onSubmit={onSubmit}>
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
    );
}
