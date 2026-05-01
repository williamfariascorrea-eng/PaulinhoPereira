/* ---- Tela de carregamento ---- */
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('loader').classList.add('escondido');
  }, 1800);
});

/* ---- Barra de progresso ---- */
const barraProgresso = document.getElementById('progresso-leitura');
window.addEventListener('scroll', () => {
  const rolagem = window.scrollY;
  const alturaDoc = document.documentElement.scrollHeight - window.innerHeight;
  const porcento = alturaDoc > 0 ? (rolagem / alturaDoc) * 100 : 0;
  barraProgresso.style.width = porcento + '%';
}, { passive: true });

/* ---- Contador animado ---- */
function animarContador(elemento) {
  const alvo = parseInt(elemento.getAttribute('data-count'), 10);
  const sufixo = elemento.getAttribute('data-suffix') || '';
  const velocidade = parseInt(elemento.getAttribute('data-speed'), 10) || 1200;
  const inicio = 0;
  const duracao = velocidade;
  const tempoInicio = performance.now();

  function atualizar(tempoAtual) {
    const passado = tempoAtual - tempoInicio;
    const progresso = Math.min(passado / duracao, 1);
    const suavizado = 1 - Math.pow(1 - progresso, 3);
    const valor = Math.floor(inicio + (alvo - inicio) * suavizado);
    elemento.textContent = valor + sufixo;
    if (progresso < 1) requestAnimationFrame(atualizar);
  }
  requestAnimationFrame(atualizar);
}

const observadorStats = new IntersectionObserver((entradas) => {
  entradas.forEach(entrada => {
    if (entrada.isIntersecting) {
      animarContador(entrada.target);
      observadorStats.unobserve(entrada.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.hero-stat-num[data-count]').forEach(el => observadorStats.observe(el));

/* ---- Efeito parallax na foto ---- */
const fotoHero = document.querySelector('.hero-foto');
if (fotoHero) {
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y < window.innerHeight) {
      fotoHero.style.transform = 'translateY(' + (y * 0.12) + 'px)';
    }
  }, { passive: true });
}

/* ---- Menu sanduíche ---- */
const botaoMenu = document.getElementById('hamburger');
const linksNav = document.getElementById('nav-links');

botaoMenu.addEventListener('click', () => {
  linksNav.classList.toggle('aberto');
});

document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => linksNav.classList.remove('aberto'));
});

/* ---- Aparecer ao rolar ---- */
const observadorAparecer = new IntersectionObserver((entradas) => {
  entradas.forEach(entrada => {
    if (entrada.isIntersecting) {
      entrada.target.classList.add('visible');
      observadorAparecer.unobserve(entrada.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => observadorAparecer.observe(el));

/* ---- Formulário de apoio ---- */
const formulario = document.getElementById('form-apoio');
const msgForm = document.getElementById('form-msg');

formulario.addEventListener('submit', (e) => {
  e.preventDefault();

  const nome = document.getElementById('nome').value.trim();
  const cidade = document.getElementById('cidade').value.trim();
  const telefone = document.getElementById('telefone').value.trim();

  if (!nome || !cidade || !telefone) {
    alert('Preencha os campos obrigatórios: Nome, Cidade e Telefone.');
    return;
  }

  msgForm.style.display = 'block';
  formulario.reset();
  setTimeout(() => { msgForm.style.display = 'none'; }, 7000);
});

/* ---- Destacar link ativo no menu ---- */
const secoes = document.querySelectorAll('section[id], div[id]');
const itensNav = document.querySelectorAll('.nav-links a[href^="#"]');

const observadorNav = new IntersectionObserver((entradas) => {
  entradas.forEach(entrada => {
    if (entrada.isIntersecting) {
      const id = entrada.target.getAttribute('id');
      itensNav.forEach(item => {
        item.style.color = '';
        item.style.fontWeight = '';
        if (item.getAttribute('href') === `#${id}`) {
          item.style.color = 'var(--azul)';
          item.style.fontWeight = '700';
        }
      });
    }
  });
}, { threshold: 0.4 });

secoes.forEach(secao => observadorNav.observe(secao));