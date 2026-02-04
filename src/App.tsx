import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { InstallerRoute } from "@/components/auth/InstallerRoute";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Quotes from "./pages/Quotes";
import QuoteDetail from "./pages/QuoteDetail";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Invoices from "./pages/Invoices";
import Calendar from "./pages/Calendar";
import Installation from "./pages/Installation";
import InstallationDetail from "./pages/InstallationDetail";
import Inbox from "./pages/Inbox";
import Products from "./pages/Products";
import ProductImport from "./pages/ProductImport";
import PriceGroups from "./pages/PriceGroups";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import CustomerDetail from "./pages/CustomerDetail";
import Service from "./pages/Service";
import ServiceTicketDetail from "./pages/ServiceTicketDetail";
import ServiceTicketPublicForm from "./pages/ServiceTicketPublicForm";
import ResetPassword from "./pages/ResetPassword";
import SetPassword from "./pages/SetPassword";
import InstallerDashboard from "./pages/installer/InstallerDashboard";
import InstallerOrderDetail from "./pages/installer/InstallerOrderDetail";
import WorkReportForm from "./pages/installer/WorkReportForm";
import WorkReports from "./pages/installer/WorkReports";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <InstallPrompt />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/set-password" element={<SetPassword />} />
            <Route path="/service/new" element={<ServiceTicketPublicForm />} />
            
            {/* Protected routes */}
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
            <Route path="/customers/:id" element={<ProtectedRoute><CustomerDetail /></ProtectedRoute>} />
            <Route path="/quotes" element={<ProtectedRoute><Quotes /></ProtectedRoute>} />
            <Route path="/quotes/:id" element={<ProtectedRoute><QuoteDetail /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
            <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
            <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
            <Route path="/installation" element={<ProtectedRoute><Installation /></ProtectedRoute>} />
            <Route path="/installation/:orderId" element={<ProtectedRoute><InstallationDetail /></ProtectedRoute>} />
            <Route path="/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
            <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
            <Route path="/products/import" element={<ProtectedRoute><ProductImport /></ProtectedRoute>} />
            <Route path="/settings/price-groups" element={<ProtectedRoute><PriceGroups /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/service" element={<ProtectedRoute><Service /></ProtectedRoute>} />
            <Route path="/service/:id" element={<ProtectedRoute><ServiceTicketDetail /></ProtectedRoute>} />
            
            {/* Installer routes */}
            <Route path="/monteur" element={<InstallerRoute><InstallerDashboard /></InstallerRoute>} />
            <Route path="/monteur/opdracht/:orderId" element={<InstallerRoute><InstallerOrderDetail /></InstallerRoute>} />
            <Route path="/monteur/werkbon/:id" element={<InstallerRoute><WorkReportForm /></InstallerRoute>} />
            <Route path="/monteur/werkbonnen" element={<InstallerRoute><WorkReports /></InstallerRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
