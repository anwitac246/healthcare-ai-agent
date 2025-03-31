'use client';
import React, { useState, useRef, useEffect } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import Navbar from '@/components/navbar';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowDown, FaPaperPlane, FaBars, FaTimes, FaPlus } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ref, push, set, onValue } from 'firebase/database';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

export default function Diagnosis() {
  const router = useRouter();
  const [db, setDb] = useState(null);
  const [user, setUser] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [chatHistories, setChatHistories] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, firebaseUser => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        router.push('/login');
      }
    });
    return unsubscribe;
  }, [router]);


  useEffect(() => {
    async function loadFirebase() {
      try {
        const mod = await import('../firebase-config');
        if (mod.db) {
          setDb(mod.db);
          if (user) {
            startNewChat(mod.db, user);
          }
        } else {
          console.error("Firebase db not found in module.");
        }
      } catch (error) {
        console.error("Firebase import error:", error);
      }
    }
    loadFirebase();
  }, [user]);


  useEffect(() => {
    if (db && user) {
      const chatsRef = ref(db, `chats/${user.uid}`);
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
  }, [db, user]);

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

  
  const startNewChat = (firebaseDb = db, currentUser = user) => {
    setMessages([]);
    setCurrentChat(null);
    if (firebaseDb && currentUser) {
      const newConvoRef = push(ref(firebaseDb, `chats/${currentUser.uid}`));
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
    const newUserMessage = { role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, newUserMessage]);

    if (db && conversationId && user) {
      push(ref(db, `chats/${user.uid}/${conversationId}/messages`), newUserMessage)
        .then(() => console.log("User message saved"))
        .catch(err => console.error("Error saving user message:", err));
    }

    try {
      const response = await axios.post('http://localhost:7000/chat', { message: input });
      const botResponse = response.data.response || 'No response received.';
      const confidence = response.data.confidence || 'N/A';
      const newBotMessage = { role: 'bot', content: `${botResponse}\n\n**Confidence:** ${confidence}%`, timestamp: Date.now() };
      setMessages(prev => [...prev, newBotMessage]);

      if (db && conversationId && user) {
        push(ref(db, `chats/${user.uid}/${conversationId}/messages`), newBotMessage)
          .then(() => console.log("Bot message saved"))
          .catch(err => console.error("Error saving bot message:", err));
      }

      if (!currentChat) {
        const summary = extractSummary(botResponse);
        if (summary) {
          const newChat = { summary, messages: [newUserMessage, newBotMessage] };
          setChatHistories(prev => [...prev, { conversationId, ...newChat }]);
          setCurrentChat(newChat);
          if (db && conversationId && user) {
            set(ref(db, `chats/${user.uid}/${conversationId}/summary`), summary)
              .then(() => console.log("Conversation summary saved:", summary))
              .catch(err => console.error("Error saving conversation summary:", err));
          }
        }
      } else {
    
        setCurrentChat(prev => ({
          ...prev,
          messages: [...prev.messages, newUserMessage, newBotMessage],
        }));
      }
    } catch (error) {
      const errorMsg = { role: 'bot', content: '**Error:** Unable to communicate with the server.', timestamp: Date.now() };
      setMessages(prev => [...prev, errorMsg]);
      if (db && conversationId && user) {
        push(ref(db, `chats/${user.uid}/${conversationId}/messages`), errorMsg)
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
        loadedMessages = Object.values(history.messages).sort((a, b) => a.timestamp - b.timestamp);
      }
    }
    setMessages(loadedMessages);
    setCurrentChat(history);
    setConversationId(history.conversationId);
  };

  return (
    <div className="min-h-screen bg-white text-green-800 flex flex-col">
      <Navbar />
      <div className="flex flex-1 pt-16 relative">
      
        <motion.div
          className="fixed top-20 left-0 z-20"
          initial={{ x: -250 }}
          animate={{ x: sidebarOpen ? 0 : -250 }}
          transition={{ type: 'tween', duration: 0.3 }}
        >
          <div className="w-64 bg-green-700 h-screen p-4 shadow-lg flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl text-white font-bold">Chats</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 text-white hover:text-green-300"
              >
                <FaTimes size={20} />
              </button>
            </div>
    
            <button
              onClick={() => startNewChat()}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500 text-white hover:bg-green-600 transition mb-4 mx-auto shadow"
            >
              <FaPlus size={16} />
            </button>
            <div className="space-y-3">
              {chatHistories.map((history, index) => (
                <button
                  key={index}
                  onClick={() => loadChatHistory(history)}
                  className="w-full text-left px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition shadow"
                >
                  {history.summary}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
  
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed top-20 left-2 z-30 p-2 bg-green-700 text-white rounded shadow hover:bg-green-600 transition"
          >
            <FaBars size={20} />
          </button>
        )}

        <div className="flex-1 flex flex-col relative border-l border-green-300 ml-[250px]">
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 pb-24">
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
                    <div className="p-4 rounded-lg max-w-md bg-green-700 text-white shadow-lg">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg max-w-md bg-green-300 text-green-900 shadow-lg">
                      {msg.content}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {showScrollButton && (
            <button onClick={scrollToBottom} className="fixed bottom-24 right-8 bg-green-500 p-3 rounded-full shadow-lg hover:bg-green-400 transition">
              <FaArrowDown size={20} className="text-white" />
            </button>
          )}
          <div className="fixed bottom-0 left-[250px] w-[calc(100%-250px)] p-4 bg-green-100 border-t border-green-300 shadow">
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center">
              <TextareaAutosize
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 p-3 bg-green-50 text-green-900 border border-green-300 rounded-l-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                minRows={1}
                maxRows={6}
              />
              <button type="submit" className="bg-green-500 text-white p-3 rounded-r-lg hover:bg-green-400 transition">
                <FaPaperPlane size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
