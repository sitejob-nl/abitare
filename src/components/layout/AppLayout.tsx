import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDivisionChange } from "@/hooks/useDivisionChange";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  breadcrumb?: string;
}

export function AppLayout({ children, title, breadcrumb }: AppLayoutProps) {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Clear React Query cache when division changes
  useDivisionChange();

  // Subscribe to realtime changes across all key tables
  useRealtimeSync();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        isMobile={isMobile}
      />
      
      <main className="flex flex-1 flex-col overflow-hidden">
        <Header 
          title={title} 
          breadcrumb={breadcrumb} 
          onMenuClick={() => setSidebarOpen(true)}
          showMenuButton={isMobile}
        />
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scrollbar-thin">
          {children}
        </div>
      </main>
    </div>
  );
}
