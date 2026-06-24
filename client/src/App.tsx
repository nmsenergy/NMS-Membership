import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AdminProvider, useAdminView } from "./contexts/AdminContext";
import { Router, Route, Switch } from "wouter";
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
import SwitchAccount from "./pages/SwitchAccount";
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMembers from "./pages/admin/AdminMembers";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminBonuses from "./pages/admin/AdminBonuses";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminTopups from "./pages/admin/AdminTopups";
import AdminImport from "./pages/admin/AdminImport";

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

// Member view with full routing
function MemberView() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/vip-zone" component={VipZone} />
      <Route path="/agent-zone" component={AgentZone} />
      <Route path="/orders" component={Orders} />
      <Route path="/team" component={Team} />
      <Route path="/topup" component={TopUp} />
      <Route path="/withdraw" component={Withdraw} />
      <Route path="/upgrade" component={Upgrade} />
      <Route path="/extra-rewards" component={ExtraRewards} />
      <Route path="/announcements" component={Announcements} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/profile" component={Profile} />
      <Route path="/register" component={Register} />
      <Route path="/switch-account" component={SwitchAccount} />
      <Route component={Home} />
    </Switch>
  );
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
            <Router>
              <AppContent />
            </Router>
          </TooltipProvider>
        </ThemeProvider>
      </AdminProvider>
    </ErrorBoundary>
  );
}

export default App;
