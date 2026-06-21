import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Code2,
  Zap,
  GitBranch,
  Cpu,
  Rocket,
  Users,
  Lock,
  Sparkles,
  ChevronDown,
  Play,
  Star,
  TrendingUp,
  Gauge,
  Terminal,
  Palette
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [activeTab, setActiveTab] = useState('features');
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Animated background canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let animationId;
    const particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      r: Math.random() * 1.5,
      opacity: Math.random() * 0.5
    }));

    const animate = () => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(14, 165, 233, 0.5)';

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x > canvas.width) p.x = 0;
        if (p.x < 0) p.x = canvas.width;
        if (p.y > canvas.height) p.y = 0;
        if (p.y < 0) p.y = canvas.height;

        ctx.globalAlpha = p.opacity;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationId);
  }, []);

  const features = [
    {
      icon: Cpu,
      title: 'AI-Powered Development',
      description: 'NVIDIA Nemotron 3 Ultra integration for intelligent code generation, architectural guidance, and real-time debugging',
      gradient: 'from-blue-600 to-cyan-600'
    },
    {
      icon: Rocket,
      title: 'One-Click Deployment',
      description: 'Deploy to production instantly with custom domains, SSL certificates, and global CDN distribution',
      gradient: 'from-purple-600 to-pink-600'
    },
    {
      icon: Zap,
      title: 'Full-Featured IDE',
      description: 'Monaco editor, integrated terminal, file explorer, debugging tools, and live preview in one unified workspace',
      gradient: 'from-yellow-600 to-orange-600'
    },
    {
      icon: Users,
      title: 'Real-time Collaboration',
      description: 'WebSocket-powered multi-user editing with live cursor tracking, conflict resolution, and team synchronization',
      gradient: 'from-green-600 to-emerald-600'
    },
    {
      icon: GitBranch,
      title: 'Framework Flexibility',
      description: 'React, Vue, Svelte, Next.js, Express, Django templates with zero-config setup and hot module reloading',
      gradient: 'from-indigo-600 to-blue-600'
    },
    {
      icon: Lock,
      title: 'Complete Data Privacy',
      description: 'Self-hosted architecture with end-to-end encryption, no vendor lock-in, and 100% data ownership',
      gradient: 'from-red-600 to-rose-600'
    }
  ];

  const testimonials = [
    {
      name: 'Alex Chen',
      role: 'Founder, TechStartup',
      text: 'NEXAR cut our development time in half. The AI suggestions are eerily accurate.',
      avatar: 'AC'
    },
    {
      name: 'Sarah Williams',
      role: 'Lead Developer, Enterprise Co',
      text: 'Finally, a development platform that respects our data privacy concerns.',
      avatar: 'SW'
    },
    {
      name: 'Marcus Johnson',
      role: 'CTO, Digital Agency',
      text: 'The collaboration features are game-changing. Our team productivity is through the roof.',
      avatar: 'MJ'
    }
  ];

  const metrics = [
    { label: 'AI Requests', value: '∞', unit: 'Unlimited' },
    { label: 'Deployment Time', value: '<30s', unit: 'Average' },
    { label: 'Uptime SLA', value: '99.9%', unit: 'Guaranteed' },
    { label: 'Data Retention', value: '100%', unit: 'Yours' }
  ];

  const pricingPlans = [
    {
      name: 'Starter',
      price: 'Free',
      description: 'Perfect for learning and side projects',
      features: ['Single project', '5GB storage', 'Community support', 'Basic deployment']
    },
    {
      name: 'Professional',
      price: '$29',
      period: '/month',
      description: 'For serious developers and small teams',
      features: ['Unlimited projects', '500GB storage', 'Priority support', 'Advanced deployment', 'Team collaboration', 'Custom domain'],
      popular: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      description: 'For large organizations and teams',
      features: ['Everything in Pro', 'Unlimited storage', 'Dedicated support', 'SSO & SAML', 'On-premise option', 'SLA guarantee']
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Animated background */}
      <canvas ref={canvasRef} className="fixed inset-0 opacity-30 pointer-events-none" />

      {/* Gradient overlays */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-blue-600/20 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-to-tr from-purple-600/20 to-transparent blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold">NEXAR</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-slate-300 hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="text-slate-300 hover:text-white transition-colors">Pricing</a>
            <a href="#" className="text-slate-300 hover:text-white transition-colors">Docs</a>
          </div>

          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-blue-600/50"
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          {/* Badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-full text-sm font-medium text-slate-300">
              <Star className="w-4 h-4 text-yellow-500" />
              Trusted by 10K+ developers worldwide
            </div>
          </div>

          {/* Main Headline */}
          <div className="text-center mb-12">
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight">
              <span className="block text-white mb-2">Build at</span>
              <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Superhuman Speed
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
              The self-hosted AI development platform designed for teams that refuse to compromise on speed, privacy, or control.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button
              onClick={() => navigate('/login')}
              className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-300 shadow-xl hover:shadow-blue-600/50 transform hover:-translate-y-1"
            >
              Start Building
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => setIsVideoOpen(true)}
              className="px-8 py-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-300"
            >
              <Play className="w-5 h-5" />
              Watch Demo
            </button>
          </div>

          {/* Hero Visual */}
          <div className="relative max-w-5xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl blur-3xl" />
            <div className="relative bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
              {/* Browser Tab */}
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-950/50 border-b border-slate-700/50">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 text-center text-xs text-slate-400">NEXAR IDE</div>
              </div>

              {/* Mock IDE */}
              <div className="grid grid-cols-12 gap-0 bg-slate-900/30 min-h-96">
                {/* Sidebar */}
                <div className="col-span-3 border-r border-slate-700/50 p-4 bg-slate-950/50">
                  <div className="space-y-2 text-xs font-mono text-slate-400">
                    <div className="flex items-center gap-2">📁 <span>src/</span></div>
                    <div className="ml-4 flex items-center gap-2">📄 <span className="text-blue-400">App.jsx</span></div>
                    <div className="ml-4 flex items-center gap-2">📄 <span>index.css</span></div>
                    <div className="flex items-center gap-2 mt-4">📦 <span>package.json</span></div>
                  </div>
                </div>

                {/* Editor */}
                <div className="col-span-6 p-4 border-r border-slate-700/50 overflow-hidden">
                  <pre className="text-xs font-mono text-slate-300 overflow-x-auto">
                    <code>{`export default function App() {
  const [count, setCount] = useState(0);
  
  return (
    <div className="container">
      <h1>AI-Powered Dev</h1>
      <button onClick={() => setCount(count+1)}>
        Count: {count}
      </button>
    </div>
  );
}`}</code>
                  </pre>
                </div>

                {/* Preview */}
                <div className="col-span-3 p-4 bg-white/5 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg mb-2" />
                  <p className="text-xs text-slate-400">Live Preview</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Section */}
      <section className="relative py-20 px-6 md:px-12 border-y border-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {metrics.map((metric, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                  {metric.value}
                </div>
                <div className="text-slate-400 text-sm mb-1">{metric.label}</div>
                <div className="text-slate-500 text-xs">{metric.unit}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-20 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black mb-4">
              Packed with <span className="text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text">Features</span>
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Everything you need to develop, deploy, and scale applications without limitations
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={i}
                  className="group relative p-8 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 hover:bg-slate-800/50 overflow-hidden"
                >
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br ${feature.gradient}`} />
                  <div className="relative z-10">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                    <p className="text-slate-400 leading-relaxed text-sm">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative py-20 px-6 md:px-12 bg-slate-800/20 border-y border-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl font-black text-center mb-16">
            Loved by <span className="text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text">Developers</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <div key={i} className="p-8 bg-slate-800/30 border border-slate-700/50 rounded-xl hover:border-slate-600/50 transition-all">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
                <p className="text-slate-300 mb-6 leading-relaxed">"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center font-bold text-sm">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{testimonial.name}</p>
                    <p className="text-slate-400 text-xs">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative py-20 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black mb-4">
              Simple, <span className="text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text">Transparent</span> Pricing
            </h2>
            <p className="text-lg text-slate-400">Choose the plan that fits your needs</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan, i) => (
              <div
                key={i}
                className={`relative p-8 rounded-xl border transition-all duration-300 ${
                  plan.popular
                    ? 'bg-slate-800/50 border-blue-500/50 ring-2 ring-blue-500/20 md:scale-105'
                    : 'bg-slate-800/20 border-slate-700/50 hover:border-slate-600/50'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full text-xs font-bold">
                    MOST POPULAR
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-slate-400 text-sm">{plan.description}</p>
                </div>

                <div className="mb-8">
                  <div className="text-4xl font-black">
                    {plan.price}
                    {plan.period && <span className="text-lg text-slate-400">{plan.period}</span>}
                  </div>
                </div>

                <button
                  className={`w-full py-3 rounded-lg font-bold mb-8 transition-all duration-300 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white'
                      : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300 border border-slate-700/50'
                  }`}
                >
                  Get Started
                </button>

                <div className="space-y-4">
                  {plan.features.map((feature, j) => (
                    <div key={j} className="flex items-start gap-3">
                      <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-20 px-6 md:px-12">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-600/30 rounded-2xl p-12 md:p-16 text-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5" />
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-black mb-6">
                Start Building Today
              </h2>
              <p className="text-lg text-slate-300 mb-8">
                Join thousands of developers who've already switched to NEXAR. No credit card required.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="group px-10 py-4 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 font-bold text-lg inline-flex items-center gap-3 transition-all duration-300 shadow-xl hover:shadow-blue-600/50 transform hover:-translate-y-1"
              >
                Launch NEXAR
                <Rocket className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-slate-800/50 py-12 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="text-lg font-bold">NEXAR</span>
              </div>
              <p className="text-slate-400 text-sm">Self-hosted AI development platform.</p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Enterprise</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Resources</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800/50 pt-12 flex flex-col md:flex-row justify-between items-center text-slate-400 text-sm">
            <div>© 2024 NEXAR. All rights reserved.</div>
            <div className="flex gap-6 mt-6 md:mt-0">
              <a href="#" className="hover:text-white transition-colors">Twitter</a>
              <a href="#" className="hover:text-white transition-colors">GitHub</a>
              <a href="#" className="hover:text-white transition-colors">Discord</a>
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
          <div className="bg-slate-900 rounded-2xl overflow-hidden max-w-3xl w-full shadow-2xl">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 aspect-video flex items-center justify-center">
              <Play className="w-16 h-16 text-white" />
            </div>
            <div className="p-6 text-center">
              <p className="text-slate-300">Demo video coming soon</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}