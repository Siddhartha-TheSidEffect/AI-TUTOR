import React, { useState, useEffect, useRef } from 'react';

const customStyles = `
  .siri-aura {
    background: conic-gradient(from 0deg, #ff3b30, #af52de, #00c7be, #34c759, #ffcc00, #ff3b30);
    animation: siri-spin-pulse 3s ease-in-out infinite;
    filter: blur(54px);
    opacity: 0.9;
    border-radius: 50%;
  }
  
  @keyframes siri-spin-pulse {
    0% { transform: rotate(0deg) scale(0.85); opacity: 0.8; }
    50% { transform: rotate(180deg) scale(1.15); opacity: 1; }
    100% { transform: rotate(360deg) scale(0.85); opacity: 0.8; }
  }

  @keyframes flashy-text {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  .text-gradient-flash {
    background: linear-gradient(to right, #00e5ff, #ff00a0, #7a00ff, #00ff73, #00e5ff);
    background-size: 200% auto;
    color: transparent;
    -webkit-background-clip: text;
    background-clip: text;
    animation: flashy-text 3s linear infinite;
  }

  .glass-panel {
    background: rgba(10, 10, 15, 0.5);
    backdrop-filter: blur(40px);
    -webkit-backdrop-filter: blur(40px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  }
  
  .glass-card {
    background: rgba(20, 20, 30, 0.4);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  }
  
  .glass-input {
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #ffffff;
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.2);
  }
  
  .glass-input:focus {
    background: rgba(0, 0, 0, 0.6);
    border-color: #00e5ff;
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(0, 229, 255, 0.2);
  }
`;

