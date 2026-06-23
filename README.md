<div align="center">
  <br/>
  <img src="client/public/favicon.svg" alt="CloakTalk Logo" width="80" height="80"/>
  <h1>CloakTalk 🔐</h1>
  <p><strong>End-to-end encrypted messaging with Google login and 6-digit session PIN lock</strong></p>

  <p>
    <img src="https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white" alt="React 18"/>
    <img src="https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white" alt="Vite 5"/>
    <img src="https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white" alt="Express 4"/>
    <img src="https://img.shields.io/badge/Socket.IO-4.7-010101?logo=socket.io&logoColor=white" alt="Socket.IO"/>
    <img src="https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white" alt="SQLite"/>
    <img src="https://img.shields.io/badge/Passport-Google_OAuth-4285F4?logo=google&logoColor=white" alt="Google OAuth"/>
  </p>
  <p>
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"/>
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"/>
  </p>
</div>

---

**CloakTalk** is a privacy-first messaging app where your conversations are truly private. Messages are encrypted on your device using the Web Crypto API before they ever reach the server — not even the server can read them. A 6-digit PIN keeps your session locked and your encryption keys safe.

## Features ✨

- 🔒 **End-to-End Encrypted** — Messages encrypted with AES-256-GCM via ECDH key exchange
- 🔑 **Google Login** — One-click authentication via Google OAuth 2.0
- 🔐 **Session PIN Lock** — 6-digit PIN encrypts your private key locally via PBKDF2
- ⚡ **Real-time Messaging** — Instant delivery via Socket.IO with typing indicators
- 👤 **Online Presence** — See who's online with live status indicators
- 🛡️ **Zero-Knowledge** — Server stores only encrypted ciphertext; your private key never leaves your device

## How E2E Encryption Works 🧬

```
┌─ Your Browser ─────────────────────┐       ┌── Server ──┐       ┌─ Recipient's Browser ──┐
│                                    │       │            │       │                        │
│  1. Generate ECDH key pair         │       │            │       │  1. Generate ECDH pair │
│  2. Upload public key ─────────────┼──────►│  Store     │◄──────┼── 2. Upload public key │
│                                    │       │  public    │       │                        │
│  3. Fetch recipient's public key ◄─┼───────│  keys      ├───────┼── 3. Fetch your pub key │
│                                    │       │            │       │                        │
│  4. Derive shared secret via ECDH  │       │  Relay     │       │  4. Derive same secret │
│  5. Encrypt message with AES-GCM  ─┼──────►│  ciphertext├──────►│  5. Decrypt with AES-GCM│
│                                    │       │            │       │                        │
└────────────────────────────────────┘       └────────────┘       └────────────────────────┘
```

## Tech Stack 🛠️

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, TailwindCSS, Socket.IO Client |
| **Backend** | Node.js, Express, Socket.IO, Passport.js |
| **Database** | SQLite (via better-sqlite3) |
| **Auth** | Google OAuth 2.0 (Passport Google Strategy), JWT |
| **Encryption** | Web Crypto API — ECDH (P-256), AES-256-GCM, PBKDF2, HKDF-SHA256 |

## Project Structure 📁

```
cloaktalk/
├── client/                      # React frontend
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── ChatBubble.jsx   # Message bubble display
│   │   │   ├── Navbar.jsx       # Top navigation bar
│   │   │   └── ProtectedRoute.jsx  # Auth/route guard
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Auth state + crypto key management
│   │   ├── pages/
│   │   │   ├── Login.jsx        # Google OAuth login
│   │   │   ├── PinSetup.jsx     # Initial 6-digit PIN setup
│   │   │   ├── LockScreen.jsx   # Session unlock with PIN
│   │   │   ├── Dashboard.jsx    # User list + search
│   │   │   └── Chat.jsx         # Encrypted messaging view
│   │   ├── utils/
│   │   │   ├── crypto.js        # E2E encryption (ECDH, AES-GCM, PBKDF2, HKDF)
│   │   │   ├── api.js           # REST API client
│   │   │   └── socket.js        # Socket.IO client
│   │   ├── App.jsx              # Root component with routing
│   │   └── main.jsx             # Entry point
│   ├── public/favicon.svg       # App icon
│   └── ...config files
│
├── server/                      # Express backend
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js          # Google OAuth routes
│   │   │   ├── users.js         # User management routes
│   │   │   └── messages.js      # Message storage routes
│   │   ├── auth.js              # Passport config + JWT utilities
│   │   ├── db.js                # SQLite schema + queries
│   │   ├── socket.js            # Socket.IO event handlers
│   │   └── index.js             # Server entry point
│   ├── Procfile                 # Render process type
│   └── ...config files
│
├── render.yaml                  # Render Blueprint deployment config
├── .env.example                 # Environment variable template
├── .gitignore
└── README.md
```

## Quick Start 🚀

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A [Google Cloud Console](https://console.cloud.google.com/) project with OAuth credentials

### 1. Get Google OAuth Credentials

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Set Application type to **Web application**
6. Add these **Authorized redirect URIs**:
   - `http://localhost:3001/api/auth/google/callback` (development)
   - `https://your-app.onrender.com/api/auth/google/callback` (production)
7. Copy the generated **Client ID** and **Client Secret**

### 2. Clone and Install

```bash
git clone https://github.com/yourusername/cloaktalk.git
cd cloaktalk

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your Google OAuth credentials:

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

### 4. Run Development

Start both the server and client in separate terminals:

```bash
# Terminal 1 — Backend (runs on :3001)
cd server
npm run dev

# Terminal 2 — Frontend (runs on :5173)
cd client
npm run dev
```

Open **[http://localhost:5173](http://localhost:5173)** — you're in!

## Deployment 🚢

### Deploy to Render (One-Click)

This repo includes a [`render.yaml`](./render.yaml) Blueprint for easy deployment.

1. Push your code to a GitHub repository
2. In the [Render Dashboard](https://dashboard.render.com/), click **New** → **Blueprint**
3. Connect your repository
4. Set the required environment variables:
   - `GOOGLE_CLIENT_ID` — your Google OAuth client ID
   - `GOOGLE_CLIENT_SECRET` — your Google OAuth client secret
5. Click **Deploy Blueprint**

Render will automatically build the client, start the server, and provision everything.

### Manual Deploy on Render

Alternatively, create a **Web Service**:

| Setting | Value |
|---------|-------|
| **Build Command** | `cd server && npm install && cd ../client && npm install && npm run build` |
| **Start Command** | `cd server && npm start` |
| **Health Check Path** | `/api/health` |

## Security 🔐

- **Private keys never leave your device** — generated in-browser, stored encrypted in localStorage
- **6-digit PIN** encrypts your ECDH private key via **PBKDF2 (100,000 iterations + SHA-256)**
- **Messages encrypted end-to-end** — server stores only AES-GCM ciphertext
- **Shared secrets derived via ECDH (P-256)** — perfect forward secrecy when key pairs are rotated
- **JWT tokens use URL fragments** — avoids leaking tokens in server logs or `Referer` headers
- **5 failed PIN attempts** triggers automatic sign-out

> ⚠️ **Important:** If you forget your PIN, you lose access to your encryption keys. Old messages become permanently undecryptable. There is no backdoor.

## Contributing 🤝

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License 📄

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Built with ❤️ and the Web Crypto API</sub>
</div>
