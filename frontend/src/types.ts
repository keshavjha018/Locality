export type Message = {
    id: string;
    role: 'user' | 'bot';
    content: string;
    sources?: string[];
    isTyping?: boolean;
};