const InteractiveBackground = ({ allowBattle = false }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    
    const MAX_PARTICLES = 1600; 
    let particles = [];
    let bombs = [];
    
    let isMicActive = false;
    let repelTargets = [];
    
    let battleActive = false;
    let retreating = false;
    let ships = [];

    const resize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const handleMicState = (e) => { 
      if (isMicActive && !e.detail.isRecording) {
        repelTargets.push({ x: canvas.width / 2, y: canvas.height - 100, radius: 1200, strength: 60, age: 0 });
      }
      isMicActive = e.detail.isRecording; 
    };
    window.addEventListener('mic-state-change', handleMicState);

    const handleGlobalClick = (e) => {
      repelTargets.push({ x: e.clientX, y: e.clientY, radius: 250, strength: 20, age: 0 });
    };
    window.addEventListener('click', handleGlobalClick);

    const handleAppScroll = (e) => {
      const scrollTop = e.detail.scrollTop;
      if (battleActive) {
        if (scrollTop > 50 && !retreating) {
          retreating = true;
        } else if (scrollTop <= 10 && retreating) {
          retreating = false;
        
          if (ships.length === 2) {
            ships[0].x = -150;
            ships[0].vx = 2.5;
            ships[1].x = canvas.width + 150;
            ships[1].vx = -2.5;
          }
        }
      }
    };
    window.addEventListener('app-scroll', handleAppScroll);

    const startSpaceBattle = () => {
      if (!allowBattle) return; 
      
      particles = particles.filter(p => p.y > 300); 
      battleActive = true;
      retreating = false;
      
      ships = [
        { x: -150, y: 150, vx: 2.5, dir: 1 }, 
        { x: canvas.width + 150, y: 150, vx: -2.5, dir: -1 } 
      ];
      bombs = [];
      window.dispatchEvent(new Event('battle-started'));
    };
    window.addEventListener('start-space-battle', startSpaceBattle);

    const drawDotMatrixFalcon = (x, y, dir) => {
      ctx.save();
      ctx.translate(x, y);
      if (dir < 0) ctx.scale(-1, 1); 
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      const drawDot = (dx, dy) => ctx.fillRect(dx, dy, 2, 2);
      
      for(let r=0; r<=24; r+=4) {
        const steps = r === 0 ? 1 : r * 2.5;
        for(let i=0; i<steps; i++) {
          const angle = (i/steps) * Math.PI * 2;
          drawDot(Math.cos(angle)*r, Math.sin(angle)*r);
        }
      }
      
      for(let dx=18; dx<=45; dx+=4) {
        for(let dy=4; dy<=10; dy+=4) {
          drawDot(dx, -dy);
          drawDot(dx, dy); 
        }
      }
      
      for(let dx=8; dx<=28; dx+=4) drawDot(dx, 16);
      drawDot(30, 16); drawDot(32, 14); drawDot(32, 18);
      
      ctx.fillStyle = 'rgba(0, 229, 255, 0.9)';
      ctx.shadowBlur = 12; ctx.shadowColor = '#00e5ff';
      for(let dy=-12; dy<=12; dy+=3) drawDot(-25, dy);
      
      ctx.restore();
    };

    class Particle {
      constructor(x, y, vx, vy, isBomb = false) {
        this.x = x ?? Math.random() * canvas.width;
        this.y = y ?? Math.random() * canvas.height;
        this.vx = vx ?? (Math.random() - 0.5) * 0.5;
        this.vy = vy ?? (Math.random() - 0.5) * 0.5;
        this.radius = isBomb ? Math.random() * 2 + 1.5 : Math.random() * 1.2 + 0.3; 
        this.baseSpeed = Math.random() * 0.2 + 0.1;
      }

      update() {
        let ax = 0;
        let ay = 0;

        repelTargets.forEach(rt => {
          const dx = this.x - rt.x;
          const dy = this.y - rt.y;
          const dist = Math.hypot(dx, dy);
          if (dist < rt.radius) {
            const force = (rt.radius - dist) / rt.radius;
            ax += (dx / dist) * force * (rt.strength / (rt.age + 1)); 
          }
        });

        if (isMicActive) {
          const targetX = canvas.width / 2;
          const targetY = canvas.height - 100; 
          const dx = targetX - this.x;
          const dy = targetY - this.y;
          const dist = Math.hypot(dx, dy);
          
          if (dist > 30) { 
            const pullStrength = 1.5; 
            ax += (dx / dist) * pullStrength;
            ay += (dy / dist) * pullStrength;
          }
        }

        this.vx += ax;
        this.vy += ay;
        this.vx *= 0.92;
        this.vy *= 0.92;

        const speed = Math.hypot(this.vx, this.vy);
        if (!isMicActive && repelTargets.length === 0 && speed < this.baseSpeed && speed > 0.01) {
          this.vx = (this.vx / speed) * this.baseSpeed;
          this.vy = (this.vy / speed) * this.baseSpeed;
        }

        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.5})`; 
        ctx.fill();
      }
    }

    for (let i = 0; i < MAX_PARTICLES; i++) particles.push(new Particle());

    const render = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      repelTargets = repelTargets.filter(rt => {
        rt.age += 1;
        return rt.age < 20;
      });

      if (battleActive && allowBattle) {
        let s1 = ships[0];
        let s2 = ships[1];
        let dist = Math.abs(s1.x - s2.x);

        if (retreating) {
          s1.x -= 30; 
          s2.x += 30; 
        } else {
          if (dist < 400 && dist > 40) {
            s1.vx *= 0.98;
            s2.vx *= 0.98;
          }
          s1.x += s1.vx;
          s2.x += s2.vx;
        }

        drawDotMatrixFalcon(s1.x, s1.y, s1.dir);
        drawDotMatrixFalcon(s2.x, s2.y, s2.dir);

        if (Math.random() < 0.04 && !retreating) { 
          for(let k=0; k<30; k++) { 
            const thrustX = 20 + Math.random() * 20;
            const spreadY = (Math.random() - 0.5) * 60; 
            
            bombs.push(new Particle(s1.x + 40, s1.y, s1.vx + thrustX, spreadY, true));
            bombs.push(new Particle(s2.x - 40, s2.y, s2.vx - thrustX, spreadY, true));
          }
        }

        if (dist < 40 && !retreating) {
          battleActive = false;
          for(let i=0; i<600; i++) {
            particles.push(new Particle(s1.x, s1.y, (Math.random()-0.5)*40, (Math.random()-0.5)*40));
          }
          if (particles.length > MAX_PARTICLES) particles = particles.slice(particles.length - MAX_PARTICLES);
          window.dispatchEvent(new Event('battle-ended'));
        }
      }

      particles = particles.concat(bombs);
      bombs = []; 
      
      particles.forEach(p => { p.update(); p.draw(); });
      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('mic-state-change', handleMicState);
      window.removeEventListener('start-space-battle', startSpaceBattle);
      window.removeEventListener('app-scroll', handleAppScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, [allowBattle]); 

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-[-1] bg-black" />;
};

export default function App() {
  const [currentView, setCurrentView] = useState('login'); 
  const [activeTab, setActiveTab] = useState('home'); 
  const [user, setUser] = useState({ name: '', email: '' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [tutorSettings, setTutorSettings] = useState({
    speed: 1.0, language: 'en-US', level: 'pro', bargeIn: true, timeLimit: 15
  });
  const [selectedSubject, setSelectedSubject] = useState('Machine Learning (Python)');
  const [uploadedFile, setUploadedFile] = useState(null);

  const handleLoginSuccess = (name, email) => {
    setUser({ name, email });
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setUser({ name: '', email: '' });
    setCurrentView('login');
  };

  if (currentView === 'login') {
    return (
      <>
        <style>{customStyles}</style>
        <InteractiveBackground allowBattle={false} key="login" />
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  if (currentView === 'session') {
    return (
      <>
        <style>{customStyles}</style>
        <InteractiveBackground allowBattle={false} key="session" />
        <ActiveSessionView 
          user={user} 
          subject={selectedSubject} 
          settings={tutorSettings} 
          file={uploadedFile}
          onEndSession={() => {
            setCurrentView('dashboard');
            window.dispatchEvent(new CustomEvent('mic-state-change', { detail: { isRecording: false } }));
          }} 
        />
      </>
    );
  }

  const handleAppScroll = (e) => {
    const scrollTop = e.target.scrollTop;
    window.dispatchEvent(new CustomEvent('app-scroll', { detail: { scrollTop } }));
  };

  return (
    <>
      <style>{customStyles}</style>
      <InteractiveBackground allowBattle={true} key="dashboard" />
      <div className="flex h-screen bg-transparent font-sans text-gray-100 selection:bg-cyan-500/30 overflow-hidden relative">
        
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-6 left-6 z-50 glass-card p-3 rounded-full hover:bg-white/10 transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)]"
          >
            <span className="text-xl">🍔</span>
          </button>
        )}

        <aside className={`glass-panel flex flex-col z-40 rounded-3xl my-6 overflow-hidden h-fit transition-all duration-500 ease-in-out absolute md:relative ${
          isSidebarOpen ? 'w-64 opacity-100 ml-6 translate-x-0' : 'w-0 opacity-0 -translate-x-10 pointer-events-none'
        }`}>
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/20">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-tr from-cyan-400 to-indigo-500 rounded-lg flex items-center justify-center text-white font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]">A</div>
              <h1 className="text-xl font-bold tracking-wide text-white">Apex Tutor</h1>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-white transition-colors">✕</button>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            <NavItem icon="🏠" label="Home" isActive={activeTab === 'home'} onClick={() => setActiveTab('home')} />
            <NavItem icon="⚙️" label="Settings" isActive={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
            <NavItem icon="📚" label="History" isActive={activeTab === 'history'} onClick={() => setActiveTab('history')} />
            <NavItem icon="👤" label="Profile" isActive={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
          </nav>
        </aside>

        <main className={`flex-1 flex flex-col h-full overflow-hidden relative transition-all duration-500`}>
          <header className="h-16 glass-panel flex items-center justify-between px-8 shrink-0 z-10 rounded-b-3xl mx-8 border-t-0 mt-0">
            <h2 className="text-lg font-bold tracking-wide capitalize text-white ml-12 md:ml-0">{activeTab}</h2>
            <div className="flex items-center space-x-3 cursor-pointer hover:bg-white/10 p-1.5 rounded-full transition-all" onClick={() => setActiveTab('profile')}>
              <span className="font-semibold text-sm text-gray-300">{user.name}</span>
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md">
                {user.name.charAt(0)}
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8 z-0" onScroll={handleAppScroll}>
            {activeTab === 'home' && <HomeTab onStart={() => setCurrentView('session')} subject={selectedSubject} setSubject={setSelectedSubject} settings={tutorSettings} setSettings={setTutorSettings} setFile={setUploadedFile} />}
            {activeTab === 'settings' && <SettingsTab settings={tutorSettings} setSettings={setTutorSettings} />}
            {activeTab === 'history' && <HistoryTab />}
            {activeTab === 'profile' && <ProfileTab user={user} onLogout={handleLogout} />}
          </div>
        </main>
      </div>
    </>
  );
}

const NavItem = ({ icon, label, isActive, onClick }) => (
  <button 
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-300 ${
      isActive 
      ? 'bg-white/15 text-cyan-300 font-bold shadow-sm border border-white/20' 
      : 'text-gray-400 hover:bg-white/5 hover:text-white font-medium'
    }`}
  >
    <span className="text-xl">{icon}</span>
    <span>{label}</span>
  </button>
);

