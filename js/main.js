document.addEventListener('DOMContentLoaded', () => {
  const header = document.getElementById('header');
  const hamburger = document.getElementById('hamburger');
  const nav = document.getElementById('nav');
  const navLinks = document.querySelectorAll('.header__nav-link');
  const fadeEls = document.querySelectorAll('.fade-in');
  const counters = document.querySelectorAll('.count');
  const hero = document.getElementById('hero');

  let countersAnimated = false;

  /* Header scroll */
  function handleScroll() {
    const scrollY = window.scrollY;
    if (scrollY > 80) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    /* Active nav link */
    const sections = document.querySelectorAll('section[id]');
    let current = '';
    sections.forEach((s) => {
      const top = s.offsetTop - 150;
      if (scrollY >= top) {
        current = s.getAttribute('id');
      }
    });
    navLinks.forEach((link) => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  }

  window.addEventListener('scroll', handleScroll, { passive: true });

  /* Hamburguer menu */
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    nav.classList.toggle('open');
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      nav.classList.remove('open');
    });
  });

  closeNavOnClickOutside(nav, hamburger);

  function closeNavOnClickOutside(navEl, hamburgerEl) {
    document.addEventListener('click', (e) => {
      if (
        navEl.classList.contains('open') &&
        !navEl.contains(e.target) &&
        !hamburgerEl.contains(e.target)
      ) {
        navEl.classList.remove('open');
        hamburgerEl.classList.remove('active');
      }
    });
  }

  /* Fade-in on scroll */
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const delay = entry.target.dataset.delay || 0;
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, Number(delay));
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
  );

  fadeEls.forEach((el) => observer.observe(el));

  /* Counter animation */
  function animateCounters() {
    counters.forEach((counter) => {
      const target = Number(counter.dataset.target);
      const duration = 2000;
      const step = Math.max(1, Math.floor(target / 60));
      let current = 0;

      function update() {
        current += step;
        if (current >= target) {
          counter.textContent = target.toLocaleString('pt-BR');
          return;
        }
        counter.textContent = current.toLocaleString('pt-BR');
        requestAnimationFrame(update);
      }

      update();
    });
    countersAnimated = true;
  }

  const numerosSection = document.getElementById('numeros');
  const numerosObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !countersAnimated) {
          animateCounters();
          numerosObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  if (numerosSection) {
    numerosObserver.observe(numerosSection);
  }

  /* Smooth scroll for anchor links */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
});