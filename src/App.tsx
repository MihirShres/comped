import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { Spinner, TabBar } from './ui';
import AuthPage from './pages/Auth';
import Discover from './pages/creator/Discover';
import OfferDetail from './pages/creator/OfferDetail';
import Visits from './pages/creator/Visits';
import VisitDetail from './pages/creator/VisitDetail';
import Wallet from './pages/creator/Wallet';
import CreatorProfile from './pages/creator/Profile';
import BusinessSetup from './pages/business/Setup';
import Dashboard from './pages/business/Dashboard';
import Offers from './pages/business/Offers';
import NewOffer from './pages/business/NewOffer';
import Redeem from './pages/business/Redeem';
import Reviews from './pages/business/Reviews';

export default function App() {
  const { session, profile, business, loading } = useAuth();

  if (loading) {
    return (
      <div className="app center">
        <Spinner />
      </div>
    );
  }

  if (!session || !profile) {
    return (
      <div className="app">
        <AuthPage />
      </div>
    );
  }

  if (profile.role === 'business') {
    if (!business) {
      return (
        <div className="app">
          <BusinessSetup />
        </div>
      );
    }
    return (
      <div className="app with-tabs">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/offers/new" element={<NewOffer />} />
          <Route path="/redeem" element={<Redeem />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/settings" element={<BusinessSetup editing />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <TabBar role="business" />
      </div>
    );
  }

  return (
    <div className="app with-tabs">
      <Routes>
        <Route path="/" element={<Discover />} />
        <Route path="/offer/:id" element={<OfferDetail />} />
        <Route path="/visits" element={<Visits />} />
        <Route path="/visits/:id" element={<VisitDetail />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/profile" element={<CreatorProfile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <TabBar role="creator" />
    </div>
  );
}