const LoginScreen = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [flashPhase, setFlashPhase] = useState(false); 
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = () => {
    const { username, email, password } = formData;
    if (!username || !password) return setErrorMsg('Username and Password required.');

    let storedUsers = JSON.parse(localStorage.getItem('apex_users')) || [];
    
    if (isSignUp) {
      if (!email) return setErrorMsg('Email is required for signup.');
      if (storedUsers.find(u => u.username === username)) return setErrorMsg('Username already exists.');
      
      storedUsers.push({ username, email, password });
      localStorage.setItem('apex_users', JSON.stringify(storedUsers));
    } else {
      const user = storedUsers.find(u => u.username === username && u.password === password);
      if (!user) return setErrorMsg('Invalid username or password.');
      formData.email = user.email; 
    }

    setErrorMsg('');
    setFlashPhase(true);
    
    setTimeout(() => {
      onLoginSuccess(username, formData.email);
    }, 2500);
  };

  if (flashPhase) {
    return (
      <div className="flex h-screen items-center justify-center bg-black absolute inset-0 z-50">
        <h1 className="text-5xl md:text-7xl font-black text-gradient-flash tracking-tight text-center px-4">
          {isSignUp ? `Welcome to Apex, ${formData.username}!` : `Welcome back, ${formData.username}.`}
        </h1>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-transparent">
      <div className="glass-panel p-10 rounded-[2.5rem] w-full max-w-md text-center shadow-2xl relative z-10">
        <div className="w-20 h-20 mx-auto bg-gradient-to-tr from-cyan-400 to-indigo-500 rounded-2xl flex items-center justify-center text-white text-4xl font-bold shadow-[0_0_20px_rgba(6,182,212,0.5)] mb-6">A</div>
        <h2 className="text-3xl font-bold text-white mb-2 tracking-wide">{isSignUp ? 'Create Account' : 'Apex Secure Login'}</h2>
        <p className="text-gray-400 mb-6 font-medium">{isSignUp ? 'Begin your personalized journey' : 'Access your encrypted workspace'}</p>
        
        {errorMsg && <p className="text-rose-400 text-sm font-bold mb-4 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">{errorMsg}</p>}

        <div className="space-y-4 mb-8">
          <input 
            type="text" placeholder="Username" value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})} 
            className="w-full glass-input rounded-2xl px-5 py-4 outline-none transition-all placeholder-gray-500 font-medium"
          />
          {isSignUp && (
            <input 
              type="email" placeholder="Email Address" value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})} 
              className="w-full glass-input rounded-2xl px-5 py-4 outline-none transition-all placeholder-gray-500 font-medium"
            />
          )}
          <input 
            type="password" placeholder="Password" value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})} 
            className="w-full glass-input rounded-2xl px-5 py-4 outline-none transition-all placeholder-gray-500 font-medium"
          />
        </div>

        <button 
          onClick={handleSubmit}
          className="w-full bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold py-4 rounded-2xl hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(6,182,212,0.4)]"
        >
          {isSignUp ? 'Sign Up' : 'Secure Login'}
        </button>

        <p className="mt-6 text-gray-400 text-sm">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          <span 
            className="text-cyan-400 font-bold ml-2 cursor-pointer hover:underline"
            onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(''); }}
          >
            {isSignUp ? 'Log In' : 'Sign Up'}
          </span>
        </p>
      </div>
    </div>
  );
};

