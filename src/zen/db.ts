import type {
  IZenInstance,
  IZenPair,
  AuthCallback,
  AuthResult,
  SignUpResult,
} from './types';
import * as crypto from './crypto';

export class DataBase {
  public zen: IZenInstance;
  private _pair: IZenPair | null = null;
  private _pub: string | null = null;
  public crypto: typeof crypto;
  public static readonly DEFAULT_GET_TIMEOUT = 15000;
  public static readonly DEFAULT_PUT_TIMEOUT = 15000;

  /**
   * Cleans a Zen public key by removing the leading tilde if present.
   */
  public static cleanPub(pub: string): string {
    if (!pub) return '';
    return pub.startsWith('~') ? pub.slice(1) : pub;
  }

  constructor(zen: IZenInstance) {
    this.zen = zen;
    this.crypto = crypto;

    // Monkey-patch Zen instance to support .user() calls for legacy compatibility
    (this.zen as any).user = (pub?: string) => this.userShim(pub);
  }

  /**
   * Universal User Shim
   */
  public userShim(pub?: string): any {
    const targetPub = pub || this._pub;
    if (!targetPub || !this.zen) return null;

    const node = this.zen.get(`~${targetPub}`);
    const shim = Object.create(node);

    const isSelf = targetPub === this._pub;

    Object.defineProperties(shim, {
      is: { get: () => ({ pub: targetPub }) },
      _: { get: () => ({ ...node._, sea: isSelf ? this._pair : null }) },
      auth: { value: () => { console.warn('[DB] skip auth() - Zen uses explicit authenticator'); return shim; } },
      create: { value: () => { console.error('[DB] create() not supported - use signUp()'); } },
      leave: { value: () => this.logout() },
      put: { value: (data: any, cb?: any, opt?: any) => {
        if (isSelf) {
            return this.userPut(node._.soul.split('~').pop() || '', data, cb, opt);
        }
        return node.put(data, cb, opt);
      }}
    });

    return shim;
  }

  public get user(): any {
    return this.userShim();
  }

  public get pair(): IZenPair | null {
    return this._pair;
  }

  private readonly onAuthCallbacks: Array<AuthCallback> = [];

  async initialize(): Promise<void> {
    await this.restoreSession();
  }

  async restoreSession(): Promise<AuthResult> {
    try {
      const storedPair = localStorage.getItem('null_auth_pair') || localStorage.getItem('shogun_auth_pair') || localStorage.getItem('linda_auth_pair');
      if (storedPair) {
        const payload = JSON.parse(storedPair);
        const pair = payload.pair || payload;
        if (pair && pair.pub) {
          this._pair = pair;
          this._pub = pair.pub;

          // Fetch username (alias) 
          const username = await this.safeGet(`~${pair.pub}/alias`, 3000);
          
          this.emitAuthEvent();
          return { success: true, userPub: pair.pub, username: username || pair.pub };
        }
      }
    } catch (e) {
      console.warn('[DB] Failed to restore session:', e);
    }
    return { success: false, error: 'No session found' };
  }

  private emitAuthEvent(): void {
    if (this._pub) {
      const userShim = this.user;
      this.onAuthCallbacks.forEach((cb) => cb(userShim as any));
    }
  }

  onAuth(callback: AuthCallback): () => void {
    this.onAuthCallbacks.push(callback);
    if (this._pub) callback(this.user as any);
    return () => {
      const i = this.onAuthCallbacks.indexOf(callback);
      if (i !== -1) this.onAuthCallbacks.splice(i, 1);
    };
  }

  isLoggedIn(): boolean {
    const user = this.user;
    return !!(user && user.is);
  }

  async signUp(username: string, password?: string, pair?: IZenPair | null): Promise<SignUpResult> {
    const normalizedUsername = username.trim().toLowerCase();
    try {
      const seed = password ? (normalizedUsername + password) : Math.random().toString(36);
      const userPair = pair || await this.crypto.generatePairFromSeed(seed, this.zen);
      const pub = userPair.pub;

      this._pair = userPair;
      this._pub = pub;

      await this.Put(`usernames/${normalizedUsername}`, pub);

      await this.userPut('alias', normalizedUsername);
      
      localStorage.setItem('null_auth_pair', JSON.stringify({ pair: userPair, username: normalizedUsername }));
      this.emitAuthEvent();

      return { success: true, userPub: pub, username: normalizedUsername, isNewUser: true };
    } catch (error: any) {
      console.error('[DB] SignUp error:', error);
      return { success: false, error: `SignUp failed: ${error.message || error}` };
    }
  }

