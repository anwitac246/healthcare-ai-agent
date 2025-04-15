
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/navbar';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { FaPlay, FaPause, FaRedo, FaExclamationTriangle } from 'react-icons/fa';

export default function ExercisePage() {
    const [webcamError, setWebcamError] = useState(null);
    const [selectedPose, setSelectedPose] = useState('Warrior II Pose');
    const [timeRemaining, setTimeRemaining] = useState(30);
    const [currentSet, setCurrentSet] = useState(1);
    const [totalSets, setTotalSets] = useState(3);
    const [duration, setDuration] = useState(30);
    const [sets, setSets] = useState(3);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [feedback, setFeedback] = useState({
        message: `Please align with ${selectedPose}.`,
        color: 'text-red-500',
    });
    const timerRef = useRef(null);

    const poseImages = {
        'Warrior II Pose': '/img/Warrior II pose.png',
        'Tree Pose': '/img/Vrikshasana.png',
        'T Pose': '/img/T pose.png',
        'Downward Dog': '/img/DownwardDog.png',
        Plank: '/img/Plank.png',
        'Cobra Pose': '/img/CobraPose.png',
    };

    const fetchSessionData = async () => {
        try {
            const response = await fetch('http://127.0.0.1:3001/update_session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ duration, sets, current_set: currentSet }),
            });
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            const data = await response.json();
            if (data.error) {
                setFeedback({
                    message: 'Error communicating with server.',
                    color: 'text-red-500',
                });
                return;
            }
            if (data.current_pose === selectedPose) {
                setFeedback({
                    message: `Great job! You're in ${selectedPose}!`,
                    color: 'text-[#64A65F]',
                });
            } else if (data.current_pose) {
                setFeedback({
                    message: `Detected ${data.current_pose}. Try adjusting to ${selectedPose}.`,
                    color: 'text-red-500',
                });
            } else {
                setFeedback({
                    message: `Please align with ${selectedPose}.`,
                    color: 'text-red-500',
                });
            }
        } catch (error) {
            setFeedback({
                message: `Error communicating with server: ${error.message}. Is the backend running on port 3001?`,
                color: 'text-red-500',
            });
        }
    };

    const startTimer = () => {
        if (isTimerRunning) return;
        setIsTimerRunning(true);
        timerRef.current = setInterval(async () => {
            setTimeRemaining((prev) => {
                if (prev <= 1) {
                    setCurrentSet((prevSet) => {
                        if (prevSet >= totalSets) {
                            clearInterval(timerRef.current);
                            setIsTimerRunning(false);
                            setFeedback({
                                message: 'Workout complete! Well done!',
                                color: 'text-[#64A65F]',
                            });
                            resetTimer();
                            return prevSet;
                        }
                        fetchSessionData();
                        return prevSet + 1;
                    });
                    return duration;
                }
                return prev - 1;
            });
            await fetchSessionData();
        }, 1000);
    };

    const pauseTimer = () => {
        clearInterval(timerRef.current);
        setIsTimerRunning(false);
    };

    const resetTimer = async () => {
        try {
            const response = await fetch('http://127.0.0.1:3001/reset_session', { method: 'POST' });
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            clearInterval(timerRef.current);
            setTimeRemaining(duration);
            setCurrentSet(1);
            setIsTimerRunning(false);
            setFeedback({
                message: `Please align with ${selectedPose}.`,
                color: 'text-red-500',
            });
            await fetchSessionData();
        } catch (error) {
            setFeedback({
                message: `Error resetting session: ${error.message}`,
                color: 'text-red-500',
            });
        }
    };

    const handlePoseSelect = (pose) => {
        setSelectedPose(pose);
        setFeedback({
            message: `Please align with ${pose}.`,
            color: 'text-red-500',
        });
        resetTimer();
    };

    const handleDurationChange = (e) => {
        const newDuration = parseInt(e.target.value) || 30;
        setDuration(newDuration);
        setTimeRemaining(newDuration);
    };

    const handleSetsChange = (e) => {
        const newSets = parseInt(e.target.value) || 3;
        setSets(newSets);
        setTotalSets(newSets);
    };

    useEffect(() => {
        fetchSessionData();
        const interval = setInterval(fetchSessionData, 2000);
        return () => clearInterval(interval);
    }, [selectedPose, duration, sets, currentSet]);

    useEffect(() => {
        return () => clearInterval(timerRef.current);
    }, []);

    const handleImageError = () => {
        setWebcamError('Failed to load webcam feed. Ensure the backend is running on port 3001 and webcam is accessible.');
    };

    const retryWebcam = () => {
        setWebcamError(null);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-inter">
            <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
            <Head>
                <title>Exercise - Yoga Practice</title>
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
                    rel="stylesheet"
                />
            </Head>
            <Navbar />
            <div className="w-full px-4 sm:px-6 lg:px-8 py-12 pt-24">
                <div className="max-w-7xl mx-auto">

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Webcam Feed */}
                        <div className="bg-white/90 backdrop-blur-lg rounded-xl shadow-md p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Webcam Feed</h2>
                            {webcamError ? (
                                <div className="text-center">
                                    <p className="text-red-500 mb-4">{webcamError}</p>
                                    <button
                                        onClick={retryWebcam}
                                        className="inline-flex items-center px-4 py-2 bg-[#64A65F] text-white rounded-lg hover:bg-[#4B8C47] transition-transform hover:scale-105 shadow-md"
                                    >
                                        <FaRedo className="mr-2" />
                                        Retry Webcam
                                    </button>
                                </div>
                            ) : (
                                <img
                                    src="http://127.0.0.1:3001/video_feed"
                                    alt="Webcam feed"
                                    className="w-full rounded-lg"
                                    onError={handleImageError}
                                />
                            )}
                            {/* Feedback Section */}
                            <div className="mt-4">
                                <h2 className="text-xl font-bold text-gray-800 mb-2">Feedback</h2>
                                <p className={`text-lg ${feedback.color}`}>{feedback.message}</p>
                            </div>
                        </div>

                        {/* Controls and Pose Selection */}
                        <div className="space-y-6">
                            {/* Pose Selection */}
                            <div className="bg-white/90 backdrop-blur-lg rounded-xl shadow-md p-6 animate-fade-in">
                                <h2 className="text-2xl font-bold text-gray-800 mb-4">Select Pose</h2>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {Object.entries(poseImages).map(([pose, imagePath]) => (
                                        <button
                                            key={pose}
                                            onClick={() => handlePoseSelect(pose)}
                                            className={`p-3 rounded-lg transition-transform hover:scale-105 ${selectedPose === pose
                                                    ? 'ring-2 ring-[#64A65F] bg-[#64A65F]/10'
                                                    : 'hover:bg-gray-50'
                                                }`}
                                            aria-label={`Select ${pose}`}
                                        >
                                            <Image
                                                src={imagePath}
                                                alt={pose}
                                                width={150}
                                                height={120}
                                                className="w-full h-32 object-contain mb-2 rounded"
                                            />
                                            <p className="text-center font-medium text-gray-700">{pose}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Timer Controls */}
                            <div className="control-card bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Workout Timer</h2>
                <div className="space-y-6">
                  {/* Progress Bar */}
                  <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-[#3B82F6] transition-all duration-300"
                      style={{ width: `${((duration - timeRemaining) / duration) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-gray-700">
                    <p className="text-sm font-medium">
                      Time: {timeRemaining}s / {duration}s
                    </p>
                    <p className="text-sm font-medium">
                      Set {currentSet} of {totalSets}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Duration (seconds)
                      </label>
                      <input
                        type="number"
                        value={duration}
                        onChange={handleDurationChange}
                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B82F6] text-gray-800 text-sm"
                        min="5"
                        max="300"
                        aria-label="Set duration"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Number of Sets
                      </label>
                      <input
                        type="number"
                        value={sets}
                        onChange={handleSetsChange}
                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B82F6] text-gray-800 text-sm"
                        min="1"
                        max="10"
                        aria-label="Set number of sets"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={startTimer}
                      disabled={isTimerRunning}
                      className="inline-flex items-center px-4 py-2 bg-[#3B82F6] text-white rounded-lg text-sm font-medium hover:bg-[#2563EB] disabled:opacity-50 hover-scale"
                      aria-label="Start timer"
                    >
                      <FaPlay className="mr-2 w-4 h-4" />
                      Start
                    </button>
                    <button
                      onClick={pauseTimer}
                      disabled={!isTimerRunning}
                      className="inline-flex items-center px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:opacity-50 hover-scale"
                      aria-label="Pause timer"
                    >
                      <FaPause className="mr-2 w-4 h-4" />
                      Pause
                    </button>
                    <button
                      onClick={resetTimer}
                      className="inline-flex items-center px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 hover-scale"
                      aria-label="Reset timer"
                    >
                      <FaRedo className="mr-2 w-4 h-4" />
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
