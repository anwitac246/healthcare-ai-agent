'use client';
import React, { useState, useRef, useEffect } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import Navbar from '@/components/navbar';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowDown, FaPaperPlane } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ref, push, set, onValue } from 'firebase/database';

export default function Diagnosis() {
  const [db, setDb] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [chatHistories, setChatHistories] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);


  useEffect(() => {
    async function loadFirebase() {
      try {
        const mod = await import('../firebase-config');
        if (mod.db) {
          setDb(mod.db);
          startNewChat(mod.db);
        } else {
          console.error("Firebase db not found in module.");
        }
      } catch (error) {
        console.error("Firebase import error:", error);
      }
    }
    loadFirebase();
  }, []);

  useEffect(() => {
    if (db) {
      const chatsRef = ref(db, 'chats');
      onValue(chatsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const histories = [];
          for (const key in data) {
     
            if (data[key].summary && data[key].summary.trim() !== '') {
              histories.push({ conversationId: key, ...data[key] });
            }
          }
          setChatHistories(histories);
        }
      }, (error) => {
        console.error("Error fetching chats:", error);
      });
    }
  }, [db]);

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
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  const extractSummary = (text) => {
    const match = text.match(/SUMMARY:\s*(.*)/);
    return match ? match[1] : null;
  };

  const startNewChat = (firebaseDb = db) => {
    setMessages([]);
    setCurrentChat(null);
    if (firebaseDb) {
      const newConvoRef = push(ref(firebaseDb, 'chats'));
      setConversationId(newConvoRef.key);
      set(newConvoRef, { summary: '', messages: {} })
        .then(() => console.log("New conversation started with ID:", newConvoRef.key))
        .catch(err => console.error("Error starting new conversation:", err));
    } else {
      setConversationId(null);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const newUserMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, newUserMessage]);

    if (db && conversationId) {
      push(ref(db, `chats/${conversationId}/messages`), newUserMessage)
        .then(() => console.log("User message saved"))
        .catch(err => console.error("Error saving user message:", err));
    }

    try {
      const response = await axios.post('http://localhost:7000/chat', { message: input });
      const botResponse = response.data.response || 'No response received.';
      const confidence = response.data.confidence || 'N/A';
      const newBotMessage = { role: 'bot', content: `${botResponse}\n\n**Confidence:** ${confidence}%` };
      setMessages(prev => [...prev, newBotMessage]);

      if (db && conversationId) {
        push(ref(db, `chats/${conversationId}/messages`), newBotMessage)
          .then(() => console.log("Bot message saved"))
          .catch(err => console.error("Error saving bot message:", err));
      }

      if (!currentChat) {
        const summary = extractSummary(botResponse);
        if (summary) {
          const newChat = { summary, messages: [newUserMessage, newBotMessage] };
          setChatHistories(prev => [...prev, newChat]);
          setCurrentChat(newChat);
          if (db && conversationId) {
            set(ref(db, `chats/${conversationId}/summary`), summary)
              .then(() => console.log("Conversation summary saved:", summary))
              .catch(err => console.error("Error saving conversation summary:", err));
          }
        }
      } else {
        currentChat.messages.push(newUserMessage, newBotMessage);
      }
    } catch (error) {
      const errorMsg = { role: 'bot', content: '**Error:** Unable to communicate with the server.' };
      setMessages(prev => [...prev, errorMsg]);
      if (db && conversationId) {
        push(ref(db, `chats/${conversationId}/messages`), errorMsg)
          .then(() => console.log("Error message saved"))
          .catch(err => console.error("Error saving error message:", err));
      }
    }

    setInput('');
    setTimeout(scrollToBottom, 100);
    inputRef.current?.focus();
  };

  const loadChatHistory = (history) => {
   
    let loadedMessages = [];
    if (history && history.messages) {
      if (Array.isArray(history.messages)) {
        loadedMessages = history.messages;
      } else if (typeof history.messages === 'object') {
        loadedMessages = Object.values(history.messages);
      }
    }
    setMessages(loadedMessages);
    setCurrentChat(history);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      <Navbar />
      <div className="flex flex-1 pt-16">
        <div className="w-1/4 bg-gray-800 p-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => startNewChat()}
            className="w-full p-2 text-left bg-blue-600 text-white rounded-md hover:bg-blue-500 transition"
          >
            + New Chat
          </button>
          {chatHistories.map((history, index) => (
            <button
              key={index}
              onClick={() => loadChatHistory(history)}
              className="w-full p-2 text-left bg-gray-700 text-white rounded-md hover:bg-gray-600 transition"
            >
              {history.summary}
            </button>
          ))}
        </div>
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
              <TextareaAutosize
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 p-2 bg-gray-700 text-white border border-gray-600 rounded-l-lg resize-none"
                minRows={1}
                maxRows={6}
              />
              <button type="submit" className="bg-green-500 text-white p-3 rounded-r-lg hover:bg-green-400 transition">
                <FaPaperPlane />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
