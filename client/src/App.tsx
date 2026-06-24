import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AdminProvider, useAdminView } from "./contexts/AdminContext";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Orders from "./pages/Orders";
import Team from "./pages/Team";
import VipZone from "./pages/VipZone";
import AgentZone from "./pages/AgentZone";
import TopUp from "./pages/TopUp";
import Withdraw from "./pages/Withdraw";
import Upgrade from "./pages/Upgrade";
import ExtraRewards from "./pages/ExtraRewards";
import Announcements from "./pages/Announcements";
import Notifications from "./pages/Notifications";
import Register from "./pages/Register";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMembers from "./pages/admin/AdminMembers";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminBonuses from "./pages/admin/AdminBonuses";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminTopups from "./pages/admin/AdminTopups";
import AdminImport from "./pages/admin/AdminImport";

// Member view component
function MemberView() {
  return <Home />;
}

// Admin view component
function AdminView() {
  const { currentAdminPage } = useAdminView();

  const renderAdminPage = () => {
    switch (currentAdminPage) {
      case "dashboard":
        return <AdminDashboard />;
      case "members":
        return <AdminMembers />;
      case "orders":
        return <AdminOrders />;
      case "products":
        return <AdminProducts />;
      case "bonuses":
        return <AdminBonuses />;
      case "announcements":
        return <AdminAnnouncements />;
      case "settings":
        return <AdminSettings />;
      case "topups":
        return <AdminTopups />;
      case "import":
        return <AdminImport />;
      default:
        return <AdminDashboard />;
    }
  };

  return renderAdminPage();
}

// Root component that switches between member and admin views
function AppContent() {
  const { showAdminView } = useAdminView();

  return showAdminView ? <AdminView /> : <MemberView />;
}

function App() {
  return (
    <ErrorBoundary>
      <AdminProvider>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <Toaster position="top-center" />
            <AppContent />
          </TooltipProvider>
        </ThemeProvider>
      </AdminProvider>
    </ErrorBoundary>
  );
}

export default App;
