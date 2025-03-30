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
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <div className="flex flex-1 pt-16">
        {/* Fixed Sidebar */}
        <div className="fixed top-16 left-0 w-1/4 h-[calc(100vh-4rem)] bg-green-700 p-6 space-y-4 shadow-lg overflow-y-auto">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => startNewChat()}
            className="w-full p-3 text-left bg-green-800 text-white rounded-lg transition-all"
          >
            + New Chat
          </motion.button>
          {chatHistories.map((history, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => loadChatHistory(history)}
              className="w-full p-3 text-left bg-green-600 text-white rounded-lg hover:bg-green-500 transition-all border border-green-400"
            >
              {history.summary}
            </motion.button>
          ))}
        </div>
        {/* Chat Area */}
        <div className="ml-[25%] w-3/4 flex flex-col relative bg-white shadow-lg">
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-8 space-y-6 pb-32">
            <AnimatePresence>
              {messages.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'bot' ? (
                    <div className="p-4 rounded-xl max-w-md bg-gray-200 text-black shadow-md">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl max-w-md bg-white text-black border border-green-700 shadow-md">
                      {msg.content}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {showScrollButton && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={scrollToBottom}
              className="fixed bottom-28 right-8 bg-green-500 p-3 rounded-full shadow-xl hover:bg-green-400 transition"
            >
              <FaArrowDown className="text-white" />
            </motion.button>
          )}
          {/* Input Area */}
          <div className="fixed bottom-0 left-[25%] w-3/4 p-6 bg-green-100 border-t border-green-300 shadow-2xl">
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center space-x-3">
              <TextareaAutosize
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 p-3 bg-white text-black border border-green-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                minRows={1}
                maxRows={6}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                className="bg-green-700 text-white p-3 rounded-lg hover:bg-green-600 transition-all"
              >
                <FaPaperPlane />
              </motion.button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
