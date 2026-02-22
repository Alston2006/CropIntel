/* ===== CropIntel — Cinematic Interactions ===== */

document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initScrollReveal();
  initParallax();
  initNavScroll();
  initMobileNav();
  initPageTransitions();
});

/* --- Particles --- */
function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];
  const PARTICLE_COUNT = 60;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createParticle() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 0.5,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: (Math.random() - 0.5) * 0.2 - 0.1,
      opacity: Math.random() * 0.3 + 0.05,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.01 + 0.005
    };
  }

  function init() {
    resize();
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(createParticle());
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.speedX;
      p.y += p.speedY;
      p.pulse += p.pulseSpeed;
      const opacity = p.opacity * (0.5 + 0.5 * Math.sin(p.pulse));

      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(128, 209, 135, ${opacity})`;
      ctx.fill();
    });
    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', resize);
  init();
  animate();
}

/* --- Scroll Reveal --- */
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  if (!reveals.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -60px 0px'
  });

  reveals.forEach(el => observer.observe(el));
}

/* --- Parallax --- */
function initParallax() {
  const parallaxElements = document.querySelectorAll('[data-parallax]');
  if (!parallaxElements.length) return;

  let ticking = false;

  function updateParallax() {
    const scrollY = window.pageYOffset;
    parallaxElements.forEach(el => {
      const speed = parseFloat(el.dataset.parallax) || 0.1;
      const rect = el.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      const offset = (centerY - window.innerHeight / 2) * speed;
      el.style.transform = `translateY(${offset}px)`;
    });
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  });
}

/* --- Nav Scroll --- */
function initNavScroll() {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 80) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });
}

/* --- Mobile Nav --- */
function initMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    links.classList.toggle('open');
    toggle.classList.toggle('active');
  });

  links.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.classList.remove('active');
    });
  });
}

/* --- Page Transitions --- */
function initPageTransitions() {
  const overlay = document.querySelector('.page-transition');
  if (!overlay) return;

  // Fade in on load
  overlay.classList.remove('active');

  document.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return;

    link.addEventListener('click', (e) => {
      e.preventDefault();
      overlay.classList.add('active');
      setTimeout(() => {
        window.location.href = href;
      }, 400);
    });
  });
}

/* --- Cinematic SVG Placeholder Generation --- */
function generateCinematicPlaceholder(width, height, label, variant) {
  const v = variant || 0;
  const hues = [135, 140, 128, 145, 132, 138, 142, 130, 136];
  const h = hues[v % hues.length];

  // Create unique patterns per variant
  const patterns = [
    // Grid pattern
    `<pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(128,209,135,0.04)" stroke-width="0.5"/></pattern>`,
    // Dots pattern
    `<pattern id="p" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="15" cy="15" r="1" fill="rgba(128,209,135,0.06)"/></pattern>`,
    // Circuit pattern  
    `<pattern id="p" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 0 30 L 20 30 L 30 20 L 40 20" fill="none" stroke="rgba(128,209,135,0.04)" stroke-width="0.5"/><circle cx="40" cy="20" r="2" fill="rgba(128,209,135,0.05)"/></pattern>`,
    // Diagonal lines
    `<pattern id="p" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 0 20 L 20 0" fill="none" stroke="rgba(128,209,135,0.03)" stroke-width="0.5"/></pattern>`,
    // Hexagonal hints
    `<pattern id="p" width="50" height="43.3" patternUnits="userSpaceOnUse"><path d="M 25 0 L 50 14.4 L 50 28.8 L 25 43.3 L 0 28.8 L 0 14.4 Z" fill="none" stroke="rgba(128,209,135,0.03)" stroke-width="0.5"/></pattern>`
  ];

  const pattern = patterns[v % patterns.length];
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) * 0.4;

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>
    <defs>
      <linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'>
        <stop offset='0%' stop-color='hsl(${h},20%,6%)'/>
        <stop offset='40%' stop-color='hsl(${h},18%,10%)'/>
        <stop offset='100%' stop-color='hsl(${h},12%,5%)'/>
      </linearGradient>
      <radialGradient id='rg' cx='50%' cy='40%' r='60%'>
        <stop offset='0%' stop-color='rgba(128,209,135,0.06)'/>
        <stop offset='100%' stop-color='transparent'/>
      </radialGradient>
      ${pattern}
    </defs>
    <rect width='${width}' height='${height}' fill='url(#g)'/>
    <rect width='${width}' height='${height}' fill='url(#p)'/>
    <rect width='${width}' height='${height}' fill='url(#rg)'/>
    <circle cx='${cx}' cy='${cy * 0.7}' r='${r * 0.15}' fill='none' stroke='rgba(128,209,135,0.08)' stroke-width='1'/>
    <circle cx='${cx}' cy='${cy * 0.7}' r='${r * 0.3}' fill='none' stroke='rgba(128,209,135,0.04)' stroke-width='0.5'/>
    <line x1='${cx - 30}' y1='${cy * 0.7}' x2='${cx + 30}' y2='${cy * 0.7}' stroke='rgba(128,209,135,0.06)' stroke-width='0.5'/>
    <line x1='${cx}' y1='${cy * 0.7 - 30}' x2='${cx}' y2='${cy * 0.7 + 30}' stroke='rgba(128,209,135,0.06)' stroke-width='0.5'/>
    <text x='50%' y='75%' dominant-baseline='middle' text-anchor='middle' font-family='monospace' font-size='11' fill='rgba(128,209,135,0.15)' letter-spacing='4'>${label.toUpperCase()}</text>
    <text x='50%' y='81%' dominant-baseline='middle' text-anchor='middle' font-family='monospace' font-size='8' fill='rgba(128,209,135,0.08)' letter-spacing='2'>CROPINTEL</text>
  </svg>`;

  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

// Proactively replace all images with cinematic placeholders
(function () {
  const imageLabels = {
    'hero.png': 'AERIAL INTELLIGENCE',
    'dashboard.png': 'COMMAND CENTER',
    'field.png': 'FIELD RECONNAISSANCE',
    'image.png': 'WEATHER CORE',
    'images.png': 'MARKET ENGINE',
    'crop.png': 'CROP ADVISORY',
    'ai.png': 'AI NEURAL CORE',
    'rag.png': 'RAG PIPELINE',
    'farmer.png': 'FIELD OPERATIVE'
  };

  function resolveLabel(src) {
    for (const [file, label] of Object.entries(imageLabels)) {
      if (src && src.includes(file)) return label;
    }
    return 'CLASSIFIED';
  }

  function resolveVariant(src) {
    let hash = 0;
    const s = src || '';
    for (let i = 0; i < s.length; i++) {
      hash = ((hash << 5) - hash) + s.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  // Run immediately for images already in DOM
  document.querySelectorAll('img').forEach(img => {
    const origSrc = img.getAttribute('src') || '';
    const label = resolveLabel(origSrc);
    const variant = resolveVariant(origSrc);
    // Set error handler first
    img.onerror = function () {
      this.onerror = null;
      this.src = generateCinematicPlaceholder(800, 800, label, variant);
    };
    // If image already broken, fix it
    if (img.complete && img.naturalWidth === 0) {
      img.src = generateCinematicPlaceholder(800, 800, label, variant);
    }
  });

  // Also observe DOM for dynamically added images
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('img').forEach(img => {
      if (img.complete && img.naturalWidth === 0) {
        const origSrc = img.getAttribute('src') || img.dataset.origSrc || '';
        const label = resolveLabel(origSrc);
        const variant = resolveVariant(origSrc);
        img.src = generateCinematicPlaceholder(800, 800, label, variant);
      }
    });
  });
})();
