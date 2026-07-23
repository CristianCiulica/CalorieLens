import './style.css'

// ============================================================
// Theme Management (Light / Dark Mode)
// ============================================================

export function initTheme() {
  const toggleBtn = document.getElementById('theme-toggle');
  
  // Check stored theme or system preference
  const storedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  const initialTheme = storedTheme || (systemPrefersDark ? 'dark' : 'light');
  setTheme(initialTheme);

  toggleBtn?.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  });
}

function setTheme(theme: string) {
  const heroImg = document.getElementById('hero-phone-img') as HTMLImageElement | null;
  
  if (heroImg) {
    heroImg.classList.add('theme-transitioning');
    setTimeout(() => {
      if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        heroImg.src = '/hero-mockup-dark.jpg';
      } else {
        document.documentElement.removeAttribute('data-theme');
        heroImg.src = '/hero-mockup-light.jpg';
      }
      
      const handleLoad = () => {
        heroImg.classList.remove('theme-transitioning');
        heroImg.removeEventListener('load', handleLoad);
      };
      heroImg.addEventListener('load', handleLoad);
      setTimeout(() => heroImg.classList.remove('theme-transitioning'), 300);
    }, 150);
  } else {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  localStorage.setItem('theme', theme);
}

// Initialize theme as early as possible
initTheme();

// ============================================================
// Navbar scroll behavior
// ============================================================

const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    navbar?.classList.add('scrolled');
  } else {
    navbar?.classList.remove('scrolled');
  }
}, { passive: true });

// ============================================================
// Smooth scroll for anchor links
// ============================================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    e.preventDefault();
    const targetId = (e.currentTarget as HTMLAnchorElement).getAttribute('href');
    if (targetId && targetId !== '#') {
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });
});

// ============================================================
// Scroll-triggered reveal animations
// ============================================================

function setupScrollAnimations() {
  const elements = document.querySelectorAll('[data-scroll]');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          const delay = parseInt(el.dataset.scrollDelay || '0', 10);

          setTimeout(() => {
            el.classList.add('is-visible');
          }, delay);

          observer.unobserve(el);
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: '0px 0px -60px 0px',
    }
  );

  elements.forEach((el) => observer.observe(el));
}

// ============================================================
// Animated number counters
// ============================================================

function setupCounters() {
  const counters = document.querySelectorAll('[data-count]');

  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          const target = parseInt(el.dataset.count || '0', 10);
          animateCounter(el, target);
          counterObserver.unobserve(el);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((el) => counterObserver.observe(el));
}

function animateCounter(element: HTMLElement, target: number) {
  const duration = target > 1000 ? 2000 : 1200;
  const start = performance.now();

  function formatNumber(n: number): string {
    if (target >= 1000) {
      const k = Math.floor(n / 1000);
      const remainder = Math.floor(n % 1000);
      if (k > 0) {
        return `${k.toLocaleString()},${remainder.toString().padStart(3, '0').slice(0, 3)}`;
      }
      return n.toString();
    }
    return n.toString();
  }

  function update(now: number) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);

    const eased = 1 - Math.pow(1 - progress, 5);
    const current = Math.round(target * eased);

    element.textContent = formatNumber(current);

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = target >= 1000
        ? target.toLocaleString()
        : target.toString();
    }
  }

  requestAnimationFrame(update);
}

// ============================================================
// Waitlist form
// ============================================================

function setupWaitlistForm() {
  const form = document.getElementById('waitlist-form') as HTMLFormElement | null;
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = form.querySelector('button') as HTMLButtonElement;
    const input = form.querySelector('input') as HTMLInputElement;

    if (btn && input) {
      btn.textContent = "You're in ✓";
      btn.disabled = true;
      input.disabled = true;
      btn.style.background = '#28cd41';
      btn.style.boxShadow = '0 4px 24px rgba(40, 205, 65, 0.3)';
    }
  });
}

// ============================================================
// Parallax on hero glow (subtle mouse tracking)
// ============================================================

function setupHeroParallax() {
  const glow = document.querySelector('.hero-glow') as HTMLElement | null;
  if (!glow) return;

  window.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 30;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;
    glow.style.transform = `translateX(calc(-50% + ${x}px)) translateY(${y}px)`;
  }, { passive: true });
}

// ============================================================
// Init
// ============================================================

setupScrollAnimations();
setupCounters();
setupWaitlistForm();
setupHeroParallax();
