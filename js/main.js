document.addEventListener('DOMContentLoaded', () => {
  const header = document.getElementById('header');
  const hamburger = document.getElementById('hamburger');
  const nav = document.getElementById('nav');
  const navLinks = document.querySelectorAll('.header__nav-link');
  const revealEls = document.querySelectorAll('.reveal');
  const heroCounters = document.querySelectorAll('.hero__stat-number');
  const sectionCounters = document.querySelectorAll('.numero-card__number');
  const scrollProgress = document.getElementById('scrollProgress');
  const backToTop = document.getElementById('backToTop');

  let heroCounted = false;
  let sectionCounted = false;

  /* ── Scroll handler ── */
  function handleScroll() {
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = (scrollY / docHeight) * 100;

    scrollProgress.style.width = Math.min(progress, 100) + '%';

    if (scrollY > 80) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    backToTop.classList.toggle('visible', scrollY > 600);

    updateActiveNav(scrollY);
  }

  function updateActiveNav(scrollY) {
    const sections = document.querySelectorAll('section[id]');
    let current = '';
    sections.forEach((s) => {
      const top = s.offsetTop - 180;
      if (scrollY >= top) {
        current = s.getAttribute('id');
      }
    });
    navLinks.forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
    });
  }

  window.addEventListener('scroll', handleScroll, { passive: true });

  /* ── Mobile menu ── */
  hamburger.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    hamburger.classList.toggle('active');
    hamburger.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('click', (e) => {
    if (nav.classList.contains('open') && !nav.contains(e.target) && !hamburger.contains(e.target)) {
      closeMenu();
    }
  });

  function closeMenu() {
    nav.classList.remove('open');
    hamburger.classList.remove('active');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  /* ── Reveal on scroll ── */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const delay = parseInt(entry.target.dataset.delay) || 0;
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, delay);
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  revealEls.forEach((el) => revealObserver.observe(el));

  /* ── Counter animation ── */
  function animateCounter(el, target, duration) {
    const step = Math.max(1, Math.floor(target / 60));
    let current = 0;

    function update() {
      current += step;
      if (current >= target) {
        el.textContent = target.toLocaleString('pt-BR');
        return;
      }
      el.textContent = current.toLocaleString('pt-BR');
      requestAnimationFrame(update);
    }

    update();
  }

  /* Hero counters (animate on load) */
  setTimeout(() => {
    heroCounters.forEach((el) => {
      const target = parseInt(el.dataset.count);
      if (target) animateCounter(el, target, 1500);
    });
    heroCounted = true;
  }, 800);

  /* Section counters on scroll */
  const numerosSection = document.getElementById('numeros');
  if (numerosSection) {
    const numerosObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !sectionCounted) {
            sectionCounters.forEach((el) => {
              const target = parseInt(el.dataset.target);
              if (target) animateCounter(el, target, 2000);
            });
            sectionCounted = true;
            numerosObs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    numerosObs.observe(numerosSection);
  }

  /* ── Smooth scroll for anchor links ── */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ── Newsletter form ── */
  const form = document.getElementById('newsletterForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const original = btn.textContent;
      btn.textContent = 'Recebido! Obrigado :)';
      btn.style.background = '#25d366';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = original;
        btn.style.background = '';
        btn.disabled = false;
        form.reset();
      }, 3000);
    });
  }

  /* ── Back to top ── */
  backToTop.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ── Parallax subtle hero movement ── */
  const hero = document.getElementById('hero');
  window.addEventListener('mousemove', (e) => {
    if (window.innerWidth < 768) return;
    const x = (e.clientX / window.innerWidth - 0.5) * 6;
    const y = (e.clientY / window.innerHeight - 0.5) * 6;
    hero.style.setProperty('--mouse-x', x + 'px');
    hero.style.setProperty('--mouse-y', y + 'px');
  });

  handleScroll();
});