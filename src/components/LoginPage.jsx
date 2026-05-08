import { useState } from 'react'
import useAppStore from '../store/useAppStore'

const Icon = {
  User: () => <svg className="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Lock: () => <svg className="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Arrow: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  Shield: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Chip: () => <svg className="w-10 h-10 text-cyan-400" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="15" x2="23" y2="15"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="15" x2="4" y2="15"/></svg>
}

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, notify } = useAppStore()

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!username || !password) {
      notify('Please enter both username and password', 'error')
      return
    }

    setLoading(true)
    try {
      const result = await window.maso.auth.login({ username, password })
      if (result.success) {
        login(result.user)
        notify(`Welcome back, ${result.user.username}`, 'success')
      } else {
        notify(result.error, 'error')
      }
    } catch (err) {
      notify('Authentication failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="grid-overlay"></div>
      </div>

      <div className="login-card">
        <div className="login-header">
          <div className="brand-icon">
            <Icon.Chip />
          </div>
          <h1>MASO <span>v2.1</span></h1>
          <p>Secure RTSP Monitoring System</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label>Username</label>
            <div className="input-wrapper">
              <Icon.User />
              <input 
                type="text" 
                placeholder="Enter username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="input-group">
            <label>Password</label>
            <div className="input-wrapper">
              <Icon.Lock />
              <input 
                type="password" 
                placeholder="Enter password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <div className="spinner"></div>
            ) : (
              <>
                <span>Access Terminal</span>
                <Icon.Arrow />
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <div className="security-badge">
            <Icon.Shield />
            <span>Encrypted Connection</span>
          </div>
          <p>© 2026 Maso Advanced Systems. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
