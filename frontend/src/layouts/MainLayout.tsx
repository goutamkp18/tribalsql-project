import React, { useState } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { TopNav } from '../components/layout/TopNav';
import { NotificationCenter } from '../components/layout/NotificationCenter';
import { mockSystemStatus } from '../data/mockDashboard';
import { PageView } from '../types';

interface MainLayoutProps {
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  currentPage,
  onNavigate,
  children,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F7F7] text-[#142337] flex flex-col font-sans">
      {/* Persistent Powder Blue Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1 min-h-screen bg-[#F5F7F7]">
        {/* Top Navigation */}
        <TopNav
          systemStatus={mockSystemStatus}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          unreadCount={1}
        />

        {/* Dynamic Page Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Notification Center Dialog */}
      <NotificationCenter
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onNavigate={onNavigate}
      />
    </div>
  );
};
