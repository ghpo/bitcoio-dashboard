# 🎓 Tutorial — bitcoio DeFi Dashboard

> Controle total das suas trades na Stacks com alertas no Telegram

---

## 📋 Pré-requisitos

- ✅ **Node.js 22+** (via nvm)
- ✅ **Bun** — `curl -fsSL https://bun.sh/install | bash`
- ✅ **Stacks Wallet** com keystore em `~/.aibtc/wallets/`
- ✅ **Bitflow Swap Aggregator** — clone `aibtcdev/skills` em `~/.openclaw/workspace/.agents/`
- ✅ **Telegram** (opcional, para alertas)

---

## 🚀 Instalação (3 minutos)

```bash
# Clone
git clone https://github.com/GHPO/bitcoio-dashboard.git
cd bi***

# Dependencies
npm install

# Configure
cp .env.example .env.local
# Adicione seus endpoints Bitflow e token do Telegram

# Build & Run
npm run build
npm start -p 3002
```

Abra **http://localhost:3002** no navegador ou celular.

---

## 🔐 1. Conectar sua Wallet

1. Clique em **🔐 Unlock** no header
2. Digite sua senha do keystore
3. ✅ Bolinha verde + saldo aparecem

![Wallet unlocked — saldo USDCx visível](https://via.placeholder.com/300x80/0a0f0c/4ade80?text=💰+$5.26+USDCx)

---

## 🛒 2. Comprar Tokens

1. Na aba **Trade**, selecione DOG, sBTC ou STX
2. Veja o preço live abaixo do nome do token
3. Digite o valor em USDCx no input gigante
4. O dashboard mostra:
   - 💰 Seu saldo atual
   - 📉 **"Após compra"** — quanto sobra
   - 🎯 **"Você recebe X.XX DOG"** — preview da quantidade
5. Clique em **Buy DOG**
6. Confirme no modal → 🎉 **Confetes!**

![Trade panel — input USDCx, preview, buy button](https://via.placeholder.com/300x200/0a0f0c/4ade80?text=Buy+DOG+Preview)

---

## 💰 3. Vender Posições

1. Vá para aba **Posições**
2. Veja cartão com P&L em tempo real:
   - 🟢 **Verde** = lucro
   - 🔴 **Vermelho** = prejuízo
3. Clique **Sell** → modal com preço de venda real
4. ⏳ Aguarde o fetch do preço (~5s)
5. Escolha 25%, 50%, 100% ou valor customizado
6. ✅ **Confirm Sell** libera quando o preço carregar
7. Venda executada on-chain → confetes + toast

![Position card with P&L](https://via.placeholder.com/300x150/0a0f0c/f87171?text=P%26L+-5.2%25)

---

## 🔔 4. Alertas no Telegram (DIFERENCIAL!)

Configure o `.env.local`:

```env
TELEGRAM_BOT_TOKEN=seu_t…aqui
TELEGRAM_CHAT_ID=seu_chat_id
```

**Alertas automáticos:**

| Gatilho | Frequência | Mensagem |
|---------|-----------|----------|
| 💰 Lucro ≥3% | A cada 5 min | "DOG atingiu +5.2% de lucro! P&L: $3.42" |
| ⚠️ Alta volatilidade | Quando detectado | "⚠️ DOG subiu 7.3% em 5min" |
| 📊 Resumo | A cada 4h | Todas posições + análise de spread buy/sell |

**Você nunca perde uma oportunidade de lucro.** 📱

Para ativar os alertas, configure o cron:

```bash
crontab -e
```

Adicione:
```
*/5 * * * * curl http://localhost:3002/api/monitor
0 */4 * * * curl -X POST http://localhost:3002/api/monitor
@reboot sleep 10 && ~/.../projects/defi-dashboard-pro/daemon/start-dashboard.sh
```

---

## 📟 Ticker Banner

No topo do dashboard, um banner rola infinitamente com:
- **Preços live** — DOG, sBTC, STX com variação ▲▼
- **🟢/🔴** colorido — verde sobe, vermelho desce
- **Volatilidade** — "Alta volatilidade" ou "Baixa volatilidade"

---

## 🎯 Fluxo Completo

```
Unlock Wallet → Ver Saldo → Selecionar Token → Ver Preço →
Digitar Valor → Preview Quantidade → Confirmar Compra →
Swap On-Chain → Confetes 🎉 → Posição Aberta → Monitorar P&L →
Receber Alerta Telegram → Vender com Lucro → Repetir 🔁
```

---

## 🛡️ Segurança

- Chave privada **nunca sai do servidor**
- Keystore criptografado com AES-256-GCM
- Senha armazenada apenas no `localStorage` do navegador
- API routes no servidor local (sem exposição externa)

---

## 🧪 Troubleshooting

| Problema | Solução |
|----------|---------|
| "Wallet locked" | Clique Unlock e digite a senha |
| Preços "---" | Aguarde ~5s (primeira carga busca on-chain) |
| "Saldo insuficiente" | Aparece modal explicando quanto tem vs quanto quer gastar |
| Sell "fetching..." infinito | Aguarde ~5s — busca preço de venda real via Bitflow |
| Botão Confirm Sell travado | Só libera quando `/api/quote` retorna o preço real |

---

**Feito com 💚 para a comunidade Bitflow + AIBTC**
