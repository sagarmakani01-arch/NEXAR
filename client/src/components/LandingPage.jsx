import { useState, useEffect } from 'react';
import { ArrowRight, Code2, Zap, GitBranch, Cpu, Rocket, Users, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const features = [
    {
      icon: Code2,
      title: 'AI-Powered Development',
      description: 'Nemotron 3 Ultra for intelligent code generation, debugging, and architecture guidance'
    },
    {
      icon: Rocket,
      title: 'Instant Deployment',
      description: 'One-click deploy with custom subdomains, zero watermarks, unlimited usage'
    },
    {
      icon: Zap,
      title: 'Full IDE Experience',
      description: 'Monaco editor, live terminal, file explorer, and real-time preview'
    },
    {
      icon: Users,
      title: 'Real-time Collaboration',
      description: 'WebSocket-based multi-user editing with live cursor tracking'
    },
    {
      icon: GitBranch,
      title: 'Multiple Frameworks',
      description: 'React, Vue, Svelte, Next.js, Express - full stack templates ready'
    },
    {
      icon: Shield,
      title: 'Self-Hosted Control',
      description: 'Complete data ownership, no vendor lock-in, no rate limits'
    }
  ];

  const stats = [
    { number: '∞', label: 'AI Requests' },
    { number: '0%', label: 'Watermarks' },
    { number: '24/7', label: 'Uptime' },
    { number: '100%', label: 'Your Data' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-96 h-96 bg-primary-600/20 rounded-full blur-3xl -top-20 -right-20 animate-pulse-slow"
          style={{ transform: `translate(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px)` }}
        />
        <div
          className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl bottom-0 -left-20 animate-pulse-slow"
          style={{ transform: `translate(${-mousePosition.x * 0.02}px, ${-mousePosition.y * 0.02}px)` }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.1),rgba(14,165,233,0))]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-40 flex items-center justify-between px-6 py-4 md:px-12 backdrop-blur-xl bg-slate-950/50 border-b border-slate-800/50">
        <div className="text-2xl font-black bg-gradient-to-r from-primary-400 to-blue-400 bg-clip-text text-transparent">
          NEXAR
        </div>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 transition-all duration-300 font-semibold text-white shadow-lg hover:shadow-primary-600/50"
        >
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative z-20 min-h-screen flex items-center justify-center px-6 md:px-12 pt-20">
        <div className="max-w-6xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700 mb-8 animate-fade-in">
            <Cpu className="w-4 h-4 text-primary-400" />
            <span className="text-sm font-medium text-slate-300">Powered by Nemotron 3 Ultra</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight animate-slide-up">
            <span className="bg-gradient-to-r from-primary-300 via-blue-300 to-purple-300 bg-clip-text text-transparent">
              Build. Deploy. Dominate.
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-2xl text-slate-300 max-w-3xl mx-auto mb-12 leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
            The self-hosted AI development platform that gives you unlimited power. Zero watermarks. Zero limits. Zero compromises.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <button
              onClick={() => navigate('/login')}
              className="group px-8 py-4 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 transition-all duration-300 font-bold text-lg flex items-center justify-center gap-3 shadow-2xl hover:shadow-primary-600/50 transform hover:-translate-y-1"
            >
              Get Started Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              className="px-8 py-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all duration-300 font-bold text-lg flex items-center justify-center gap-2"
            >
              <Code2 className="w-5 h-5" />
              View Demo
            </button>
          </div>

          {/* Hero Image/Code Block */}
          <div className="relative max-w-4xl mx-auto animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="absolute inset-0 bg-gradient-to-r from-primary-600/20 to-purple-600/20 rounded-2xl blur-2xl" />
            <div className="relative bg-slate-800/80 backdrop-blur border border-slate-700 rounded-2xl p-6 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-10 bg-slate-900/50 border-b border-slate-700 flex items-center gap-2 px-4">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <pre className="pt-8 text-sm md:text-base text-slate-300 font-mono overflow-x-auto">
                <code>{`// Your AI-powered development starts here
const project = await nexar.create({
  framework: 'next.js',
  aiMode: 'turbo',
  watermarks: false,
  limits: 'infinite'
});

await project.deploy();
// 🚀 Live in seconds`}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-slate-600 rounded-full flex justify-center">
            <div className="w-1 h-2 bg-primary-400 rounded-full mt-2" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-20 py-20 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50 hover:border-primary-600/30 transition-all duration-300 hover:bg-slate-800/50">
                <div className="text-4xl md:text-5xl font-black text-transparent bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text mb-2">
                  {stat.number}
                </div>
                <p className="text-slate-400 font-semibold">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-20 py-20 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black text-center mb-4">
            Everything You Need
          </h2>
          <p className="text-center text-slate-400 mb-16 text-lg">
            A complete development environment, powered by cutting-edge AI
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={i}
                  className="group p-8 rounded-2xl bg-slate-800/30 border border-slate-700/50 hover:border-primary-600/50 hover:bg-slate-800/50 transition-all duration-300 transform hover:-translate-y-2"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-20 py-20 px-6 md:px-12">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-gradient-to-r from-primary-600/20 to-purple-600/20 border border-primary-600/30 rounded-3xl p-12 md:p-16 text-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-600/5 to-purple-600/5" />
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-black mb-6">
                Ready to <span className="text-transparent bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text">level up</span>?
              </h2>
              <p className="text-lg text-slate-300 mb-8">
                Join developers who've ditched limitations. Start building unstoppable projects today.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="group px-10 py-4 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 transition-all duration-300 font-bold text-lg inline-flex items-center gap-3 shadow-2xl hover:shadow-primary-600/50 transform hover:-translate-y-1"
              >
                Launch NEXAR
                <Rocket className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-20 border-t border-slate-800/50 py-12 px-6 md:px-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center text-slate-400 text-sm">
          <div>© 2024 NEXAR. All rights reserved. Self-hosted, forever free.</div>
          <div className="flex gap-6 mt-6 md:mt-0">
            <a href="#" className="hover:text-primary-400 transition-colors">Docs</a>
            <a href="#" className="hover:text-primary-400 transition-colors">GitHub</a>
            <a href="#" className="hover:text-primary-400 transition-colors">Discord</a>
          </div>
        </div>
      </footer>
    </div>
  );
}