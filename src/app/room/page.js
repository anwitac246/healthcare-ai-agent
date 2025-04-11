'use client';

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
        <title>AetherCare – Create a Room</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-[#F2EFE7] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <h1 className="text-3xl font-bold text-black mb-4">
            Welcome to AetherCare
          </h1>
          <p className="text-[#006A71] mb-4">
            Start a video call by creating a new room. Share the link with others
            to join!
          </p>
          <p className="text-sm text-black mb-6">
            Note: Rooms expire 30 minutes after creation.
          </p>

          <button
            onClick={createRoom}
            className="px-6 py-3 bg-gradient-to-r from-[#006A71] to-black text-white rounded-full hover:from-black hover:to-[#006A71] transition-colors duration-200 shadow-md text-lg font-medium"
          >
            Create New Room
          </button>

          {roomId && (
            <div className="mt-6 p-4 bg-[#F2EFE7] rounded-lg">
              <p className="text-black mb-2">Your room is ready! Redirecting...</p>
              <p className="text-[#006A71] font-medium break-all">
                {`${window.location.origin}/room/${roomId}`}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
