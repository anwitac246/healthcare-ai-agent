'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import Head from 'next/head';

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState('');

  const createRoom = () => {
    const newRoomId = uuidv4();
    setRoomId(newRoomId);
    setTimeout(() => {
      router.push(`/room/${newRoomId}`);
    }, 1000);
  };

  return (
    <>
      <Head>
        <title>VideoSync – Create a Room</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Welcome to VideoSync</h1>
          <p className="text-gray-600 mb-6">
            Start a video call by creating a new room. Share the link with others to join!
          </p>

          <button
            onClick={createRoom}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full hover:from-indigo-700 hover:to-purple-700 transition-colors duration-200 shadow-md text-lg font-medium"
          >
            Create New Room
          </button>

          {roomId && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700 mb-2">Your room is ready! Redirecting...</p>
              <p className="text-indigo-600 font-medium break-all">
                {`${window.location.origin}/room/${roomId}`}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
