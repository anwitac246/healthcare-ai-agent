'use client';
import React, { useState, useRef, useEffect } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import Navbar from '@/components/navbar';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowDown, FaPaperPlane } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Diagnosis() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [showScrollButton, setShowScrollButton] = useState(false);
    const chatContainerRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        const chatContainer = chatContainerRef.current;
        if (!chatContainer) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = chatContainer;
            setShowScrollButton(scrollHeight - scrollTop - clientHeight > 300);
        };

        chatContainer.addEventListener('scroll', handleScroll);
        return () => chatContainer.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToBottom = () => {
        chatContainerRef.current.scrollTo({
            top: chatContainerRef.current.scrollHeight,
            behavior: 'smooth',
        });
    };

    const handleSendMessage = async () => {
        if (!input.trim()) return;
        const newUserMessage = { role: 'user', content: input };
        setMessages((prev) => [...prev, newUserMessage]);

        try {
            const response = await axios.post('http://localhost:7000/chat', { message: input });
            const botResponse = response.data.response;
            const confidence = response.data.confidence || 'N/A';
            const newBotMessage = { role: 'bot', content: `${botResponse}\n\n**Confidence:** ${confidence}%` };
            setMessages((prev) => [...prev, newBotMessage]);
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages((prev) => [
                ...prev,
                { role: 'bot', content: '**Error:** Unable to communicate with the server.' },
            ]);
        }
        setInput('');
        setTimeout(scrollToBottom, 100);
        inputRef.current.focus();
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
            <Navbar />
            <div className="flex flex-1 pt-16">
                <div className="w-1/4 bg-gray-800 p-4"></div>
                <div className="w-[2px] bg-gray-700"></div>
                <div className="w-3/4 flex flex-col relative">
                    <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
                        <AnimatePresence>
                            {messages.map((msg, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3 }}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    {msg.role === 'bot' ? (
                                        <div className="p-3 rounded-lg max-w-md bg-gray-700 text-white">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                        </div>
                                    ) : (
                                        <div className="p-3 rounded-lg max-w-md bg-green-500 text-white">
                                            {msg.content}
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                    {showScrollButton && (
                        <button onClick={scrollToBottom} className="fixed bottom-24 right-8 bg-green-500 p-2 rounded-full shadow-lg hover:bg-green-400 transition">
                            <FaArrowDown className="text-white" />
                        </button>
                    )}
                    <div className="fixed bottom-0 left-1/4 w-3/4 p-4 bg-gray-800 border-t border-gray-700">
                        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center">
                            <TextareaAutosize ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your message..." className="flex-1 p-2 bg-gray-700 text-white border border-gray-600 rounded-l-lg resize-none" minRows={1} maxRows={6} />
                            <button type="submit" className="bg-green-500 text-white p-3 rounded-r-lg hover:bg-green-400 transition"><FaPaperPlane /></button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