const HomeTab = ({ onStart, subject, setSubject, settings, setSettings, setFile }) => {
  const [customTopic, setCustomTopic] = useState('');
  const [uiShifted, setUiShifted] = useState(true); 
  
  const broadSubjects = ['Machine Learning (Python)', 'Data Structures & Algorithms (C++)', 'Quantitative Finance'];

  useEffect(() => {
    window.dispatchEvent(new Event('start-space-battle'));
    
    const handleBattleEnd = () => setUiShifted(false); 
    const handleScroll = (e) => {
      if (e.detail.scrollTop > 50) setUiShifted(false);
    };

    window.addEventListener('battle-ended', handleBattleEnd);
    window.addEventListener('app-scroll', handleScroll);
    return () => {
      window.removeEventListener('battle-ended', handleBattleEnd);
      window.removeEventListener('app-scroll', handleScroll);
    };
  }, []);
  
  return (
    <div className={`max-w-5xl mx-auto space-y-10 ${uiShifted ? 'mt-[35vh] opacity-50 transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)]' : 'mt-0 opacity-100 transition-none'}`}>
      
      <div className="glass-panel p-8 rounded-3xl flex flex-col md:flex-row items-center justify-between relative z-10">
        <div className="w-full md:w-2/3 pr-0 md:pr-8 space-y-4">
          <div>
            <h3 className="text-cyan-400 text-xs uppercase tracking-widest font-bold mb-1">Select Domain</h3>
            <select 
              value={subject} onChange={(e) => setSubject(e.target.value)}
              className="text-xl font-bold bg-transparent border-b-2 border-white/20 focus:border-cyan-400 outline-none pb-1 text-white cursor-pointer w-full"
            >
              {broadSubjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          
          <div className="flex space-x-4">
            <div className="flex-1">
               <h3 className="text-cyan-400 text-xs uppercase tracking-widest font-bold mb-1">Language</h3>
               <select 
                 value={settings.language} onChange={(e) => setSettings({...settings, language: e.target.value})}
                 className="w-full glass-input rounded-xl px-3 py-2 outline-none font-medium text-sm cursor-pointer"
               >
                 <option value="en-US">English</option>
                 <option value="hi-IN">Hindi (AI Translation)</option>
               </select>
            </div>
            <div className="flex-1">
               <h3 className="text-cyan-400 text-xs uppercase tracking-widest font-bold mb-1">Difficulty</h3>
               <select 
                 value={settings.level} onChange={(e) => setSettings({...settings, level: e.target.value})}
                 className="w-full glass-input rounded-xl px-3 py-2 outline-none font-medium text-sm cursor-pointer"
               >
                 <option value="beginner">Beginner</option>
                 <option value="pro">Pro (Advanced)</option>
               </select>
            </div>
          </div>
          
          <div className="glass-card p-3 rounded-xl border border-dashed border-cyan-500/50">
            <h3 className="text-cyan-400 text-xs uppercase tracking-widest font-bold mb-2">Upload Textbook/Notes (RAG Context)</h3>
            <input 
              type="file" 
              accept=".pdf,.docx,.ppt" 
              onChange={(e) => setFile(e.target.files[0])}
              className="text-sm text-gray-300 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 cursor-pointer"
            />
          </div>
        </div>
        
        <div className="mt-6 md:mt-0 w-full md:w-1/3 z-10">
          <button 
            onClick={(e) => { e.stopPropagation(); onStart(); }}
            className="w-full bg-gradient-to-r from-cyan-500 to-indigo-600 text-white px-6 py-5 rounded-2xl font-bold shadow-[0_0_30px_rgba(6,182,212,0.3)] transition-all transform hover:scale-105 flex items-center justify-center space-x-3"
          >
            <span className="text-lg">Initialize Lesson</span>
            <span className="text-xl">🎙️</span>
          </button>
        </div>
      </div>

      <div className="glass-panel p-8 rounded-3xl relative z-10">
        <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-xl font-bold text-white">ChromaDB Vector Memory</h3>
            <p className="text-gray-400 text-sm mt-1 font-medium">Sourced dynamically from your previous evaluations.</p>
          </div>
          <button className="text-cyan-400 text-sm font-bold hover:text-cyan-300 transition-colors bg-white/10 px-4 py-2 rounded-lg border border-white/20 shadow-sm">View Full Assessment</button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden border-t border-l border-emerald-500/30">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,1)]"></div>
            <h4 className="text-emerald-400 font-bold mb-4 flex items-center text-lg">
              <span className="mr-3 text-2xl">✅</span> Strong Concepts
            </h4>
            <ul className="space-y-3 text-sm text-gray-300 font-medium">
              <li className="flex items-center"><div className="w-2 h-2 rounded-full bg-emerald-400 mr-3"></div> Multi-dimensional Array Allocation</li>
              <li className="flex items-center"><div className="w-2 h-2 rounded-full bg-emerald-400 mr-3"></div> Time Complexity Analysis (Big O)</li>
            </ul>
          </div>

          <div className="glass-card rounded-2xl p-6 relative overflow-hidden border-t border-l border-amber-500/30">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,1)]"></div>
            <h4 className="text-amber-400 font-bold mb-4 flex items-center text-lg">
              <span className="mr-3 text-2xl">🎯</span> Weaknesses (Needs Revision)
            </h4>
            <ul className="space-y-3 text-sm text-gray-300 font-medium">
              <li className="flex items-center"><div className="w-2 h-2 rounded-full bg-amber-400 mr-3"></div> Memory Leaks in Vectors</li>
              <li className="flex items-center"><div className="w-2 h-2 rounded-full bg-amber-400 mr-3"></div> Advanced Dynamic Programming</li>
            </ul>
          </div>
        </div>
      </div>

      <h3 className="text-2xl font-black text-white tracking-wide mt-8 px-2">System Integrations</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
        <FeatureCard 
          icon="🎥" title="HeyGen Video Rendering"
          desc="Routes parsed LLM text into real-time Avatar generation for human-like visual teaching delivery."
        />
        <FeatureCard 
          icon="🌐" title="Multilingual Capabilities"
          desc="Seamlessly toggles logic between English and Hindi, passing translated context dynamically to the Avatar API."
        />
        <FeatureCard 
          icon="🧠" title="Adaptive Logic Pipeline"
          desc="Utilizes Gemini Pro's complex system prompts to instantly adapt difficulty curves based on user responses."
        />
        <FeatureCard 
          icon="🔗" title="Hallucination-Free RAG"
          desc="Powered by ChromaDB, extracting semantic context purely from uploaded PDFs to ground all LLM outputs."
        />
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }) => (
  <div className="glass-panel p-6 rounded-3xl hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all duration-300 pointer-events-auto">
    <div className="text-4xl mb-4 bg-white/5 inline-block p-3 rounded-2xl">{icon}</div>
    <h4 className="text-white font-bold mb-2 text-lg">{title}</h4>
    <p className="text-sm text-gray-400 font-medium leading-relaxed">{desc}</p>
  </div>
);

