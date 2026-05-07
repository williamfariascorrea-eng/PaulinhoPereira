const API_URL = '/api';
let token = localStorage.getItem('crm_token');
let currentView = 'dashboard';
let currentDemandaId = null;
let currentPage = 1;
const itemsPerPage = 20;

function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast ' + type;
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  const currentToken = options.skipAuth ? null : (token || localStorage.getItem('crm_token'));
  if (currentToken) {
    headers['Authorization'] = `Bearer ${currentToken}`;
  }
  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  if (response.status === 401) {
    logout();
    throw new Error('Unauthorized');
  }
  return response.json();
}

async function login(username, password) {
  const data = await apiRequest('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    skipAuth: true,
  });
  token = data.token;
  localStorage.setItem('crm_token', token);
  return data;
}

function logout() {
  token = null;
  localStorage.removeItem('crm_token');
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}

async function loadDashboard() {
  const stats = await apiRequest('/dashboard/stats');
  document.getElementById('stat-total').textContent = stats.total;
  document.getElementById('stat-pendentes').textContent = stats.pendentes;
  document.getElementById('stat-andamento').textContent = stats.andamento;
  document.getElementById('stat-resolvidos').textContent = stats.resolvidos;
}

async function loadDemandas(filters = {}) {
  const params = new URLSearchParams(filters);
  const demandas = await apiRequest(`/demandas?${params}`);
  renderDemandasList(demandas, 'demandas-list');
}

async function loadArquivadas(filters = {}) {
  const params = new URLSearchParams({ ...filters, arquivado: 'true' });
  const demandas = await apiRequest(`/demandas?${params}`);
  renderDemandasList(demandas, 'arquivadas-list');
}

