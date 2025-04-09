
'use client';

import { useState, useEffect, useRef } from 'react';
import TwilioVideo from 'twilio-video';

export default function VideoCall() {
  const [room, setRoom] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [error, setError] = useState(null);
  const [roomName] = useState(new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('room') || 'default-room');
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const joinRoom = async () => {
    console.log(`[Client] Joining room: ${roomName}`);
    try {
      console.log('[Client] Fetching token from http://localhost:5000/token');
      const response = await fetch(`http://localhost:5000/token?room=${roomName}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const { token, identity } = await response.json();
      console.log(`[Client] Token fetched: identity=${identity}, token=${token.slice(0, 20)}...`);
      setIdentity(identity);

      console.log('[Client] Requesting media devices...');
      const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideoRef.current.srcObject = localStream;
      console.log('[Client] Local stream acquired');

      console.log('[Client] Connecting to Twilio room...');
      const twilioRoom = await TwilioVideo.connect(token, {
        name: roomName,
        audio: true,
        video: { width: 640 },
      });
      console.log(`[Client] Connected to room: ${twilioRoom.name}`);
      setRoom(twilioRoom);

      twilioRoom.participants.forEach(handleParticipantConnected);
      twilioRoom.on('participantConnected', handleParticipantConnected);
      twilioRoom.on('participantDisconnected', (participant) => {
        console.log(`[Client] Participant disconnected: ${participant.identity}`);
        remoteVideoRef.current.srcObject = null;
      });

    } catch (err) {
      console.error('[Client] Error joining room:', err);
      setError(`Failed to join call: ${err.message}`);
    }
  };

  const handleParticipantConnected = (participant) => {
    console.log(`[Client] Participant connected: ${participant.identity}`);

    participant.on('trackSubscribed', (track) => {
      console.log(`[Client] Subscribed to track from ${participant.identity}:`, track);
  
      remoteVideoRef.current.srcObject = new MediaStream([track.mediaStreamTrack]);
    });

    participant.tracks.forEach((publication) => {
      if (publication.isSubscribed && publication.track) {
        console.log(`[Client] Existing track from ${participant.identity}:`, publication.track);
        remoteVideoRef.current.srcObject = new MediaStream([publication.track.mediaStreamTrack]);
      }
    });
  };

  const leaveRoom = () => {
    if (room) {
      console.log('[Client] Leaving room');
      room.disconnect();
      setRoom(null);
      setIdentity(null);
      if (localVideoRef.current.srcObject) {
        localVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      remoteVideoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    console.log('[Client] useEffect: Checking room status');
    if (!room) {
      joinRoom();
    }
    return () => {
      if (room) {
        leaveRoom();
      }
    };
  }, [room]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center p-4">
      <h1 className="text-4xl font-bold mb-6">Twilio Video Call</h1>

      {error && <p className="mb-4 text-red-500 text-center">{error}</p>}
      <div className="mb-4 text-center">
        <p>Room: {roomName}</p>
        {identity && <p>Your Identity: {identity}</p>}
        <p>
          Share this link:{' '}
          <a href={`http://localhost:3000/videocall?room=${roomName}`} className="underline" style={{ color: '#006A71' }}>
            http://localhost:3000/videocall?room={roomName}
          </a>
        </p>
      </div>

      <div className="flex gap-4 justify-center mb-8">
        <button
          onClick={joinRoom}
          disabled={!!room}
          className="px-6 py-3 rounded-lg text-white font-semibold transition hover:bg-[#004B50] shadow-lg disabled:opacity-50"
          style={{ backgroundColor: '#006A71' }}
        >
          Join Call
        </button>
        <button
          onClick={leaveRoom}
          disabled={!room}
          className="px-6 py-3 rounded-lg text-white font-semibold transition hover:bg-[#CC3333] shadow-lg disabled:opacity-50"
          style={{ backgroundColor: '#FF4444' }}
        >
          Leave Call
        </button>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="relative">
          <video ref={localVideoRef} autoPlay muted className="w-full rounded-lg border border-gray-700" />
          <span className="absolute bottom-2 left-2 bg-black bg-opacity-70 px-2 py-1 rounded text-sm">You</span>
        </div>
        <div className="relative">
          <video ref={remoteVideoRef} autoPlay className="w-full rounded-lg border border-gray-700" />
          <span className="absolute bottom-2 left-2 bg-black bg-opacity-70 px-2 py-1 rounded text-sm">Remote</span>
        </div>
      </div>
    </div>
  );
}
