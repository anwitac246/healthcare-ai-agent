
// 'use client';

// import { useEffect, useRef, useState } from 'react';
// import { useRouter, useParams } from 'next/navigation';
// import Peer from 'peerjs';
// import io from 'socket.io-client';
// import Head from 'next/head';

// import { db } from '@/app/firebase-config';
// import {
//   ref as dbRef,
//   query,
//   orderByChild,
//   equalTo,
//   onValue,
//   update,
// } from 'firebase/database';

// const socket = io('http://localhost:5000');

// export default function Room() {
//   const { roomId } = useParams();
//   const router = useRouter();

//   const [status, setStatus] = useState('loading');
//   const [audioMuted, setAudioMuted] = useState(false);
//   const [videoOff, setVideoOff] = useState(false);
//   const [linkCopied, setLinkCopied] = useState(false);
//   const [timeLeft, setTimeLeft] = useState(null);

//   const videoGridRef = useRef(null);
//   const myPeer = useRef(null);
//   const peersRef = useRef({});
//   const joinedUsersRef = useRef(new Set());
//   const localStream = useRef(null);
//   const myId = useRef(null);

//   useEffect(() => {
//     if (!roomId) return;
//     const apptQ = query(
//       dbRef(db, 'appointments'),
//       orderByChild('roomId'),
//       equalTo(roomId)
//     );
//     const unsub = onValue(apptQ, (snap) => {
//       const data = snap.val();
//       if (!data) {
//         setStatus('invalid');
//         return;
//       }
//       const [id, appt] = Object.entries(data)[0];
//       const now = Date.now();
//       if (!appt.generatedAt || now > appt.generatedAt + 30 * 60 * 1000) {
//         update(dbRef(db, `appointments/${id}`), {
//           status: 'completed',
//           meetingLink: null,
//           generatedAt: null,
//           roomId: null,
//         });
//         setStatus('expired');
//       } else {
//         setStatus('valid');
//       }
//     });
//     return () => unsub();
//   }, [roomId]);

//   useEffect(() => {
//     if (!roomId || status !== 'valid') return;

//     const peer = new Peer(undefined, {
//       host: 'localhost',
//       port: 5000,
//       path: '/peerjs',
//       secure: false,
//     });
//     myPeer.current = peer;

//     peer.on('open', (id) => {
//       myId.current = id;
//       navigator.mediaDevices.getUserMedia({ video: true, audio: true })
//         .then((stream) => {
//           localStream.current = stream;

//           const video = document.createElement('video');
//           video.muted = true;
//           addVideoStream(video, stream, id);

//           socket.emit('join-room', roomId, id);

//           socket.on('room-users', (users) => {
//             users.forEach((userId) => {
//               if (userId !== id && !joinedUsersRef.current.has(userId)) {
//                 connectToNewUser(userId, stream);
//                 joinedUsersRef.current.add(userId);
//               }
//             });
//           });

//           socket.on('user-connected', (userId) => {
//             if (userId !== id && !joinedUsersRef.current.has(userId)) {
//               connectToNewUser(userId, stream);
//               joinedUsersRef.current.add(userId);
//             }
//           });

//           peer.on('call', (call) => {
//             call.answer(stream);
//             const remoteVideo = document.createElement('video');
//             call.on('stream', (remoteStream) => {
//               addVideoStream(remoteVideo, remoteStream, call.peer);
//             });
//             call.on('close', () => {
//               removeVideo(call.peer);
//             });
//             peersRef.current[call.peer] = call;
//           });

//           socket.on('user-disconnected', (userId) => {
//             if (peersRef.current[userId]) {
//               peersRef.current[userId].close();
//               delete peersRef.current[userId];
//               joinedUsersRef.current.delete(userId);
//               removeVideo(userId);
//             }
//           });

//           socket.on('room-timer', (seconds) => setTimeLeft(seconds));
//           socket.on('room-expired', () => {
//             alert('This room has expired.');
//             router.push('/room');
//           });
//         })
//         .catch((err) => console.error('Media error:', err));
//     });

