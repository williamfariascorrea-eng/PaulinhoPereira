require('dotenv').config()
const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')

const app = express()
const PORT = process.env.PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET || 'crm-paulinho-secret-key-2026'

app.use(cors())
app.use(express.json())

let db = {
  usuarios: [],
  demandas: [],
  historico: [],
  templates: [
    { id: 1, titulo: 'Agradecimento', texto: 'Agradecemos seu contato. Sua demanda foi registrada e será encaminhada para análise.' },
    { id: 2, titulo: 'Em andamento', texto: 'Sua demanda está sendo acompanhada pela nossa equipe. Em breve retornaremos com mais informações.' },
    { id: 3, titulo: 'Encaminhado', texto: 'Sua demanda foi encaminhada aos órgãos competentes. Pedimos paciência enquanto acompanhamos o processo.' },
    { id: 4, titulo: 'Resolvido', texto: 'Informamos que sua demanda foi atendida. Estamos à disposição para qualsquer dúvidas.' },
    { id: 5, titulo: 'Mais Info', texto: 'Para melhor atender, poderia nos fornecer mais detalhes sobre o caso?' },
  ]
}

const hashedPassword = bcrypt.hashSync('admin123', 10)
db.usuarios.push({
  _id: uuidv4(),
  username: 'admin',
  password: hashedPassword,
  role: 'admin',
  nome: 'Administrador',
  email: 'admin@paulinhopereira.com',
  ativo: true
})

const operatorPassword = bcrypt.hashSync('operador123', 10)
db.usuarios.push({
  _id: uuidv4(),
  username: 'operador',
  password: operatorPassword,
  role: 'operador',
  nome: 'Operador Teste',
  email: 'operador@paulinhopereira.com',
  ativo: true
})

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token não fornecido' })
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' })
  }
}

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito a administradores' })
  next()
}

// Rate limiting para login - protege contra ataques de força bruta
const loginAttempts = {}
const MAX_LOGIN_ATTEMPTS = 5
const LOGIN_LOCKOUT_TIME = 15 * 60 * 1000 // 15 minutos

const checkLoginAttempt = (ip) => {
  const now = Date.now()
  if (!loginAttempts[ip]) {
    loginAttempts[ip] = { attempts: 1, lockedUntil: null }
    return true
  }
  const attempt = loginAttempts[ip]
  if (attempt.lockedUntil && now < attempt.lockedUntil) {
    return false
  }
  if (attempt.lockedUntil && now >= attempt.lockedUntil) {
    loginAttempts[ip] = { attempts: 1, lockedUntil: null }
    return true
  }
  if (attempt.attempts >= MAX_LOGIN_ATTEMPTS) {
    loginAttempts[ip].lockedUntil = now + LOGIN_LOCKOUT_TIME
    return false
  }
  attempt.attempts++
  return true
}

// Rate limiting geral - protege contra DDoS
const requestCounts = {}
const REQUEST_LIMIT = 100
const REQUEST_WINDOW = 60 * 1000 // 1 minuto

const checkRateLimit = (ip) => {
  const now = Date.now()
  if (!requestCounts[ip]) {
    requestCounts[ip] = { count: 1, resetAt: now + REQUEST_WINDOW }
    return true
  }
  if (now > requestCounts[ip].resetAt) {
    requestCounts[ip] = { count: 1, resetAt: now + REQUEST_WINDOW }
    return true
  }
  if (requestCounts[ip].count >= REQUEST_LIMIT) {
    return false
  }
  requestCounts[ip].count++
  return true
}

app.use((req, res, next) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown'
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Muitas requisicoes. Tente novamente mais tarde.' })
  }
  next()
})

app.post('/api/login', (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown'
  
  if (!checkLoginAttempt(ip)) {
    return res.status(429).json({ error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' })
  }
  
  const { username, password } = req.body
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario e senha sao obrigatorios' })
  }
  
  if (username.length > 50 || password.length > 100) {
    return res.status(400).json({ error: 'Credenciais invalidas' })
  }
  
  const user = db.usuarios.find(u => u.username === username && u.ativo)
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Credenciais invalidas' })
  }
  
  loginAttempts[ip] = { attempts: 0, lockedUntil: null }
  
  const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' })
  res.json({ token, role: user.role, username: user.username, nome: user.nome })
})