const SettingsTab = ({ settings, setSettings }) => {
  return (
    <div className="max-w-2xl mx-auto glass-panel p-10 rounded-3xl space-y-8 relative z-10">
      <div>
        <label className="block text-sm font-bold text-gray-300 mb-2">AI Video API Selection</label>
        <select className="w-full glass-input rounded-2xl p-4 font-medium outline-none">
          <option value="heygen">HeyGen API (Primary)</option>
          <option value="did">D-ID API (Secondary)</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-300 mb-2">Fallback Audio Mode</label>
        <select className="w-full glass-input rounded-2xl p-4 font-medium outline-none">
          <option value="google">Google TTS API</option>
          <option value="eleven">ElevenLabs API</option>
        </select>
      </div>
      <div className="flex items-center justify-between p-6 glass-card rounded-2xl">
        <div>
          <h4 className="font-bold text-white text-lg">Enable Adaptive Difficulty</h4>
          <p className="text-sm text-gray-400 mt-1 font-medium">Allows prompt logic to downscale complexity automatically</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer pointer-events-auto">
          <input type="checkbox" defaultChecked className="sr-only peer" />
          <div className="w-14 h-8 bg-black/40 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-cyan-500 border border-white/20"></div>
        </label>
      </div>
    </div>
  );
};

