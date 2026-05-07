# CRM Paulinho Pereira - Gestão de Demandas

CRM para gestão de demandas públicas integradas ao site político.

## 🚀 Como Executar

### Pré-requisitos
- Node.js (versão 18 ou superior)

### Instalação

```bash
cd crm
npm install
```

### Executar o Servidor

```bash
npm start
```

O CRM estará disponível em: `http://localhost:3001/admin`

### Credenciais Padrão
- **Usuário:** admin
- **Senha:** admin123

---

## 📡 API para Integração com o Site

O formulário do site pode enviar demandas diretamente para o CRM.

### Endpoint para Enviar Demanda

```
POST http://localhost:3001/api/demandas
Content-Type: application/json

{
  "nome": "Nome do cidadão",
  "bairro": "Bairro/Localidade",
  "contato": "(51) 99999-9999",
  "tipo": "Tipo da demanda",
  "mensagem": "Descrição da demanda"
}
```

### Exemplo de formulário HTML para integrar

```html
<form id="demo-form">
  <input type="text" name="nome" placeholder="Seu nome" required>
  <input type="text" name="bairro" placeholder="Bairro">
  <input type="tel" name="contato" placeholder="WhatsApp" required>
  <select name="tipo">
    <option value="">Tipo de demanda</option>
    <option value="sugestao">Sugestão</option>
    <option value="reclamacao">Reclamação</option>
    <option value="solicitacao">Solicitação</option>
    <option value="elogio">Elogio</option>
  </select>
  <textarea name="mensagem" placeholder="Sua mensagem" required></textarea>
  <button type="submit">Enviar</button>
</form>

<script>
document.getElementById('demo-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);
  
  const response = await fetch('http://localhost:3001/api/demandas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  if (response.ok) {
    alert('Demanda enviada com sucesso!');
    e.target.reset();
  } else {
    alert('Erro ao enviar demanda');
  }
});
</script>
```

---

## 🔐 Endpoints da API

| Método | Endpoint | Descrição | Autenticado |
|--------|----------|-----------|------------|
| POST | /api/login | Autenticar usuário | Não |
| GET | /api/dashboard/stats | Estatísticas do dashboard | Sim |
| GET | /api/demandas | Listar demandas | Sim |
| GET | /api/demandas/:id | Ver demanda específica | Sim |
| PUT | /api/demandas/:id | Atualizar demanda | Sim |
| DELETE | /api/demandas/:id | Excluir demanda | Sim |
| PUT | /api/demandas/:id/arquivar | Arquivar/Desarquivar | Sim |
| GET | /api/bairros | Listar bairros únicos | Sim |
| GET | /api/templates | Listar templates de resposta | Sim |

---

## 🎨 Estrutura de Arquivos

```
crm/
├── package.json           # Dependências do projeto
├── server/
│   └── index.js       # Servidor e API
├── public/
│   ├── index.html    # Interface do CRM
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
└── crm.db           # Banco de dados SQLite (criado automaticamente)
```

---

## ⚙️ Configuração

### Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|----------|-------|
| PORT | Porta do servidor | 3001 |
| JWT_SECRET | Chave secreta JWT | crm-paulinho-secret-key-2026 |

### Alterar Porta

No Windows PowerShell:
```powershell
$env:PORT = 3002; npm start
```

### Alterar Senha Padrão

A primeira vez que o servidor iniciar, a senha padrão `admin123` será criada. Para alterá-la, edite o arquivo `server/index.js` e reinicie o servidor.

---

## 📊 Status das Demandas

- 🟡 **Novo** - Demanda recebida, não vista
- 🔵 **Em Atendimento** - Em processo de resolução
- 🟢 **Resolvido** - Demanda atendida
- ⚫ **Arquivado** - Demanda arquivada (não aparece na lista principal)

---

## 🔗 Integração com Google Forms

Se o site usa Google Forms, você pode usar o Google Apps Script para enviar automaticamente ao CRM:

1. No Google Forms, vá em **Extensions > Apps Script**
2. Cole o código abaixo:

```javascript
function onFormSubmit(e) {
  const item = e.response.getItemResponses();
  const data = {
    nome: item[0].getResponse(),
    bairro: item[1].getResponse(),
    contato: item[2].getResponse(),
    tipo: item[3].getResponse(),
    mensagem: item[4].getResponse()
  };
  
  const options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(data)
  };
  
  UrlFetchApp.fetch('http://localhost:3001/api/demandas', options);
}
```

3. Salve e configure o gatilho para executar `onFormSubmit` no envio do formulário.

---

## 📱 Funcionalidades

- Dashboard com estatísticas em tempo real
- Listagem de demandas com filtros
- Busca por nome ou palavra-chave
- Alteração de status rápida
- Respostas com templates rápidos
- Campo de observações internas
- Cópia de resposta para WhatsApp
- Arquivamento e exclusão
- Design responsivo (funciona no celular)