app.get('/api/usuarios', authMiddleware, adminOnly, (req, res) => {
  res.json(db.usuarios.map(u => ({ ...u, password: undefined })))
})

app.post('/api/usuarios', authMiddleware, adminOnly, (req, res) => {
  const { username, password, role, nome, email } = req.body
  if (db.usuarios.find(u => u.username === username)) return res.status(400).json({ error: 'Usuário já existe' })
  const novo = { _id: uuidv4(), username, password: bcrypt.hashSync(password, 10), role: role || 'operador', nome, email, ativo: true }
  db.usuarios.push(novo)
  res.json({ id: novo._id, message: 'Usuário criado com sucesso' })
})

app.delete('/api/usuarios/:id', authMiddleware, adminOnly, (req, res) => {
  const user = db.usuarios.find(u => u._id === req.params.id)
  if (user) user.ativo = false
  res.json({ message: 'Usuário desativado' })
})

// Notificações - verificar novas demandas
app.get('/api/notificacoes', authMiddleware, (req, res) => {
  const { since } = req.query
  const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000)
  
  const novas = db.demandas.filter(d => new Date(d.created_at) > sinceDate && !d.arquivado)
  const countNovas = db.demandas.filter(d => d.status === 'novo' && !d.arquivado).length
  
  res.json({
    novas: novas.length,
    pendentes: countNovas,
    ultimas: novas.slice(-5).map(d => ({
      _id: d._id,
      nome: d.nome,
      mensagem: d.mensagem?.substring(0, 50) + '...',
      created_at: d.created_at
    }))
  })
})

app.delete('/api/usuarios/:id/permanente', authMiddleware, adminOnly, (req, res) => {
  const index = db.usuarios.findIndex(u => u._id === req.params.id)
  if (index === -1) return res.status(404).json({ error: 'Usuário não encontrado' })
  db.usuarios.splice(index, 1)
  res.json({ message: 'Usuário excluído permanentemente' })
})

app.put('/api/usuarios/:id', authMiddleware, adminOnly, (req, res) => {
  const { role } = req.body
  const user = db.usuarios.find(u => u._id === req.params.id)
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
  if (role) user.role = role
  res.json({ message: 'Usuário atualizado com sucesso' })
})

app.get('/api/dashboard/stats', authMiddleware, (req, res) => {
  const demandas = db.demandas.filter(d => !d.arquivado)
  const total = demandas.length
  const pendentes = demandas.filter(d => d.status === 'novo').length
  const andamento = demandas.filter(d => d.status === 'atendimento').length
  const resolvidos = demandas.filter(d => d.status === 'resolvido').length
  const arquivados = db.demandas.filter(d => d.arquivado).length

  const porPrioridade = { alta: demandas.filter(d => d.prioridade === 'alta').length, media: demandas.filter(d => d.prioridade === 'media').length, baixa: demandas.filter(d => d.prioridade === 'baixa').length }

  const ultimos30Dias = new Date()
  ultimos30Dias.setDate(ultimos30Dias.getDate() - 30)
  const novos = demandas.filter(d => new Date(d.created_at) >= ultimos30Dias).length

  res.json({ total, pendentes, andamento, resolvidos, arquivados, porPrioridade, ultimos30Dias: novos, demandasPorUsuario: {} })
})

app.get('/api/dashboard/graficos', authMiddleware, (req, res) => {
  const demandas = db.demandas.filter(d => !d.arquivado)
  const porStatus = [
    { name: 'Novos', value: demandas.filter(d => d.status === 'novo').length, color: '#ffc107' },
    { name: 'Em Atendimento', value: demandas.filter(d => d.status === 'atendimento').length, color: '#0d6efd' },
    { name: 'Resolvidos', value: demandas.filter(d => d.status === 'resolvido').length, color: '#198754' }
  ]
  const porPrioridade = [
    { name: 'Alta', value: demandas.filter(d => d.prioridade === 'alta').length, color: '#dc3545' },
    { name: 'Média', value: demandas.filter(d => d.prioridade === 'media').length, color: '#fd7e14' },
    { name: 'Baixa', value: demandas.filter(d => d.prioridade === 'baixa').length, color: '#20c997' }
  ]
  const bairrosCount = {}
  demandas.forEach(d => { const b = d.bairro || 'Não informado'; bairrosCount[b] = (bairrosCount[b] || 0) + 1 })
  const porBairro = Object.entries(bairrosCount).map(([name, value]) => ({ name, value }))
  res.json({ porStatus, porPrioridade, porBairro })
})

