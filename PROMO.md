# 📢 Material de Divulgação

---

## Discord Bitflow — Canal `#builders` / `#showcase`

**Título:** 🏦 bitcoio — Dashboard DeFi com alertas no Telegram

**Corpo:**

Fala galera da **Bitflow**! 🚀

Construí um dashboard completo pra trading na Stacks usando o **Bitflow Swap Aggregator**. O diferencial? **Alertas no Telegram** — você nunca perde uma oportunidade de lucro.

### ✨ Features
- 📊 **Preços live** de DOG, sBTC e STX via Bitflow
- 🛒 **Compra e venda real** on-chain (swap execution)
- 📈 **P&L tracking** por posição e portfolio total
- 🔔 **Telegram**: alerta quando bate ≥3% de lucro, alta volatilidade, e resumo a cada 4h
- 📟 **Ticker banner** com variação de preços em tempo real
- ⚙️ **Settings modal**: import/export seed, trocar senha, backup do banco SQLite
- 🎨 **UX premium** — animações, glassmorphism, app-like (header fixo, zoom bloqueado)

### 🛠️ Stack
Next.js 16 + React 19 + TypeScript + Tailwind + Framer Motion + Bitflow SDK

### 🔗 Links
- GitHub: https://github.com/ghpo/bitcoio-dashboard
- Tutorial completo no repo

Feedbacks são bem-vindos! 🙏

---

## Discord AIBTC — Canal de agentes

**Título:** 🤖 bitcoio — Agente DeFi com wallet on-chain e alertas Telegram

**Corpo:**

E aí builders da **AIBTC**! 🌊

Meu agente **bitcoio** (#446, nível 2) agora tem um dashboard completo com **alertas no Telegram** como diferencial principal.

### 🤖 O agente
- **Wallet on-chain** com keystore AES-256-GCM
- **Swap execution** via Bitflow Aggregator
- **Monitoramento 24/7** com alertas condicionais
- **Resumo periódico** com análise de spread buy/sell
- ⚙️ **Settings**: import/export seed, trocar senha, backup SQLite

### 🔔 Alertas (diferencial!)
| Gatilho | O que faz |
|---------|-----------|
| Lucro ≥3% | 🚀 "DOG +5.2% — P&L $3.42" |
| Volatilidade ≥5% | ⚠️ "STX caiu 7.3% em 5min" |
| Resumo 4h | 📊 Todas posições + análise |

### 🎯 Por que isso importa
Agentes AIBTC precisam de **visibilidade** e **controle**. Com esse dashboard + alertas, você:
- Sabe na hora quando uma posição tá no lucro
- Recebe análise de mercado periódica
- Controla tudo por um dashboard web ou direto no celular
- Executa trades com confirmação visual e confetes 🎉
- Faz backup e restore do banco de posições

### 🔗 Links
- GitHub: https://github.com/GHPO2/bitcoio-dashboard
- Tutorial: TUTORIAL.md no repo
- Agente on-chain: #446 (identity-registry-v2)

---

## Twitter/X — Thread

**Tweet 1:**
Construí um dashboard DeFi pra Stacks com o diferencial que faltava: **alertas no Telegram** 📱🔔

Agora eu sei na HORA quando uma posição bate lucro, sem precisar ficar olhando tela.

🧵👇

**Tweet 2:**
🛒 Compra e venda real on-chain via @BitflowLabs
📊 P&L tracking por posição
🔔 Telegram: lucro ≥3%, volatilidade, resumo 4h
📟 Ticker com variação de preços
⚙️ Settings: seed, senha, backup SQLite

Tudo em Next.js + React 19 + TypeScript

**Tweet 3:**
O Dashboard foi feito pra parecer app nativo:
- Header fixo no topo
- Zoom e scroll bloqueados
- Modal de erro quando tenta gastar mais que o saldo
- Confetes 🎉 em trades bem-sucedidos
- Backup do banco em 1 clique

**Tweet 4:**
Código 100% aberto no GitHub:
github.com/GHPO2/bitcoio-dashboard

Tutorial completo pra instalar em 3 minutos.
Feedbacks são bem-vindos! 🚀

@BitflowLabs @Stacks @aibtcdev

---

## 📱 Acesso Mobile via Tailscale

O dashboard pode ser acessado de **qualquer lugar** pelo celular com segurança usando **Tailscale**.

### Setup
```bash
# No PC rodando o dashboard:
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# No celular:
# Instalar Tailscale (App Store / Google Play)
# Logar na mesma conta do PC
# Abrir: http://100.69.212.72:3002
```

### Vantagens
- 🔒 **Criptografia WireGuard** fim-a-fim
- 🚪 **Nenhuma porta exposta** na internet
- 🌐 Funciona de **4G/5G, Wi-Fi público, qualquer rede**
- 📲 Acesso completo ao dashboard + QR codes dos endereços
- 🤖 Telegram continua funcionando de qualquer lugar (Gateway via systemd)

---

## 📸 Screenshots sugeridos

1. **Dashboard completo** — Trade tab com input gigante, preços, saldo
2. **Modal de venda** — com P&L vermelho/verde e preço de venda real
3. **Alerta Telegram** — print da mensagem "DOG atingiu +5.2%"
4. **Posições abertas** — cards com P&L colorido
5. **Ticker banner** — rolando com variações ▲▼
6. **Settings modal** — abas Import, Export, Password, Backup

(Tire screenshots direto do dashboard em http://localhost:3002)
