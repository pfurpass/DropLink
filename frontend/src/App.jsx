import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Download from './pages/Download';
import Admin from './pages/Admin';
import Login from './pages/Login';
import { isLoggedIn } from './utils/auth';

const PrivateRoute = ({ children }) =>
  isLoggedIn() ? children : <Navigate to="/admin/login" replace />;

function App() {
  return (
    <Router>
      <div className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/d/:id" element={<Download />} />
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