// Estatísticas por operador
app.get('/api/estatisticas/operadores', authMiddleware, (req, res) => {
  const operadores = db.usuarios.filter(u => u.role === 'operador' || u.role === 'admin')
  const demandas = db.demandas.filter(d => !d.arquivado)
  
  const stats = operadores.map(op => {
    const demandasOp = demandas.filter(d => d.responsavel?._id === op._id || d.responsavel === op._id)
    const resolvidas = demandasOp.filter(d => d.status === 'resolvido').length
    const andamento = demandasOp.filter(d => d.status === 'atendimento').length
    const novas = demandasOp.filter(d => d.status === 'novo').length
    
    return {
      operador: { _id: op._id, nome: op.nome || op.username },
      total: demandasOp.length,
      resolvidas,
      andamento,
      novas,
      taxaResolucao: demandasOp.length > 0 ? Math.round((resolvidas / demandasOp.length) * 100) : 0
    }
  })
  
  res.json(stats)
})

app.get('/api/demandas', authMiddleware, (req, res) => {
  const { status, bairro, busca, arquivado, prioridade, categoria, ordenar } = req.query
  let demandas = db.demandas.filter(d => arquivado === 'true' ? d.arquivado : !d.arquivado)
  if (status && status !== 'todos') demandas = demandas.filter(d => d.status === status)
  if (prioridade && prioridade !== 'todos') demandas = demandas.filter(d => d.prioridade === prioridade)
  if (categoria && categoria !== 'todos') demandas = demandas.filter(d => d.categoria === categoria)
  if (bairro) demandas = demandas.filter(d => d.bairro?.toLowerCase().includes(bairro.toLowerCase()))
  if (busca) {
    const b = busca.toLowerCase()
    demandas = demandas.filter(d => d.nome.toLowerCase().includes(b) || d.mensagem.toLowerCase().includes(b) || d.contato.toLowerCase().includes(b))
  }
  demandas.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  if (ordenar === 'asc') demandas.reverse()
  res.json(demandas)
})

app.get('/api/demandas/exportar', authMiddleware, (req, res) => {
  const demandas = db.demandas.filter(d => !d.arquivado)
  const csv = ['ID,Nome,Bairro,Contato,Status,Prioridade,Mensagem,Data', ...demandas.map(d => `"${d._id}","${d.nome}","${d.bairro || ''}","${d.contato}","${d.status}","${d.prioridade}","${d.mensagem.replace(/"/g, '""')}","${new Date(d.created_at).toLocaleDateString('pt-BR')}"`)].join('\n')
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename=demandas.csv')
  res.send(csv)
})

app.get('/api/demandas/:id', authMiddleware, (req, res) => {
  const demanda = db.demandas.find(d => d._id === req.params.id)
  if (!demanda) return res.status(404).json({ error: 'Demanda não encontrada' })
  res.json(demanda)
})

app.get('/api/demandas/:id/historico', authMiddleware, (req, res) => {
  const historico = db.historico.filter(h => h.demanda_id === req.params.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  res.json(historico)
})

// Rate limiting - máximo 3 demandas por IP a cada 1 hora
const demandaRateLimit = {}
const DEMANDA_RATE_LIMIT_MAX = 3
const DEMANDA_RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hora em ms

const checkDemandaRateLimit = (ip) => {
  const now = Date.now()
  if (!demandaRateLimit[ip]) {
    demandaRateLimit[ip] = { count: 1, resetAt: now + DEMANDA_RATE_LIMIT_WINDOW }
    return true
  }
  if (now > demandaRateLimit[ip].resetAt) {
    demandaRateLimit[ip] = { count: 1, resetAt: now + DEMANDA_RATE_LIMIT_WINDOW }
    return true
  }
  if (demandaRateLimit[ip].count >= DEMANDA_RATE_LIMIT_MAX) {
    return false
  }
  demandaRateLimit[ip].count++
  return true
}

app.post('/api/demandas', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown'
  
  if (!checkDemandaRateLimit(ip)) {
    return res.status(429).json({ error: 'Voce ja enviou muitas demandas. Tente novamente mais tarde.' })
  }
  
  const { nome, bairro, contato, tipo, mensagem, categoria, foto } = req.body
  if (!nome || !contato || !mensagem) return res.status(400).json({ error: 'Nome, contato e mensagem são obrigatórios' })
  
  const demanda = { 
    _id: uuidv4(), 
    nome, 
    bairro: bairro || '', 
    contato, 
    tipo: tipo || '', 
    categoria: categoria || 'outros',
    mensagem, 
    status: 'novo', 
    prioridade: 'media', 
    resposta: null, 
    observacoes: null, 
    responsavel: null, 
    arquivo: null,
    arquivos: foto ? [{
      id: uuidv4(),
      data: foto,
      tipo: 'image/jpeg',
      nome: 'foto_demanda',
      created_at: new Date()
    }] : [],
    created_at: new Date(), 
    updated_at: new Date(), 
    arquivado: false 
  }
  db.demandas.push(demanda)
  res.json({ id: demanda._id, message: 'Demanda criada com sucesso' })
})

