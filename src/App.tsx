/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  User, 
  Newspaper, 
  MessageSquare, 
  Mail, 
  Menu, 
  X, 
  ArrowRight, 
  Github, 
  Instagram, 
  Linkedin,
  LogOut,
  Lock,
  Plus,
  ArrowLeft,
  Sparkles,
  Loader2,
  Trash2,
  Edit
} from 'lucide-react';
import { cn } from './lib/utils';
import type { Article, SiteSettings } from './types';
import { summarizeArticle } from './lib/gemini';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  createUserWithEmailAndPassword,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('beranda');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({
    heroSubtitle: 'Selamat Datang di Blog Saya',
    heroTitle: 'Halo, Saya Mitrawan',
    heroImage: 'https://files.catbox.moe/nyl52j.jpg',
    heroDesc: 'Saya sangat menikmati proses belajar hal-hal baru setiap harinya. Blog ini adalah cara saya mendokumentasikan setiap pengalaman dan informasi yang didapat.',
    aboutDesc: 'Saya adalah pribadi yang selalu antusias dalam mengeksplorasi berbagai hal baru yang menarik perhatian saya. Di sela kesibukan, saya sering menghabiskan waktu dengan mengulik pengembangan fitur bot WhatsApp sebagai bentuk eksperimen kreatif.',
    botDesc: 'Halo! Selain menulis di blog, saya juga mengembangkan Bot WhatsApp yang dapat membantu berbagai keperluan.'
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        if (firebaseUser.email === 'wmitrawan@gmail.com') {
          setIsAdmin(true);
        } else {
          try {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            setIsAdmin(userDoc.exists() && userDoc.data().role === 'admin');
          } catch (error) {
            console.error("Error checking admin status:", error);
            setIsAdmin(false);
          }
        }
      } else {
        setIsAdmin(false);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Articles Listener
  useEffect(() => {
    const q = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article));
      setArticles(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'articles');
    });
    return () => unsubscribe();
  }, []);

  // Settings Listener
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'main'), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as SiteSettings);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/main');
    });
    return () => unsubscribe();
  }, []);

  // Theme effect - Force Dark Mode
  useEffect(() => {
    document.documentElement.classList.add('dark');
    localStorage.theme = 'dark';
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    try {
      if (isRegisterMode) {
        await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
      } else {
        await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      }
      setIsLoginModalOpen(false);
      setLoginEmail('');
      setLoginPassword('');
      setIsRegisterMode(false);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setLoginError('Email sudah terdaftar.');
      } else if (error.code === 'auth/weak-password') {
        setLoginError('Password terlalu lemah.');
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setLoginError('Email atau password salah.');
      } else {
        setLoginError('Terjadi kesalahan. Silakan coba lagi.');
      }
      console.error("Auth error:", error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      handleNavClick('beranda');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const navItems = [
    { id: 'beranda', label: 'Beranda', icon: Home },
    { id: 'tentang', label: 'Tentang', icon: User },
    { id: 'artikel', label: 'Artikel', icon: Newspaper },
    { id: 'bot-wa', label: 'Bot WA', icon: MessageSquare },
    { id: 'kontak', label: 'Kontak', icon: Mail },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Admin', icon: Lock });
  }

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    setSelectedArticle(null);
    setIsMobileMenuOpen(false);
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-dark/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                aria-label="Toggle Menu"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <div className="flex-shrink-0 flex items-center">
                <button 
                  onClick={() => handleNavClick('beranda')}
                  className="text-2xl font-bold text-primary tracking-tight"
                >
                  Mitra<span className="text-dark dark:text-white">Wann.</span>
                </button>
              </div>
            </div>

            {/* Desktop Menu - Login Button */}
            <div className="hidden md:flex items-center">
              {!user ? (
                <button 
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-5 py-2 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-all shadow-lg shadow-red-500/20"
                >
                  Masuk
                </button>
              ) : (
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-400">
                    {isAdmin ? 'Admin' : 'User'}: {user.email?.split('@')[0]}
                  </span>
                  <button 
                    onClick={handleLogout}
                    className="p-2 rounded-full bg-gray-800 text-gray-400 hover:text-primary transition-colors"
                    title="Keluar"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle - Login Button */}
            <div className="md:hidden flex items-center">
              {!user ? (
                <button 
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-all shadow-md shadow-red-500/10"
                >
                  Masuk
                </button>
              ) : (
                <button 
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-primary transition-colors"
                >
                  <LogOut size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Dropdown - Now for all sizes */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-dark/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, x: -300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute inset-y-0 left-0 w-full max-w-xs bg-white dark:bg-darker border-r border-gray-100 dark:border-gray-800 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <div className="text-xl font-bold text-primary">Menu Navigasi</div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-gray-400 hover:text-primary transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="px-4 py-8 space-y-2">
                {navItems.map((item, index) => (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleNavClick(item.id)}
                    className={cn(
                      "flex items-center gap-4 w-full px-4 py-4 rounded-2xl font-semibold transition-all",
                      activeTab === item.id 
                        ? "bg-primary/10 text-primary shadow-sm" 
                        : "text-gray-300 hover:bg-gray-800"
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-xl",
                      activeTab === item.id ? "bg-primary text-white" : "bg-gray-800"
                    )}>
                      <item.icon size={18} />
                    </div>
                    {item.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          {selectedArticle ? (
            <motion.div
              key="article-detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ArticleDetail 
                article={selectedArticle} 
                onBack={() => setSelectedArticle(null)} 
              />
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'beranda' && <Hero settings={settings} onNavigate={handleNavClick} />}
              {activeTab === 'tentang' && <About settings={settings} />}
              {activeTab === 'artikel' && <Articles articles={articles} onSelectArticle={setSelectedArticle} />}
              {activeTab === 'bot-wa' && <BotWA settings={settings} />}
              {activeTab === 'kontak' && <Contact />}
              {activeTab === 'admin' && isAdmin && <AdminDashboard articles={articles} settings={settings} onLogout={handleLogout} />}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-darker py-8 border-t border-gray-100 dark:border-gray-800 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} Mitrawan. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Login Modal */}
      <AnimatePresence>
        {isLoginModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute inset-0 bg-dark/60 backdrop-blur-sm" 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white dark:bg-darker w-full max-w-sm rounded-2xl shadow-2xl p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-dark dark:text-white">
                  {isRegisterMode ? 'Daftar Akun' : 'Masuk'}
                </h2>
                <button onClick={() => setIsLoginModalOpen(false)} className="text-gray-400 hover:text-primary">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input 
                    type="email" 
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary transition-all"
                    placeholder="email@contoh.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                  <input 
                    type="password" 
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
                {loginError && <p className="text-primary text-xs font-medium">{loginError}</p>}
                <button 
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary-hover transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
                >
                  {isLoggingIn ? 'Memproses...' : (isRegisterMode ? 'Daftar Sekarang' : 'Masuk')}
                </button>
                <div className="text-center mt-4">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsRegisterMode(!isRegisterMode);
                      setLoginError('');
                    }}
                    className="text-sm text-gray-500 hover:text-primary transition-colors"
                  >
                    {isRegisterMode ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Placeholder Components (to be implemented in separate files or below)
function Hero({ settings, onNavigate }: { settings: SiteSettings, onNavigate: (id: string) => void }) {
  return (
    <section className="relative pt-10 pb-16 lg:pt-24 lg:pb-28 overflow-hidden">
      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-primary opacity-[0.08] rounded-full blur-3xl" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col-reverse lg:flex-row items-center gap-12">
          <div className="w-full lg:w-1/2 text-center lg:text-left">
            <span className="text-primary font-semibold tracking-wide uppercase text-sm">{settings.heroSubtitle}</span>
            <h1 className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-extrabold text-dark dark:text-white leading-tight">
              {settings.heroTitle}
            </h1>
            <p className="mt-5 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              {settings.heroDesc}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button 
                onClick={() => onNavigate('artikel')}
                className="bg-primary text-white px-8 py-3 rounded-full font-medium hover:bg-primary-hover transition shadow-lg shadow-red-500/20"
              >
                Baca Artikel
              </button>
              <button 
                onClick={() => onNavigate('kontak')}
                className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-8 py-3 rounded-full font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                Hubungi Saya
              </button>
            </div>
          </div>
          <div className="w-full lg:w-1/2 flex justify-center lg:justify-end">
            <div className="relative w-64 h-64 sm:w-80 sm:h-80">
              <div className="absolute inset-0 bg-primary rounded-full opacity-20 blur-2xl transform scale-110" />
              <img 
                src={settings.heroImage} 
                alt="Foto Profil" 
                className="relative rounded-full object-cover w-full h-full shadow-2xl border-4 border-white dark:border-gray-800"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function About({ settings }: { settings: SiteSettings }) {
  return (
    <section className="py-20 bg-white dark:bg-darker">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold text-dark dark:text-white">Tentang Saya</h2>
        <div className="w-16 h-1 bg-primary mx-auto mt-4 rounded" />
        <p className="mt-6 text-gray-600 dark:text-gray-400 leading-relaxed text-lg text-left sm:text-center whitespace-pre-line">
          {settings.aboutDesc}
        </p>
      </div>
    </section>
  );
}

function Articles({ articles, onSelectArticle }: { articles: Article[], onSelectArticle: (article: Article) => void }) {
  return (
    <section className="py-20 bg-light dark:bg-dark">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-dark dark:text-white">Daftar Artikel</h2>
        <div className="w-16 h-1 bg-primary mt-4 mb-10 rounded" />
        
        {articles.length === 0 ? (
          <p className="text-center text-gray-500 py-10">Belum ada artikel yang dipublikasikan.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article) => (
              <motion.article 
                key={article.id}
                whileHover={{ y: -5 }}
                className="group bg-white dark:bg-darker rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden cursor-pointer"
                onClick={() => onSelectArticle(article)}
              >
                <img src={article.image} alt={article.title} className="w-full h-48 object-cover" />
                <div className="p-6">
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                    <span className="text-primary font-medium">{article.category}</span>
                    <span>{article.date}</span>
                  </div>
                  <h3 className="text-xl font-bold text-dark dark:text-white mb-2 group-hover:text-primary transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 mb-4">
                    {article.excerpt}
                  </p>
                  <div className="flex items-center text-primary font-medium text-sm">
                    Baca selengkapnya <ArrowRight size={14} className="ml-2" />
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function BotWA({ settings }: { settings: SiteSettings }) {
  return (
    <section className="py-20 bg-gray-50 dark:bg-darker text-center">
      <div className="max-w-4xl mx-auto px-4">
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
          <MessageSquare size={48} />
        </div>
        <h2 className="text-3xl font-bold text-dark dark:text-white">Bot WhatsApp Pintar</h2>
        <div className="w-16 h-1 bg-primary mx-auto mt-4 rounded" />
        <p className="mt-6 text-gray-600 dark:text-gray-400 leading-relaxed text-lg mb-10 whitespace-pre-line">
          {settings.botDesc}
        </p>
        <a 
          href="https://wa.me/628989240628?text=.menu" 
          target="_blank" 
          rel="noreferrer"
          className="inline-flex items-center gap-3 bg-green-500 text-white px-8 py-4 rounded-full font-bold hover:bg-green-600 transition shadow-lg shadow-green-500/30"
        >
          Hubungi Bot Sekarang
        </a>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Atau simpan nomor: +62 898-9240-628</p>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section className="py-20 bg-white dark:bg-dark text-center">
      <div className="max-w-3xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-dark dark:text-white">Mari Berkolaborasi</h2>
        <div className="w-16 h-1 bg-primary mx-auto mt-4 mb-8 rounded" />
        <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
          Punya ide proyek atau sekadar ingin menyapa?
        </p>
        <div className="flex justify-center gap-6">
          <a href="https://wa.me/6282215415550" target="_blank" rel="noreferrer" className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-primary hover:text-white transition-all">
            <MessageSquare size={24} />
          </a>
          <a href="https://www.instagram.com/mitrawann?igsh=MW5iMjRsdmJmY29pMg%3D%3D" target="_blank" rel="noreferrer" className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-primary hover:text-white transition-all">
            <Instagram size={24} />
          </a>
          <a href="#" className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-primary hover:text-white transition-all">
            <Linkedin size={24} />
          </a>
        </div>
      </div>
    </section>
  );
}

function AdminDashboard({ articles, settings, onLogout }: { articles: Article[], settings: SiteSettings, onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState('articles');
  const [isEditing, setIsEditing] = useState(false);
  const [currentArticle, setCurrentArticle] = useState<Partial<Article>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Form states for settings
  const [formSettings, setFormSettings] = useState<SiteSettings>(settings);

  useEffect(() => {
    setFormSettings(settings);
  }, [settings]);

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const articleData = {
        ...currentArticle,
        updatedAt: Date.now(),
        date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        authorId: auth.currentUser?.uid
      };

      if (currentArticle.id) {
        await updateDoc(doc(db, 'articles', currentArticle.id), articleData);
      } else {
        await addDoc(collection(db, 'articles'), {
          ...articleData,
          createdAt: Date.now()
        });
      }
      setIsEditing(false);
      setCurrentArticle({});
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'articles');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteArticle = async (id: string) => {
    if (window.confirm('Yakin ingin menghapus artikel ini?')) {
      try {
        await deleteDoc(doc(db, 'articles', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `articles/${id}`);
      }
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'main'), {
        ...formSettings,
        updatedAt: Date.now()
      });
      alert('Pengaturan berhasil disimpan!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/main');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="py-10 sm:py-20 bg-light dark:bg-dark">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white dark:bg-darker rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* Sidebar */}
            <div className="w-full md:w-64 bg-gray-50 dark:bg-gray-800/50 border-r border-gray-100 dark:border-gray-800 p-6">
              <h2 className="text-xl font-bold text-dark dark:text-white mb-8">Admin Panel</h2>
              <nav className="space-y-2">
                <button 
                  onClick={() => { setActiveTab('articles'); setIsEditing(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    activeTab === 'articles' ? "bg-primary text-white shadow-lg shadow-red-500/20" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  <Newspaper size={18} /> Kelola Artikel
                </button>
                <button 
                  onClick={() => setActiveTab('settings')}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    activeTab === 'settings' ? "bg-primary text-white shadow-lg shadow-red-500/20" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  <User size={18} /> Profil & Tampilan
                </button>
                <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                  <button 
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                  >
                    <LogOut size={18} /> Logout
                  </button>
                </div>
              </nav>
            </div>

            {/* Content */}
            <div className="flex-grow p-6 sm:p-10">
              {activeTab === 'articles' && (
                <div>
                  {!isEditing ? (
                    <>
                      <div className="flex justify-between items-center mb-8">
                        <h3 className="text-2xl font-bold text-dark dark:text-white">Daftar Artikel</h3>
                        <button 
                          onClick={() => { setIsEditing(true); setCurrentArticle({}); }}
                          className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary-hover transition-all"
                        >
                          <Plus size={18} /> Tulis Baru
                        </button>
                      </div>
                      <div className="space-y-4">
                        {articles.map(article => (
                          <div key={article.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <div className="min-w-0 flex-grow">
                              <h4 className="font-bold text-dark dark:text-white truncate">{article.title}</h4>
                              <p className="text-xs text-gray-500">{article.date} &bull; {article.category}</p>
                            </div>
                            <div className="flex gap-4 ml-4">
                              <button 
                                onClick={() => { setIsEditing(true); setCurrentArticle(article); }}
                                className="text-gray-400 hover:text-primary transition-colors"
                              >
                                <Edit size={18} />
                              </button>
                              <button 
                                onClick={() => handleDeleteArticle(article.id)}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                        {articles.length === 0 && <p className="text-gray-500 text-sm italic">Belum ada artikel.</p>}
                      </div>
                    </>
                  ) : (
                    <form onSubmit={handleSaveArticle} className="space-y-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-2xl font-bold text-dark dark:text-white">
                          {currentArticle.id ? 'Edit Artikel' : 'Tulis Artikel Baru'}
                        </h3>
                        <button 
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="text-gray-500 hover:text-dark dark:hover:text-white font-medium"
                        >
                          Batal
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Judul</label>
                          <input 
                            type="text" 
                            required
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary"
                            value={currentArticle.title || ''}
                            onChange={e => setCurrentArticle({...currentArticle, title: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kategori</label>
                          <input 
                            type="text" 
                            required
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary"
                            value={currentArticle.category || ''}
                            onChange={e => setCurrentArticle({...currentArticle, category: e.target.value})}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL Gambar</label>
                        <input 
                          type="url" 
                          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary"
                          value={currentArticle.image || ''}
                          onChange={e => setCurrentArticle({...currentArticle, image: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ringkasan (Excerpt)</label>
                        <textarea 
                          rows={2}
                          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary"
                          value={currentArticle.excerpt || ''}
                          onChange={e => setCurrentArticle({...currentArticle, excerpt: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Konten Artikel</label>
                        <ReactQuill 
                          theme="snow"
                          value={currentArticle.content || ''}
                          onChange={content => setCurrentArticle({...currentArticle, content})}
                          modules={{
                            toolbar: [
                              [{ 'header': [1, 2, 3, false] }],
                              ['bold', 'italic', 'underline', 'strike'],
                              [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                              ['link', 'image', 'code-block'],
                              ['clean']
                            ],
                          }}
                        />
                      </div>
                      <button 
                        type="submit"
                        disabled={isSaving}
                        className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-hover transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 flex items-center gap-2"
                      >
                        {isSaving && <Loader2 size={18} className="animate-spin" />}
                        {currentArticle.id ? 'Simpan Perubahan' : 'Publikasikan'}
                      </button>
                    </form>
                  )}
                </div>
              )}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-dark dark:text-white mb-8">Pengaturan Situs</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subjudul Hero</label>
                      <input 
                        type="text" 
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary" 
                        value={formSettings.heroSubtitle}
                        onChange={e => setFormSettings({...formSettings, heroSubtitle: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Judul Hero</label>
                      <input 
                        type="text" 
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary" 
                        value={formSettings.heroTitle}
                        onChange={e => setFormSettings({...formSettings, heroTitle: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL Foto Profil</label>
                      <input 
                        type="url" 
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary" 
                        value={formSettings.heroImage}
                        onChange={e => setFormSettings({...formSettings, heroImage: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deskripsi Hero</label>
                      <textarea 
                        rows={3} 
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary" 
                        value={formSettings.heroDesc}
                        onChange={e => setFormSettings({...formSettings, heroDesc: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deskripsi Tentang</label>
                      <textarea 
                        rows={5} 
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary" 
                        value={formSettings.aboutDesc}
                        onChange={e => setFormSettings({...formSettings, aboutDesc: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deskripsi Bot WA</label>
                      <textarea 
                        rows={3} 
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary" 
                        value={formSettings.botDesc}
                        onChange={e => setFormSettings({...formSettings, botDesc: e.target.value})}
                      />
                    </div>
                    <button 
                      onClick={handleSaveSettings}
                      disabled={isSaving}
                      className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-hover transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSaving && <Loader2 size={18} className="animate-spin" />}
                      Simpan Perubahan
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ArticleDetail({ article, onBack }: { article: Article, onBack: () => void }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const handleSummarize = async () => {
    setIsSummarizing(true);
    const result = await summarizeArticle(article.title, article.content);
    setSummary(result || "Gagal membuat ringkasan.");
    setIsSummarizing(false);
  };

  return (
    <section className="py-10 sm:py-20 bg-white dark:bg-darker">
      <div className="max-w-4xl mx-auto px-4">
        <button 
          onClick={onBack}
          className="inline-flex items-center text-gray-500 hover:text-primary font-medium mb-8 transition-colors bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-lg"
        >
          <ArrowLeft size={18} className="mr-2" /> Kembali
        </button>

        <img src={article.image} alt={article.title} className="w-full h-64 sm:h-96 object-cover rounded-2xl mb-8 shadow-lg" />
        
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
          <span>{article.date}</span>
          <span className="bg-red-50 dark:bg-red-500/10 text-primary px-3 py-1 rounded-full font-medium">
            {article.category}
          </span>
        </div>
        
        <h1 className="text-3xl sm:text-5xl font-bold text-dark dark:text-white mb-8 leading-tight">
          {article.title}
        </h1>

        {/* AI Summarizer */}
        <div className="mb-10 p-6 bg-red-50/50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/10 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-dark dark:text-white flex items-center gap-2">
              <Sparkles size={18} className="text-primary" /> Ringkasan AI
            </h3>
            <button 
              onClick={handleSummarize}
              disabled={isSummarizing}
              className="text-xs font-bold text-primary hover:underline disabled:opacity-50"
            >
              {isSummarizing ? "Meringkas..." : "Buat Ringkasan"}
            </button>
          </div>
          {summary ? (
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              {summary}
            </p>
          ) : (
            <p className="text-gray-400 text-xs italic">
              Klik tombol di atas untuk membuat ringkasan artikel ini secara otomatis.
            </p>
          )}
        </div>

        <div 
          className="prose prose-red dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      </div>
    </section>
  );
}