//     return () => {
//       peer.destroy();
//       socket.disconnect();
//       Object.values(peersRef.current).forEach((call) => call.close());
//       localStream.current?.getTracks().forEach((t) => t.stop());
//     };
//   }, [roomId, status, router]);

//   useEffect(() => {
//     if (timeLeft == null || timeLeft <= 0) return;
//     const timer = setInterval(() => {
//       setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
//     }, 1000);
//     return () => clearInterval(timer);
//   }, [timeLeft]);

//   function connectToNewUser(userId, stream) {
//     const call = myPeer.current.call(userId, stream);
//     const video = document.createElement('video');
//     call.on('stream', (userStream) => addVideoStream(video, userStream, userId));
//     call.on('close', () => removeVideo(userId));
//     peersRef.current[userId] = call;
//   }

//   function addVideoStream(video, stream, id) {
//     if (videoGridRef.current.querySelector(`[data-id="${id}"]`)) return;
//     video.srcObject = stream;
//     video.playsInline = true;
//     video.addEventListener('loadedmetadata', () => video.play());
//     const wrapper = document.createElement('div');
//     wrapper.className = 'relative rounded-lg overflow-hidden bg-black shadow-md';
//     wrapper.dataset.id = id;
//     video.className = 'w-full h-64 object-cover';
//     wrapper.appendChild(video);
//     videoGridRef.current.appendChild(wrapper);
//   }

//   function removeVideo(id) {
//     const vid = videoGridRef.current.querySelector(`[data-id="${id}"]`);
//     if (vid) vid.remove();
//   }

//   const toggleAudio = () => {
//     if (!localStream.current) return;
//     const enabled = !audioMuted;
//     localStream.current.getAudioTracks()[0].enabled = enabled;
//     setAudioMuted(!audioMuted);
//   };

//   const toggleVideo = () => {
//     if (!localStream.current) return;
//     const enabled = !videoOff;
//     localStream.current.getVideoTracks()[0].enabled = enabled;
//     setVideoOff(!videoOff);
//   };

//   const shareLink = () => {
//     navigator.clipboard.writeText(window.location.href);
//     setLinkCopied(true);
//     setTimeout(() => setLinkCopied(false), 2000);
//   };

//   const formatTime = (sec) => {
//     if (!sec || sec <= 0) return 'Expired';
//     const m = Math.floor(sec / 60), s = sec % 60;
//     return `${m}:${s < 10 ? '0' : ''}${s}`;
//   };

//   if (status === 'loading') {
//     return <div className="flex items-center justify-center h-screen">Checking link…</div>;
//   }
//   if (status === 'invalid') {
//     return <div className="flex items-center justify-center h-screen text-red-600">Invalid meeting link.</div>;
//   }
//   if (status === 'expired') {
//     return <div className="flex items-center justify-center h-screen text-gray-600">This meeting has expired.</div>;
//   }