app.put('/api/demandas/:id', authMiddleware, (req, res) => {
  const { status, resposta, observacoes, prioridade, responsavel } = req.body
  const demanda = db.demandas.find(d => d._id === req.params.id)
  if (!demanda) return res.status(404).json({ error: 'Demanda não encontrada' })

  if (status && status !== demanda.status) {
    db.historico.push({ demanda_id: req.params.id, usuario_id: req.user.id, acao: 'Status alterado', campo: 'status', valor_anterior: demanda.status, valor_novo: status, created_at: new Date() })
    demanda.status = status
    
    if (status === 'resolvido') {
      demanda.arquivado = true
      db.historico.push({ demanda_id: req.params.id, usuario_id: req.user.id, acao: 'Arquivada automaticamente ao resolver', created_at: new Date() })
    }
    
    if ((status === 'novo' || status === 'atendimento') && demanda.arquivado) {
      demanda.arquivado = false
      db.historico.push({ demanda_id: req.params.id, usuario_id: req.user.id, acao: 'Desarquivada automaticamente ao reativar', created_at: new Date() })
    }
  }
  if (prioridade && prioridade !== demanda.prioridade) {
    db.historico.push({ demanda_id: req.params.id, usuario_id: req.user.id, acao: 'Prioridade alterada', campo: 'prioridade', valor_anterior: demanda.prioridade, valor_novo: prioridade, created_at: new Date() })
    demanda.prioridade = prioridade
  }
  if (resposta !== undefined) demanda.resposta = resposta
  if (observacoes !== undefined) demanda.observacoes = observacoes
  if (responsavel !== undefined) demanda.responsavel = responsavel
  demanda.updated_at = new Date()

  res.json({ message: 'Demanda atualizada com sucesso' })
})

app.put('/api/demandas/:id/arquivar', authMiddleware, (req, res) => {
  const { arquivar } = req.body
  const demanda = db.demandas.find(d => d._id === req.params.id)
  if (!demanda) return res.status(404).json({ error: 'Demanda não encontrada' })
  demanda.arquivado = arquivar
  db.historico.push({ demanda_id: req.params.id, usuario_id: req.user.id, acao: arquivar ? 'Arquivada' : 'Desarquivada', created_at: new Date() })
  res.json({ message: arquivar ? 'Demanda arquivada' : 'Demanda desarquivada' })
})

app.delete('/api/demandas/:id', authMiddleware, (req, res) => {
  const index = db.demandas.findIndex(d => d._id === req.params.id)
  if (index === -1) return res.status(404).json({ error: 'Demanda não encontrada' })
  db.demandas.splice(index, 1)
  db.historico = db.historico.filter(h => h.demanda_id !== req.params.id)
  res.json({ message: 'Demanda excluída com sucesso' })
})

app.get('/api/bairros', authMiddleware, (req, res) => {
  const bairros = [...new Set(db.demandas.filter(d => d.bairro).map(d => d.bairro))].sort()
  res.json(bairros)
})

app.get('/api/usuarios/operadores', authMiddleware, (req, res) => {
  const usuarios = db.usuarios.filter(u => ['admin', 'operador'].includes(u.role) && u.ativo).map(u => ({ _id: u._id, nome: u.nome, username: u.username }))
  res.json(usuarios)
})

