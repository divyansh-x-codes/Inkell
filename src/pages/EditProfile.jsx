import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const PROFILE_KEY = 'inkwell_my_profile';

export function loadMyProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveMyProfile(data) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(data)); } catch {}
}

const DEFAULT_PROFILE = {
  name: 'You',
  handle: '@inkwell_reader',
  bio: 'Reading enthusiast. Tech, AI, and culture. Subscriber to great ideas.',
  color: '#1a9e6e',
  avatar: null,
};

export default function EditProfile({ showToast }) {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const existing = loadMyProfile() || DEFAULT_PROFILE;
  const [name, setName] = useState(existing.name);
  const [handle, setHandle] = useState(existing.handle);
  const [bio, setBio] = useState(existing.bio);
  const [avatar, setAvatar] = useState(existing.avatar);
  const [color] = useState(existing.color);
  const [saving, setSaving] = useState(false);

  const getInitials = (n) => {
    if (!n) return 'Y';
    const s = n.trim().split(' ');
    return s.length > 1 ? (s[0][0] + s[1][0]).toUpperCase() : n[0].toUpperCase();
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Photo must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setAvatar(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!name.trim()) { showToast('Name cannot be empty'); return; }
    setSaving(true);
    setTimeout(() => {
      saveMyProfile({ name: name.trim(), handle, bio, avatar, color });
      showToast('Profile saved!');
      setSaving(false);
      navigate('/my-profile');
    }, 600);
  };

  return (
    <div className="editprofile-page app-shell">
      {/* Header */}
      <div className="editprofile-header">
        <button className="tb-circle-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <span className="editprofile-title">Edit Profile</span>
        <button
          className="editprofile-save-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? '…' : 'Save'}
        </button>
      </div>

      <div className="editprofile-scroll">

        {/* Avatar section */}
        <div className="editprofile-avatar-section">
          <div className="editprofile-avatar-wrap" onClick={() => fileRef.current.click()}>
            {avatar
              ? <img src={avatar} alt="avatar" className="editprofile-avatar-img" />
              : <div className="editprofile-avatar-placeholder" style={{ background: color }}>
                  {getInitials(name)}
                </div>
            }
            <div className="editprofile-avatar-overlay">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{width:22,height:22}}>
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
            </div>
          </div>
          <button className="editprofile-change-photo-btn" onClick={() => fileRef.current.click()}>
            Change photo
          </button>
          {avatar && (
            <button
              className="editprofile-remove-photo-btn"
              onClick={() => { setAvatar(null); showToast('Photo removed'); }}
            >
              Remove photo
            </button>
          )}
          <input
            type="file"
            ref={fileRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handlePhotoSelect}
          />
        </div>

        {/* Fields */}
        <div className="editprofile-fields">
          <div className="editprofile-field-group">
            <label className="editprofile-label">Display Name</label>
            <input
              className="editprofile-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              maxLength={50}
            />
            <div className="editprofile-char-hint">{name.length}/50</div>
          </div>

          <div className="editprofile-field-group">
            <label className="editprofile-label">Username</label>
            <input
              className="editprofile-input"
              value={handle}
              onChange={e => setHandle(e.target.value.startsWith('@') ? e.target.value : '@' + e.target.value)}
              placeholder="@username"
              maxLength={30}
            />
          </div>

          <div className="editprofile-field-group">
            <label className="editprofile-label">Bio</label>
            <textarea
              className="editprofile-textarea"
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell people about yourself..."
              rows={3}
              maxLength={160}
            />
            <div className="editprofile-char-hint">{bio.length}/160</div>
          </div>
        </div>

      </div>
    </div>
  );
}
