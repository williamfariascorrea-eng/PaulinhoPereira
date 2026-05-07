import { useState, useEffect } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

function App() {
  const [token, setToken] = useState(localStorage.getItem('crm_token'))
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('crm_user') || 'null'))
  const [view, setView] = useState('dashboard')
  const [demandas, setDemandas] = useState([])
  const [stats, setStats] = useState({ total: 0, pendentes: 0, andamento: 0, resolvidos: 0, porPrioridade: {}, ultimos30Dias: 0, demandasPorUsuario: {} })
  const [graficos, setGraficos] = useState({ porStatus: [], porPrioridade: [], porBairro: [] })
  const [currentDemanda, setCurrentDemanda] = useState(null)
  const [historico, setHistorico] = useState([])
  const [filters, setFilters] = useState({ status: '', bairro: '', busca: '', prioridade: '', categoria: '', responsavel: '', ordenar: 'desc', ordenarPor: 'created_at' })
  const [bairros, setBairros] = useState([])
  const [operadores, setOperadores] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState({ message: '', type: '' })
  const [templates, setTemplates] = useState([])
  const [showUserModal, setShowUserModal] = useState(false)
  const [showNewUserModal, setShowNewUserModal] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'operador', nome: '', email: '' })
  const [categorias, setCategorias] = useState([])
  const [dashboardAvancado, setDashboardAvancado] = useState(null)
  const [darkMode, setDarkMode] = useState(localStorage.getItem('crm_darkmode') === 'true')
  const [showRelatorioModal, setShowRelatorioModal] = useState(false)
  const [relatorioPeriodo, setRelatorioPeriodo] = useState({ inicio: '', fim: '' })
  const [notificacoes, setNotificacoes] = useState({ novas: 0, pendentes: 0, ultimas: [] })
  const [showNotificacoes, setShowNotificacoes] = useState(false)
  const [estatisticasOperadores, setEstatisticasOperadores] = useState([])

  useEffect(() => {
    if (token) {
      loadDashboard()
      loadBairros()
      loadOperadores()
      loadTemplates()
      loadCategorias()
      loadDashboardAvancado()
      if (user?.role === 'admin') loadUsuarios()
      loadEstatisticasOperadores()
    }
  }, [token, user])

  useEffect(() => {
    if (token && user?.role !== 'visualizador') {
      checkNotificacoes()
      const interval = setInterval(checkNotificacoes, 30000)
      return () => clearInterval(interval)
    }
  }, [token, user])

  const showToast = (message, type = '') => {
    setToast({ message, type })
    setTimeout(() => setToast({ message: '', type: '' }), 3000)
  }

  const toggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    localStorage.setItem('crm_darkmode', newMode)
    document.body.classList.toggle('dark-mode', newMode)
  }

  const checkNotificacoes = async () => {
    if (!token || user?.role === 'visualizador') return
    try {
      const since = new Date(Date.now() - 30 * 1000).toISOString()
      const response = await fetch(API_URL + `/notificacoes?since=${since}`, {
        headers: { Authorization: 'Bearer ' + token }
      })
      const data = await response.json()
      setNotificacoes(data)
      if (data.novas > 0 && view !== 'dashboard') {
        showToast(`${data.novas} nova(s) demanda(s)!`, 'success')
      }
    } catch (e) {}
  }

  const loadEstatisticasOperadores = async () => {
    if (!token || user?.role === 'visualizador') return
    try {
      const response = await fetch(API_URL + '/estatisticas/operadores', {
        headers: { Authorization: 'Bearer ' + token }
      })
      const data = await response.json()
      setEstatisticasOperadores(data)
    } catch (e) {}
  }

  const generateRelatorioPeriodo = async () => {
    if (!relatorioPeriodo.inicio || !relatorioPeriodo.fim) {
      showToast('Selecione as datas inicial e final', 'error')
      return
    }
    const token = localStorage.getItem('crm_token')
    const response = await fetch(API_URL + `/relatorio/periodo?inicio=${relatorioPeriodo.inicio}&fim=${relatorioPeriodo.fim}`, {
      headers: { Authorization: 'Bearer ' + token }
    })
    const html = await response.text()
    const win = window.open('', '_blank')
    win.document.write(html)
    setShowRelatorioModal(false)
  }

  const apiRequest = async (endpoint, options = {}) => {
    setError('')
    try {
      const headers = { 'Content-Type': 'application/json', ...options.headers }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers })
      
      if (response.status === 401) {
        logout()
        throw new Error('Sessão expirada')
      }
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro na requisição')
      }
      
      if (response.headers.get('Content-Type')?.includes('text/csv')) {
        return response.text()
      }
      return response.json()
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const login = async (username, password) => {
    const data = await apiRequest('/login', { method: 'POST', body: JSON.stringify({ username, password }) })
    setToken(data.token)
    setUser({ username: data.username, nome: data.nome, role: data.role })
    localStorage.setItem('crm_token', data.token)
    localStorage.setItem('crm_user', JSON.stringify({ username: data.username, nome: data.nome, role: data.role }))
    return data
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('crm_token')
    localStorage.removeItem('crm_user')
  }

  const loadDashboard = async () => {
    try {
      const [statsData, graficosData] = await Promise.all([
        apiRequest('/dashboard/stats'),
        apiRequest('/dashboard/graficos')
      ])
      setStats(statsData)
      setGraficos(graficosData)
    } catch (err) {
      console.error(err)
    }
  }

  const loadDemandas = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.prioridade) params.append('prioridade', filters.prioridade)
      if (filters.categoria) params.append('categoria', filters.categoria)
      if (filters.bairro) params.append('bairro', filters.bairro)
      if (filters.busca) params.append('busca', filters.busca)
      if (filters.ordenar) params.append('ordenar', filters.ordenar)
      const data = await apiRequest(`/demandas?${params}`)
      setDemandas(data)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const loadArquivadas = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ arquivado: 'true' })
      if (filters.busca) params.append('busca', filters.busca)
      if (filters.ordenar) params.append('ordenar', filters.ordenar)
      const data = await apiRequest(`/demandas?${params}`)
      setDemandas(data)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const loadBairros = async () => {
    const data = await apiRequest('/bairros')
    setBairros(data)
  }

  const loadOperadores = async () => {
    const data = await apiRequest('/usuarios/operadores')
    setOperadores(data)
  }

  const loadUsuarios = async () => {
    const data = await apiRequest('/usuarios')
    setUsuarios(data)
  }

  const loadTemplates = async () => {
    const data = await apiRequest('/templates')
    setTemplates(data)
  }

  const loadCategorias = async () => {
    const data = await apiRequest('/categorias')
    setCategorias(data)
  }

  const loadDashboardAvancado = async () => {
    try {
      const data = await apiRequest('/dashboard/avancado')
      setDashboardAvancado(data)
    } catch (err) {
      console.error(err)
    }
  }

  const openDemanda = async (id) => {
    try {
      const [data, historicoData] = await Promise.all([
        apiRequest(`/demandas/${id}`),
        apiRequest(`/demandas/${id}/historico`)
      ])
      setCurrentDemanda(data)
      setHistorico(historicoData)
      setView('demanda-detail')
    } catch (err) {
      showToast('Erro ao carregar demanda', 'error')
    }
  }

  const saveDemanda = async () => {
    if (!currentDemanda) return
    try {
      await apiRequest(`/demandas/${currentDemanda._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: currentDemanda.status,
          prioridade: currentDemanda.prioridade,
          resposta: currentDemanda.resposta,
          observacoes: currentDemanda.observacoes,
          responsavel: currentDemanda.responsavel?._id || currentDemanda.responsavel
        })
      })
      showToast('Demanda atualizada com sucesso', 'success')
      refreshCurrentView()
      const historicoData = await apiRequest(`/demandas/${currentDemanda._id}/historico`)
      setHistorico(historicoData)
    } catch (err) {
      showToast('Erro ao salvar', 'error')
    }
  }

  const toggleArchive = async () => {
    if (!currentDemanda) return
    try {
      await apiRequest(`/demandas/${currentDemanda._id}/arquivar`, {
        method: 'PUT',
        body: JSON.stringify({ arquivar: !currentDemanda.arquivado })
      })
      showToast(currentDemanda.arquivado ? 'Demanda desarquivada' : 'Demanda arquivada', 'success')
      refreshCurrentView()
    } catch (err) {
      showToast('Erro ao arquivar', 'error')
    }
  }

  const deleteDemanda = async () => {
    if (!currentDemanda) return
    if (window.confirm('Tem certeza que deseja excluir esta demanda permanentemente?')) {
      try {
        await apiRequest(`/demandas/${currentDemanda._id}`, { method: 'DELETE' })
        showToast('Demanda excluída', 'success')
        setView('demandas')
        loadDemandas()
      } catch (err) {
        showToast('Erro ao excluir', 'error')
      }
    }
  }

  const refreshCurrentView = () => {
    if (view === 'dashboard') loadDashboard()
    else if (view === 'demandas') loadDemandas()
    else if (view === 'arquivadas') loadArquivadas()
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const copyToWhatsApp = () => {
    const text = `Olá ${currentDemanda.nome}! ${currentDemanda.resposta}`
    navigator.clipboard.writeText(text)
    showToast('Copiado para área de transferência', 'success')
  }

  const uploadArquivo = async (demandaId, arquivo, tipo, nome) => {
    try {
      await apiRequest(`/demandas/${demandaId}/arquivo`, {
        method: 'POST',
        body: JSON.stringify({ arquivo, tipo, nome })
      })
      showToast('Arquivo enviado com sucesso', 'success')
      loadDemandas()
    } catch (err) {
      showToast('Erro ao enviar arquivo', 'error')
    }
  }

  const exportCSV = async () => {
    try {
      const csv = await apiRequest('/demandas/exportar?tipo=csv')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `demandas_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      showToast('Exportação concluída', 'success')
    } catch (err) {
      showToast('Erro ao exportar', 'error')
    }
  }

  const createUser = async () => {
    try {
      await apiRequest('/usuarios', {
        method: 'POST',
        body: JSON.stringify(newUser)
      })
      showToast('Usuário criado com sucesso', 'success')
      setShowNewUserModal(false)
      setNewUser({ username: '', password: '', role: 'operador', nome: '', email: '' })
      loadUsuarios()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const deleteUser = async (id) => {
    if (window.confirm('Excluir este usuário permanentemente?')) {
      try {
        await apiRequest(`/usuarios/${id}/permanente`, { method: 'DELETE' })
        showToast('Usuário excluído', 'success')
        loadUsuarios()
      } catch (err) {
        showToast('Erro ao excluir usuário', 'error')
      }
    }
  }

  const updateUserRole = async (id, newRole) => {
    try {
      await apiRequest(`/usuarios/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole })
      })
      showToast('Cargo atualizado com sucesso', 'success')
      loadUsuarios()
    } catch (err) {
      showToast('Erro ao atualizar cargo', 'error')
    }
  }

  if (!token) {
    return <Login onLogin={login} error={error} />
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src="/images/PODEMOS simbolo.jpg" alt="Logo" />
          <span>CRM Paulinho</span>
        </div>
        <nav className="sidebar-nav">
          {user?.role !== 'visualizador' && (
            <button className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => { loadDashboard(); setView('dashboard') }}>
              <span className="nav-icon">📊</span> Dashboard
            </button>
          )}
          <button className={`nav-item ${view === 'demandas' ? 'active' : ''}`} onClick={() => { loadDemandas(); setView('demandas') }}>
            <span className="nav-icon">📥</span> Demandas
            {notificacoes.pendentes > 0 && <span className="notification-badge">{notificacoes.pendentes}</span>}
          </button>
          {user?.role !== 'visualizador' && (
            <button className={`nav-item ${view === 'arquivadas' ? 'active' : ''}`} onClick={() => { loadArquivadas(); setView('arquivadas') }}>
              <span className="nav-icon">📦</span> Arquivadas
            </button>
          )}
          {user?.role === 'admin' && (
            <button className={`nav-item ${view === 'usuarios' ? 'active' : ''}`} onClick={() => { loadUsuarios(); setView('usuarios') }}>
              <span className="nav-icon">👥</span> Usuários
            </button>
          )}
          {(user?.role === 'admin' || user?.role === 'operador') && (
            <button className={`nav-item ${view === 'estatisticas' ? 'active' : ''}`} onClick={() => { loadEstatisticasOperadores(); setView('estatisticas') }}>
              <span className="nav-icon">📈</span> Estatísticas
            </button>
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <span>{user?.nome || user?.username}</span>
            <small>{user?.role === 'admin' ? 'Administrador' : user?.role === 'operador' ? 'Operador' : 'Visualizador'}</small>
          </div>
          <button className="btn-logout" onClick={logout}>Sair</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <h1>
            {view === 'dashboard' ? 'Dashboard' : 
             view === 'demandas' ? 'Demandas' : 
             view === 'arquivadas' ? 'Arquivadas' : 
             view === 'usuarios' ? 'Gerenciar Usuários' : 
             view === 'estatisticas' ? 'Estatísticas por Operador' : 
             'Detalhe da Demanda'}
          </h1>
          <div className="top-bar-actions">
            {user?.role === 'admin' && (
              <button className="btn-export" onClick={async () => {
                const token = localStorage.getItem('crm_token')
                const response = await fetch(API_URL + '/backup', { headers: { Authorization: 'Bearer ' + token } })
                const data = await response.json()
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `backup_${new Date().toISOString().split('T')[0]}.json`
                a.click()
                showToast('Backup realizado com sucesso', 'success')
              }}>💾 <span>Backup</span></button>
            )}
            <button className="btn-icon" onClick={toggleDarkMode} title={darkMode ? 'Modo Claro' : 'Modo Escuro'}>
              {darkMode ? '☀️' : '🌙'}
            </button>
            {view === 'demandas' && user?.role !== 'visualizador' && (
              <>
                <button className="btn-export" onClick={() => setShowRelatorioModal(true)}>
                  📅 <span>Período</span>
                </button>
                <button className="btn-export" onClick={exportCSV}>
                  📊 <span>CSV</span>
                </button>
                <button className="btn-export btn-pdf" onClick={async () => {
  const token = localStorage.getItem('crm_token')
  const response = await fetch(API_URL + '/relatorio', { headers: { Authorization: 'Bearer ' + token } })
  const html = await response.text()
  const win = window.open('', '_blank')
  win.document.write(html)
}}>📄 <span>PDF</span></button>
              </>
            )}
            {user?.role !== 'visualizador' && (
              <button className="btn-icon" onClick={refreshCurrentView}>🔄</button>
            )}
          </div>
        </header>

        {error && <div className="error-banner">{error} <button onClick={() => setError('')}>×</button></div>}

        {view === 'dashboard' && <Dashboard stats={stats} graficos={graficos} dashboardAvancado={dashboardAvancado} />}
        {view === 'demandas' && (
          <DemandasList
            demandas={demandas}
            loading={loading}
            filters={filters}
            setFilters={setFilters}
            bairros={bairros}
            operadores={operadores}
            categorias={categorias}
            onSearch={loadDemandas}
            onSelect={openDemanda}
          />
        )}
        {view === 'arquivadas' && (
          <DemandasList
            demandas={demandas}
            loading={loading}
            filters={filters}
            setFilters={setFilters}
            categorias={categorias}
            onSearch={loadArquivadas}
            onSelect={openDemanda}
            isArquivadas
          />
        )}
        {view === 'usuarios' && user?.role === 'admin' && (
          <UsuariosPanel
            usuarios={usuarios}
            onAdd={() => setShowNewUserModal(true)}
            onDelete={deleteUser}
            onUpdateRole={updateUserRole}
          />
        )}
        {view === 'estatisticas' && (user?.role === 'admin' || user?.role === 'operador') && (
          <div className="estatisticas-panel">
            <div className="stats-grid">
              {estatisticasOperadores.map((stat, i) => (
                <div key={i} className="stat-card">
                  <h3>{stat.operador?.nome || stat.operador?.username || 'Não atribuído'}</h3>
                  <div className="stat-row">
                    <span>Total atribuídas:</span>
                    <strong>{stat.total}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Novas:</span>
                    <strong className="text-novo">{stat.novas}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Em andamento:</span>
                    <strong className="text-andamento">{stat.andamento}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Resolvidas:</span>
                    <strong className="text-resolvido">{stat.resolvidas}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Taxa de resolução:</span>
                    <strong>{stat.taxaResolucao}%</strong>
                  </div>
                  <div className="progress-bar">
                    <div className="progress" style={{width: stat.taxaResolucao + '%'}}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {view === 'demanda-detail' && currentDemanda && (
          <DemandaDetail
            demanda={currentDemanda}
            setDemanda={setCurrentDemanda}
            historico={historico}
            operadores={operadores}
            templates={templates}
            onSave={saveDemanda}
            onArchive={toggleArchive}
            onDelete={deleteDemanda}
            onCopy={copyToWhatsApp}
            onBack={() => { setView('demandas'); loadDemandas() }}
            userRole={user?.role}
            onUploadArquivo={uploadArquivo}
          />
        )}
      </main>

      {toast.message && <div className={`toast ${toast.type}`}>{toast.message}</div>}
      
      {showNewUserModal && (
        <div className="modal-overlay" onClick={() => setShowNewUserModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Novo Usuário</h2>
            <div className="form-group">
              <label>Usuário</label>
              <input type="text" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Senha</label>
              <input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Nome</label>
              <input type="text" value={newUser.nome} onChange={e => setNewUser({...newUser, nome: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Função</label>
              <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                <option value="operador">Operador</option>
                <option value="admin">Administrador</option>
                <option value="visualizador">Visualizador</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowNewUserModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={createUser}>Criar</button>
            </div>
          </div>
        </div>
      )}

      {showRelatorioModal && (
        <div className="modal-overlay" onClick={() => setShowRelatorioModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Relatório por Período</h2>
            <div className="form-group">
              <label>Data Início</label>
              <input type="date" value={relatorioPeriodo.inicio} onChange={e => setRelatorioPeriodo({...relatorioPeriodo, inicio: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Data Fim</label>
              <input type="date" value={relatorioPeriodo.fim} onChange={e => setRelatorioPeriodo({...relatorioPeriodo, fim: e.target.value})} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowRelatorioModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={generateRelatorioPeriodo}>Gerar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Login({ onLogin, error }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErr('')
    try {
      await onLogin(username, password)
    } catch (err) {
      setErr(err.message || 'Credenciais inválidas')
    }
    setLoading(false)
  }

  return (
    <div className="login-screen">
      <div className="login-box">
        <div className="login-logo">
          <img src="/images/PODEMOS simbolo.jpg" alt="Partido Podemos" />
        </div>
        <h1>CRM Paulinho</h1>
        <p className="login-subtitle">Gestão de Demandas</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Usuário</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
          {(err || error) && <p className="login-error">{err || error}</p>}
        </form>
      </div>
    </div>
  )
}

function Dashboard({ stats, graficos, dashboardAvancado }) {
  const maxValue = Math.max(...graficos.porBairro.map(b => b.value), 1)

  return (
    <div className="dashboard">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📥</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total de Demandas</div>
        </div>
        <div className="stat-card stat-novo">
          <div className="stat-icon">🟡</div>
          <div className="stat-value">{stats.pendentes}</div>
          <div className="stat-label">Pendentes</div>
        </div>
        <div className="stat-card stat-atendimento">
          <div className="stat-icon">🔵</div>
          <div className="stat-value">{stats.andamento}</div>
          <div className="stat-label">Em Atendimento</div>
        </div>
        <div className="stat-card stat-resolvido">
          <div className="stat-icon">🟢</div>
          <div className="stat-value">{stats.resolvidos}</div>
          <div className="stat-label">Resolvidas</div>
        </div>
      </div>

      <div className="charts-row">
        <div className="chart-card">
          <h3>Por Status</h3>
          <div className="chart-bars">
            {graficos.porStatus.map((item, i) => (
              <div key={i} className="chart-bar-item">
                <div className="chart-bar-label">{item.name}</div>
                <div className="chart-bar-container">
                  <div className="chart-bar" style={{ width: `${stats.total ? (item.value / stats.total * 100) : 0}%`, background: item.color }}></div>
                </div>
                <div className="chart-bar-value">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h3>Por Prioridade</h3>
          <div className="chart-bars">
            {graficos.porPrioridade.map((item, i) => (
              <div key={i} className="chart-bar-item">
                <div className="chart-bar-label">{item.name}</div>
                <div className="chart-bar-container">
                  <div className="chart-bar" style={{ width: `${stats.total ? (item.value / stats.total * 100) : 0}%`, background: item.color }}></div>
                </div>
                <div className="chart-bar-value">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h3>Por Bairro</h3>
          <div className="chart-bars">
            {graficos.porBairro.slice(0, 5).map((item, i) => (
              <div key={i} className="chart-bar-item">
                <div className="chart-bar-label">{item.name.length > 15 ? item.name.slice(0, 15) + '...' : item.name}</div>
                <div className="chart-bar-container">
                  <div className="chart-bar" style={{ width: `${(item.value / maxValue * 100)}%`, background: '#1e3a5f' }}></div>
                </div>
                <div className="chart-bar-value">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {dashboardAvancado && (
        <div className="dashboard-avancado">
          <h3>📈 Dashboard Avançado</h3>
          <div className="charts-row">
            <div className="chart-card">
              <h3>Por Categoria</h3>
              <div className="chart-bars">
                {Object.entries(dashboardAvancado.porCategoria || {}).map(([cat, val], i) => (
                  <div key={i} className="chart-bar-item">
                    <div className="chart-bar-label">{cat.replace('_', ' ')}</div>
                    <div className="chart-bar-container">
                      <div className="chart-bar" style={{ width: `${(val / dashboardAvancado.total * 100)}%`, background: '#6f42c1' }}></div>
                    </div>
                    <div className="chart-bar-value">{val}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="chart-card">
              <h3>Evolução (Últimos 6 meses)</h3>
              <div className="chart-bars">
                {Object.entries(dashboardAvancado.porMes || {}).map(([mes, val], i) => (
                  <div key={i} className="chart-bar-item">
                    <div className="chart-bar-label">{mes}</div>
                    <div className="chart-bar-container">
                      <div className="chart-bar" style={{ width: `${(val / Math.max(...Object.values(dashboardAvancado.porMes || {a:1})) * 100)}%`, background: '#20c997' }}></div>
                    </div>
                    <div className="chart-bar-value">{val}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="chart-card">
              <h3>Indicadores</h3>
              <div className="indicadores-grid">
                <div className="indicador">
                  <span className="indicador-value">{dashboardAvancado.tempoMedioDias || 0}</span>
                  <span className="indicador-label">Dias méd. resolução</span>
                </div>
                <div className="indicador">
                  <span className="indicador-value">{dashboardAvancado.taxaResolucao || 0}%</span>
                  <span className="indicador-label">Taxa de resolução</span>
                </div>
                <div className="indicador">
                  <span className="indicador-value">{dashboardAvancado.total || 0}</span>
                  <span className="indicador-label">Total demandas</span>
                </div>
                <div className="indicador">
                  <span className="indicador-value">{dashboardAvancado.resolvidas || 0}</span>
                  <span className="indicador-label">Resolvidas</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="stats-secondary">
        <div className="stat-mini">
          <span className="stat-mini-value">{stats.ultimos30Dias}</span>
          <span className="stat-mini-label">Últimos 30 dias</span>
        </div>
        <div className="stat-mini">
          <span className="stat-mini-value">{Object.keys(stats.demandasPorUsuario).length}</span>
          <span className="stat-mini-label">Usuários ativos</span>
        </div>
        <div className="stat-mini">
          <span className="stat-mini-value">{stats.arquivados}</span>
          <span className="stat-mini-label">Arquivadas</span>
        </div>
      </div>
    </div>
  )
}

function DemandasList({ demandas, loading, filters, setFilters, bairros, operadores, categorias, onSearch, onSelect, isArquivadas }) {
  return (
    <div>
      <div className="filters-bar">
        {!isArquivadas && (
          <>
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">Status</option>
              <option value="novo">Novo</option>
              <option value="atendimento">Em Atendimento</option>
              <option value="resolvido">Resolvido</option>
            </select>
            <select value={filters.prioridade} onChange={(e) => setFilters({ ...filters, prioridade: e.target.value })}>
              <option value="">Prioridade</option>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
            <select value={filters.categoria} onChange={(e) => setFilters({ ...filters, categoria: e.target.value })}>
              <option value="">Categoria</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.icon} {c.nome}</option>)}
            </select>
            <select value={filters.bairro} onChange={(e) => setFilters({ ...filters, bairro: e.target.value })}>
              <option value="">Bairro</option>
              {bairros.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={filters.responsavel} onChange={(e) => setFilters({ ...filters, responsavel: e.target.value })}>
              <option value="">Responsável</option>
              {operadores.map(o => <option key={o._id} value={o._id}>{o.nome || o.username}</option>)}
            </select>
          </>
        )}
        <input type="text" placeholder="Buscar..." value={filters.busca} onChange={(e) => setFilters({ ...filters, busca: e.target.value })} />
        <select value={filters.ordenar} onChange={(e) => setFilters({ ...filters, ordenar: e.target.value })}>
          <option value="desc">Mais recentes</option>
          <option value="asc">Mais antigas</option>
        </select>
        <button className="btn-primary" onClick={onSearch}>Buscar</button>
      </div>
      
      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <span>Carregando...</span>
        </div>
      ) : (
        <div className="demandas-list">
          {demandas.length === 0 ? (
            <div className="empty-state">📭 Nenhuma demanda encontrada</div>
          ) : (
            demandas.map(d => (
              <div key={d._id} className={`demanda-card status-${d.status} prioridade-${d.prioridade}`} onClick={() => onSelect(d._id)}>
                <div className="demanda-header">
                  <div className="demanda-nome">
                    {d.prioridade === 'alta' && <span className="badge-prioridade alta">⚡</span>}
                    {d.prioridade === 'media' && <span className="badge-prioridade media">📌</span>}
                    {d.prioridade === 'baixa' && <span className="badge-prioridade baixa">🔽</span>}
                    {d.nome}
                  </div>
                  <div className="demanda-status">
                    {d.status === 'novo' ? '🟡 Novo' : d.status === 'atendimento' ? '🔵 Em Atendimento' : '🟢 Resolvido'}
                  </div>
                </div>
                <div className="demanda-row">
                  <span>📍 {d.bairro || 'Não informado'}</span>
                  <span>📞 {d.contato}</span>
                  <span>📅 {new Date(d.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="demanda-mensagem">{d.mensagem}</div>
                {d.responsavel && <div className="demanda-responsavel">👤 {d.responsavel.nome || d.responsavel.username}</div>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function DemandaDetail({ demanda, setDemanda, historico, operadores, templates, onSave, onArchive, onDelete, onCopy, onBack, userRole, onUploadArquivo }) {
  const [showHistorico, setShowHistorico] = useState(false)
  const [uploading, setUploading] = useState(false)
  const isVisualizador = userRole === 'visualizador'

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5000000) {
      alert('Arquivo muito grande. Máximo 5MB')
      return
    }
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1]
      await onUploadArquivo(demanda._id, base64, file.type, file.name)
      setUploading(false)
    }
    reader.readAsDataURL(file)
  }

  const applyTemplate = (texto) => {
    if (!isVisualizador) {
      setDemanda({ ...demanda, resposta: demanda.resposta ? `${demanda.resposta}\n\n${texto}` : texto })
    }
  }

  return (
    <div>
      <div className="detail-header">
        <button className="btn-back" onClick={onBack}>← Voltar</button>
        {!isVisualizador && (
          <div className="detail-actions">
            <button className="btn-info" onClick={() => setShowHistorico(!showHistorico)}>📋 Histórico</button>
            <button className="btn-secondary" onClick={onArchive}>{demanda.arquivado ? 'Desarquivar' : 'Arquivar'}</button>
            <button className="btn-danger" onClick={onDelete}>Excluir</button>
          </div>
        )}
      </div>

      {showHistorico && (
        <div className="historico-panel">
          <h3>Histórico de Alterações</h3>
          {historico.length === 0 ? <p>Nenhuma alteração registrada</p> : (
            <div className="historico-list">
              {historico.map((h, i) => (
                <div key={i} className="historico-item">
                  <div className="historico-acao">{h.acao}</div>
                  {h.campo && <div className="historico-campo">{h.campo}: {h.valor_anterior} → {h.valor_novo}</div>}
                  <div className="historico-meta">
                    {h.usuario_id?.nome || h.usuario_id?.username} • {new Date(h.created_at).toLocaleString('pt-BR')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="detail-content">
        <div className="detail-info">
          <div className="detail-row"><label>ID:</label> <span>{demanda._id?.slice(0, 8)}</span></div>
          <div className="detail-row">
            <label>Status:</label>
            {isVisualizador ? <span>{demanda.status === 'novo' ? '🟡 Novo' : demanda.status === 'atendimento' ? '🔵 Em Atendimento' : '🟢 Resolvido'}</span> : (
              <select value={demanda.status} onChange={(e) => setDemanda({ ...demanda, status: e.target.value })}>
                <option value="novo">🟡 Novo</option>
                <option value="atendimento">🔵 Em Atendimento</option>
                <option value="resolvido">🟢 Resolvido</option>
              </select>
            )}
          </div>
          <div className="detail-row">
            <label>Prioridade:</label>
            {isVisualizador ? <span>{demanda.prioridade === 'alta' ? '⚡ Alta' : demanda.prioridade === 'media' ? '📌 Média' : '🔽 Baixa'}</span> : (
              <select value={demanda.prioridade} onChange={(e) => setDemanda({ ...demanda, prioridade: e.target.value })}>
                <option value="baixa">🔽 Baixa</option>
                <option value="media">📌 Média</option>
                <option value="alta">⚡ Alta</option>
              </select>
            )}
          </div>
          <div className="detail-row">
            <label>Responsável:</label>
            {isVisualizador ? <span>{demanda.responsavel?.nome || 'Não atribuído'}</span> : (
              <select value={demanda.responsavel?._id || ''} onChange={(e) => setDemanda({ ...demanda, responsavel: e.target.value ? { _id: e.target.value } : null })}>
                <option value="">Não atribuído</option>
                {operadores.map(o => <option key={o._id} value={o._id}>{o.nome || o.username}</option>)}
              </select>
            )}
          </div>
          <div className="detail-row"><label>Nome:</label> <span>{demanda.nome}</span></div>
          <div className="detail-row"><label>Bairro:</label> <span>{demanda.bairro || 'Não informado'}</span></div>
          <div className="detail-row"><label>Contato:</label> <span>{demanda.contato}</span></div>
          <div className="detail-row"><label>Tipo:</label> <span>{demanda.tipo || 'Não informado'}</span></div>
          <div className="detail-row"><label>Data:</label> <span>{new Date(demanda.created_at).toLocaleString('pt-BR')}</span></div>
        </div>

        <div className="detail-mensagem">
          <h3>Mensagem</h3>
          <p>{demanda.mensagem}</p>
        </div>

        <div className="detail-arquivos">
          <h3>Anexos</h3>
          {demanda.arquivos && demanda.arquivos.length > 0 ? (
            <div className="arquivos-grid">
              {demanda.arquivos.map(arq => (
                <div key={arq.id} className="arquivo-item">
                  {arq.tipo?.startsWith('image') ? (
                    <img src={`data:${arq.tipo};base64,${arq.data}`} alt={arq.nome} style={{maxWidth: '100px', maxHeight: '100px'}} />
                  ) : (
                    <span>📎 {arq.nome}</span>
                  )}
                </div>
              ))}
            </div>
          ) : <p>Nenhum arquivo anexado</p>}
          {!isVisualizador && (
            <label className="btn-upload">
              {uploading ? 'Enviando...' : '+ Adicionar Arquivo'}
              <input type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleFileUpload} style={{display: 'none'}} />
            </label>
          )}
        </div>

        {!isVisualizador && (
          <div className="detail-resposta">
            <h3>Resposta</h3>
            <div className="templates-bar">
              {templates.map(t => (
                <button key={t.id} className="template-btn" onClick={() => applyTemplate(t.texto)}>{t.titulo}</button>
              ))}
            </div>
            <textarea value={demanda.resposta || ''} onChange={(e) => setDemanda({ ...demanda, resposta: e.target.value })} placeholder="Escreva sua resposta..." />
            <div className="resposta-actions">
              <button className="btn-secondary" onClick={onCopy}>📋 Copiar para WhatsApp</button>
              <button className="btn-primary" onClick={onSave}>Salvar</button>
            </div>
          </div>
        )}

        {!isVisualizador && (
          <div className="detail-observacoes">
            <h3>Observações Internas</h3>
            <textarea value={demanda.observacoes || ''} onChange={(e) => setDemanda({ ...demanda, observacoes: e.target.value })} placeholder="Notas internas..." />
            <button className="btn-primary" onClick={onSave}>Salvar</button>
          </div>
        )}
      </div>
    </div>
  )
}

function UsuariosPanel({ usuarios, onAdd, onDelete, onUpdateRole }) {
  return (
    <div>
      <div className="panel-header">
        <button className="btn-primary" onClick={onAdd}>+ Novo Usuário</button>
      </div>
      <div className="usuarios-grid">
        {usuarios.map(u => (
          <div key={u._id} className="usuario-card">
            <div className="usuario-avatar">{u.nome?.[0] || u.username[0]}</div>
            <div className="usuario-info">
              <div className="usuario-nome">{u.nome || u.username}</div>
              <div className="usuario-email">{u.email || '-'}</div>
              <select 
                className="usuario-role-select" 
                value={u.role} 
                onChange={(e) => onUpdateRole(u._id, e.target.value)}
              >
                <option value="admin">Administrador</option>
                <option value="operador">Operador</option>
                <option value="visualizador">Visualizador</option>
              </select>
            </div>
            <button className="btn-delete" onClick={() => onDelete(u._id)} title="Excluir">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App