app.get('/api/templates', authMiddleware, (req, res) => {
  res.json(db.templates)
})

app.get('/api/categorias', (req, res) => {
  res.json([
    { id: 'saude', nome: 'Saúde', icon: '🏥' },
    { id: 'infraestrutura', nome: 'Infraestrutura', icon: '🚧' },
    { id: 'social', nome: 'Assistência Social', icon: '🤝' },
    { id: 'educacao', nome: 'Educação', icon: '📚' },
    { id: 'meio_ambiente', nome: 'Meio Ambiente', icon: '🌳' },
    { id: 'seguranca', nome: 'Segurança', icon: '🚔' },
    { id: 'outros', nome: 'Outros', icon: '📋' }
  ])
})

// Dashboard avançado - estatísticas por período
app.get('/api/dashboard/avancado', authMiddleware, (req, res) => {
  const demandas = db.demandas.filter(d => !d.arquivado)
  
  // Demandas por categoria
  const porCategoria = {}
  demandas.forEach(d => {
    const cat = d.categoria || 'outros'
    porCategoria[cat] = (porCategoria[cat] || 0) + 1
  })
  
  // Demanda por mês (últimos 6 meses)
  const porMes = {}
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' })
    porMes[key] = demandas.filter(dm => {
      const dmDate = new Date(dm.created_at)
      return dmDate.getMonth() === d.getMonth() && dmDate.getFullYear() === d.getFullYear()
    }).length
  }
  
  // Tempo médio de resolução (demandas resolvidas nos últimos 30 dias)
  const resolvidasUltimos30 = demandas.filter(d => {
    if (d.status !== 'resolvido') return false
    const diff = Date.now() - new Date(d.updated_at).getTime()
    return diff <= 30 * 24 * 60 * 60 * 1000
  })
  
  let tempoMedioDias = 0
  if (resolvidasUltimos30.length > 0) {
    const somaDias = resolvidasUltimos30.reduce((acc, d) => {
      const diff = new Date(d.updated_at) - new Date(d.created_at)
      return acc + Math.floor(diff / (1000 * 60 * 60 * 24))
    }, 0)
    tempoMedioDias = Math.round(somaDias / resolvidasUltimos30.length)
  }
  
  // Taxa de resolução
  const total = demandas.length
  const resolvidas = demandas.filter(d => d.status === 'resolvido').length
  const taxaResolucao = total > 0 ? Math.round((resolvidas / total) * 100) : 0
  
  // Ranking de operadores por demandas resolvidas
  const rankingOperadores = {}
  db.usuarios.filter(u => u.ativo && u.role !== 'visualizador').forEach(u => {
    const qtd = demandas.filter(d => d.responsavel?._id === u._id || d.responsavel === u._id).length
    rankingOperadores[u.nome || u.username] = qtd
  })
  
  res.json({
    porCategoria,
    porMes,
    tempoMedioDias,
    taxaResolucao,
    total,
    resolvidas,
    pendentes: demandas.filter(d => d.status === 'novo').length,
    andamento: demandas.filter(d => d.status === 'atendimento').length,
    rankingOperadores
  })
})

