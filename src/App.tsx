import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { InstallerRoute } from "@/components/auth/InstallerRoute";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { UpdatePrompt } from "@/components/pwa/UpdatePrompt";
import { Loader2 } from "lucide-react";

// Lazy-loaded pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Customers = lazy(() => import("./pages/Customers"));
const CustomerDetail = lazy(() => import("./pages/CustomerDetail"));
const Quotes = lazy(() => import("./pages/Quotes"));
const QuoteDetail = lazy(() => import("./pages/QuoteDetail"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const Invoices = lazy(() => import("./pages/Invoices"));
const InvoiceDetail = lazy(() => import("./pages/InvoiceDetail"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Installation = lazy(() => import("./pages/Installation"));
const InstallationDetail = lazy(() => import("./pages/InstallationDetail"));
const Inbox = lazy(() => import("./pages/Inbox"));
const Products = lazy(() => import("./pages/Products"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const ProductImport = lazy(() => import("./pages/ProductImport"));
const PriceGroups = lazy(() => import("./pages/PriceGroups"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const Login = lazy(() => import("./pages/Login"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Service = lazy(() => import("./pages/Service"));
const ServiceTicketDetail = lazy(() => import("./pages/ServiceTicketDetail"));
const ServiceTicketPublicForm = lazy(() => import("./pages/ServiceTicketPublicForm"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const SetPassword = lazy(() => import("./pages/SetPassword"));
const TradeplaceMessages = lazy(() => import("./pages/TradeplaceMessages"));
const InstallerDashboard = lazy(() => import("./pages/installer/InstallerDashboard"));
const InstallerOrderDetail = lazy(() => import("./pages/installer/InstallerOrderDetail"));
const WorkReportForm = lazy(() => import("./pages/installer/WorkReportForm"));
const WorkReports = lazy(() => import("./pages/installer/WorkReports"));

// Portal pages
const PortalLayout = lazy(() => import("./pages/portal/PortalLayout"));
const PortalDashboard = lazy(() => import("./pages/portal/PortalDashboard"));
const PortalOrders = lazy(() => import("./pages/portal/PortalOrders"));
const PortalOrderDetail = lazy(() => import("./pages/portal/PortalOrderDetail"));
const PortalInvoices = lazy(() => import("./pages/portal/PortalInvoices"));
const PortalDocuments = lazy(() => import("./pages/portal/PortalDocuments"));
const PortalPlanning = lazy(() => import("./pages/portal/PortalPlanning"));
const PortalQuoteDetail = lazy(() => import("./pages/portal/PortalQuoteDetail"));
const PortalQuotes = lazy(() => import("./pages/portal/PortalQuotes"));

const PageLoader = () => (
  <div className="flex h-screen items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <InstallPrompt />
        <UpdatePrompt />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/set-password" element={<SetPassword />} />
              <Route path="/service/new" element={<ServiceTicketPublicForm />} />
              
              {/* Customer Portal routes (public with token) */}
              <Route path="/portal/:token" element={<PortalLayout />}>
                <Route index element={<PortalDashboard />} />
                <Route path="orders" element={<PortalOrders />} />
                <Route path="orders/:orderId" element={<PortalOrderDetail />} />
                <Route path="quotes" element={<PortalQuotes />} />
                <Route path="quotes/:quoteId" element={<PortalQuoteDetail />} />
                <Route path="invoices" element={<PortalInvoices />} />
                <Route path="documents" element={<PortalDocuments />} />
                <Route path="planning" element={<PortalPlanning />} />
              </Route>
              {/* Protected routes */}
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
              <Route path="/customers/:id" element={<ProtectedRoute><CustomerDetail /></ProtectedRoute>} />
              <Route path="/quotes" element={<ProtectedRoute><Quotes /></ProtectedRoute>} />
              <Route path="/quotes/:id" element={<ProtectedRoute><QuoteDetail /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
              <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
              <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
              <Route path="/invoices/:id" element={<ProtectedRoute><InvoiceDetail /></ProtectedRoute>} />
              <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
              <Route path="/installation" element={<ProtectedRoute><Installation /></ProtectedRoute>} />
              <Route path="/installation/:orderId" element={<ProtectedRoute><InstallationDetail /></ProtectedRoute>} />
              <Route path="/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
              <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
              <Route path="/products/import" element={<ProtectedRoute><ProductImport /></ProtectedRoute>} />
              <Route path="/products/:id" element={<ProtectedRoute><ProductDetail /></ProtectedRoute>} />
              <Route path="/settings/price-groups" element={<ProtectedRoute><PriceGroups /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/settings/tradeplace-messages" element={<ProtectedRoute><TradeplaceMessages /></ProtectedRoute>} />
              <Route path="/service" element={<ProtectedRoute><Service /></ProtectedRoute>} />
              <Route path="/service/:id" element={<ProtectedRoute><ServiceTicketDetail /></ProtectedRoute>} />
              
              {/* Installer routes */}
              <Route path="/monteur" element={<InstallerRoute><InstallerDashboard /></InstallerRoute>} />
              <Route path="/monteur/opdracht/:orderId" element={<InstallerRoute><InstallerOrderDetail /></InstallerRoute>} />
              <Route path="/monteur/werkbon/:id" element={<InstallerRoute><WorkReportForm /></InstallerRoute>} />
              <Route path="/monteur/werkbonnen" element={<InstallerRoute><WorkReports /></InstallerRoute>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
