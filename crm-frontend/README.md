# CRM Paulinho - Frontend

Frontend React do sistema de CRM para gestão de demandas políticas.

## Instalação

```bash
npm install
npm run dev
```

## Variáveis de Ambiente

Crie um arquivo `.env`:

```
VITE_API_URL=http://localhost:3001/api
```

## Deploy no Vercel

1. Conecte seu repositório GitHub no Vercel
2. Adicione a variável `VITE_API_URL` com a URL da sua API
3. Deploy automático

## Funcionalidades

- Dashboard com gráficos visuais
- Gestão de demandas com prioridades
- Histórico de alterações
- Múltiplos usuários (admin/operador/visualizador)
- Exportação CSV
- Busca avançada e filtros
- Responsivo