  async login(username: string, password: string): Promise<AuthResult> {
    const normalizedUsername = username.trim().toLowerCase();
    try {
      const pub = await this.Get(`usernames/${normalizedUsername}`, 10000);

      if (!pub || typeof pub !== 'string') {
        return { success: false, error: 'User not found' };
      }

      const pair = await this.crypto.generatePairFromSeed(normalizedUsername + password, this.zen);
      if (pair.pub !== pub) return { success: false, error: 'Invalid password' };

      this._pair = pair;
      this._pub = pub;
      localStorage.setItem('null_auth_pair', JSON.stringify({ pair, username: normalizedUsername }));
      this.emitAuthEvent();

      return { success: true, userPub: pub, username: normalizedUsername };
    } catch (error: any) {
      console.error('[DB] Login error:', error);
      return { success: false, error: `Login failed: ${error.message || error}` };
    }
  }

  async loginWithPair(username: string, pair: IZenPair): Promise<AuthResult> {
    try {
      this._pair = pair;
      this._pub = pair.pub;
      localStorage.setItem('null_auth_pair', JSON.stringify({ pair, username }));
      this.emitAuthEvent();
      return { success: true, userPub: pair.pub, username };
    } catch (e: any) {
      return { success: false, error: e.message || e };
    }
  }

  logout(): void {
    this._pair = null;
    this._pub = null;
    localStorage.removeItem('null_auth_pair');
  }

  getUserPub(): string | null {
    return this._pub;
  }

  public async safeGet(pathOrChain: string | any, timeoutMs: number = DataBase.DEFAULT_GET_TIMEOUT): Promise<any> {
    if (!this.zen) return null;
    
    let chain: any;
    if (typeof pathOrChain === 'string') {
        if (pathOrChain.includes('~')) {
            const parts = pathOrChain.split('/');
            chain = this.zen.get(parts[0]);
            for (let i = 1; i < parts.length; i++) {
                chain = chain.get(parts[i]);
            }
        } else {
            chain = this.getChain(pathOrChain);
        }
    } else {
        chain = pathOrChain;
    }

    if (!chain) return null;

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve(null);
      }, timeoutMs);

      chain.once((data: any) => {
        clearTimeout(timer);
        resolve(data || null);
      });
    });
  }

  private getChain(path: string): any {
    if (!this.zen) return null;

    const parts = path.split('/').filter(p => !!p);
    let chain: any = this.zen;

    if (parts.length > 0 && parts[0].startsWith('~')) {
      const pub = DataBase.cleanPub(parts[0]);
      if (pub === DataBase.cleanPub(this._pub || '')) {
        chain = this.user;
      } else {
        chain = this.zen.get(`~${pub}`);
      }
      parts.shift();
    }

    for (const p of parts) {
      if (!chain || typeof chain.get !== 'function') return null;
      try {
        chain = chain.get(p);
      } catch (err) {
        return null;
      }
    }
    return chain;
  }

  Get(path: string, timeoutMs?: number): Promise<any> {
    return this.safeGet(path, timeoutMs);
  }

  private injectAuth(path: string, opt: any): any {
    const isUserPath = path.startsWith('~') || path.includes('/~');
    if (isUserPath && this._pair && !opt.authenticator) {
      return { ...opt, authenticator: this._pair };
    }
    return opt;
  }

  Put(path: string, data: any, opt: any = {}): Promise<any> {
    const chain = this.getChain(path);
    if (!chain || typeof chain.put !== 'function') return Promise.reject('Invalid path');
    
    const finalOpt = this.injectAuth(path, opt);

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ err: 'timeout' });
      }, DataBase.DEFAULT_PUT_TIMEOUT);
      chain.put(data, (ack: any) => {
        clearTimeout(timeout);
        resolve(ack);
      }, finalOpt);
    });
  }

  async userGet(path: string, timeoutMs: number = DataBase.DEFAULT_GET_TIMEOUT): Promise<any> {
    if (!this._pub) return null;
    return this.safeGet(`~${this._pub}/${path}`, timeoutMs);
  }

  userPut(path: string, data: any, cb?: any, opt: any = {}): Promise<any> {
    if (!this._pub || !this._pair) return Promise.reject('Not logged in');
    
    const options = { 
      ...opt, 
      authenticator: opt.authenticator || this._pair 
    };

    const parts = path.split('/').filter(p => !!p);
    let chain = this.zen.get(`~${this._pub}`);
    
    for (const p of parts) {
      chain = chain.get(p);
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ err: 'timeout' });
      }, DataBase.DEFAULT_PUT_TIMEOUT);
      chain.put(data, (ack: any) => {
        clearTimeout(timeout);
        if (cb) cb(ack);
        resolve(ack);
      }, options);
    });
  }

  On(path: string, callback: (data: any) => void): void {
    const chain = this.getChain(path);
    if (chain && typeof chain.on === 'function') {
      chain.on((v: any) => callback(v));
    }
  }

  Off(path: string): void {
    const chain = this.getChain(path);
    if (chain && typeof chain.off === 'function') {
      chain.off();
    }
  }
}
