'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Peer from 'peerjs';
import io from 'socket.io-client';
import Head from 'next/head';
import { db } from '@/app/firebase-config';
import {
  ref as dbRef,
  query,
  orderByChild,
  equalTo,
  onValue,
  update,
} from 'firebase/database';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaShareSquare, FaPhone, FaCog, FaExpand } from 'react-icons/fa';
import Link from 'next/link';

const socket = io('http://localhost:5000');

export default function Room() {
  const { roomId } = useParams();
  const router = useRouter();

  const [status, setStatus] = useState('loading');
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [debugInfo, setDebugInfo] = useState(''); // Debug information
  const [mediaError, setMediaError] = useState(null); // Track media errors

  const videoGridRef = useRef(null);
  const myPeer = useRef(null);
  const peersRef = useRef({});
  const joinedUsersRef = useRef(new Set());
  const localStream = useRef(null);
  const myId = useRef(null);

  // Debug logging function
  const debugLog = (message) => {
    console.log(`[DEBUG] ${message}`);
    setDebugInfo(prev => prev + `\n${new Date().toLocaleTimeString()}: ${message}`);
  };

  useEffect(() => {
    if (!roomId) return;
    debugLog(`Checking room: ${roomId}`);
    
    const apptQ = query(
      dbRef(db, 'appointments'),
      orderByChild('roomId'),
      equalTo(roomId)
    );
    const unsub = onValue(apptQ, (snap) => {
      const data = snap.val();
      if (!data) {
        debugLog('No appointment data found');
        setStatus('invalid');
        return;
      }
      const [id, appt] = Object.entries(data)[0];
      const now = Date.now();
      debugLog(`Appointment found. Generated at: ${appt.generatedAt}, Now: ${now}`);
      
      if (!appt.generatedAt || now > appt.generatedAt + 30 * 60 * 1000) {
        debugLog('Appointment expired');
        update(dbRef(db, `appointments/${id}`), {
          status: 'completed',
          meetingLink: null,
          generatedAt: null,
          roomId: null,
        });
        setStatus('expired');
      } else {
        debugLog('Appointment is valid');
        setStatus('valid');
      }
    });
    return () => unsub();
  }, [roomId]);

  useEffect(() => {
    if (!roomId || status !== 'valid') return;

    debugLog('Initializing peer connection...');
    const peer = new Peer(undefined, {
      host: 'localhost',
      port: 5000,
      path: '/peerjs',
      secure: false,
      debug: 2, // Enable debug mode
    });
    myPeer.current = peer;

    peer.on('open', (id) => {
      debugLog(`Peer opened with ID: ${id}`);
      myId.current = id;
      
      // Request media with more specific constraints
      const mediaConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      };

      debugLog('Requesting user media...');
      navigator.mediaDevices.getUserMedia(mediaConstraints)
        .then((stream) => {
          debugLog(`Media stream obtained. Video tracks: ${stream.getVideoTracks().length}, Audio tracks: ${stream.getAudioTracks().length}`);
          localStream.current = stream;

          // Log stream details
          stream.getVideoTracks().forEach((track, index) => {
            debugLog(`Video track ${index}: ${track.label}, enabled: ${track.enabled}, readyState: ${track.readyState}`);
          });

          const video = document.createElement('video');
          video.muted = true;
          video.autoplay = true;
          video.playsInline = true;
          
          // Add error handling for video element
          video.onerror = (e) => {
            debugLog(`Video element error: ${e.message || 'Unknown error'}`);
          };
          
          video.onloadedmetadata = () => {
            debugLog(`Video metadata loaded. Dimensions: ${video.videoWidth}x${video.videoHeight}`);
          };

          addVideoStream(video, stream, id, true);

          socket.emit('join-room', roomId, id);
          debugLog(`Joined room: ${roomId}`);

          socket.on('room-users', (users) => {
            debugLog(`Room users: ${JSON.stringify(users)}`);
            setParticipantCount(users.length);
            users.forEach((userId) => {
              if (userId !== id && !joinedUsersRef.current.has(userId)) {
                debugLog(`Connecting to user: ${userId}`);
                connectToNewUser(userId, stream);
                joinedUsersRef.current.add(userId);
              }
            });
          });

          socket.on('user-connected', (userId) => {
            debugLog(`User connected: ${userId}`);
            if (userId !== id && !joinedUsersRef.current.has(userId)) {
              connectToNewUser(userId, stream);
              joinedUsersRef.current.add(userId);
              setParticipantCount(prev => prev + 1);
            }
          });

          peer.on('call', (call) => {
            debugLog(`Receiving call from: ${call.peer}`);
            call.answer(stream);
            const remoteVideo = document.createElement('video');
            remoteVideo.autoplay = true;
            remoteVideo.playsInline = true;
            
            call.on('stream', (remoteStream) => {
              debugLog(`Received remote stream from: ${call.peer}`);
              addVideoStream(remoteVideo, remoteStream, call.peer, false);
            });
            call.on('close', () => {
              debugLog(`Call closed with: ${call.peer}`);
              removeVideo(call.peer);
            });
            peersRef.current[call.peer] = call;
          });

          socket.on('user-disconnected', (userId) => {
            debugLog(`User disconnected: ${userId}`);
            if (peersRef.current[userId]) {
              peersRef.current[userId].close();
              delete peersRef.current[userId];
              joinedUsersRef.current.delete(userId);
              removeVideo(userId);
              setParticipantCount(prev => Math.max(0, prev - 1));
            }
          });

          socket.on('room-timer', (seconds) => setTimeLeft(seconds));
          socket.on('room-expired', () => {
            alert('This room has expired.');
            router.push('/room');
          });
        })
        .catch((err) => {
          const errorMsg = `Media error: ${err.name} - ${err.message}`;
          debugLog(errorMsg);
          setMediaError(errorMsg);
          console.error('Media error:', err);
          
          // Provide specific error messages
          if (err.name === 'NotAllowedError') {
            setMediaError('Camera/microphone access denied. Please allow permissions and refresh.');
          } else if (err.name === 'NotFoundError') {
            setMediaError('No camera or microphone found. Please connect a device.');
          } else if (err.name === 'NotReadableError') {
            setMediaError('Camera/microphone is being used by another application.');
          } else {
            setMediaError(`Media access error: ${err.message}`);
          }
        });
    });

    peer.on('error', (err) => {
      debugLog(`Peer error: ${err.type} - ${err.message}`);
      console.error('Peer error:', err);
    });

    return () => {
      debugLog('Cleaning up...');
      peer.destroy();
      socket.disconnect();
      Object.values(peersRef.current).forEach((call) => call.close());
      localStream.current?.getTracks().forEach((t) => t.stop());
    };
  }, [roomId, status, router]);

  useEffect(() => {
    if (timeLeft == null || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  function connectToNewUser(userId, stream) {
    debugLog(`Calling user: ${userId}`);
    const call = myPeer.current.call(userId, stream);
    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    
    call.on('stream', (userStream) => {
      debugLog(`Received stream from user: ${userId}`);
      addVideoStream(video, userStream, userId, false);
    });
    call.on('close', () => {
      debugLog(`Connection closed with user: ${userId}`);
      removeVideo(userId);
    });
    peersRef.current[userId] = call;
  }

  function addVideoStream(video, stream, id, isLocal = false) {
    if (!videoGridRef.current) {
      debugLog('Video grid ref not available');
      return;
    }
    
    if (videoGridRef.current.querySelector(`[data-id="${id}"]`)) {
      debugLog(`Video for ${id} already exists`);
      return;
    }
    
    debugLog(`Adding video stream for: ${id} (local: ${isLocal})`);
    
    video.srcObject = stream;
    video.playsInline = true;
    video.autoplay = true;
    
    // Enhanced video event handling
    video.addEventListener('loadedmetadata', () => {
      debugLog(`Video metadata loaded for ${id}: ${video.videoWidth}x${video.videoHeight}`);
      video.play().catch(e => {
        debugLog(`Error playing video for ${id}: ${e.message}`);
      });
    });
    
    video.addEventListener('canplay', () => {
      debugLog(`Video can play for ${id}`);
    });
    
    video.addEventListener('error', (e) => {
      debugLog(`Video error for ${id}: ${e.message || 'Unknown error'}`);
    });
    
    const wrapper = document.createElement('div');
    wrapper.className = `relative rounded-2xl overflow-hidden bg-gray-900 shadow-2xl border-2 ${isLocal ? 'border-emerald-400' : 'border-gray-700'} video-wrapper`;
    wrapper.dataset.id = id;
    wrapper.style.height = '320px'; // Ensure consistent height
    video.className = 'w-full h-full object-cover';
    
    // User label
    const label = document.createElement('div');
    label.className = `absolute bottom-4 left-4 px-3 py-2 rounded-full text-white text-sm font-semibold ${isLocal ? 'bg-emerald-500' : 'bg-gray-800/80'} backdrop-blur-sm`;
    label.textContent = isLocal ? 'You' : `Participant ${id.slice(0, 6)}`;
    
    // Status indicators
    const statusBar = document.createElement('div');
    statusBar.className = 'absolute top-4 left-4 flex gap-2';
    
    if (!isLocal) {
      const micStatus = document.createElement('div');
      micStatus.className = 'w-3 h-3 bg-emerald-500 rounded-full animate-pulse';
      statusBar.appendChild(micStatus);
    }
    
    wrapper.appendChild(video);
    wrapper.appendChild(label);
    wrapper.appendChild(statusBar);
    videoGridRef.current.appendChild(wrapper);
    
    debugLog(`Video element added to grid for ${id}`);
  }

  function removeVideo(id) {
    const vid = videoGridRef.current?.querySelector(`[data-id="${id}"]`);
    if (vid) {
      debugLog(`Removing video for ${id}`);
      vid.remove();
    }
  }

  const toggleAudio = () => {
    if (!localStream.current) return;
    const enabled = !audioMuted;
    localStream.current.getAudioTracks()[0].enabled = enabled;
    setAudioMuted(!audioMuted);
    debugLog(`Audio ${enabled ? 'enabled' : 'disabled'}`);
  };

  const toggleVideo = () => {
    if (!localStream.current) return;
    const enabled = !videoOff;
    localStream.current.getVideoTracks()[0].enabled = enabled;
    setVideoOff(!videoOff);
    debugLog(`Video ${enabled ? 'enabled' : 'disabled'}`);
  };

  const shareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 3000);
  };

  const endCall = () => {
    if (confirm('Are you sure you want to end the call?')) {
      router.push('/');
    }
  };

  const formatTime = (sec) => {
    if (!sec || sec <= 0) return 'Expired';
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-green-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 border-t-emerald-600 mx-auto mb-4"></div>
          <p className="text-emerald-700 font-semibold text-lg">Connecting to your meeting...</p>
        </div>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-green-100">
        <div className="bg-white p-10 rounded-2xl shadow-2xl text-center border border-gray-200">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaPhone className="text-red-500 text-2xl" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Invalid Meeting Link</h2>
          <p className="text-gray-600 mb-6">The meeting link you're trying to access is not valid.</p>
          <Link href="/" className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-semibold">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-green-100">
        <div className="bg-white p-10 rounded-2xl shadow-2xl text-center border border-gray-200">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaPhone className="text-orange-500 text-2xl" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Meeting Has Ended</h2>
          <p className="text-gray-600 mb-6">This meeting session has expired and is no longer available.</p>
          <Link href="/" className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-semibold">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>AetherCare Video Call - Room {roomId}</title>
        <meta name="description" content={`Join the secure video consultation for room ${roomId} with AetherCare.`} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-emerald-900 font-inter flex flex-col">
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
          .video-wrapper {
            height: 320px;
            transition: all 0.3s ease;
          }
          .video-wrapper:hover {
            transform: translateY(-2px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          }
          @media (max-width: 640px) {
            .video-wrapper {
              height: 240px;
            }
          }
          .control-btn {
            transition: all 0.2s ease;
            backdrop-filter: blur(10px);
          }
          .control-btn:hover {
            transform: scale(1.05);
          }
          .control-btn:active {
            transform: scale(0.95);
          }
        `}</style>

        {/* Header */}
        <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 p-4">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                <FaVideo className="text-white text-lg" />
              </div>
              <h1 className="text-2xl font-bold text-white">AetherCare</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl text-white">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">{participantCount} participant{participantCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl text-white text-sm font-medium">
                Room: {roomId}
              </div>
              <div className={`px-4 py-2 backdrop-blur-sm rounded-xl text-sm font-medium ${
                timeLeft && timeLeft > 300 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-orange-500/20 text-orange-300'
              }`}>
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>
        </header>

        {/* Error Display */}
        {mediaError && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 mx-6 mt-4 rounded-lg">
            <strong>Media Error:</strong> {mediaError}
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 max-w-7xl mx-auto p-6 w-full">
          {/* Video Grid */}
          <div
            ref={videoGridRef}
            className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8"
          />

          {/* Controls */}
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
            <div className="flex items-center gap-4 bg-black/40 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
              <button
                onClick={toggleAudio}
                className={`control-btn w-14 h-14 rounded-xl flex items-center justify-center text-white font-medium transition-all ${
                  audioMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
                aria-label={audioMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {audioMuted ? <FaMicrophoneSlash className="text-xl" /> : <FaMicrophone className="text-xl" />}
              </button>

              <button
                onClick={toggleVideo}
                className={`control-btn w-14 h-14 rounded-xl flex items-center justify-center text-white font-medium transition-all ${
                  videoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
                aria-label={videoOff ? 'Start Video' : 'Stop Video'}
              >
                {videoOff ? <FaVideoSlash className="text-xl" /> : <FaVideo className="text-xl" />}
              </button>

              <button
                onClick={shareLink}
                className="control-btn w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center transition-all"
                aria-label="Share Room Link"
              >
                <FaShareSquare className="text-xl" />
              </button>

              <div className="w-px h-8 bg-white/20"></div>

              <button
                onClick={endCall}
                className="control-btn w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-xl flex items-center justify-center transition-all"
                aria-label="End Call"
              >
                <FaPhone className="text-xl transform rotate-135" />
              </button>
            </div>
          </div>
        </main>

        {/* Debug Panel (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg max-w-sm max-h-64 overflow-y-auto text-xs">
            <h3 className="font-bold mb-2">Debug Info:</h3>
            <pre className="whitespace-pre-wrap">{debugInfo}</pre>
          </div>
        )}

        {/* Link Copied Notification */}
        {linkCopied && (
          <div className="fixed top-20 right-6 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-2xl z-50 animate-bounce">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span className="font-semibold">Meeting link copied!</span>
            </div>
          </div>
        )}

        {/* Connection Status */}
        <div className="fixed top-20 left-6 bg-black/40 backdrop-blur-xl text-white px-4 py-2 rounded-xl border border-white/20">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Connected</span>
          </div>
        </div>
      </div>
    </>
  );
}