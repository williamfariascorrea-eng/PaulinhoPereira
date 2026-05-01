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

/* ---- Formulário de apoio (envia via WhatsApp) ---- */
const formulario = document.getElementById('form-apoio');
const msgForm = document.getElementById('form-msg');

formulario.addEventListener('submit', (e) => {
  e.preventDefault();

  const nome = document.getElementById('nome').value.trim();
  const cidade = document.getElementById('cidade').value.trim();
  const telefone = document.getElementById('telefone').value.trim();
  const email = document.getElementById('email').value.trim();
  const como = document.getElementById('como').value;
  const mensagem = document.getElementById('mensagem').value.trim();

  if (!nome || !cidade || !telefone) {
    alert('Preencha os campos obrigatórios: Nome, Cidade e Telefone.');
    return;
  }

  // Monta mensagem para WhatsApp
  let texto = `*Novo apoio via site!*%0A`;
  texto += `👤 *Nome:* ${nome}%0A`;
  texto += `📍 *Cidade:* ${cidade}%0A`;
  texto += `📞 *Telefone:* ${telefone}%0A`;
  if (email) texto += `📧 *E-mail:* ${email}%0A`;
  if (como) texto += `🤝 *Como quer ajudar:* ${como}%0A`;
  if (mensagem) texto += `💬 *Mensagem:* ${mensagem}%0A`;

  // Abre WhatsApp com a mensagem
  window.open(`https://wa.me/5553999999999?text=${texto}`, '_blank');

  msgForm.style.display = 'block';
  formulario.reset();
  setTimeout(() => { msgForm.style.display = 'none'; }, 7000);
});

/* ---- Destacar link ativo no menu (com classe CSS) ---- */
const secoes = document.querySelectorAll('section[id]');
const itensNav = document.querySelectorAll('.nav-links a[href^="#"]');

const observadorNav = new IntersectionObserver((entradas) => {
  entradas.forEach(entrada => {
    if (entrada.isIntersecting) {
      const id = entrada.target.getAttribute('id');
      itensNav.forEach(item => {
        item.classList.remove('nav-ativo');
        if (item.getAttribute('href') === `#${id}`) {
          item.classList.add('nav-ativo');
        }
      });
    }
  });
}, { threshold: 0.4 });

secoes.forEach(secao => observadorNav.observe(secao));

/* ---- Botão voltar ao topo ---- */
const btnTopo = document.getElementById('btn-topo');

window.addEventListener('scroll', () => {
  if (window.scrollY > 500) {
    btnTopo.classList.add('visivel');
  } else {
    btnTopo.classList.remove('visivel');
  }
}, { passive: true });

btnTopo.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ---- Lightbox (galeria) ---- */
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxLegenda = document.getElementById('lightbox-legenda');
const lightboxFechar = document.getElementById('lightbox-fechar');

document.querySelectorAll('.galeria-item').forEach(item => {
  item.addEventListener('click', () => {
    const img = item.querySelector('img');
    const legenda = item.querySelector('.galeria-legenda');
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightboxLegenda.textContent = legenda ? legenda.textContent : '';
    lightbox.classList.add('ativo');
    document.body.style.overflow = 'hidden';
  });
});

function fecharLightbox() {
  lightbox.classList.remove('ativo');
  document.body.style.overflow = '';
}

lightboxFechar.addEventListener('click', fecharLightbox);
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) fecharLightbox();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && lightbox.classList.contains('ativo')) fecharLightbox();
});

/* ---- Contagem regressiva para as eleições ---- */
// Eleições 2026 - 1º turno: 4 de outubro de 2026
const dataEleicao = new Date('2026-10-04T08:00:00-03:00');

function atualizarCountdown() {
  const agora = new Date();
  const diff = dataEleicao - agora;

  if (diff <= 0) {
    document.getElementById('cd-dias').textContent = '0';
    document.getElementById('cd-horas').textContent = '0';
    document.getElementById('cd-min').textContent = '0';
    document.getElementById('cd-seg').textContent = '0';
    return;
  }

  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const min = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seg = Math.floor((diff % (1000 * 60)) / 1000);

  document.getElementById('cd-dias').textContent = dias;
  document.getElementById('cd-horas').textContent = String(horas).padStart(2, '0');
  document.getElementById('cd-min').textContent = String(min).padStart(2, '0');
  document.getElementById('cd-seg').textContent = String(seg).padStart(2, '0');
}

atualizarCountdown();
setInterval(atualizarCountdown, 1000);