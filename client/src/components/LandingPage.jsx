import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Sparkles, Shield, Server, Cpu, Users, GitBranch,
  Lock, Globe, Zap, Play, Star, Check, ChevronRight, Menu, X
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let animationId;
    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.4 + 0.1
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x > canvas.width) p.x = 0;
        if (p.x < 0) p.x = canvas.width;
        if (p.y > canvas.height) p.y = 0;
        if (p.y < 0) p.y = canvas.height;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56, 189, 248, ${p.opacity})`;
        ctx.fill();
      });
      animationId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationId);
  }, []);

  const problems = [
    {
      title: 'Vendor Lock-In',
      description: 'Proprietary platforms that control your workflow, data, and AI access — leaving you dependent on their roadmap and pricing.',
      icon: Lock
    },
    {
      title: 'Data Privacy Risks',
      description: 'Cloud IDEs that train on your code, expose intellectual property, and offer no guarantee of data sovereignty.',
      icon: Shield
    },
    {
      title: 'Fragmented Toolchains',
      description: 'Juggling separate tools for editing, AI assistance, deployment, and collaboration — each with its own subscription and learning curve.',
      icon: Server
    },
    {
      title: 'Limited Customization',
      description: 'Closed ecosystems that restrict which AI models you can use, how you deploy, and how you integrate with existing infrastructure.',
      icon: GitBranch
    }
  ];

  const differentiators = [
    {
      title: 'Self-Hosted by Design',
      description: 'Your code never leaves your infrastructure. Deploy on your own servers, VPC, or air-gapped environment.',
      icon: Server
    },
    {
      title: 'AI Provider Agnostic',
      description: 'Use any AI model — Ollama (local), Groq, OpenRouter, or bring your own. No vendor dictating your AI stack.',
      icon: Cpu
    },
    {
      title: 'Complete Data Ownership',
      description: '100% of your code, prompts, and generated content stay under your control. No training on your data. No third-party access.',
      icon: Lock
    },
    {
      title: 'One Unified Workspace',
      description: 'Monaco editor, integrated terminal, file explorer, AI chat, deployment, and real-time collaboration — all in one self-contained platform.',
      icon: Globe
    },
    {
      title: 'Real-Time Collaboration',
      description: 'Multi-user editing with live cursors, conflict resolution, and team-wide synchronization — no additional tools needed.',
      icon: Users
    },
    {
      title: 'Open Architecture',
      description: 'Full API access, extensible plugin system, and complete source control. No black boxes, no proprietary formats.',
      icon: GitBranch
    }
  ];

  const useCases = [
    {
      title: 'For Development Teams',
      description: 'Accelerate delivery with AI-assisted coding, automated code review, and instant deployment — all with complete data privacy.',
      gradient: 'from-blue-600 to-cyan-600'
    },
    {
      title: 'For Enterprise IT',
      description: 'Deploy behind your firewall with SSO, audit logging, and compliance-ready infrastructure. AI development without the risk.',
      gradient: 'from-purple-600 to-pink-600'
    },
    {
      title: 'For Independent Developers',
      description: 'A professional-grade development environment with free AI access. No subscriptions, no limits, no data harvesting.',
      gradient: 'from-emerald-600 to-teal-600'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Animated Background */}
      <canvas ref={canvasRef} className="fixed inset-0 opacity-40 pointer-events-none" />

      {/* Gradient Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/70 backdrop-blur-xl border-b border-slate-800/30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">NEXAR</span>
          </div>

          <div className="hidden md:flex items-center gap-10">
            <a href="#purpose" className="text-sm text-slate-400 hover:text-white transition-colors">Purpose</a>
            <a href="#why" className="text-sm text-slate-400 hover:text-white transition-colors">Why NEXAR</a>
            <a href="#features" className="text-sm text-slate-400 hover:text-white transition-colors">Features</a>
          </div>

          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl text-sm font-semibold transition-all duration-300 shadow-lg hover:shadow-blue-600/40 hover:shadow-xl active:scale-[0.98]"
          >
            Get Started
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800/30 bg-slate-950/95 backdrop-blur-xl">
            <div className="px-6 py-4 space-y-3">
              <a href="#purpose" onClick={() => setMobileMenuOpen(false)} className="block text-slate-400 hover:text-white transition-colors">Purpose</a>
              <a href="#why" onClick={() => setMobileMenuOpen(false)} className="block text-slate-400 hover:text-white transition-colors">Why NEXAR</a>
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-slate-400 hover:text-white transition-colors">Features</a>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative pt-40 pb-28 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-800/40 border border-slate-700/40 rounded-full text-xs font-medium text-slate-400 mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Self-hosted AI development platform
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 leading-[1.1] tracking-tight">
            <span className="block text-white">Build Software.</span>
            <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
              Own Your Stack.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            NEXAR is a self-hosted AI development platform that gives you complete control over your 
            code, your AI models, and your infrastructure. No vendor lock-in. No data leaving your servers. 
            No compromises.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/login')}
              className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all duration-300 shadow-xl hover:shadow-blue-600/30 active:scale-[0.98]"
            >
              Start Building Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => setIsVideoOpen(true)}
              className="px-8 py-4 bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/40 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all duration-300"
            >
              <Play className="w-4 h-4" />
              Watch Overview
            </button>
          </div>
        </div>
      </section>

      {/* Purpose Section — What NEXAR is For */}
      <section id="purpose" className="relative py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
              Built for a{' '}
              <span className="text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text">
                Single Purpose
              </span>
            </h2>
            <p className="text-lg text-slate-400 max-w-3xl mx-auto leading-relaxed">
              NEXAR exists to give every developer and team the power of AI-assisted development 
              without sacrificing control, privacy, or flexibility. It is the platform for building 
              software on your own terms.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {useCases.map((item, i) => (
              <div
                key={i}
                className="group relative p-8 rounded-2xl bg-slate-800/20 border border-slate-700/30 hover:border-slate-600/40 transition-all duration-500"
              >
                <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br ${item.gradient}`} />
                <div className="relative z-10">
                  <h3 className="text-lg font-bold mb-3">{item.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem Section — What Problem It Solves */}
      <section className="relative py-28 px-6 bg-slate-900/30 border-y border-slate-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
              The{' '}
              <span className="text-transparent bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text">
                Problems
              </span>{' '}
              We Solve
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              The development industry has accepted unnecessary compromises. NEXAR challenges every one of them.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {problems.map((problem, i) => {
              const Icon = problem.icon;
              return (
                <div key={i} className="flex gap-5 p-6 rounded-xl bg-slate-800/20 border border-slate-700/30">
                  <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-bold mb-2">{problem.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{problem.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Differentiators — Why Choose NEXAR */}
      <section id="why" className="relative py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
              Why{' '}
              <span className="text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text">
                NEXAR
              </span>
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Every platform claims to be different. Here is what actually sets us apart.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {differentiators.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className="group p-6 rounded-xl bg-slate-800/20 border border-slate-700/30 hover:bg-slate-800/30 hover:border-slate-600/40 transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Mission Section — What We Aim For */}
      <section className="relative py-28 px-6 bg-gradient-to-b from-slate-900/50 to-slate-950 border-y border-slate-800/30">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs font-medium text-blue-400 mb-8">
            Our Mission
          </div>
          <h2 className="text-3xl md:text-5xl font-black mb-8 tracking-tight leading-tight">
            Democratizing AI-Assisted Development
          </h2>
          <p className="text-base md:text-lg text-slate-400 max-w-3xl mx-auto leading-relaxed mb-6">
            We believe that professional-grade AI development tools should be accessible to every 
            developer and team, regardless of budget or organizational size. Our mission is to remove 
            the barriers — cost, complexity, privacy concerns, vendor dependence — that prevent teams 
            from adopting AI-assisted development at scale.
          </p>
          <p className="text-base md:text-lg text-slate-400 max-w-3xl mx-auto leading-relaxed">
            We are building toward a future where development teams own their entire toolchain, 
            choose their AI providers freely, and never have to choose between productivity and privacy.
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
              Everything You Need.{' '}
              <span className="text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text">
                Nothing You Don't.
              </span>
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              A complete development environment that respects your autonomy.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-slate-800/20 rounded-2xl overflow-hidden border border-slate-800/30 max-w-5xl mx-auto">
            {[
              { label: 'Monaco Editor', desc: 'Industry-standard code editor with IntelliSense, debugging, and Git integration.' },
              { label: 'AI Chat & Generation', desc: 'Multi-model AI assistant for code generation, review, debugging, and architecture design.' },
              { label: 'Multiple AI Providers', desc: 'Ollama (local), Groq, OpenRouter — or bring your own. No provider lock-in.' },
              { label: 'Integrated Terminal', desc: 'Full terminal emulator with multi-session support and output persistence.' },
              { label: 'Real-Time Collaboration', desc: 'Live multi-user editing with cursor tracking, conflict resolution, and team sync.' },
              { label: 'One-Click Deploy', desc: 'Deploy projects to production with custom domains, SSL, and global CDN distribution.' },
              { label: 'File Manager', desc: 'Full file explorer with create, edit, rename, delete, and upload capabilities.' },
              { label: 'Preview & Dev Server', desc: 'Live preview with hot module reloading for React, Vue, Svelte, and more.' },
              { label: 'Self-Hosted Architecture', desc: 'Deploy on your own infrastructure. Full control over data, access, and compliance.' }
            ].map((feature, i) => (
              <div key={i} className="p-6 bg-slate-800/10 hover:bg-slate-800/25 transition-colors duration-300">
                <h3 className="font-semibold text-sm mb-2">{feature.label}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-28 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative p-12 md:p-16 rounded-3xl bg-gradient-to-b from-blue-600/10 to-purple-600/5 border border-blue-500/20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tight">
                Take Control of Your Development Stack
              </h2>
              <p className="text-base md:text-lg text-slate-400 mb-8 max-w-xl mx-auto leading-relaxed">
                No credit card. No data collection. No limits. Start building with the only AI development platform that puts you in full control.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="group px-10 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl font-semibold text-base inline-flex items-center gap-2 transition-all duration-300 shadow-xl hover:shadow-blue-600/30 active:scale-[0.98]"
              >
                Start Building Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-slate-800/30 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold">NEXAR</span>
            </div>
            <div className="flex gap-8 text-sm text-slate-500">
              <a href="#purpose" className="hover:text-slate-300 transition-colors">Purpose</a>
              <a href="#why" className="hover:text-slate-300 transition-colors">Why NEXAR</a>
              <a href="#features" className="hover:text-slate-300 transition-colors">Features</a>
            </div>
          </div>
          <div className="border-t border-slate-800/30 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-slate-600">
            <div>&copy; 2024 NEXAR. All rights reserved.</div>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="https://github.com/sagarmakani01-arch/NEXAR" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors">GitHub</a>
              <a href="#" className="hover:text-slate-400 transition-colors">Documentation</a>
              <a href="#" className="hover:text-slate-400 transition-colors">Privacy</a>
              <a href="#" className="hover:text-slate-400 transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Video Modal */}
      {isVideoOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsVideoOpen(false)}
        >
          <div
            className="bg-slate-900 rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl border border-slate-700/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
              <div className="text-center">
                <Play className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                <p className="text-sm text-slate-400">Product overview video</p>
              </div>
            </div>
            <div className="p-6 flex justify-end">
              <button
                onClick={() => setIsVideoOpen(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}