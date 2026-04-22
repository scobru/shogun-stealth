import React, { useState } from 'react';
import { DataBase } from '../zen/db';
import { type AuthResult } from '../zen/types';

interface AuthPageProps {
  db: DataBase;
  onAuth: (username: string) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ db, onAuth }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let result: AuthResult;
      
      if (isLogin) {
        result = await db.login(username, password);
      } else {
        result = await db.signUp(username, password);
      }

      if (result.success && result.username) {
        onAuth(result.username);
      } else {
        setError(result.error || 'Authentication failed');
      }
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
      <div className="absolute -bottom-8 -right-4 w-72 h-72 bg-secondary rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-1000"></div>

      <div className="max-w-md w-full surface-container p-10 rounded-[40px] shadow-2xl z-10 border border-primary/5">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-primary mb-3 tracking-tighter uppercase italic">
            NULL ROUTE
          </h1>
          <p className="text-base-content/40 text-[10px] font-bold uppercase tracking-widest">
            Privacy Forge Gateway
          </p>
        </div>

        <div className="flex bg-base-200 p-1.5 rounded-2xl mb-8">
          <button 
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isLogin ? 'bg-primary text-base-100 shadow-lg shadow-primary/20' : 'text-base-content/40 hover:text-base-content'}`}
          >
            Login
          </button>
          <button 
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!isLogin ? 'bg-primary text-base-100 shadow-lg shadow-primary/20' : 'text-base-content/40 hover:text-base-content'}`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold opacity-40 uppercase tracking-[0.2em] ml-4">
              Username
            </label>
            <input 
              type="text" 
              placeholder="null_neuro" 
              className="input-material w-full"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold opacity-40 uppercase tracking-[0.2em] ml-4">
              Password
            </label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="input-material w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="alert alert-error py-3 rounded-2xl text-[10px] font-bold border-none bg-error/10 text-error uppercase tracking-widest">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary-bloom w-full h-[64px]"
          >
            {loading ? <span className="loading loading-spinner"></span> : (isLogin ? 'Enter The Void' : 'Claim Identity')}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-primary/5 text-center">
          <p className="text-[9px] text-base-content/20 uppercase tracking-[0.3em] font-black">
            Powered by Zen Decentralized Graph
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
