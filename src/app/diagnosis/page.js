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
  const [selectedImage, setSelectedImage] = useState(null);
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
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    async function loadFirebase() {
      try {
        const mod = await import('../firebase-config');
        if (mod.db) {
          setDb(mod.db);
          if (user) startNewChat(mod.db, user);
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
          const histories = Object.entries(data)
            .filter(([_, chat]) => chat.summary && chat.summary.trim() !== '')
            .map(([key, chat]) => ({ conversationId: key, ...chat }));
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
    if (match) return match[1];
    return text.split(" ").slice(0, 10).join(" ") + "...";
  };

  function calculateAge(dobString) {
    const birthDate = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const formData = new FormData();
      formData.append('file', file);
      try {
      
        const response = await axios.post("http://localhost:7000/classify", formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const { class_name, confidence } = response.data.image_classification;

        const classificationMessage = `Patient uploaded an image. The diagnosis suggests: ${class_name} with ${confidence}% confidence. Please give medical insights or ask further questions.`;
        const newImageMessage = {
          role: "user",
          content: classificationMessage,
          timestamp: Date.now()
        };
        setMessages((prev) => [...prev, newImageMessage]);
        if (db && conversationId && user) {
          await push(ref(db, `chats/${user.uid}/${conversationId}/messages`), newImageMessage);
          console.log("Image message saved");
        }
     
        const chatResponse = await axios.post("http://localhost:7000/chat", {
          message: classificationMessage
        });
        const botReply = chatResponse.data.response;
        const newBotMessage = {
          role: "assistant",
          content: `${botReply}\n\n**Confidence:** ${confidence}%`,
          timestamp: Date.now()
        };
        setMessages((prev) => [...prev, newBotMessage]);
        if (db && conversationId && user) {
          await push(ref(db, `chats/${user.uid}/${conversationId}/messages`), newBotMessage);
          console.log("Bot reply saved");
        }
        if (!currentChat) {
          const summary = extractSummary(newBotMessage.content);
          const newChat = { summary, messages: [classificationMessage, newBotMessage] };
          setChatHistories((prev) => [...prev, { conversationId, ...newChat }]);
          setCurrentChat(newChat);
          if (db && conversationId && user) {
            await set(ref(db, `chats/${user.uid}/${conversationId}/summary`), summary)
              .catch(err => console.error("Error saving conversation summary:", err));
          }
        } else {
          setCurrentChat(prev => {
            let prevMessages = Array.isArray(prev.messages) ? prev.messages : Object.values(prev.messages || {});
            return { ...prev, messages: [...prevMessages, newUserMessage, newBotMessage] };
          });
        }
        if (confidence >= 80) {
          generateMDReport(user.name, user.email, user.dob, botReply, confidence);
        }
      } catch (error) {
        console.error("Error during image classification or bot chat:", error);
      }
      
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const newUserMessage = { role: "user", content: input, timestamp: Date.now() };
    setMessages((prev) => [...prev, newUserMessage]);
    if (db && conversationId && user) {
      await push(ref(db, `chats/${user.uid}/${conversationId}/messages`), newUserMessage)
        .catch((err) => console.error("Error saving user message:", err));
    }
    try {
      const response = await axios.post("http://localhost:7000/chat", {
        message: input,
        history: [...messages.filter((msg) => msg.role === "user"), newUserMessage].slice(-10),
      });
      const botResponse = response.data.response || "No response received.";
      const confidence = response.data.confidence || 0;
      const newBotMessage = {
        role: "assistant",
        content: `${botResponse}\n\n**Confidence:** ${confidence}%`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, newBotMessage]);
      if (db && conversationId && user) {
        await push(ref(db, `chats/${user.uid}/${conversationId}/messages`), newBotMessage)
          .catch((err) => console.error("Error saving bot message:", err));
      }
      
      if (!currentChat) {
        const summary = extractSummary(botResponse);
        const newChat = { summary, messages: [newUserMessage, newBotMessage] };
        setChatHistories((prev) => [...prev, { conversationId, ...newChat }]);
        setCurrentChat(newChat);
        if (db && conversationId && user) {
          await set(ref(db, `chats/${user.uid}/${conversationId}/summary`), summary)
            .catch(err => console.error("Error saving conversation summary:", err));
        }
      } else {
        setCurrentChat(prev => {
          let prevMessages = Array.isArray(prev.messages) ? prev.messages : Object.values(prev.messages || {});
          return { ...prev, messages: [...prevMessages, newUserMessage, newBotMessage] };
        });
      }
      if (confidence >= 80) {
        generateMDReport(user.name, user.email, user.dob, botResponse, confidence);
      }
    } catch (error) {
      console.error("Error communicating with the server:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "**Error:** Unable to communicate with the server.", timestamp: Date.now() },
      ]);
    }
    setInput("");
    setTimeout(scrollToBottom, 100);
    inputRef.current?.focus();
  };

  const generateMDReport = (userName, userEmail, userDOB, diagnosisText, confidence) => {
    let mdReport = `# AetherCare Diagnosis Report\n\n`;
    mdReport += `**Name:** ${userName || "____________________"}\n\n`;
    mdReport += `**Email:** ${userEmail || "____________________"}\n\n`;
    if (userDOB) {
      const age = calculateAge(userDOB);
      mdReport += `**Age:** ${age} years\n\n`;
    } else {
      mdReport += `**Age:** ____________________\n\n`;
    }
    mdReport += `## Diagnosis:\n\n`;
    mdReport += `${diagnosisText}\n\n`;
    mdReport += `## Medications and Precautions:\n\n`;
    mdReport += `- Follow the prescribed treatment plan.\n`;
    mdReport += `- Consult a specialist if symptoms worsen.\n`;
    mdReport += `- Rest and stay hydrated.\n\n`;
    mdReport += `**Confidence:** ${confidence}%\n\n`;
    const blob = new Blob([mdReport], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "diagnosis_report.md";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    setTimeout(scrollToBottom, 100);
  };

  return (
    <div className="min-h-screen bg-[#F2EFE7] text-[#006A71] flex flex-col">
      <Navbar />
      <div className="flex flex-1 pt-16 relative">
        <motion.div
          className="fixed top-20 left-0 z-20"
          initial={{ x: -250 }}
          animate={{ x: sidebarOpen ? 0 : -250 }}
          transition={{ type: 'tween', duration: 0.3 }}
        >
          <div className="w-64 bg-[#006A71] h-screen p-4 shadow-lg flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl text-[#F2EFE7] font-bold">Chats</h2>
              <button onClick={() => setSidebarOpen(false)} className="p-2 text-[#F2EFE7] hover:text-[#9ACBD0] transition">
                <FaTimes size={20} />
              </button>
            </div>
            <button onClick={() => startNewChat()} className="flex items-center justify-center w-10 h-10 rounded-full bg-[#48A6A7] text-[#F2EFE7] hover:bg-[#9ACBD0] transition mb-4 mx-auto shadow">
              <FaPlus size={16} />
            </button>
            <div className="space-y-3">
              {chatHistories.map((history, index) => (
                <button key={index} onClick={() => loadChatHistory(history)} className="w-full text-left px-4 py-2 bg-[#48A6A7] text-[#F2EFE7] rounded hover:bg-[#9ACBD0] transition shadow">
                  {history.summary}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
        {!sidebarOpen && (
          <button onClick={() => setSidebarOpen(true)} className="fixed top-20 left-2 z-30 p-2 bg-[#006A71] text-[#F2EFE7] rounded shadow hover:bg-[#48A6A7] transition">
            <FaBars size={20} />
          </button>
        )}
        <div className="flex-1 flex flex-col relative border-l border-[#9ACBD0] ml-[250px]">
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 pb-24">
            <AnimatePresence>
              {messages.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="p-4 rounded-lg max-w-md bg-[#006A71] text-white shadow-lg">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg max-w-md bg-[#9ACBD0] text-[#006A71] shadow-lg">
                      {msg.content}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {showScrollButton && (
            <button onClick={scrollToBottom} className="fixed bottom-24 right-8 bg-[#48A6A7] p-3 rounded-full shadow-lg hover:bg-[#9ACBD0] transition">
              <FaArrowDown size={20} className="text-[#F2EFE7]" />
            </button>
          )}
          <div className="fixed bottom-0 left-[250px] w-[calc(100%-250px)] p-4 bg-[#F2EFE7] border-t border-[#9ACBD0] shadow">
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center">
              <TextareaAutosize
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 p-3 bg-[#F2EFE7] text-[#006A71] border border-[#9ACBD0] rounded-l-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#48A6A7]"
                minRows={1}
                maxRows={6}
              />
              <button type="submit" className="bg-[#48A6A7] text-[#F2EFE7] p-3 rounded-r-lg hover:bg-[#9ACBD0] transition">
                <FaPaperPlane size={18} />
              </button>
            </form>
            <div className="mt-4">
              <input type="file" accept="image/*" onChange={handleImageUpload} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
