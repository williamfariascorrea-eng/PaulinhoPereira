/* ============================================
    PAULINHO PEREIRA - VEREADOR SÃO LOURENÇO DO SUL
    JavaScript Interativo
    ============================================ */

document.addEventListener('DOMContentLoaded', function() {

    // ============================================
    // PROTEÇÃO TOTAL DO SITE
    // ============================================
    
    // Bloquear menu de contexto (botão direito)
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });

    // Bloquear atalhos de cópia
    document.addEventListener('keydown', function(e) {
        // Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+U, Ctrl+S, F12, Ctrl+Shift+I
        if ((e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'u' || e.key === 's')) ||
            e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && e.key === 'I')) {
            e.preventDefault();
            return false;
        }
    });

    // Bloquear drag and drop de imagens
    document.addEventListener('dragstart', function(e) {
        e.preventDefault();
        return false;
    });

    // Detectar DevTools (opcional - discret)
    let devtoolsOpen = false;
    setInterval(function() {
        if (window.outerHeight - window.innerHeight > 200 || window.outerWidth - window.innerWidth > 200) {
            if (!devtoolsOpen) {
                devtoolsOpen = true;
                console.clear();
                console.log('%cPROTEÇÃO ATIVA', 'color: red; font-size: 50px; font-weight: bold;');
                console.log('%cInspeção desencorajada', 'color: orange; font-size: 20px;');
            }
        }
    }, 1000);

    // ============================================
    // EFEITO SCROLL NAVBAR
    // ============================================
    const navbar = document.getElementById('navbar');

    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // ============================================
    // MENU MOBILE
    // ============================================
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');

    navToggle.addEventListener('click', function() {
        navMenu.classList.toggle('active');

        // Animate hamburger
        const spans = navToggle.querySelectorAll('span');
        if (navMenu.classList.contains('active')) {
            spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
        } else {
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        }
    });

    // Close menu on link click
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            const spans = navToggle.querySelectorAll('span');
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        });
    });

    // ============================================
    // LINK ATIVO AO ROLAR
    // ============================================
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', function() {
        let current = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.offsetHeight;

            if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
            }
        });
    });

    // ============================================
    // ANIMAÇÃO PARTÍCULAS
    // ============================================
    const particlesContainer = document.getElementById('particles');

    function createParticles() {
        const particleCount = 30;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');

            // Random position
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';

            // Random size
            const size = Math.random() * 4 + 2;
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';

            // Random animation duration and delay
            particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
            particle.style.animationDelay = (Math.random() * 5) + 's';

            particlesContainer.appendChild(particle);
        }
    }

    createParticles();

    // ============================================
    // CONTADORES ANIMADOS
    // ============================================
    const statNumbers = document.querySelectorAll('.stat-box .stat-number[data-count]');
    let countersAnimated = false;

    function animateCounters() {
        if (countersAnimated) return;

        const statsSection = document.querySelector('.stats-section');
        const rect = statsSection.getBoundingClientRect();

        if (rect.top < window.innerHeight && rect.bottom > 0) {
            countersAnimated = true;

            statNumbers.forEach(stat => {
                const target = parseInt(stat.getAttribute('data-count'));
                const duration = 2000;
                const start = performance.now();

                function updateCounter(currentTime) {
                    const elapsed = currentTime - start;
                    const progress = Math.min(elapsed / duration, 1);

                    // Easing function
                    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
                    const current = Math.floor(easeOutQuart * target);

                    stat.textContent = current.toLocaleString('pt-BR');

                    if (progress < 1) {
                        requestAnimationFrame(updateCounter);
                    } else {
                        stat.textContent = target.toLocaleString('pt-BR');
                    }
                }

                requestAnimationFrame(updateCounter);
            });
        }
    }

    window.addEventListener('scroll', animateCounters);
    animateCounters(); // Check on load

    // ============================================
    // REVEAL AO ROLAR
    // ============================================
    const revealElements = document.querySelectorAll('.about-card, .project-card, .timeline-item, .info-card');

    function revealOnScroll() {
        revealElements.forEach(element => {
            const rect = element.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight - 100;

            if (isVisible) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    }

    // Set initial state
    revealElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });

    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll(); // Check on load

    // ============================================
    // BOTÕES VOLTAR AO TOPO / DESCER
    // ============================================
    const backToTop = document.getElementById('backToTop');
    const scrollDown = document.getElementById('scrollDown');

    window.addEventListener('scroll', function() {
        if (window.scrollY > 500) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
        
        // Esconder botão descer após rolagem
        if (window.scrollY > 300) {
            if (scrollDown) scrollDown.style.opacity = '0';
        } else {
            if (scrollDown) scrollDown.style.opacity = '1';
        }
    });

    if (backToTop) {
        backToTop.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    if (scrollDown) {
        scrollDown.addEventListener('click', function() {
            const contato = document.getElementById('contato');
            if (contato) {
                contato.scrollIntoView({
                    behavior: 'smooth',
                    block: 'end'
                });
            }
        });
    }

    // ============================================
    // FORMULÁRIO CONTATO
    // ============================================
    const contactForm = document.getElementById('contactForm');

    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const btn = contactForm.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;

        btn.innerHTML = '<span>Enviando...</span><i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;

        // Simulate form submission
        setTimeout(() => {
            btn.innerHTML = '<span>Mensagem Enviada!</span><i class="fas fa-check"></i>';
            btn.style.background = 'var(--primary-light)';

            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
                btn.disabled = false;
                contactForm.reset();
            }, 2000);
        }, 1500);
    });

    // ============================================
    // ROLAGEM SUAVE
    // ============================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));

            if (target) {
                const offset = 80;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // ============================================
    // PARALLAX NO HERO
    // ============================================
    const hero = document.querySelector('.hero');

    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const heroHeight = hero.offsetHeight;

        if (scrolled < heroHeight) {
            const parallax = scrolled * 0.5;
            hero.style.backgroundPositionY = parallax + 'px';
        }
    });

    // ============================================
    // EFEITO DIGITAÇÃO SUBTÍTULO HERO
    // ============================================
    const heroSubtitle = document.querySelector('.hero-subtitle');
    const subtitleText = heroSubtitle.textContent;
    heroSubtitle.textContent = '';

    let charIndex = 0;
    function typeWriter() {
        if (charIndex < subtitleText.length) {
            heroSubtitle.textContent += subtitleText.charAt(charIndex);
            charIndex++;
            setTimeout(typeWriter, 50);
        }
    }

    setTimeout(typeWriter, 1000);

    // ============================================
    // ANIMAÇÃO BARRAS PROGRESSO
    // ============================================
    const progressBars = document.querySelectorAll('.progress-fill');
    let progressAnimated = false;

    function animateProgressBars() {
        if (progressAnimated) return;

        const aboutSection = document.querySelector('.about');
        const rect = aboutSection.getBoundingClientRect();

        if (rect.top < window.innerHeight && rect.bottom > 0) {
            progressAnimated = true;

            progressBars.forEach(bar => {
                const width = bar.style.width;
                bar.style.width = '0%';

                setTimeout(() => {
                    bar.style.width = width;
                }, 200);
            });
        }
    }

    window.addEventListener('scroll', animateProgressBars);

    // ============================================
    // EFEITO BRILHO CURSOR
    // ============================================
    const cursorGlow = document.createElement('div');
    cursorGlow.style.cssText = `
        position: fixed;
        width: 300px;
        height: 300px;
        background: radial-gradient(circle, rgba(26, 95, 42, 0.08) 0%, transparent 70%);
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999;
        transform: translate(-50%, -50%);
        transition: opacity 0.3s ease;
    `;
    document.body.appendChild(cursorGlow);

    let mouseX = 0, mouseY = 0;
    let glowX = 0, glowY = 0;

    document.addEventListener('mousemove', function(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function updateGlow() {
        glowX += (mouseX - glowX) * 0.1;
        glowY += (mouseY - glowY) * 0.1;

        cursorGlow.style.left = glowX + 'px';
        cursorGlow.style.top = glowY + 'px';

        requestAnimationFrame(updateGlow);
    }

    // Only on desktop
    if (window.innerWidth > 768) {
        updateGlow();
    } else {
        cursorGlow.style.display = 'none';
    }

    // ============================================
    // ROLAGEM SUAVE SUMÁRIO WIKI
    // ============================================
    document.querySelectorAll('.article-toc a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const target = document.querySelector(targetId);

            if (target) {
                const offset = 100;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // ============================================
    // OBSERVADOR DE INTERSECÇÃO
    // ============================================
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.timeline-item, .project-card, .about-card').forEach(el => {
        observer.observe(el);
    });

    // ============================================
    // PAUSAR VÍDEO AO ROLAR
    // ============================================
    const videoIframe = document.querySelector('.video-embed iframe');
    
    if (videoIframe) {
        const videoObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) {
                    // Pause video when scrolled out of view
                    videoIframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                    // Facebook specific pause command
                    videoIframe.contentWindow.postMessage(JSON.stringify({type: 'pause'}), '*');
                }
            });
        }, { 
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        });
        
        videoObserver.observe(videoIframe);
    }

    console.log('🚀 Site Paulinho Pereira carregado com sucesso!');
    console.log('Vereador São Lourenço do Sul - Servindo desde 2012');
});
