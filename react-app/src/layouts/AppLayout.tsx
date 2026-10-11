import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { UserRole } from '@/types';
import { getCurrentUser } from '@/lib/store';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const user = getCurrentUser();

  // If not logged in, redirect to login page immediately
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Server-Side Role Enforcement Guard:
  // Strictly isolate each station — each user role can ONLY access their own station
  if (user.role === 'SENDER' && !location.pathname.startsWith('/sender')) {
    return <Navigate to="/sender/register" replace />;
  }
  if (user.role === 'RECEIVER' && !location.pathname.startsWith('/receiver')) {
    return <Navigate to="/receiver/dashboard" replace />;
  }
  if (user.role === 'ADMIN' && !location.pathname.startsWith('/admin')) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (location.pathname.startsWith('/super-admin') && user.role !== 'SUPER_ADMIN') {
    if (user.role === 'SENDER') return <Navigate to="/sender/register" replace />;
    if (user.role === 'RECEIVER') return <Navigate to="/receiver/dashboard" replace />;
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Derive station from current path
  const getStationFromPath = (path: string): UserRole => {
    if (path.startsWith('/sender')) return 'SENDER';
    if (path.startsWith('/receiver')) return 'RECEIVER';
    if (path.startsWith('/admin')) return 'ADMIN';
    if (path.startsWith('/super-admin')) return 'SUPER_ADMIN';
    return user.role || 'SENDER';
  };

  const [currentStation, setCurrentStation] = useState<UserRole>(() => getStationFromPath(location.pathname));

  useEffect(() => {
    const station = getStationFromPath(location.pathname);
    setCurrentStation(station);
  }, [location.pathname]);

  const handleStationChange = (newStation: UserRole) => {
    setCurrentStation(newStation);
    if (newStation === 'SENDER') navigate('/sender/register');
    else if (newStation === 'RECEIVER') navigate('/receiver/dashboard');
    else if (newStation === 'ADMIN') navigate('/admin/dashboard');
    else if (newStation === 'SUPER_ADMIN') navigate('/super-admin/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-[#1E293B] flex font-sans selection:bg-[#85E510] selection:text-[#062404]">
      {/* Role-Specific Persistent Sidebar */}
      <Sidebar
        currentStation={currentStation}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area with Header */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header
          currentStation={currentStation}
          onStationChange={handleStationChange}
          onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        />

        <main className="flex-1 min-w-0 bg-[#F1F5F9] p-3 sm:p-5 lg:p-6 overflow-y-auto">
          <div className="max-w-[1780px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
