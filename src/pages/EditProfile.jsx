import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function EditProfile({ showToast }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef(null);

  const [name, setName] = useState(user?.name || '');
  const [handle, setHandle] = useState(user?.handle || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [color] = useState(user?.color || '#e85d04');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setHandle(user.handle || '');
      setBio(user.bio || '');
      setAvatar(user.avatar || '');
    }
  }, [user]);

  const getInitials = (n) => {
    if (!n) return 'Y';
    const s = n.trim().split(' ');
    return s.length > 1 ? (s[0][0] + s[1][0]).toUpperCase() : n[0].toUpperCase();
  };

  const compressImage = (dataUrl, maxWidth = 400, maxHeight = 400) => {
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
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // High compression
      };
      img.src = dataUrl;
    });
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Early filter: 10MB (to prevent memory crash before compression)
    if (file.size > 10 * 1024 * 1024) {
      showToast('Photo too large (max 10MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
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
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        name: name.trim(),
        handle: handle || `@${name.toLowerCase().replace(/\s/g, '')}`,
        bio,
        avatar,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      
      showToast('Profile saved!');
      navigate('/my-profile');
    } catch (err) {
      console.error("Save failed:", err);
      showToast('Failed to save profile');
    } finally {
      setSaving(false);
    }
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
