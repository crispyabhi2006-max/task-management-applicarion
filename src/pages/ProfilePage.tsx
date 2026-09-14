import React, { useEffect, useState } from 'react';
import { User as UserIcon, Mail, Calendar, CheckSquare, ShieldCheck, Database, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { authService } from '../services/api.ts';
import { useNavigate } from 'react-router-dom';

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<any>(user);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await authService.getMe();
        if (res.success && res.data?.user) {
          setProfileData(res.data.user);
        }
      } catch (err) {
        // ignore
      }
    }
    loadProfile();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-20 h-20 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-3xl font-bold shadow-md shrink-0">
          {profileData?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="text-center sm:text-left flex-1">
          <h2 className="text-xl font-bold text-slate-900">{profileData?.name}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{profileData?.email}</p>
          <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Authenticated User
            </span>
            <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium border border-indigo-200 flex items-center gap-1 font-mono">
              User ID: #{profileData?.id}
            </span>
          </div>
        </div>

        <button
          id="profile-logout-btn"
          onClick={handleLogout}
          className="px-4 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Account Details & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Info Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Account Information
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-3">
              <UserIcon className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-slate-500 block">Full Name</span>
                <span className="font-semibold text-slate-800">{profileData?.name}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-slate-500 block">Email Address</span>
                <span className="font-semibold text-slate-800">{profileData?.email}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-slate-500 block">Member Since</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {profileData?.createdAt ? new Date(profileData.createdAt).toLocaleDateString() : 'Active'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Database & Architecture Summary */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Internship Tech Stack
          </h3>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
              <span className="text-slate-600 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-500" /> Database Engine
              </span>
              <span className="font-mono font-semibold text-slate-800">MySQL / MariaDB</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
              <span className="text-slate-600 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-indigo-500" /> Total User Tasks
              </span>
              <span className="font-mono font-semibold text-indigo-700">
                {profileData?.totalTasks !== undefined ? profileData.totalTasks : 'Loading...'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
              <span className="text-slate-600">Authentication</span>
              <span className="font-mono font-semibold text-slate-800">JWT (JSON Web Tokens)</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
              <span className="text-slate-600">Password Hashing</span>
              <span className="font-mono font-semibold text-slate-800">bcryptjs (Salt 10)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
