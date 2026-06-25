// ProviderRateMonitor — tracks per-provider API usage & auto-switches at 80%

const PROVIDER_LIMITS = {
  openrouter:{ daily: 50,  rpm: 20, name: 'OpenRouter (free tier)' },
  ollama:    { daily: Infinity, rpm: Infinity, name: 'Ollama (local)' }
};

// Fallback chain: try OpenRouter → Ollama
const FALLBACK_CHAIN = ['ollama'];

class ProviderRateMonitor {
  constructor() {
    this.counts = {};
    this.lastMinute = {};
    this.notified = {};
    this.listeners = [];
    this.fallbackOverrides = {};
  }

  getLimits(provider) {
    return PROVIDER_LIMITS[provider] || PROVIDER_LIMITS.ollama;
  }

  recordCall(provider) {
    const now = Date.now();
    const today = new Date().toDateString();

    // Daily count
    if (!this.counts[provider]) this.counts[provider] = {};
    if (!this.counts[provider][today]) this.counts[provider][today] = 0;
    this.counts[provider][today]++;

    // Rolling minute for RPM
    if (!this.lastMinute[provider]) this.lastMinute[provider] = [];
    this.lastMinute[provider].push(now);
    this.lastMinute[provider] = this.lastMinute[provider].filter(t => now - t < 60000);

    this._checkMilestones(provider);
  }

  recordRateLimit(provider) {
    const today = new Date().toDateString();
    // Count as if all daily limit used to force immediate fallback
    if (!this.counts[provider]) this.counts[provider] = {};
    this.counts[provider][today] = (this.counts[provider][today] || 0) + 100;
    this._checkMilestones(provider);
  }

  getDailyUsage(provider) {
    const today = new Date().toDateString();
    return this.counts[provider]?.[today] || 0;
  }

  getDailyPercent(provider) {
    const limits = this.getLimits(provider);
    if (limits.daily === Infinity) return 0;
    return (this.getDailyUsage(provider) / limits.daily) * 100;
  }

  getCurrentRPM(provider) {
    const now = Date.now();
    const window = this.lastMinute[provider] || [];
    return window.filter(t => now - t < 60000).length;
  }

  isOverDailyLimit(provider) {
    return this.getDailyUsage(provider) >= this.getLimits(provider).daily;
  }

  isOverRPM(provider) {
    return this.getCurrentRPM(provider) >= this.getLimits(provider).rpm;
  }

  isOverLimit(provider) {
    return this.isOverDailyLimit(provider) || this.isOverRPM(provider);
  }

  // Returns effective provider & model config based on usage
  getEffectiveProvider(desiredProvider) {
    if (desiredProvider === 'ollama') return { provider: 'ollama', fallback: false };

    const pct = this.getDailyPercent(desiredProvider);

    if (pct >= 80 || this.isOverLimit(desiredProvider)) {
      // Try fallback chain
      for (const fallback of FALLBACK_CHAIN) {
        const limits = this.getLimits(fallback);
        if (fallback === 'ollama') return { provider: 'ollama', fallback: true };
        if (limits.daily === Infinity) continue;
        const fbPct = this.getDailyPercent(fallback);
        if (fbPct < 80 && !this.isOverLimit(fallback)) {
          return { provider: fallback, fallback: true };
        }
      }
      return { provider: 'ollama', fallback: true };
    }

    return { provider: desiredProvider, fallback: false };
  }

  onMilacheck(fn) {
    this.listeners.push(fn);
  }

  _checkMilestones(provider) {
    const pct = this.getDailyPercent(provider);
    const milestones = [50, 80, 95, 100];
    for (const m of milestones) {
      if (pct >= m && !this.notified[`${provider}:${m}`]) {
        this.notified[`${provider}:${m}`] = true;
        for (const fn of this.listeners) {
          fn({ provider, percent: Math.round(pct), milestone: m });
        }
      }
    }
  }

  resetDaily() {
    const today = new Date().toDateString();
    for (const provider of Object.keys(this.counts)) {
      delete this.counts[provider][today];
    }
    this.notified = {};
  }

  // Manually set a fallback override (e.g. user picks a different backup)
  setFallbackOverride(provider, fallback) {
    if (fallback) {
      this.fallbackOverrides[provider] = fallback;
    } else {
      delete this.fallbackOverrides[provider];
    }
  }
}

export const rateMonitor = new ProviderRateMonitor();

// Auto-reset daily counts at midnight
const msToMidnight = () => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);
  return midnight.getTime() - now.getTime();
};
setTimeout(() => {
  rateMonitor.resetDaily();
  setInterval(() => rateMonitor.resetDaily(), 86400000);
}, msToMidnight());

export default ProviderRateMonitor;