//   return (
//     <>
//       <Head>
//         <title>AetherCare – Room {roomId}</title>
//         <meta name="viewport" content="width=device-width, initial-scale=1" />
//       </Head>
//       <div className="min-h-screen bg-[#F2EFE7] flex flex-col">
//         <header className="bg-gradient-to-r from-[#006A71] to-black p-4 shadow-lg">
//           <div className="max-w-7xl mx-auto flex justify-between items-center">
//             <h1 className="text-2xl font-bold text-white">AetherCare</h1>
//             <div className="flex items-center gap-4">
//               <span className="text-sm bg-white text-[#006A71] px-3 py-1 rounded-full font-medium">
//                 Room ID: {roomId}
//               </span>
//               <span className="text-sm bg-white text-black px-3 py-1 rounded-full font-medium">
//                 Time Left: {formatTime(timeLeft)}
//               </span>
//             </div>
//           </div>
//         </header>
//         <main className="flex-1 max-w-7xl mx-auto p-6">
//           <div
//             ref={videoGridRef}
//             className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
//           />
//           <div className="mt-8 flex flex-wrap justify-center gap-4">
//             <button onClick={toggleAudio} className="px-5 py-2 bg-[#006A71] text-white rounded-full hover:bg-black transition-colors duration-200 shadow-md">
//               {audioMuted ? 'Unmute Audio' : 'Mute Audio'}
//             </button>
//             <button onClick={toggleVideo} className="px-5 py-2 bg-[#006A71] text-white rounded-full hover:bg-black transition-colors duration-200 shadow-md">
//               {videoOff ? 'Start Video' : 'Stop Video'}
//             </button>
//             <button onClick={shareLink} className="px-5 py-2 bg-gradient-to-r from-[#006A71] to-black text-white rounded-full hover:from-black hover:to-[#006A71] transition-colors duration-200 shadow-md">
//               Share Room Link
//             </button>
//           </div>
//         </main>
//         {linkCopied && (
//           <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#006A71] bg-opacity-90 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in-out">
//             Link Copied!
//           </div>
//         )}
//       </div>
//       <style jsx>{`
//         @keyframes fade-in-out {
//           0% { opacity: 0; }
//           10% { opacity: 1; }
//           90% { opacity: 1; }
//           100% { opacity: 0; }
//         }
//         .animate-fade-in-out {
//           animation: fade-in-out 2s ease-in-out forwards;
//         }
//       `}</style>
//     </>
//   );
// }


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
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaShareSquare } from 'react-icons/fa';
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

  const videoGridRef = useRef(null);
  const myPeer = useRef(null);
  const peersRef = useRef({});
  const joinedUsersRef = useRef(new Set());
  const localStream = useRef(null);
  const myId = useRef(null);

  useEffect(() => {
    if (!roomId) return;
    const apptQ = query(
      dbRef(db, 'appointments'),
      orderByChild('roomId'),
      equalTo(roomId)
    );
    const unsub = onValue(apptQ, (snap) => {
      const data = snap.val();
      if (!data) {
        setStatus('invalid');
        return;
      }
      const [id, appt] = Object.entries(data)[0];
      const now = Date.now();
      if (!appt.generatedAt || now > appt.generatedAt + 30 * 60 * 1000) {
        update(dbRef(db, `appointments/${id}`), {
          status: 'completed',
          meetingLink: null,
          generatedAt: null,
          roomId: null,
        });
        setStatus('expired');
      } else {
        setStatus('valid');
      }
    });
    return () => unsub();
  }, [roomId]);

  useEffect(() => {
    if (!roomId || status !== 'valid') return;

    const peer = new Peer(undefined, {
      host: 'localhost',
      port: 5000,
      path: '/peerjs',
      secure: false,
    });
    myPeer.current = peer;

    peer.on('open', (id) => {
      myId.current = id;
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          localStream.current = stream;

          const video = document.createElement('video');
          video.muted = true;
          addVideoStream(video, stream, id);

          socket.emit('join-room', roomId, id);

          socket.on('room-users', (users) => {
            users.forEach((userId) => {
              if (userId !== id && !joinedUsersRef.current.has(userId)) {
                connectToNewUser(userId, stream);
                joinedUsersRef.current.add(userId);
              }
            });
          });

          socket.on('user-connected', (userId) => {
            if (userId !== id && !joinedUsersRef.current.has(userId)) {
              connectToNewUser(userId, stream);
              joinedUsersRef.current.add(userId);
            }
          });

          peer.on('call', (call) => {
            call.answer(stream);
            const remoteVideo = document.createElement('video');
            call.on('stream', (remoteStream) => {
              addVideoStream(remoteVideo, remoteStream, call.peer);
            });
            call.on('close', () => {
              removeVideo(call.peer);
            });
            peersRef.current[call.peer] = call;
          });

          socket.on('user-disconnected', (userId) => {
            if (peersRef.current[userId]) {
              peersRef.current[userId].close();
              delete peersRef.current[userId];
              joinedUsersRef.current.delete(userId);
              removeVideo(userId);
            }
          });

          socket.on('room-timer', (seconds) => setTimeLeft(seconds));
          socket.on('room-expired', () => {
            alert('This room has expired.');
            router.push('/room');
          });
        })
        .catch((err) => console.error('Media error:', err));
    });

    return () => {
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
    const call = myPeer.current.call(userId, stream);
    const video = document.createElement('video');
    call.on('stream', (userStream) => addVideoStream(video, userStream, userId));
    call.on('close', () => removeVideo(userId));
    peersRef.current[userId] = call;
  }

  function addVideoStream(video, stream, id) {
    if (videoGridRef.current.querySelector(`[data-id="${id}"]`)) return;
    video.srcObject = stream;
    video.playsInline = true;
    video.addEventListener('loadedmetadata', () => video.play());
    const wrapper = document.createElement('div');
    wrapper.className = 'relative rounded-xl overflow-hidden bg-gray-900 shadow-lg hover-scale';
    wrapper.dataset.id = id;
    video.className = 'w-full h-full object-cover';
    const label = document.createElement('div');
    label.className = 'absolute bottom-2 left-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded-md text-xs font-medium';
    label.textContent = `User ${id.slice(0, 8)}`;
    wrapper.appendChild(video);
    wrapper.appendChild(label);
    videoGridRef.current.appendChild(wrapper);
  }

  function removeVideo(id) {
    const vid = videoGridRef.current.querySelector(`[data-id="${id}"]`);
    if (vid) vid.remove();
  }

  const toggleAudio = () => {
    if (!localStream.current) return;
    const enabled = !audioMuted;
    localStream.current.getAudioTracks()[0].enabled = enabled;
    setAudioMuted(!audioMuted);
  };

  const toggleVideo = () => {
    if (!localStream.current) return;
    const enabled = !videoOff;
    localStream.current.getVideoTracks()[0].enabled = enabled;
    setVideoOff(!videoOff);
  };

  const shareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const formatTime = (sec) => {
    if (!sec || sec <= 0) return 'Expired';
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#3B82F6]"></div>
      </div>
    );
  }
  if (status === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <p className="text-red-600 text-xl font-semibold mb-4">Invalid meeting link.</p>
          <Link href="/" className="text-[#3B82F6] hover:underline text-sm">Return to Home</Link>
        </div>
      </div>
    );
  }
  if (status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <p className="text-gray-600 text-xl font-semibold mb-4">This meeting has expired.</p>
          <Link href="/" className="text-[#3B82F6] hover:underline text-sm">Return to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Video Call - AetherCare</title>
        <meta name="description" content={`Join the video call for room ${roomId} with AetherCare.`} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 font-inter flex flex-col">
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          .hover-scale {
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }
          .hover-scale:hover {
            transform: scale(1.02);
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
          }
          .gradient-text {
            background: linear-gradient(90deg, #3B82F6, #10B981);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
          }
        `}</style>
        <header className="bg-white border-b border-gray-200 p-4 shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            <h1 className="text-2xl font-semibold gradient-text">AetherCare Video Call</h1>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                Room: {roomId}
              </span>
              <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                Time: {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-7xl mx-auto p-4 sm:p-6 flex flex-col">
          <div
            ref={videoGridRef}
            className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 flex-1"
          />
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={toggleAudio}
              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors hover-scale ${
                audioMuted ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-[#3B82F6] text-white hover:bg-[#2563EB]'
              }`}
              aria-label={audioMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {audioMuted ? <FaMicrophoneSlash className="mr-2 w-4 h-4" /> : <FaMicrophone className="mr-2 w-4 h-4" />}
              {audioMuted ? 'Unmute' : 'Mute'}
            </button>
            <button
              onClick={toggleVideo}
              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors hover-scale ${
                videoOff ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-[#3B82F6] text-white hover:bg-[#2563EB]'
              }`}
              aria-label={videoOff ? 'Start Video' : 'Stop Video'}
            >
              {videoOff ? <FaVideo className="mr-2 w-4 h-4" /> : <FaVideoSlash className="mr-2 w-4 h-4" />}
              {videoOff ? 'Start Video' : 'Stop Video'}
            </button>
            <button
              onClick={shareLink}
              className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 hover-scale"
              aria-label="Share Room Link"
            >
              <FaShareSquare className="mr-2 w-4 h-4" />
              Share Link
            </button>
          </div>
        </main>
        {linkCopied && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse">
            Link Copied!
          </div>
        )}
      </div>
    </>
  );
}
