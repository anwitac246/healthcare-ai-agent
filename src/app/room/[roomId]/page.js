'use client';

import { useEffect, useRef, useState } from 'react';
import { use } from 'react';
import Peer from 'peerjs';
import io from 'socket.io-client';
import Head from 'next/head';

const socket = io('http://localhost:5000');

export default function Room({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const { roomId } = params;

  const videoGridRef = useRef(null);
  const myVideoRef = useRef(null);
  const myPeer = useRef(null);
  const peersRef = useRef({});
  const localStream = useRef(null);
  const myId = useRef(null);

  const [audioMuted, setAudioMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (!roomId) return;

    const peer = new Peer(undefined, {
      host: 'localhost',
      port: 5000,
      path: '/peerjs',
      secure: false,
    });

    myPeer.current = peer;

    const myVideo = document.createElement('video');
    myVideo.muted = true;
    myVideoRef.current = myVideo;

    peer.on('open', (id) => {
      myId.current = id;

      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          localStream.current = stream;
          addVideoStream(myVideo, stream, id);

          socket.emit('join-room', roomId, id);

          socket.on('room-users', (users) => {
            users.forEach((userId) => {
              if (userId !== id) {
                connectToNewUser(userId, stream);
              }
            });
          });

          socket.on('user-connected', (userId) => {
            if (userId !== id && !peersRef.current[userId]) {
              connectToNewUser(userId, stream);
            }
          });

          peer.on('call', (call) => {
            call.answer(stream);
            const video = document.createElement('video');
            call.on('stream', (userStream) => {
              addVideoStream(video, userStream, call.peer);
            });
            call.on('close', () => {
              video.remove();
            });
            peersRef.current[call.peer] = call;
          });

          socket.on('user-disconnected', (userId) => {
            if (peersRef.current[userId]) {
              peersRef.current[userId].close();
              delete peersRef.current[userId];
            }
          });
        })
        .catch((err) => console.error('Media error:', err));
    });

    return () => {
      peer.destroy();
      socket.disconnect();
      Object.values(peersRef.current).forEach((call) => call.close());
      if (localStream.current) {
        localStream.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [roomId]);

  function connectToNewUser(userId, stream) {
    const call = myPeer.current.call(userId, stream);
    const video = document.createElement('video');
    call.on('stream', (userVideoStream) => {
      addVideoStream(video, userVideoStream, userId);
    });
    call.on('close', () => {
      video.remove();
    });
    peersRef.current[userId] = call;
  }

  function addVideoStream(video, stream, id) {
    if (videoGridRef.current.querySelector(`[data-id="${id}"]`)) return;

    video.srcObject = stream;
    video.playsInline = true;
    video.addEventListener('loadedmetadata', () => video.play());

    const wrapper = document.createElement('div');
    wrapper.className = 'relative rounded-lg overflow-hidden bg-gray-900 shadow-md';
    wrapper.dataset.id = id;
    video.className = 'w-full h-64 object-cover';
    wrapper.appendChild(video);
    videoGridRef.current.appendChild(wrapper);
  }

  const toggleAudio = () => {
    if (localStream.current) {
      const enabled = !audioMuted;
      localStream.current.getAudioTracks()[0].enabled = enabled;
      setAudioMuted(!audioMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream.current) {
      const enabled = !videoOff;
      localStream.current.getVideoTracks()[0].enabled = enabled;
      setVideoOff(!videoOff);
    }
  };

  const shareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  if (!roomId) {
    return <div className="flex items-center justify-center h-screen text-gray-500">Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>VideoSync – Room {roomId}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-100 flex flex-col">
        <header className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">VideoSync</h1>
            <span className="text-sm bg-white text-indigo-600 px-3 py-1 rounded-full font-medium">
              Room ID: {roomId}
            </span>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto w-full p-6">
          <div
            ref={videoGridRef}
            className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          />

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button onClick={toggleAudio} className="px-5 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors duration-200 shadow-md">
              {audioMuted ? 'Unmute Audio' : 'Mute Audio'}
            </button>
            <button onClick={toggleVideo} className="px-5 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors duration-200 shadow-md">
              {videoOff ? 'Start Video' : 'Stop Video'}
            </button>
            <button onClick={shareLink} className="px-5 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors duration-200 shadow-md">
              Share Room Link
            </button>
          </div>
        </main>

        {linkCopied && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 bg-opacity-90 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in-out">
            Link Copied!
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in-out {
          0% { opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { opacity: 0; }
        }
        .animate-fade-in-out {
          animation: fade-in-out 2s ease-in-out forwards;
        }
      `}</style>
    </>
  );
}
