import React from 'react';
import { Outlet } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F2FBF5] via-[#E6F8ED] to-[#F2FBF5] text-[#202833] flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans selection:bg-[#00DF68] selection:text-black">
      {/* Soft Ambient Radiance */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#00DF68]/8 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 my-auto flex flex-col items-center">
        <Outlet />
      </div>

      <footer className="mt-6 mb-3 text-center text-[10px] text-slate-400 relative z-10 flex items-center justify-center gap-1.5 font-medium">
        <span>Protected Workstation</span>
        <span>&bull;</span>
        <span className="text-slate-600 font-bold">SILICON LABS</span>
        <span>&bull;</span>
        <span>StudentBridge Enterprise</span>
      </footer>
    </div>
  );
};