const HistoryTab = () => (
  <div className="max-w-4xl mx-auto space-y-6 relative z-10">
    <div className="flex justify-between items-center mb-8">
      <h3 className="text-3xl font-black text-white tracking-wide">Learning History</h3>
      <button className="glass-card border border-white/20 text-cyan-300 px-6 py-3 rounded-xl font-bold hover:bg-white/10 transition-all pointer-events-auto">
        ⚡ Generate Revision Shorts
      </button>
    </div>
    {[1, 2, 3].map(i => (
      <div key={i} className="glass-panel p-6 rounded-2xl flex justify-between items-center hover:bg-white/5 transition-all cursor-pointer pointer-events-auto group border-l-4 border-l-cyan-500">
        <div>
          <h4 className="font-bold text-white text-lg">Session {i}: Advanced Graph Algorithms</h4>
          <p className="text-sm text-gray-400 mt-1 font-medium">August {10 - i}, 2026 • 45 minutes</p>
        </div>
        <span className="text-cyan-400 font-bold group-hover:translate-x-2 transition-transform bg-cyan-900/30 px-4 py-2 rounded-lg">Review →</span>
      </div>
    ))}
  </div>
);

const ProfileTab = ({ user, onLogout }) => (
  <div className="max-w-md mx-auto glass-panel p-10 rounded-[2.5rem] text-center mt-12 relative z-10 pointer-events-auto">
    <div className="w-32 h-32 mx-auto bg-gradient-to-tr from-cyan-400 to-indigo-600 rounded-full flex items-center justify-center text-6xl text-white font-bold shadow-[0_0_40px_rgba(6,182,212,0.5)] mb-6 border-4 border-white/20">
      {user.name.charAt(0)}
    </div>
    <h3 className="text-3xl font-black text-white mb-2">{user.name}</h3>
    <p className="text-gray-400 font-medium mb-10">{user.email}</p>
    
    <div className="space-y-4">
      <button className="w-full glass-input text-white py-4 rounded-2xl font-bold hover:bg-white/10 transition-all">Edit Profile</button>
      <button onClick={onLogout} className="w-full bg-rose-500/20 text-rose-400 py-4 rounded-2xl font-bold hover:bg-rose-500/40 transition-all border border-rose-500/30">Log Out</button>
    </div>
  </div>
);



