'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/navbar';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, push, get, update } from 'firebase/database';
import { app, db } from '@/app/firebase-config';
import Link from 'next/link';

export default function BookAppointment() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [userId, setUserId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [mode, setMode] = useState('video');
  const [cause, setCause] = useState('');
  const [dateTime, setDateTime] = useState('');

  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [doctorFilter, setDoctorFilter] = useState('all');

  useEffect(() => {
    const auth = getAuth(app);
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        alert('You must be logged in to book an appointment.');
        router.replace('/login');
        return;
      }
      const roleSnap = await get(ref(db, `users/${user.uid}/role`));
      if (roleSnap.val() === 'doctor') {
        alert('Doctors cannot book appointments.');
        router.replace('/');
        return;
      }
      setUserId(user.uid);
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsub = onValue(usersRef, (snap) => {
      const data = snap.val() || {};
      const docs = Object.entries(data)
        .filter(([, u]) => u.role === 'doctor')
        .map(([id, u]) => ({ id, name: u.name, specialization: u.specialization }));
      setDoctors(docs);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const apptRef = ref(db, 'appointments');
    const unsub = onValue(apptRef, (snap) => {
      const data = snap.val() || {};
      const all = Object.entries(data).map(([id, a]) => ({ id, ...a }));
      const now = Date.now();

      all.forEach((appt) => {
        if (
          appt.status === 'accepted' &&
          appt.generatedAt &&
          now > appt.generatedAt + 30 * 60 * 1000
        ) {
          update(ref(db, `appointments/${appt.id}`), {
            status: 'completed',
            meetingLink: null,
            generatedAt: null,
            roomId: null,
          });
        }
      });

      const mine = all
        .filter((a) => a.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt);
      setAppointments(mine);
    });
    return () => unsub();
  }, [userId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patientName.trim() || !selectedDoctorId || !dateTime) {
      alert('Please fill all fields.');
      return;
    }

    const allSnap = await get(ref(db, 'appointments'));
    const allData = allSnap.val() || {};
    const existingAccepted = Object.entries(allData)
      .map(([id, a]) => ({ id, ...a }))
      .filter((a) => a.doctorId === selectedDoctorId && a.status === 'accepted');

    const requestedTime = new Date(dateTime).getTime();
    const THIRTY_MIN = 30 * 60 * 1000;
    for (let appt of existingAccepted) {
      const existingTime = new Date(appt.dateTime).getTime();
      if (
        requestedTime >= existingTime &&
        requestedTime < existingTime + THIRTY_MIN
      ) {
        alert(
          'Sorry, that doctor already has an appointment at that time. Please choose another slot.'
        );
        return;
      }
    }

    const doctor = doctors.find((d) => d.id === selectedDoctorId);
    const newAppt = {
      patientName: patientName.trim(),
      doctorId: selectedDoctorId,
      doctorName: doctor.name,
      mode,
      description: cause.trim(),
      dateTime,
      status: 'pending',
      createdAt: Date.now(),
      userId,
    };

    try {
      await push(ref(db, 'appointments'), newAppt);
      alert('Appointment booked successfully!');
      setPatientName('');
      setSelectedDoctorId('');
      setMode('video');
      setCause('');
      setDateTime('');
    } catch (err) {
      console.error('Firebase write failed:', err);
      alert('Error booking appointment. Please try again.');
    }
  };

  // Filter appointments based on search and filters
  const getFilteredAppointments = () => {
    let filtered = appointments;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (appt) =>
          appt.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appt.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((appt) => appt.status === statusFilter);
    }

    // Doctor filter
    if (doctorFilter !== 'all') {
      filtered = filtered.filter((appt) => appt.doctorId === doctorFilter);
    }

    // Sort
    if (sortBy === 'newest') {
      filtered.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => a.createdAt - b.createdAt);
    } else if (sortBy === 'date') {
      filtered.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
    }

    return filtered;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
        );
      case 'accepted':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20,6 9,17 4,12"/>
          </svg>
        );
      case 'rejected':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        );
      case 'completed':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22,4 12,14.01 9,11.01"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const getModeIcon = (mode) => {
    if (mode === 'video') {
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="23 7 16 12 23 17 23 7"/>
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 9v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9"/>
          <path d="M9 22V12h6v10M2 10.6L12 2l10 8.6"/>
        </svg>
      );
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 border-4 border-[#2D5A2B] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading appointments...</p>
        </div>
      </div>
    );
  }

  const filteredAppointments = getFilteredAppointments();

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      <Head>
        <title>Book Appointment - Healthcare Portal</title>
      </Head>
      <Navbar />

      <div className="flex flex-1 mt-20 relative">
        {/* Sidebar Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed top-24 left-4 z-20 px-4 py-2 bg-[#2D5A2B] text-white rounded-lg hover:bg-[#1F3F1E] transition-all duration-200 shadow-lg flex items-center space-x-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="9" y1="9" x2="15" y2="9"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
          <span>{sidebarOpen ? 'Hide' : 'View'} Appointments</span>
        </button>

        {/* Sidebar */}
        <aside
          className={`fixed top-0 left-0 h-full w-96 bg-white shadow-2xl transition-transform duration-300 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } z-10 pt-24 overflow-y-auto border-r border-gray-200`}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-[#2D5A2B] flex items-center space-x-2">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7z"/>
                </svg>
                <span>Your Appointments</span>
              </h3>
              <span className="bg-[#2D5A2B] text-white px-2 py-1 rounded-full text-sm font-semibold">
                {appointments.length}
              </span>
            </div>

            {/* Search and Filters */}
            <div className="space-y-4 mb-6">
              {/* Search */}
              <div className="relative">
                <svg className="absolute left-3 top-3 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search appointments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5A2B] focus:border-transparent"
                />
              </div>

              {/* Filters Row */}
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5A2B] focus:border-transparent text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="completed">Completed</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5A2B] focus:border-transparent text-sm"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="date">By Date</option>
                </select>
              </div>

              {/* Doctor Filter */}
              <select
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5A2B] focus:border-transparent text-sm"
              >
                <option value="all">All Doctors</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    Dr. {doc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Appointments List */}
            {filteredAppointments.length > 0 ? (
              <div className="space-y-4">
                {filteredAppointments.map((appt, index) => (
                  <div
                    key={appt.id}
                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 bg-[#2D5A2B] rounded-lg flex items-center justify-center text-white font-semibold">
                          {appt.doctorName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">Dr. {appt.doctorName}</h4>
                          <div className="flex items-center space-x-1 text-sm text-gray-500">
                            {getModeIcon(appt.mode)}
                            <span className="capitalize">{appt.mode}</span>
                          </div>
                        </div>
                      </div>
                      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold ${
                        {
                          pending: 'bg-yellow-100 text-yellow-700',
                          accepted: 'bg-green-100 text-green-700',
                          rejected: 'bg-red-100 text-red-700',
                          completed: 'bg-gray-100 text-gray-700',
                        }[appt.status]
                      }`}>
                        {getStatusIcon(appt.status)}
                        <span className="capitalize">{appt.status}</span>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/>
                          <line x1="8" y1="2" x2="8" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        <span>{new Date(appt.dateTime).toLocaleDateString()}</span>
                        <span>{new Date(appt.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      {appt.description && (
                        <div className="flex items-start space-x-2 text-gray-600">
                          <svg className="w-4 h-4 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <polyline points="10,9 9,9 8,9"/>
                          </svg>
                          <span className="text-xs">{appt.description}</span>
                        </div>
                      )}
                    </div>

                    {appt.status === 'accepted' && appt.meetingLink && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <Link
                          href={appt.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-2 px-3 py-2 bg-[#2D5A2B] text-white rounded-lg hover:bg-[#1F3F1E] transition-colors duration-200 text-sm"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="23 7 16 12 23 17 23 7"/>
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                          </svg>
                          <span>Join Meeting</span>
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="9" y1="9" x2="15" y2="9"/>
                  <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
                <p className="text-gray-500 font-medium">No appointments found</p>
                <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 py-8 px-6">
          <div className="max-w-6xl mx-auto">
            {/* Header Section */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Book Your Appointment</h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Schedule a consultation with our experienced healthcare professionals. Choose between video calls or in-person visits.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Appointment Form */}
              <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-[#2D5A2B] rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Schedule Your Visit</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="patientName" className="block text-gray-700 font-semibold mb-2">
                      Full Name
                    </label>
                    <input
                      id="patientName"
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2D5A2B] focus:border-transparent transition-all duration-200"
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="doctor" className="block text-gray-700 font-semibold mb-2">
                      Select Doctor
                    </label>
                    <select
                      id="doctor"
                      value={selectedDoctorId}
                      onChange={(e) => setSelectedDoctorId(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2D5A2B] focus:border-transparent transition-all duration-200"
                      required
                    >
                      <option value="" disabled>Choose your preferred doctor</option>
                      {doctors.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          Dr. {doc.name} - {doc.specialization}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="mode" className="block text-gray-700 font-semibold mb-2">
                      Consultation Type
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <label className={`relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                        mode === 'video' ? 'border-[#2D5A2B] bg-green-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="mode"
                          value="video"
                          checked={mode === 'video'}
                          onChange={(e) => setMode(e.target.value)}
                          className="sr-only"
                        />
                        <div className="flex items-center space-x-3">
                          <svg className="w-6 h-6 text-[#2D5A2B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="23 7 16 12 23 17 23 7"/>
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                          </svg>
                          <span className="font-medium text-gray-900">Video Call</span>
                        </div>
                      </label>
                      <label className={`relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                        mode === 'in-person' ? 'border-[#2D5A2B] bg-green-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="mode"
                          value="in-person"
                          checked={mode === 'in-person'}
                          onChange={(e) => setMode(e.target.value)}
                          className="sr-only"
                        />
                        <div className="flex items-center space-x-3">
                          <svg className="w-6 h-6 text-[#2D5A2B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 9v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9"/>
                            <path d="M9 22V12h6v10M2 10.6L12 2l10 8.6"/>
                          </svg>
                          <span className="font-medium text-gray-900">In-Person</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="cause" className="block text-gray-700 font-semibold mb-2">
                      Reason for Visit
                    </label>
                    <textarea
                      id="cause"
                      value={cause}
                      onChange={(e) => setCause(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2D5A2B] focus:border-transparent transition-all duration-200 resize-none"
                      rows={4}
                      placeholder="Please describe your symptoms or reason for consultation..."
                    />
                  </div>

                  <div>
                    <label htmlFor="datetime" className="block text-gray-700 font-semibold mb-2">
                      Preferred Date & Time
                    </label>
                    <input
                      id="datetime"
                      type="datetime-local"
                      value={dateTime}
                      onChange={(e) => setDateTime(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2D5A2B] focus:border-transparent transition-all duration-200"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-[#2D5A2B] text-white rounded-xl hover:bg-[#1F3F1E] transition-all duration-200 font-semibold text-lg flex items-center justify-center space-x-2 shadow-lg"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20,6 9,17 4,12"/>
                    </svg>
                    <span>Confirm Appointment</span>
                  </button>
                </form>
              </div>

              {/* Info Panel */}
              <div className="space-y-8">
                {/* Quick Stats */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Your Healthcare Summary</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-xl">
                      <div className="text-2xl font-bold text-blue-600">{appointments.length}</div>
                      <div className="text-sm text-blue-600 font-medium">Total Appointments</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-xl">
                      <div className="text-2xl font-bold text-green-600">
                        {appointments.filter(a => a.status === 'completed').length}
                      </div>
                      <div className="text-sm text-green-600 font-medium">Completed</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-xl">
                      <div className="text-2xl font-bold text-yellow-600">
                        {appointments.filter(a => a.status === 'pending').length}
                      </div>
                      <div className="text-sm text-yellow-600 font-medium">Pending</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-xl">
                      <div className="text-2xl font-bold text-purple-600">
                        {appointments.filter(a => a.status === 'accepted').length}
                      </div>
                      <div className="text-sm text-purple-600 font-medium">Accepted</div>
                    </div>
                  </div>
                </div>

                {/* How It Works */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                    <svg className="w-5 h-5 text-[#2D5A2B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <span>How It Works</span>
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-[#2D5A2B] text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Fill the Form</h4>
                        <p className="text-gray-600 text-sm">Provide your details and select your preferred doctor</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-[#2D5A2B] text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Doctor Reviews</h4>
                        <p className="text-gray-600 text-sm">Your doctor will review and approve your appointment</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-[#2D5A2B] text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Get Confirmation</h4>
                        <p className="text-gray-600 text-sm">Receive meeting link or visit details once approved</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Available Doctors */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                    <svg className="w-5 h-5 text-[#2D5A2B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    <span>Available Doctors</span>
                  </h3>
                  <div className="space-y-3">
                    {doctors.slice(0, 3).map((doctor) => (
                      <div key={doctor.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 bg-[#2D5A2B] rounded-full flex items-center justify-center text-white font-semibold">
                          {doctor.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">Dr. {doctor.name}</h4>
                          <p className="text-sm text-gray-600">{doctor.specialization}</p>
                        </div>
                      </div>
                    ))}
                    {doctors.length > 3 && (
                      <div className="text-center pt-2">
                        <p className="text-sm text-gray-500">+{doctors.length - 3} more doctors available</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="bg-gradient-to-r from-red-50 to-red-100 p-6 rounded-2xl border border-red-200">
                  <h3 className="text-xl font-bold text-red-800 mb-2 flex items-center space-x-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                    <span>Emergency?</span>
                  </h3>
                  <p className="text-red-700 text-sm mb-3">
                    For urgent medical situations, please contact emergency services immediately.
                  </p>
                  <div className="flex space-x-3">
                    <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
                      Call 911
                    </button>
                    <button className="px-4 py-2 bg-white text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium">
                      Emergency Info
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}