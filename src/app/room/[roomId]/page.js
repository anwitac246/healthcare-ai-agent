
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Peer from "peerjs";
import io from "socket.io-client";
import Head from "next/head";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaShare, FaClock } from "react-icons/fa";
import Link from "next/link";

import { db } from "@/app/firebase-config";
import { ref as dbRef, query, orderByChild, equalTo, onValue, update } from "firebase/database";

gsap.registerPlugin(ScrollTrigger);

const socket = io("http://localhost:5000");

export default function Room() {
  const { roomId } = useParams();
  const router = useRouter();

  const [status, setStatus] = useState("loading");
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);

  const videoGridRef = useRef(null);
  const headerRef = useRef(null);
  const controlsRef = useRef(null);
  const toastRef = useRef(null);
  const myPeer = useRef(null);
  const peersRef = useRef({});
  const joinedUsersRef = useRef(new Set());
  const localStream = useRef(null);
  const myId = useRef(null);

  useEffect(() => {
    if (!roomId) return;
    const apptQ = query(dbRef(db, "appointments"), orderByChild("roomId"), equalTo(roomId));
    const unsub = onValue(apptQ, (snap) => {
      const data = snap.val();
      if (!data) {
        setStatus("invalid");
        return;
      }
      const [id, appt] = Object.entries(data)[0];
      const now = Date.now();
      if (!appt.generatedAt || now > appt.generatedAt + 30 * 60 * 1000) {
        update(dbRef(db, `appointments/${id}`), {
          status: "completed",
          meetingLink: null,
          generatedAt: null,
          roomId: null,
        });
        setStatus("expired");
      } else {
        setStatus("valid");
      }
    });
    return () => unsub();
  }, [roomId]);

  useEffect(() => {
    if (!roomId || status !== "valid") return;

    const peer = new Peer(undefined, {
      host: "localhost",
      port: 5000,
      path: "/peerjs",
      secure: false,
    });
    myPeer.current = peer;

    peer.on("open", (id) => {
      myId.current = id;
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          localStream.current = stream;

          const video = document.createElement("video");
          video.muted = true;
          addVideoStream(video, stream, id, true);

          socket.emit("join-room", roomId, id);

          socket.on("room-users", (users) => {
            users.forEach((userId) => {
              if (userId !== id && !joinedUsersRef.current.has(userId)) {
                connectToNewUser(userId, stream);
                joinedUsersRef.current.add(userId);
              }
            });
          });

          socket.on("user-connected", (userId) => {
            if (userId !== id && !joinedUsersRef.current.has(userId)) {
              connectToNewUser(userId, stream);
              joinedUsersRef.current.add(userId);
            }
          });

          peer.on("call", (call) => {
            call.answer(stream);
            const remoteVideo = document.createElement("video");
            call.on("stream", (remoteStream) => {
              addVideoStream(remoteVideo, remoteStream, call.peer, false);
            });
            call.on("close", () => {
              removeVideo(call.peer);
            });
            peersRef.current[call.peer] = call;
          });

          socket.on("user-disconnected", (userId) => {
            if (peersRef.current[userId]) {
              peersRef.current[userId].close();
              delete peersRef.current[userId];
              joinedUsersRef.current.delete(userId);
              removeVideo(userId);
            }
          });

          socket.on("room-timer", (seconds) => setTimeLeft(seconds));
          socket.on("room-expired", () => {
            alert("This room has expired.");
            router.push("/room");
          });
        })
        .catch((err) => console.error("Media error:", err));
    });

    return () => {
      peer.destroy();
      socket.disconnect();
      Object.values(peersRef.current).forEach((call) => call.close());
      localStream.current?.getTracks().forEach((t) => t.stop());
    };
  }, [roomId, status, router]);

  useEffect(() => {
    // Header animation: fade-in and slide-up
    gsap.fromTo(
      headerRef.current,
      { opacity: 0, y: -50 },
      { opacity: 1, y: 0, duration: 1, ease: "power3.out" }
    );

    // Controls animation: fade-in and slide-up
    gsap.fromTo(
      controlsRef.current,
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: controlsRef.current,
          start: "top 90%",
        },
      }
    );

    // Toast animation: scale and fade
    if (linkCopied) {
      gsap.fromTo(
        toastRef.current,
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.7)" }
      );
      gsap.to(toastRef.current, {
        opacity: 0,
        scale: 0.8,
        duration: 0.5,
        delay: 1.5,
        ease: "power3.in",
      });
    }

    // Cleanup ScrollTriggers
    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, [linkCopied]);

  useEffect(() => {
    if (timeLeft == null || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  function connectToNewUser(userId, stream) {
    const call = myPeer.current.call(userId, stream);
    const video = document.createElement("video");
    call.on("stream", (userStream) => addVideoStream(video, userStream, userId, false));
    call.on("close", () => removeVideo(userId));
    peersRef.current[userId] = call;

    // Animate new video card
    gsap.fromTo(
      videoGridRef.current.querySelector(`[data-id="${userId}"]`),
      { opacity: 0, scale: 0.8 },
      { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.7)" }
    );
  }

  function addVideoStream(video, stream, id, isLocal = false) {
    if (videoGridRef.current.querySelector(`[data-id="${id}"]`)) return;
    video.srcObject = stream;
    video.playsInline = true;
    video.addEventListener("loadedmetadata", () => video.play());
    const wrapper = document.createElement("div");
    wrapper.className =
      "relative rounded-xl overflow-hidden bg-black/90 backdrop-blur-md border border-[#A8D5A2]/50 shadow-lg video-card";
    wrapper.dataset.id = id;
    video.className = "w-full h-64 object-cover";
    const label = document.createElement("div");
    label.className =
      "absolute bottom-2 left-2 bg-[#64A65F] text-[#F5F5F5] px-2 py-1 rounded-lg text-sm font-semibold";
    label.textContent = isLocal ? "You" : `User ${id.slice(0, 8)}`;
    wrapper.appendChild(video);
    wrapper.appendChild(label);
    videoGridRef.current.appendChild(wrapper);
  }

  function removeVideo(id) {
    const vid = videoGridRef.current.querySelector(`[data-id="${id}"]`);
    if (vid) {
      gsap.to(vid, {
        opacity: 0,
        scale: 0.8,
        duration: 0.5,
        ease: "power3.in",
        onComplete: () => vid.remove(),
      });
    }
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
  };

  const formatTime = (sec) => {
    if (!sec || sec <= 0) return "Expired";
    const m = Math.floor(sec / 60),
      s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <FaVideo className="text-[#64A65F] text-4xl animate-bounce" />
          <p className="text-[#64A65F] text-lg font-semibold mt-2 animate-pulse">
            Checking meeting link...
          </p>
        </div>
      </div>
    );
  }
  if (status === "invalid") {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <p className="text-red-600 text-xl font-semibold font-[Poppins]">
          Invalid meeting link.
        </p>
      </div>
    );
  }
  if (status === "expired") {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <p className="text-[#4B8C47] text-xl font-semibold font-[Poppins]">
          This meeting has expired.
        </p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>AetherCare – Room {roomId}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col relative overflow-hidden font-sans">
        {/* Background Wave Pattern */}
        <div className="absolute inset-0 z-0 opacity-10">
          <svg
            className="w-full h-full"
            viewBox="0 0 1440 320"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="#A8D5A2"
              d="M0,160L80,186.7C160,213,320,267,480,266.7C640,267,800,213,960,186.7C1120,160,1280,160,1360,160L1440,160L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"
            />
          </svg>
        </div>
        <header
          ref={headerRef}
          className="bg-[#64A65F] p-4 shadow-lg z-10"
        >
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold text-[#F5F5F5] font-[Poppins]">
              AetherCare
            </h1>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center bg-[#F5F5F5] text-[#64A65F] px-3 py-1 rounded-full text-sm font-semibold">
                Room ID: {roomId}
              </span>
              <span className="inline-flex items-center bg-[#F5F5F5] text-[#64A65F] px-3 py-1 rounded-full text-sm font-semibold">
                <FaClock className="mr-1" />
                Time Left: {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-7xl mx-auto p-6 z-10">
          <div
            ref={videoGridRef}
            className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          />
          <div ref={controlsRef} className="mt-8 flex flex-wrap justify-center gap-4">
            <button
              onClick={toggleAudio}
              className="flex items-center px-6 py-3 bg-[#64A65F] text-[#F5F5F5] rounded-lg font-semibold hover:bg-[#4B8C47] transition-all shadow-md hover:shadow-lg hover:scale-105"
            >
              {audioMuted ? (
                <>
                  <FaMicrophoneSlash className="mr-2" />
                  Unmute Audio
                </>
              ) : (
                <>
                  <FaMicrophone className="mr-2" />
                  Mute Audio
                </>
              )}
            </button>
            <button
              onClick={toggleVideo}
              className="flex items-center px-6 py-3 bg-[#64A65F] text-[#F5F5F5] rounded-lg font-semibold hover:bg-[#4B8C47] transition-all shadow-md hover:shadow-lg hover:scale-105"
            >
              {videoOff ? (
                <>
                  <FaVideo className="mr-2" />
                  Start Video
                </>
              ) : (
                <>
                  <FaVideoSlash className="mr-2" />
                  Stop Video
                </>
              )}
            </button>
            <button
              onClick={shareLink}
              className="flex items-center px-6 py-3 bg-[#64A65F] text-[#F5F5F5] rounded-lg font-semibold hover:bg-[#4B8C47] transition-all shadow-md hover:shadow-lg hover:scale-105"
            >
              <FaShare className="mr-2" />
              Share Room Link
            </button>
          </div>
        </main>
        {linkCopied && (
          <div
            ref={toastRef}
            className="fixed top-4 right-4 bg-[#64A65F] text-[#F5F5F5] px-6 py-3 rounded-lg shadow-lg z-50"
          >
            Link Copied!
          </div>
        )}
        <footer className="bg-[#64A65F] text-[#F5F5F5] py-8 mt-auto z-10">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-base">
              © {new Date().getFullYear()} AetherCare. All rights reserved.
            </p>
            <div className="mt-4 space-x-4">
              <Link href="/about" className="text-[#F5F5F5] hover:text-[#A8D5A2] transition">
                About
              </Link>
              <Link href="/contact" className="text-[#F5F5F5] hover:text-[#A8D5A2] transition">
                Contact
              </Link>
              <Link href="/privacy" className="text-[#F5F5F5] hover:text-[#A8D5A2] transition">
                Privacy Policy
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
