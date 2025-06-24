'use client';

import React, { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/navbar';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { FaPlay, FaPause, FaRedo, FaExclamationTriangle, FaClock, FaCheckCircle } from 'react-icons/fa';

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
            const response = await fetch('http://127.0.0.1:8080/update_session', {
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
                    message: `Perfect! You're holding ${selectedPose} beautifully!`,
                    color: 'text-emerald-600',
                });
            } else if (data.current_pose) {
                setFeedback({
                    message: `Detected ${data.current_pose}. Adjust to ${selectedPose}.`,
                    color: 'text-amber-600',
                });
            } else {
                setFeedback({
                    message: `Position yourself for ${selectedPose}.`,
                    color: 'text-slate-600',
                });
            }
        } catch (error) {
            setFeedback({
                message: `Connection error: ${error.message}. Check if backend is running on port 8080.`,
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
                                message: '🎉 Workout complete! Excellent work!',
                                color: 'text-emerald-600',
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
            const response = await fetch('http://127.0.0.1:8080/reset_session', { method: 'POST' });
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            clearInterval(timerRef.current);
            setTimeRemaining(duration);
            setCurrentSet(1);
            setIsTimerRunning(false);
            setFeedback({
                message: `Ready to begin ${selectedPose}.`,
                color: 'text-slate-600',
            });
            await fetchSessionData();
        } catch (error) {
            setFeedback({
                message: `Reset error: ${error.message}`,
                color: 'text-red-500',
            });
        }
    };

    const handlePoseSelect = (pose) => {
        setSelectedPose(pose);
        setFeedback({
            message: `Get ready for ${pose}.`,
            color: 'text-slate-600',
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
        setWebcamError('Unable to load webcam feed. Please ensure your camera is connected and the backend server is running on port 8080.');
    };

    const retryWebcam = () => {
        setWebcamError(null);
    };

    const progressPercentage = ((duration - timeRemaining) / duration) * 100;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-inter">
            <Head>
                <title>AI Yoga Practice - Exercise Session</title>
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
                    rel="stylesheet"
                />
            </Head>
            
            <Navbar />
            
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
                {/* Header Section */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-slate-800 mb-2">AI Yoga Practice</h1>
                    <p className="text-slate-600 text-lg">Perfect your poses with real-time feedback</p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Webcam Feed - Takes up 2 columns on xl screens */}
                    <div className="xl:col-span-2">
                        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                            {/* Webcam Header */}
                            <div className="bg-gradient-to-r from-forest-600 to-forest-700 px-6 py-4">
                                <h2 className="text-xl font-semibold text-white flex items-center">
                                    <div className="w-3 h-3 bg-green-400 rounded-full mr-3 animate-pulse"></div>
                                    Live Camera Feed
                                </h2>
                            </div>
                            
                            {/* Webcam Content */}
                            <div className="p-6">
                                {webcamError ? (
                                    <div className="text-center py-12">
                                        <FaExclamationTriangle className="mx-auto text-6xl text-amber-500 mb-4" />
                                        <p className="text-slate-600 mb-6 max-w-md mx-auto leading-relaxed">
                                            {webcamError}
                                        </p>
                                        <button
                                            onClick={retryWebcam}
                                            className="inline-flex items-center px-6 py-3 bg-forest-600 text-white rounded-xl hover:bg-forest-700 transition-all duration-200 transform hover:scale-105 shadow-lg font-medium"
                                        >
                                            <FaRedo className="mr-2" />
                                            Retry Connection
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="relative rounded-xl overflow-hidden bg-slate-100">
                                            <img
                                                src="http://127.0.0.1:8080/video_feed"
                                                alt="Live webcam feed showing your pose"
                                                className="w-full h-auto"
                                                onError={handleImageError}
                                            />
                                        </div>
                                        
                                        {/* Feedback Card */}
                                        <div className="bg-slate-50 rounded-xl p-4 border-l-4 border-forest-500">
                                            <div className="flex items-start space-x-3">
                                                <div className="flex-shrink-0 mt-1">
                                                    {feedback.color.includes('emerald') ? (
                                                        <FaCheckCircle className="text-emerald-500 text-xl" />
                                                    ) : (
                                                        <FaClock className="text-slate-500 text-xl" />
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-medium text-slate-800 mb-1">Real-time Feedback</h3>
                                                    <p className={`text-lg font-medium ${feedback.color}`}>
                                                        {feedback.message}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Controls Section */}
                    <div className="space-y-6">
                        {/* Timer Controls */}
                        <div className="bg-white rounded-2xl shadow-xl border border-slate-200">
                            <div className="bg-gradient-to-r from-forest-600 to-forest-700 px-6 py-4 rounded-t-2xl">
                                <h2 className="text-xl font-semibold text-white">Workout Timer</h2>
                            </div>
                            
                            <div className="p-6 space-y-6">
                                {/* Circular Progress */}
                                <div className="flex items-center justify-center">
                                    <div className="relative w-32 h-32">
                                        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                                            <circle
                                                cx="50"
                                                cy="50"
                                                r="45"
                                                stroke="currentColor"
                                                strokeWidth="6"
                                                fill="none"
                                                className="text-slate-200"
                                            />
                                            <circle
                                                cx="50"
                                                cy="50"
                                                r="45"
                                                stroke="currentColor"
                                                strokeWidth="6"
                                                fill="none"
                                                strokeDasharray={`${2 * Math.PI * 45}`}
                                                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progressPercentage / 100)}`}
                                                className="text-forest-600 transition-all duration-1000 ease-out"
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-slate-800">{timeRemaining}</div>
                                                <div className="text-xs text-slate-500">seconds</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Set Progress */}
                                <div className="text-center">
                                    <div className="text-lg font-semibold text-slate-800">
                                        Set {currentSet} of {totalSets}
                                    </div>
                                    <div className="flex justify-center mt-2 space-x-1">
                                        {Array.from({ length: totalSets }, (_, i) => (
                                            <div
                                                key={i}
                                                className={`w-3 h-3 rounded-full ${
                                                    i < currentSet ? 'bg-forest-600' : 'bg-slate-300'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Settings */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Duration (sec)
                                        </label>
                                        <input
                                            type="number"
                                            value={duration}
                                            onChange={handleDurationChange}
                                            disabled={isTimerRunning}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-forest-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                                            min="5"
                                            max="300"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Sets
                                        </label>
                                        <input
                                            type="number"
                                            value={sets}
                                            onChange={handleSetsChange}
                                            disabled={isTimerRunning}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-forest-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                                            min="1"
                                            max="10"
                                        />
                                    </div>
                                </div>

                                {/* Control Buttons */}
                                <div className="flex justify-center space-x-3">
                                    <button
                                        onClick={startTimer}
                                        disabled={isTimerRunning}
                                        className="flex items-center px-6 py-3 bg-forest-600 text-white rounded-xl hover:bg-forest-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg font-medium"
                                    >
                                        <FaPlay className="mr-2" />
                                        Start
                                    </button>
                                    <button
                                        onClick={pauseTimer}
                                        disabled={!isTimerRunning}
                                        className="flex items-center px-6 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg font-medium"
                                    >
                                        <FaPause className="mr-2" />
                                        Pause
                                    </button>
                                    <button
                                        onClick={resetTimer}
                                        className="flex items-center px-4 py-3 bg-slate-500 text-white rounded-xl hover:bg-slate-600 transition-all duration-200 transform hover:scale-105 shadow-lg font-medium"
                                    >
                                        <FaRedo className="mr-2" />
                                        Reset
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Current Pose Display */}
                        <div className="bg-white rounded-2xl shadow-xl border border-slate-200">
                            <div className="bg-gradient-to-r from-forest-600 to-forest-700 px-6 py-4 rounded-t-2xl">
                                <h2 className="text-xl font-semibold text-white">Current Pose</h2>
                            </div>
                            <div className="p-6 text-center">
                                <div className="mb-4">
                                    <Image
                                        src={poseImages[selectedPose]}
                                        alt={selectedPose}
                                        width={200}
                                        height={150}
                                        className="mx-auto rounded-xl shadow-md"
                                    />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800">{selectedPose}</h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pose Selection */}
                <div className="mt-8">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200">
                        <div className="bg-gradient-to-r from-forest-600 to-forest-700 px-6 py-4 rounded-t-2xl">
                            <h2 className="text-xl font-semibold text-white">Choose Your Pose</h2>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                                {Object.entries(poseImages).map(([pose, imagePath]) => (
                                    <button
                                        key={pose}
                                        onClick={() => handlePoseSelect(pose)}
                                        className={`group relative p-4 rounded-xl transition-all duration-200 transform hover:scale-105 ${
                                            selectedPose === pose
                                                ? 'ring-3 ring-forest-500 bg-forest-50 shadow-lg'
                                                : 'hover:bg-slate-50 hover:shadow-md'
                                        }`}
                                    >
                                        <div className="relative">
                                            <Image
                                                src={imagePath}
                                                alt={pose}
                                                width={120}
                                                height={120}
                                                className="w-full h-24 object-contain mb-3 rounded-lg"
                                            />
                                            {selectedPose === pose && (
                                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-forest-600 rounded-full flex items-center justify-center">
                                                    <FaCheckCircle className="text-white text-sm" />
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-sm font-medium text-slate-700 text-center leading-tight">
                                            {pose}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .font-inter {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                
                .forest-50 { background-color: #f0f9f0; }
                .forest-500 { background-color: #22c55e; border-color: #22c55e; }
                .forest-600 { background-color: #16a34a; }
                .forest-700 { background-color: #15803d; }
                
                .text-forest-600 { color: #16a34a; }
                .bg-forest-50 { background-color: #f0f9f0; }
                .bg-forest-600 { background-color: #16a34a; }
                .bg-forest-700 { background-color: #15803d; }
                .hover\\:bg-forest-700:hover { background-color: #15803d; }
                .ring-forest-500 { --tw-ring-color: #22c55e; }
                .focus\\:ring-forest-500:focus { --tw-ring-color: #22c55e; }
                .focus\\:border-forest-500:focus { border-color: #22c55e; }
                .ring-3 { --tw-ring-offset-width: 3px; }
            `}</style>
        </div>
    );
}