function renderDemandasList(demandas, containerId) {
  const container = document.getElementById(containerId);
  if (demandas.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📭</div>
        <p>Nenhuma demanda encontrada</p>
      </div>
    `;
    return;
  }
  container.innerHTML = demandas
    .map(
      (d) => `
      <div class="demanda-card status-${d.status}" data-id="${d.id}">
        <div class="demanda-header">
          <div class="demanda-nome">${d.nome}</div>
          <div class="demanda-status">${d.status === 'novo' ? '🟡 Novo' : d.status === 'atendimento' ? '🔵 Em Atendimento' : '🟢 Resolvido'}</div>
        </div>
        <div class="demanda-row">
          <span>📍 ${d.bairro || 'Não informado'}</span>
          <span>📞 ${d.contato}</span>
          <span>📅 ${formatDate(d.created_at)}</span>
        </div>
        <div class="demanda-mensagem">${d.mensagem}</div>
      </div>
    `
    )
    .join('');
  container.querySelectorAll('.demanda-card').forEach((card) => {
    card.addEventListener('click', () => openDemandaDetail(card.dataset.id));
  });
}

async function loadBairros() {
  const bairros = await apiRequest('/bairros');
  const select = document.getElementById('filter-bairro');
  select.innerHTML = '<option value="">Todos</option>' + bairros.map((b) => `<option value="${b}">${b}</option>`).join('');
}

function openDemandaDetail(id) {
  currentDemandaId = id;
  apiRequest(`/demandas/${id}`).then((d) => {
    document.getElementById('detail-id').textContent = d.id;
    document.getElementById('detail-nome').textContent = d.nome;
    document.getElementById('detail-bairro').textContent = d.bairro || 'Não informado';
    document.getElementById('detail-contato').textContent = d.contato;
    document.getElementById('detail-tipo').textContent = d.tipo || 'Não informado';
    document.getElementById('detail-data').textContent = formatDate(d.created_at);
    document.getElementById('detail-mensagem-text').textContent = d.mensagem;
    document.getElementById('detail-status').value = d.status;
    document.getElementById('resposta-input').value = d.resposta || '';
    document.getElementById('observacoes-input').value = d.observacoes || '';
    document.getElementById('archive-btn').textContent = d.arquivado ? 'Desarquivar' : 'Arquivar';
    switchView('demanda-detail');
  });
}

function switchView(view) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  document.getElementById(`${view}-view`).classList.add('active');
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
  const navItem = document.querySelector(`[data-view="${view}"]`);
  if (navItem) navItem.classList.add('active');
  const titles = {
    dashboard: 'Dashboard',
    demandas: 'Demandas',
    arquivadas: 'Arquivadas',
    'demanda-detail': 'Detalhe da Demanda',
  };
  document.getElementById('page-title').textContent = titles[view] || view;
  currentView = view;
}

async function saveDemanda() {
  if (!currentDemandaId) return;
  const status = document.getElementById('detail-status').value;
  const resposta = document.getElementById('resposta-input').value;
  const observacoes = document.getElementById('observacoes-input').value;
  await apiRequest(`/demandas/${currentDemandaId}`, {
    method: 'PUT',
    body: JSON.stringify({ status, resposta, observacoes }),
  });
  showToast('Demanda atualizada com sucesso', 'success');
  refreshCurrentView();
}

async function toggleArchive() {
  if (!currentDemandaId) return;
  const demanda = await apiRequest(`/demandas/${currentDemandaId}`);
  await apiRequest(`/demandas/${currentDemandaId}/arquivar`, {
    method: 'PUT',
    body: JSON.stringify({ arquivar: !demanda.arquivado }),
  });
  showToast(demanda.arquivado ? 'Demanda desarquivada' : 'Demanda arquivada', 'success');
  refreshCurrentView();
}

async function deleteDemanda() {
  if (!currentDemandaId) return;
  showConfirm('Tem certeza que deseja excluir esta demanda permanentemente?', async () => {
    await apiRequest(`/demandas/${currentDemandaId}`, { method: 'DELETE' });
    showToast('Demanda excluída', 'success');
    switchView('demandas');
    loadDemandas();
  });
}

function copyToWhatsApp() {
  const resposta = document.getElementById('resposta-input').value;
  const nome = document.getElementById('detail-nome').textContent;
  const text = `Olá ${nome}! ${resposta}`;
  navigator.clipboard.writeText(text);
  showToast('Copiado para área de transferência', 'success');
}

async function loadTemplates() {
  const templates = await apiRequest('/templates');
  window.templates = templates;
}

function applyTemplate(id) {
  const template = window.templates.find((t) => t.id === id);
  if (template) {
    const current = document.getElementById('resposta-input').value;
    document.getElementById('resposta-input').value = current ? `${current}\n\n${template.texto}` : template.texto;
  }
}

function showConfirm(message, callback) {
  const modal = document.getElementById('confirm-modal');
  document.getElementById('confirm-message').textContent = message;
  modal.classList.remove('hidden');
  document.getElementById('confirm-ok').onclick = () => {
    modal.classList.add('hidden');
    callback();
  };
  document.getElementById('confirm-cancel').onclick = () => modal.classList.add('hidden');
}

function refreshCurrentView() {
  if (currentView === 'dashboard') loadDashboard();
  else if (currentView === 'demandas') loadDemandas();
  else if (currentView === 'arquivadas') loadArquivadas();
}

document.addEventListener('DOMContentLoaded', () => {
  if (token) {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    loadDashboard();
    loadBairros();
    loadTemplates();
  }

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    try {
      const data = await login(username, password);
      document.getElementById('login-screen').classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');
      document.getElementById('user-info').textContent = data.username;
      loadDashboard();
      loadBairros();
      loadTemplates();
    } catch (err) {
      document.getElementById('login-error').textContent = 'Credenciais inválidas';
    }
  });

  document.getElementById('logout-btn').addEventListener('click', logout);

  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.dataset.view;
      if (view === 'dashboard') {
        loadDashboard();
        switchView('dashboard');
      } else if (view === 'demandas') {
        loadDemandas();
        switchView('demandas');
      } else if (view === 'arquivadas') {
        loadArquivadas();
        switchView('arquivadas');
      }
    });
  });

  document.getElementById('refresh-btn').addEventListener('click', refreshCurrentView);

  document.getElementById('search-btn').addEventListener('click', () => {
    const status = document.getElementById('filter-status').value;
    const bairro = document.getElementById('filter-bairro').value;
    const busca = document.getElementById('search-input').value;
    loadDemandas({ status, bairro, busca });
  });

  document.getElementById('search-arquivadas-btn').addEventListener('click', () => {
    const busca = document.getElementById('search-arquivadas').value;
    loadArquivadas({ busca });
  });

  document.getElementById('back-btn').addEventListener('click', () => {
    switchView('demandas');
    loadDemandas();
  });

  document.getElementById('detail-status').addEventListener('change', saveDemanda);
  document.getElementById('save-resposta-btn').addEventListener('click', saveDemanda);
  document.getElementById('save-observacoes-btn').addEventListener('click', saveDemanda);
  document.getElementById('archive-btn').addEventListener('click', toggleArchive);
  document.getElementById('delete-btn').addEventListener('click', deleteDemanda);
  document.getElementById('copy-whatsapp-btn').addEventListener('click', copyToWhatsApp);

  document.querySelectorAll('.template-btn').forEach((btn) => {
    btn.addEventListener('click', () => applyTemplate(parseInt(btn.dataset.template)));
  });
});