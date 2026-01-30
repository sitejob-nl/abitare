import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  breadcrumb?: string;
}

export function AppLayout({ children, title, breadcrumb }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        <Header title={title} breadcrumb={breadcrumb} />
        <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
          {children}
        </div>
      </main>
    </div>
  );
}
