import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../utils/firebaseData';

export default function EditProfile({ showToast }) {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const fileRef = useRef(null);

  const profile = user?.profiles || {};

  const [name, setName] = useState(profile.name || '');
  const [username, setUsername] = useState(profile.username || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [avatar, setAvatar] = useState(profile.avatar_url || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.profiles) {
      setName(user.profiles.name || '');
      setUsername(user.profiles.username || '');
      setBio(user.profiles.bio || '');
      setAvatar(user.profiles.avatar_url || '');
    }
  }, [user?.profiles]);

  const getInitials = (n) => {
    if (!n) return 'Y';
    const s = n.trim().split(' ');
    return s.length > 1 ? (s[0][0] + (s[1][0] || '')[0]).toUpperCase() : n[0].toUpperCase();
  };

  const compressImage = (dataUrl, maxWidth = 160, maxHeight = 160) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.5)); 
      };
      img.src = dataUrl;
    });
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      showToast('Photo too large (max 10MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      setAvatar(ev.target.result);
      const compressed = await compressImage(ev.target.result);
      setAvatar(compressed);
      showToast('Photo optimized!');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name.trim()) { showToast('Name cannot be empty'); return; }
    if (!user?.uid) { showToast('Please login first'); return; }
    
    setSaving(true);
    
    try {
      const { error } = await updateProfile(user.uid, {
        name: name.trim(),
        username: username.replace('@', '').toLowerCase().trim(),
        bio: bio.trim(),
        avatar_url: avatar,
      });
      
      if (error) {
        showToast('Error saving: ' + error.message);
      } else {
        await refreshUser();
        showToast('🎉 Profile updated!');
        navigate('/my-profile', { replace: true });
      }
    } catch (err) {
      console.error(err);
      showToast('Connection error. Profile might not have saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="editprofile-page app-shell">
      <div className="editprofile-header">
        <button className="tb-circle-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <span className="editprofile-title">Edit Profile</span>
        <button className="editprofile-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? '…' : 'Save'}
        </button>
      </div>

      <div className="editprofile-scroll">
        <div className="editprofile-avatar-section">
          <div className="editprofile-avatar-wrap" onClick={() => fileRef.current.click()}>
            {avatar
              ? <img src={avatar} alt="avatar" className="editprofile-avatar-img" />
              : <div className="editprofile-avatar-placeholder" style={{ background: '#cc4400' }}>
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
            <button className="editprofile-remove-photo-btn" onClick={() => { setAvatar(null); showToast('Photo removed'); }}>
              Remove photo
            </button>
          )}
          <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={handlePhotoSelect} />
        </div>

        <div className="editprofile-fields">
          <div className="editprofile-field-group">
            <label className="editprofile-label">Display Name</label>
            <input className="editprofile-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" maxLength={50} />
            <div className="editprofile-char-hint">{name.length}/50</div>
          </div>

          <div className="editprofile-field-group">
            <label className="editprofile-label">Username</label>
            <input className="editprofile-input" value={username.startsWith('@') ? username : (username ? '@' + username : '')} onChange={e => setUsername(e.target.value)} placeholder="@username" maxLength={30} />
          </div>

          <div className="editprofile-field-group">
            <label className="editprofile-label">Bio</label>
            <textarea className="editprofile-textarea" value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell people about yourself..." rows={3} maxLength={160} />
            <div className="editprofile-char-hint">{bio.length}/160</div>
          </div>
        </div>
      </div>
    </div>
  );
}