const ActiveSessionView = ({ user, subject, settings, file, onEndSession }) => {
  const [status, setStatus] = useState('Ready for Lesson...');
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState([]);
  const [videoUrl, setVideoUrl] = useState(null);
  
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const askTeacher = async (transcribedText) => {
    setStatus('Generating AI Avatar Video (D-ID)...');
    
    const formData = new FormData();
    formData.append('student_query', transcribedText);
    formData.append('level', settings.level);
    formData.append('time', '15 mins'); 

    try {
      const response = await fetch('http://localhost:8000/ask_teacher', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        // Extract the feedback message or content from your friend's new JSON structure
        const aiMessage = data.ai_response?.feedback_message || "Lesson generated successfully.";
        
        setMessages(prev => [...prev, { sender: 'ai', text: aiMessage }]);
        
        if (data.video_url) {
            setVideoUrl(data.video_url);
        }
        setStatus('Connected');
      }
    } catch (error) {
      console.error("API Error:", error);
      setStatus('Connection Failed');
    }
  };

  const toggleRecording = (e) => {
    e.stopPropagation();

    if (isRecording) {
      setIsRecording(false);
      window.dispatchEvent(new CustomEvent('mic-state-change', { detail: { isRecording: false } }));
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech Recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = settings.language === 'hi-IN' ? 'hi-IN' : 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecording(true);
      setStatus('Listening...');
      window.dispatchEvent(new CustomEvent('mic-state-change', { detail: { isRecording: true } }));
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setMessages(prev => [...prev, { sender: 'user', text: transcript }]);
      askTeacher(transcript); 
    };

    recognition.onend = () => {
        setIsRecording(false);
        window.dispatchEvent(new CustomEvent('mic-state-change', { detail: { isRecording: false } }));
    };
    
    recognition.start();
  };

  return (
    <div className="flex flex-col h-screen bg-transparent font-sans text-gray-100">
      <header className="h-20 glass-panel border-t-0 border-l-0 border-r-0 flex items-center justify-between px-10 shrink-0 z-10 rounded-b-3xl mx-6">
        <div className="flex items-center space-x-6">
          <button onClick={(e) => { e.stopPropagation(); onEndSession(); }} className="text-gray-300 hover:text-white transition-colors glass-card px-4 py-2 rounded-xl text-sm font-bold pointer-events-auto border border-white/10">← Exit Session</button>
          <div className="h-6 w-px bg-white/20"></div>
          <span className="font-black text-white tracking-wide text-lg">{subject}</span>
        </div>
        <div className="flex items-center space-x-3 bg-black/40 px-5 py-2 rounded-full border border-white/10 shadow-sm">
          <div className={`w-3 h-3 rounded-full shadow-sm ${status.includes('Failed') ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'}`}></div>
          <span className="text-sm font-bold text-gray-200">{status}</span>
        </div>
      </header>

      <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 pb-48 z-0 relative pointer-events-auto overflow-hidden">
        
        <div className="flex flex-col space-y-4 h-full">
            <div className="glass-panel w-full h-80 rounded-3xl flex items-center justify-center relative overflow-hidden border-cyan-500/20 border-2 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
                {videoUrl ? (
                    <video autoPlay className="w-full h-full object-cover"><source src={videoUrl} type="video/mp4" /></video>
                ) : (
                    <div className="text-center text-gray-500">
                        <span className="text-6xl block mb-4 filter drop-shadow-lg">🎥</span>
                        <p className="font-bold text-white text-xl tracking-wide">HeyGen Avatar Render</p>
                        <p className="text-sm mt-2 text-cyan-400 font-medium">Awaiting LLM script pipeline...</p>
                    </div>
                )}
            </div>
            
            <div className="glass-card flex-1 rounded-3xl p-6 border-t border-cyan-500/30 overflow-y-auto">
                <h3 className="text-cyan-400 font-bold mb-4 tracking-wider uppercase text-xs">Dynamic Visuals & Context</h3>
                <div className="bg-black/50 p-6 rounded-xl border border-white/10 font-mono text-sm text-emerald-400 shadow-inner">
                    {'// RAG Context Output\n// Relevant algorithms will display here based on PyPDF2 extraction.'}
                </div>
            </div>
        </div>

        <div className="glass-panel rounded-3xl p-6 overflow-y-auto flex flex-col space-y-4 h-full">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                <span className="text-7xl mb-6 drop-shadow-md">✨</span>
                <p className="text-2xl font-bold text-white">ChromaDB Vector Context is loaded.</p>
                <p className="text-md mt-2 font-medium">Tap the mic to trigger prompt pipeline.</p>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} pointer-events-auto`}>
                <div className={`max-w-lg rounded-3xl px-8 py-5 shadow-2xl backdrop-blur-2xl border border-white/10 ${
                  msg.sender === 'user' 
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-sm' 
                    : 'glass-card text-gray-100 rounded-bl-sm border-l-4 border-l-cyan-400'
                }`}>
                  <p className="text-[16px] leading-relaxed font-semibold">{msg.text}</p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
        </div>

      </div>

      <div className="absolute bottom-0 left-0 right-0 p-10 bg-gradient-to-t from-black via-black/80 to-transparent flex justify-center pb-16 pointer-events-none z-20">
        <div className="relative pointer-events-auto group mt-4 flex justify-center items-center">
          {isRecording && <div className="absolute -inset-24 siri-aura pointer-events-none"></div>}
          <button
            onClick={toggleRecording}
            className={`relative flex items-center justify-center w-28 h-28 rounded-full shadow-2xl transition-all duration-300 focus:outline-none border border-white/20 z-10
              ${isRecording ? 'bg-black/90 scale-110 border-white/40' : 'glass-card hover:bg-white/10 hover:scale-105'}`}
          >
            {isRecording ? (
              <div className="w-10 h-10 bg-cyan-400 rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.8)] animate-pulse"></div>
            ) : (
              <span className="text-5xl filter drop-shadow-md">🎙️</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};