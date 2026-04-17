import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Download from './pages/Download';

function App() {
  return (
    <Router>
      <div className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/d/:id" element={<Download />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
