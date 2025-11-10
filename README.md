# Shield Trade Loop

## Demo
- Live Demo: https://shield-trade-loop.vercel.app
- Demo Video: [demo.mp4](demo.mp4)

Shield Trade Loop is a minimal dApp that lets a trader publish a private swap offer where both amounts are encrypted end‑to‑end using FHEVM. The encrypted values are stored on‑chain and can be re‑encrypted and decrypted later by the user. This demonstrates a privacy‑preserving loop: encrypt → store → decrypt to reduce information leakage and MEV risk.

The project includes:
- A Solidity contract `ShieldTrade.sol` for storing a user’s latest encrypted offer (pay/receive amounts)
- A demo `FHECounter.sol` showcasing basic FHEVM interactions
- A Next.js frontend in `frontend/` with RainbowKit + Wagmi, wired to the deployed contracts

See `demo.mp4` in the repository root for a quick walkthrough.

## Quick Start

### Prerequisites
- Node.js 20+
- npm (or pnpm/yarn)
- MetaMask (for local and testnet interactions)

Optional but recommended for Sepolia:
- A funded Sepolia account private key
- A Sepolia RPC URL (e.g., Infura/Alchemy)

### Install dependencies

```bash
# From repo root
npm install

# Frontend deps
cd frontend && npm install
```

### Local development (Hardhat)

1) Start a local node (terminal A):
```bash
npx hardhat node
```

2) Deploy contracts to localhost (terminal B):
```bash
npx hardhat deploy --network localhost
```

3) Run the frontend (terminal C):
```bash
cd frontend
npm run dev
# Open http://localhost:3000
```

If the frontend cannot find deployments, it can auto‑deploy on a local Hardhat node (non‑Windows) when you run `npm run dev` because it runs `npm run genabi` first.

### Sepolia testnet

1) Configure environment (at repo root). You can use either a `.env` file based on `.env.example` or Hardhat vars. Typical options:
```bash
# .env
PRIVATE_KEY=0x<your-sepolia-deployer-private-key>
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/<YOUR_INFURA_KEY>
# or set INFURA_API_KEY instead of SEPOLIA_RPC_URL
```

2) Deploy to Sepolia:
```bash
npx hardhat deploy --network sepolia
```

3) (Optional) Verify a contract:
```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

4) Run the frontend pointed to Sepolia:
```bash
cd frontend
npm run dev
```
The frontend auto‑generates ABIs and addresses into `frontend/abi/` from Hardhat `deployments/`. If a Sepolia deployment exists, it will be picked up automatically.

## Contracts

### ShieldTrade.sol
Minimal private offer storage:
- `setOffer(externalEuint32 pay, externalEuint32 recv, bytes inputProof)`
  - Accepts two encrypted 32‑bit integers (pay/receive) and a single input proof
  - Stores encrypted values and grants decrypt/re‑encrypt permissions to the caller and contract
- `getMyOffer() returns (euint32 pay, euint32 recv)`
  - Returns the encrypted handles for the caller’s latest offer

### FHECounter.sol (demo)
Simple counter that reads/writes encrypted integers, illustrating basic FHEVM usage and Hardhat tasks.

## Frontend
- Located in `frontend/`
- Next.js + React + Tailwind, RainbowKit + Wagmi for wallet UX
- `npm run dev` starts the app and runs `scripts/genabi.mjs` to generate `ShieldTrade`/`FHECounter` ABIs and addresses

MetaMask local network settings (if needed):
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Currency symbol: `ETH`

## Scripts (root)
- `npm run compile` — Compile Solidity contracts
- `npm run test` — Run contract tests
- `npm run node` — Start a local Hardhat node
- `npx hardhat deploy --network <network>` — Deploy contracts

## Notes
- This is an MVP for educational purposes and not audited for production.
- Keep secrets out of version control. Use `.env` (see `.env.example`).

## License
BSD-3-Clause-Clear — see [LICENSE](LICENSE).
