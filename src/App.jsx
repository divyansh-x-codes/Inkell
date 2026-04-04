import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
import Reader from './pages/Reader';
import Comments from './pages/Comments';
import Search from './pages/Search';
import Profile from './pages/Profile';
import Conversations from './pages/Conversations';
import ChatThread from './pages/ChatThread';
import MyProfile from './pages/MyProfile';
import EditProfile from './pages/EditProfile';
import Saved from './pages/Saved';
import AddArticle from './pages/AddArticle';

function App() {
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2200);
  };

  return (
    <Router>
      <div className="bg-layer"></div>
      <div className="floating-icons">
        <div className="fi">✍️</div><div className="fi">📖</div><div className="fi">🔖</div>
        <div className="fi">📰</div><div className="fi">✉️</div><div className="fi">💡</div>
        <div className="fi">🖊️</div><div className="fi">📚</div><div className="fi">🗞️</div><div className="fi">🏛️</div>
      </div>

      <div className="app">
        <div className="screen">
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/login" element={<Login showToast={showToast} />} />
            <Route path="/signup" element={<Signup showToast={showToast} />} />
            <Route path="/home" element={<Home showToast={showToast} />} />
            <Route path="/search" element={<Search showToast={showToast} />} />
            <Route path="/article/:id" element={<Reader showToast={showToast} />} />
            <Route path="/comments/:id" element={<Comments showToast={showToast} />} />
            <Route path="/profile/:username" element={<Profile showToast={showToast} />} />
            <Route path="/profile" element={<Navigate to="/my-profile" replace />} />
            <Route path="/conversations" element={<Conversations showToast={showToast} />} />
            <Route path="/chat/:id" element={<ChatThread showToast={showToast} />} />
            <Route path="/my-profile" element={<MyProfile showToast={showToast} />} />
            <Route path="/edit-profile" element={<EditProfile showToast={showToast} />} />
            <Route path="/edit-article/:id" element={<AddArticle showToast={showToast} />} />
            <Route path="/saved" element={<Saved showToast={showToast} />} />
            <Route path="/add-article" element={<AddArticle showToast={showToast} />} />
          </Routes>
        </div>
      </div>

      <div className={`toast ${toastMsg ? 'show' : ''}`} id="toast-el">
        {toastMsg}
      </div>
    </Router>
  );
}

export default App;
