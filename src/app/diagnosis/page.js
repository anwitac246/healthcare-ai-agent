'use client';
import React, { useState, useRef, useEffect } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import Navbar from '@/components/navbar';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaArrowDown,
  FaPaperPlane,
  FaBars,
  FaTimes,
  FaPlus,
  FaPaperclip,
} from 'react-icons/fa';
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
  const fileInputRef = useRef(null);


  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, u => {
      if (u) setUser(u);
      else router.push('/login');
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    async function load() {
      const mod = await import('../firebase-config');
      if (mod.db) {
        setDb(mod.db);
        if (user) startNewChat(mod.db, user);
      }
    }
    load();
  }, [user]);


  useEffect(() => {
    if (!db || !user) return;
    const chatsRef = ref(db, `chats/${user.uid}`);
    return onValue(chatsRef, snap => {
      const data = snap.val() || {};
      const list = Object.entries(data)
        .filter(([_, c]) => c.summary?.trim())
        .map(([id, c]) => ({ conversationId: id, ...c }));
      setChatHistories(list);
    });
  }, [db, user]);

 
  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      setShowScrollButton(el.scrollHeight - el.scrollTop - el.clientHeight > 300);
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToBottom = () => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  };


  const extractSummary = text => {
    const m = text.match(/SUMMARY:\s*(.*)/);
    return m ? m[1] : text.split(' ').slice(0, 10).join(' ') + '...';
  };
  const calculateAge = dob => {
    const d = new Date(dob),
      t = new Date();
    let age = t.getFullYear() - d.getFullYear();
    if (
      t.getMonth() < d.getMonth() ||
      (t.getMonth() === d.getMonth() && t.getDate() < d.getDate())
    )
      age--;
    return age;
  };

  const startNewChat = (firebaseDb = db, u = user) => {
    setMessages([]);
    setCurrentChat(null);
    const convoRef = push(ref(firebaseDb, `chats/${u.uid}`));
    setConversationId(convoRef.key);
    set(convoRef, { summary: '', messages: {} }).catch(console.error);
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input, timestamp: Date.now() };
    setMessages(m => [...m, userMsg]);
    if (db && conversationId && user) {
      await push(ref(db, `chats/${user.uid}/${conversationId}/messages`), userMsg);
    }
    try {
      const { data } = await axios.post('http://localhost:7000/chat', {
        message: input,
        history: messages.filter(m => m.role === 'user').slice(-10),
      });
      const botMsg = {
        role: 'assistant',
        content: `${data.response}\n\n**Confidence:** ${data.confidence}%`,
        timestamp: Date.now(),
      };
      setMessages(m => [...m, botMsg]);
      if (db && conversationId && user) {
        await push(
          ref(db, `chats/${user.uid}/${conversationId}/messages`),
          botMsg
        );
      }
     
      if (!currentChat) {
        const summary = extractSummary(data.response);
        const newChat = { summary, messages: [userMsg, botMsg] };
        setChatHistories(h => [...h, { conversationId, ...newChat }]);
        setCurrentChat(newChat);
        await set(
          ref(db, `chats/${user.uid}/${conversationId}/summary`),
          summary
        );
      } else {
        setCurrentChat(prev => ({
          ...prev,
          messages: [
            ...(Array.isArray(prev.messages) ? prev.messages : []),
            userMsg,
            botMsg,
          ],
        }));
      }
   
      if (data.confidence >= 80) {
        generateMDReport(
          user.displayName,
          user.email,
          user.dob,
          data.response,
          data.confidence
        );
      }
    } catch (err) {
      console.error(err);
      setMessages(m => [
        ...m,
        {
          role: 'assistant',
          content: '**Error:** Unable to reach server.',
          timestamp: Date.now(),
        },
      ]);
    }
    setInput('');
    setTimeout(scrollToBottom, 100);
  };


  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

 
  const handleImageUpload = async e => {
    const file = e.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    try {
      const { data: imgData } = await axios.post(
        'http://localhost:7000/classify',
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      const { class_name, confidence } = imgData.image_classification;
      const msg = {
        role: 'user',
        content: `Patient image: ${class_name} (${confidence}%). Please advise.`,
        timestamp: Date.now(),
      };
      setMessages(m => [...m, msg]);
      if (db && conversationId && user) {
        await push(
          ref(db, `chats/${user.uid}/${conversationId}/messages`),
          msg
        );
      }
      const { data: chatData } = await axios.post(
        'http://localhost:7000/chat',
        { message: msg.content }
      );
      const botMsg = {
        role: 'assistant',
        content: `${chatData.response}\n\n**Confidence:** ${confidence}%`,
        timestamp: Date.now(),
      };
      setMessages(m => [...m, botMsg]);
      if (db && conversationId && user) {
        await push(
          ref(db, `chats/${user.uid}/${conversationId}/messages`),
          botMsg
        );
      }
      if (confidence >= 80) {
        generateMDReport(
          user.displayName,
          user.email,
          user.dob,
          chatData.response,
          confidence
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

 
  const generateMDReport = (name, email, dob, diag, conf) => {
    let md = `# Diagnosis Report\n\n**Name:** ${name || '___'}\n\n**Email:** ${
      email || '___'
    }\n\n`;
    md += dob ? `**Age:** ${calculateAge(dob)}\n\n` : '**Age:** ___\n\n';
    md += `## Diagnosis:\n\n${diag}\n\n**Confidence:** ${conf}%\n`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'report.md';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };


  const loadChatHistory = history => {
    const msgs = Array.isArray(history.messages)
      ? history.messages
      : Object.values(history.messages || {}).sort(
          (a, b) => a.timestamp - b.timestamp
        );
    setMessages(msgs);
    setCurrentChat(history);
    setConversationId(history.conversationId);
    setTimeout(scrollToBottom, 100);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-white to-[#006A71]">
      <Navbar />

      <div className="flex flex-1 relative my-20">
        
        <motion.div
          className="fixed top-16 left-0 z-20 h-full w-64 bg-[#006A71]/90 backdrop-blur-lg p-4 flex flex-col shadow-xl"
          initial={{ x: -300 }}
          animate={{ x: sidebarOpen ? 0 : -300 }}
          transition={{ type: 'tween', duration: 0.3 }}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-white text-xl font-bold">Chats</h2>
            <button onClick={() => setSidebarOpen(false)}>
              <FaTimes size={20} className="text-white hover:text-[#9ACBD0]" />
            </button>
          </div>
          <button
            onClick={() => startNewChat()}
            className="mb-4 mx-auto p-2 bg-[#48A6A7] rounded-full text-white hover:bg-[#9ACBD0] transition shadow"
          >
            <FaPlus />
          </button>
          <div className="flex-1 overflow-y-auto space-y-2">
            {chatHistories.map((h, i) => (
              <button
                key={i}
                onClick={() => loadChatHistory(h)}
                className="w-full text-left px-3 py-2 bg-[#48A6A7] text-white rounded-lg hover:bg-[#9ACBD0] transition"
              >
                {h.summary}
              </button>
            ))}
          </div>
        </motion.div>

        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed top-20 left-2 z-30 p-2 bg-[#006A71] text-white rounded-full shadow hover:bg-[#48A6A7] transition"
          >
            <FaBars />
          </button>
        )}

      
        <div className="flex-1 flex flex-col ml-[250px] border-l border-[#9ACBD0]">
        <div
            ref={chatContainerRef}
            className="relative flex-1 overflow-y-auto p-6 space-y-4 bg-center bg-no-repeat bg-cover min-h-0"
            style={{
              backgroundImage: "url('/images/chat_bg.jpg')",
              backgroundSize: 'cover',
              backgroundRepeat: 'no-repeat',
            }}
          >
            

            <div className="relative space-y-4">
              <AnimatePresence initial={false}>
                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${
                      msg.role === 'assistant' ? 'justify-start' : 'justify-end'
                    }`}
                  >
                    <div
                      className={`p-4 rounded-xl max-w-[70%] shadow-md ${
                        msg.role === 'assistant'
                          ? 'bg-[#006A71] text-white'
                          : 'bg-white text-[#006A71] border border-[#9ACBD0]'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {showScrollButton && (
            <button
              onClick={scrollToBottom}
              className="fixed bottom-24 right-8 bg-[#48A6A7] p-3 rounded-full shadow-lg hover:bg-[#9ACBD0] transition"
            >
              <FaArrowDown className="text-white" />
            </button>
          )}

        
          <div className="fixed bottom-0 left-[250px] w-[calc(100%-250px)] p-4 bg-white/90 border-t border-[#9ACBD0] shadow-lg backdrop-blur-sm">
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-end space-x-2"
            >
              <TextareaAutosize
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 bg-white text-black border border-[#9ACBD0] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#48A6A7]"
                minRows={1}
                maxRows={4}
              />

      
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                className="p-2 bg-white border border-[#006A71] rounded-full hover:bg-[#f0f0f0] transition"
              >
                <FaPaperclip size={20} className="text-[#006A71]" />
              </button>

            
              <button
                type="submit"
                className="p-2 bg-[#006A71] border border-[#004B5F] text-white rounded-full hover:bg-[#004B5F] transition"
              >
                <FaPaperPlane size={20} />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
