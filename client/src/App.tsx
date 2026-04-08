import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
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
import Register from "./pages/Register";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMembers from "./pages/admin/AdminMembers";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminBonuses from "./pages/admin/AdminBonuses";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminTopups from "./pages/admin/AdminTopups";
import AdminCalculationBase from "./pages/admin/AdminCalculationBase";
import AdminImport from "./pages/admin/AdminImport";

function Router() {
  return (
    <Switch>
      {/* Member routes */}
      <Route path="/" component={Home} />
      <Route path="/register" component={Register} />
      <Route path="/profile" component={Profile} />
      <Route path="/orders" component={Orders} />
      <Route path="/team" component={Team} />
      <Route path="/vip-zone" component={VipZone} />
      <Route path="/agent-zone" component={AgentZone} />
      <Route path="/topup" component={TopUp} />
      <Route path="/withdraw" component={Withdraw} />
      <Route path="/upgrade" component={Upgrade} />
      <Route path="/extra-rewards" component={ExtraRewards} />
      <Route path="/announcements" component={Announcements} />
      {/* Admin routes */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/members" component={AdminMembers} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/products" component={AdminProducts} />
      <Route path="/admin/bonuses" component={AdminBonuses} />
      <Route path="/admin/announcements" component={AdminAnnouncements} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/topups" component={AdminTopups} />
      <Route path="/admin/calculation-base" component={AdminCalculationBase} />
      <Route path="/admin/import" component={AdminImport} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="top-center" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