app.get('/api/relatorio', authMiddleware, (req, res) => {
  const demandas = db.demandas.filter(d => !d.arquivado)
  const demandasArquivadas = db.demandas.filter(d => d.arquivado)
  
  const now = new Date()
  const primeiroDia = new Date(now.getFullYear(), 0, 1)
  const demandasAno = demandas.filter(d => new Date(d.created_at) >= primeiroDia)
  
  const escape = (str) => String(str || '').replace(/[&<>"']/g, (m) => ({'&': '&amp;','<': '&lt;','>': '&gt;','"': '&quot;',"'": '&#39;'}[m]))
  const formatDate = (d) => {
    const date = new Date(d)
    return ('0' + date.getDate()).slice(-2) + '/' + ('0' + (date.getMonth() + 1)).slice(-2) + '/' + date.getFullYear()
  }
  const getStatus = (s) => s === 'novo' ? 'Novo' : s === 'atendimento' ? 'Em Atendimento' : 'Resolvido'
  
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <title>Relatorio CRM - Paulinho Pereira</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { color: #1e3a5f; border-bottom: 3px solid #d4af37; padding-bottom: 10px; }
    h2 { color: #1e3a5f; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #1e3a5f; color: white; }
    tr:hover { background: #f5f5f5; }
    .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
    .stat-box { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 32px; font-weight: bold; color: #1e3a5f; }
    .stat-label { color: #666; margin-top: 5px; }
    .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; }
    .status-novo { color: #ffc107; }
    .status-atendimento { color: #0d6efd; }
    .status-resolvido { color: #198754; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>Relatorio de Demandas</h1>
  <p><strong>Paulinho Pereira - CRM</strong></p>
  <p>Data de geracao: ${formatDate(now)} ${now.getHours()}:${('0' + now.getMinutes()).slice(-2)}</p>
  
  <h2>Resumo Geral</h2>
  <div class="stat-grid">
    <div class="stat-box">
      <div class="stat-value">${demandas.length}</div>
      <div class="stat-label">Demandas Ativas</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${demandasAno.length}</div>
      <div class="stat-label">Este Ano</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${demandasArquivadas.length}</div>
      <div class="stat-label">Arquivadas</div>
    </div>
  </div>
  
  <div class="stat-grid">
    <div class="stat-box">
      <div class="stat-value">${demandas.filter(d => d.status === 'novo').length}</div>
      <div class="stat-label">Novas</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${demandas.filter(d => d.status === 'atendimento').length}</div>
      <div class="stat-label">Em Andamento</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${demandas.filter(d => d.status === 'resolvido').length}</div>
      <div class="stat-label">Resolvidas</div>
    </div>
  </div>
  
  <h2>Por Categoria</h2>
  <table>
    <tr><th>Categoria</th><th>Quantidade</th><th>%</th></tr>
    ${Object.entries(demandas.reduce((acc, d) => {
      const cat = d.categoria || 'outros'
      acc[cat] = (acc[cat] || 0) + 1
      return acc
    }, {})).map(([cat, qtd]) => `<tr><td>${escape(cat)}</td><td>${qtd}</td><td>${Math.round(qtd/demandas.length*100)}%</td></tr>`).join('')}
  </table>
  
  <h2>Por Bairro</h2>
  <table>
    <tr><th>Bairro</th><th>Quantidade</th><th>%</th></tr>
    ${Object.entries(demandas.reduce((acc, d) => {
      const b = d.bairro || 'Nao informado'
      acc[b] = (acc[b] || 0) + 1
      return acc
    }, {})).sort((a,b) => b[1] - a[1]).slice(0, 10).map(([b, qtd]) => `<tr><td>${escape(b)}</td><td>${qtd}</td><td>${Math.round(qtd/demandas.length*100)}%</td></tr>`).join('')}
  </table>
  
  <h2>Demandas Recentes (ativas)</h2>
  <table>
    <tr><th>Data</th><th>Nome</th><th>Bairro</th><th>Categoria</th><th>Status</th></tr>
    ${demandas.slice(0, 20).map(d => `
      <tr>
        <td>${formatDate(d.created_at)}</td>
        <td>${escape(d.nome)}</td>
        <td>${escape(d.bairro) || '-'}</td>
        <td>${escape(d.categoria) || '-'}</td>
        <td class="status-${d.status}">${getStatus(d.status)}</td>
      </tr>
    `).join('')}
  </table>
  
  <div class="footer">
    <p>Gerado pelo CRM Paulinho Pereira - ${now.getFullYear()}</p>
  </div>
  
  <script>window.print()</script>
</body>
</html>
  `
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
})

// Upload de arquivo (base64)
app.post('/api/demandas/:id/arquivo', authMiddleware, express.json(), (req, res) => {
  const { arquivo, tipo } = req.body
  const demanda = db.demandas.find(d => d._id === req.params.id)
  if (!demanda) return res.status(404).json({ error: 'Demanda nao encontrada' })
  
  if (!arquivo || arquivo.length > 5000000) {
    return res.status(400).json({ error: 'Arquivo invalido ou muito grande (max 5MB)' })
  }
  
  if (!demanda.arquivos) demanda.arquivos = []
  demanda.arquivos.push({
    id: uuidv4(),
    data: arquivo,
    tipo: tipo || 'imagem',
    nome: req.body.nome || 'anexo',
    created_at: new Date()
  })
  
  db.historico.push({ demanda_id: req.params.id, usuario_id: req.user.id, acao: 'Arquivo adicionado', created_at: new Date() })
  res.json({ message: 'Arquivo adicionado com sucesso' })
})

// Baixar arquivo
app.get('/api/demandas/:id/arquivo/:arquivoId', authMiddleware, (req, res) => {
  const demanda = db.demandas.find(d => d._id === req.params.id)
  if (!demanda) return res.status(404).json({ error: 'Demanda nao encontrada' })
  
  const arquivo = demanda.arquivos?.find(a => a.id === req.params.arquivoId)
  if (!arquivo) return res.status(404).json({ error: 'Arquivo nao encontrado' })
  
  res.json(arquivo)
})

// Relatorio por periodo
app.get('/api/relatorio/periodo', authMiddleware, (req, res) => {
  const { inicio, fim } = req.query
  if (!inicio || !fim) return res.status(400).json({ error: 'Data inicial e final sao obrigatorias' })
  
  const dataInicio = new Date(inicio)
  const dataFim = new Date(fim)
  dataFim.setHours(23, 59, 59)
  
  const demandas = db.demandas.filter(d => {
    const data = new Date(d.created_at)
    return data >= dataInicio && data <= dataFim
  })
  
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <title>Relatorio Periodo - Paulinho Pereira</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { color: #1e3a5f; border-bottom: 3px solid #d4af37; padding-bottom: 10px; }
    h2 { color: #1e3a5f; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #1e3a5f; color: white; }
    .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
    .stat-box { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 32px; font-weight: bold; color: #1e3a5f; }
    .stat-label { color: #666; margin-top: 5px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>Relatorio de Demandas</h1>
  <p><strong>Periodo:</strong> ${dataInicio.toLocaleDateString('pt-BR')} ate ${dataFim.toLocaleDateString('pt-BR')}</p>
  <p>Total de demandas no periodo: <strong>${demandas.length}</strong></p>
  
  <h2>Por Status</h2>
  <div class="stat-grid">
    <div class="stat-box"><div class="stat-value">${demandas.filter(d => d.status === 'novo').length}</div><div class="stat-label">Novas</div></div>
    <div class="stat-box"><div class="stat-value">${demandas.filter(d => d.status === 'atendimento').length}</div><div class="stat-label">Em Andamento</div></div>
    <div class="stat-box"><div class="stat-value">${demandas.filter(d => d.status === 'resolvido').length}</div><div class="stat-label">Resolvidas</div></div>
  </div>
  
  <h2>Por Categoria</h2>
  <table>
    <tr><th>Categoria</th><th>Quantidade</th></tr>
    ${Object.entries(demandas.reduce((acc, d) => {
      const cat = d.categoria || 'outros'
      acc[cat] = (acc[cat] || 0) + 1
      return acc
    }, {})).map(([cat, qtd]) => `<tr><td>${cat}</td><td>${qtd}</td></tr>`).join('')}
  </table>
  
  <h2>Todas as Demandas</h2>
  <table>
    <tr><th>Data</th><th>Nome</th><th>Bairro</th><th>Categoria</th><th>Status</th></tr>
    ${demandas.map(d => `
      <tr>
        <td>${new Date(d.created_at).toLocaleDateString('pt-BR')}</td>
        <td>${d.nome}</td>
        <td>${d.bairro || '-'}</td>
        <td>${d.categoria || '-'}</td>
        <td>${d.status === 'novo' ? 'Novo' : d.status === 'atendimento' ? 'Andamento' : 'Resolvido'}</td>
      </tr>
    `).join('')}
  </table>
  
  <script>window.print()</script>
</body>
</html>
  `
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
})

// Backup do banco de dados
app.get('/api/backup', authMiddleware, (req, res) => {
  if (user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' })
  
  const backup = {
    demandas: db.demandas,
    usuarios: db.usuarios.map(u => ({ ...u, password: '***' })),
    historico: db.historico,
    categorias: db.categorias,
    exported_at: new Date()
  }
  
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', `attachment; filename=backup_${new Date().toISOString().split('T')[0]}.json`)
  res.send(JSON.stringify(backup, null, 2))
})

console.log('Login: admin / admin123')
app.listen(PORT)