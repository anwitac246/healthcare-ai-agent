
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
  FaMicrophone,
  FaVolumeUp,
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
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = true;
      recog.lang = 'en-US';
      setRecognition(recog);
    }
  }, []);

  useEffect(() => {
    if (!recognition) return;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      setInput(transcript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      setMessages(m => [
        ...m,
        {
          role: 'assistant',
          content: '**Error:** Speech recognition failed. Please try again or type your message.',
          timestamp: Date.now(),
        },
      ]);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    return () => {
      recognition.stop();
    };
  }, [recognition]);

  const toggleRecording = () => {
    if (!recognition) {
      setMessages(m => [
        ...m,
        {
          role: 'assistant',
          content: '**Error:** Speech recognition is not supported in this browser.',
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    if (isRecording) {
      recognition.stop();
    } else {
      try {
        recognition.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Failed to start recognition:', err);
        setMessages(m => [
          ...m,
          {
            role: 'assistant',
            content: '**Error:** Unable to access microphone. Please check permissions.',
            timestamp: Date.now(),
          },
        ]);
      }
    }
  };

  const speakText = (text, index = null) => {
    if (!window.speechSynthesis) {
      setMessages(m => [
        ...m,
        {
          role: 'assistant',
          content: '**Error:** Text-to-speech is not supported in this browser.',
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    window.speechSynthesis.cancel(); // Clear any ongoing speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.volume = 1;
    utterance.rate = 1;
    utterance.pitch = 1;

    setIsSpeaking(true);
    setSpeakingMessageIndex(index);

    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingMessageIndex(null);
    };

    utterance.onerror = (event) => {
      // Avoid error message for intentional cancellation
      if (event.error === 'interrupted' || event.error === 'not-allowed') {
        // Silently handle cancellation or interruption
        setIsSpeaking(false);
        setSpeakingMessageIndex(null);
      } else {
        console.error('Speech synthesis error:', event.error);
        setIsSpeaking(false);
        setSpeakingMessageIndex(null);
        setMessages(m => [
          ...m,
          {
            role: 'assistant',
            content: '**Error:** Failed to read text aloud. Please try again.',
            timestamp: Date.now(),
          },
        ]);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleSpeakInput = () => {
    if (input.trim()) {
      speakText(input);
    } else {
      setMessages(m => [
        ...m,
        {
          role: 'assistant',
          content: '**Info:** No text to read. Please type or speak something first.',
          timestamp: Date.now(),
        },
      ]);
    }
  };

  const handleSpeakMessage = (content, index) => {
    const cleanText = content.replace(/\*\*(.*?)\*\*/g, '$1').replace(/## (.*?)\n/g, '$1. ');
    if (speakingMessageIndex === index && isSpeaking) {
      // Stop speaking
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeakingMessageIndex(null);
    } else {
      // Start speaking from the beginning
      speakText(cleanText, index);
    }
  };

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
    const m = text.match(/SUMMARY:\s*(.+)/);
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

  const handleSendMessage = async (overrideText) => {
    const textToSend = overrideText !== undefined ? overrideText : input;
    if (!textToSend.trim()) return;

    const userMsg = {
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    if (db && conversationId && user) {
      await push(ref(db, `chats/${user.uid}/${conversationId}/messages`), userMsg);
    }

    const historyToSend = updatedMessages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('\n\n');

    try {
      const { data } = await axios.post('http://localhost:7000/chat', {
        message: historyToSend,
      });

      const botMsg = {
        role: 'assistant',
        content: `${data.response}\n\n**Confidence:** ${data.confidence}%`,
        timestamp: Date.now(),
      };

      const afterBotMessages = [...updatedMessages, botMsg];
      setMessages(afterBotMessages);
      if (db && conversationId && user) {
        await push(ref(db, `chats/${user.uid}/${conversationId}/messages`), botMsg);
      }

      if (!currentChat) {
        const summary = extractSummary(data.response);
        setChatHistories(h => [...h, { conversationId, summary, messages: afterBotMessages }]);
        setCurrentChat({ summary, messages: afterBotMessages });
        await set(ref(db, `chats/${user.uid}/${conversationId}/summary`), summary);
      } else {
        setCurrentChat(prev => ({
          ...prev,
          messages: afterBotMessages,
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
      console.error('Chat error:', err);
      const errorMsg = {
        role: 'assistant',
        content: '**Error:** Unable to reach server.',
        timestamp: Date.now(),
      };
      const erroredMessages = [...updatedMessages, errorMsg];
      setMessages(erroredMessages);
      if (db && conversationId && user) {
        await push(ref(db, `chats/${user.uid}/${conversationId}/messages`), errorMsg);
      }
    }

    if (overrideText === undefined) {
      setInput('');
    }

    setTimeout(scrollToBottom, 100);
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);

    const uploadMsg = {
      role: 'user',
      content: `Uploaded document: ${file.name}`,
      timestamp: Date.now(),
    };
    setMessages(m => [...m, uploadMsg]);
    if (db && conversationId && user) {
      await push(ref(db, `chats/${user.uid}/${conversationId}/messages`), uploadMsg);
    }

    const form = new FormData();
    form.append('file', file);

    try {
      const { data } = await axios.post(
        'http://localhost:5000/diagnosis',
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      const summary = data.summary || '';
      if (!summary.trim()) {
        const errorMsg = {
          role: 'assistant',
          content: '**Error:** No summary generated.',
          timestamp: Date.now(),
        };
        setMessages(m => [...m, errorMsg]);
        if (db && conversationId && user) {
          await push(ref(db, `chats/${user.uid}/${conversationId}/messages`), errorMsg);
        }
      } else {
        await handleSendMessage(summary);
      }
    } catch (err) {
      console.error('Document upload error:', err);
      const errorMsg = {
        role: 'assistant',
        content: '**Error:** Failed to process document. Please try again.',
        timestamp: Date.now(),
      };
      setMessages(m => [...m, errorMsg]);
      if (db && conversationId && user) {
        await push(ref(db, `chats/${user.uid}/${conversationId}/messages`), errorMsg);
      }
    } finally {
      setIsUploading(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const generateMDReport = (name, email, dob, diag, conf) => {
    let md = `# Diagnosis Report\n\n**Name:** ${name || '___'}\n\n**Email:** ${email || '___'}\n\n`;
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-white to-[#F5F5F5]">
      <Navbar />
      <div className="flex flex-1 relative my-20">
        <motion.div
          className="fixed top-16 left-0 z-20 h-full w-64 bg-[#64A65F]/90 backdrop-blur-lg p-4 flex flex-col shadow-xl"
          initial={{ x: -300 }}
          animate={{ x: sidebarOpen ? 0 : -300 }}
          transition={{ type: 'tween', duration: 0.3 }}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[#F5F5F5] text-xl font-bold">Chats</h2>
            <button onClick={() => setSidebarOpen(false)}>
              <FaTimes size={20} className="text-[#F5F5F5] hover:text-[#A8D5A2]" />
            </button>
          </div>
          <button
            onClick={() => startNewChat()}
            className="mb-4 mx-auto p-2 bg-[#4B8C47] rounded-full text-[#F5F5F5] hover:bg-[#A8D5A2] transition shadow"
          >
            <FaPlus />
          </button>
          <div className="flex-1 overflow-y-auto space-y-2">
            {chatHistories.map((h, i) => (
              <button
                key={i}
                onClick={() => loadChatHistory(h)}
                className="w-full text-left px-3 py-2 bg-[#4B8C47] text-[#F5F5F5] rounded-lg hover:bg-[#A8D5A2] transition"
              >
                {h.summary}
              </button>
            ))}
          </div>
        </motion.div>

        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed top-20 left-2 z-30 p-2 bg-[#64A65F] text-[#F5F5F5] rounded-full shadow hover:bg-[#4B8C47] transition"
          >
            <FaBars />
          </button>
        )}
        
        
        <div className="flex-1 flex flex-col ml-[250px] border-l border-[#A8D5A2]">
        

        <div
  ref={chatContainerRef}
  className="relative flex-1 overflow-y-auto p-6 space-y-4 min-h-0 h-300"
>

  <div
    className="absolute inset-0 bg-center bg-no-repeat bg-cover h-200"
    style={{
      backgroundImage: "url('/bg.png')",
      opacity: 0.3,
    }}
  />

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
                      className={`p-4 rounded-xl max-w-[70%] shadow-md relative ${
                        msg.role === 'assistant'
                          ? 'bg-[#063902] text-[#F5F5F5]'
                          : 'bg-[#64A65F] text-black border border-[#A8D5A2]'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                          <button
                            onClick={() => handleSpeakMessage(msg.content, idx)}
                            className={`absolute top-2 right-2 p-1 rounded-full ${
                              speakingMessageIndex === idx
                                ? 'bg-yellow-500 text-white'
                                : 'bg-[#F5F5F5]/20 text-[#F5F5F5] hover:bg-[#F5F5F5]/40'
                            } transition`}
                            aria-label="Read response aloud"
                          >
                            <FaVolumeUp size={16} />
                          </button>
                        </>
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
              className="fixed bottom-24 right-8 bg-[#4B8C47] p-3 rounded-full shadow-lg hover:bg-[#A8D5A2] transition"
            >
              <FaArrowDown className="text-[#F5F5F5]" />
            </button>
          )}

          <div className="fixed bottom-0 left-[250px] w-[calc(100%-250px)] p-4 bg-white/90 border-t border-[#A8D5A2] shadow-lg backdrop-blur-sm">
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
                placeholder="Type or speak a message..."
                className="flex-1 px-4 py-2 bg-white text-black border border-[#A8D5A2] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#4B8C47]"
                minRows={1}
                maxRows={4}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                disabled={isUploading}
                className={`p-2 border border-[#64A65F] rounded-full transition ${
                  isUploading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-white text-[#64A65F] hover:bg-[#F5F5F5]'
                }`}
                aria-label="Attach document"
              >
                <FaPaperclip size={20} />
              </button>

              <button
                type="button"
                onClick={toggleRecording}
                className={`p-2 border border-[#64A65F] rounded-full transition ${
                  isRecording
                    ? 'bg-red-500 text-white'
                    : 'bg-white text-[#64A65F] hover:bg-[#F5F5F5]'
                }`}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              >
                <FaMicrophone size={20} />
              </button>

              <button
                type="button"
                onClick={handleSpeakInput}
                className={`p-2 border border-[#64A65F] rounded-full transition ${
                  isSpeaking && speakingMessageIndex === null
                    ? 'bg-yellow-500 text-white'
                    : 'bg-white text-[#64A65F] hover:bg-[#F5F5F5]'
                }`}
                aria-label="Read input aloud"
              >
                <FaVolumeUp size={20} />
              </button>

              <button
                type="submit"
                className="p-2 bg-[#64A65F] border border-[#4B8C47] text-[#F5F5F5] rounded-full hover:bg-[#4B8C47] transition"
                aria-label="Send message"
              >
                <FaPaperPlane size={20} />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.docx,.txt"
                onChange={handleDocumentUpload}
                style={{ display: 'none' }}
              />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
