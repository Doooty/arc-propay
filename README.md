Arc ProPay

USDC Payments on Arc

""Built on Arc" (https://img.shields.io/badge/Built%20on-Arc-blue)" (https://arc.network/)
""Network" (https://img.shields.io/badge/Network-Arc%20Testnet-orange)" (https://arc-propay.netlify.app/)
""Solidity" (https://img.shields.io/badge/Solidity-0.8.28-blue)" (https://soliditylang.org/)

Overview

Arc ProPay is a USDC payment application built with Arc Studio and designed to explore stablecoin-powered payment experiences on the Arc blockchain.

The project combines a modern web interface with blockchain infrastructure to make interacting with USDC payments more accessible.

🔗 Live Demo: https://arc-propay.netlify.app/

Key Features

- USDC-focused payment application.
- Arc Testnet integration.
- Wallet connectivity using Wagmi and ConnectKit.
- Blockchain interaction powered by Viem.
- Solidity smart contract development using Foundry.
- Responsive frontend built with React and Tailwind CSS.

Features should be adjusted to match the functionality currently implemented in the application.

Technology Stack

Technology| Purpose
Arc| Blockchain infrastructure
USDC| Payment token
React| Frontend
TypeScript| Application logic
Vite| Development and build
Tailwind CSS| Styling
Wagmi & Viem| Blockchain connectivity
ConnectKit| Wallet connection
Solidity| Smart contracts
Foundry| Contract development and testing

Network Configuration

Property| Value
Network| Arc Testnet
Chain ID| 5042002
Token| USDC
Token decimals| 6
Token address| "0x3600000000000000000000000000000000000000"

Getting Started

Prerequisites

- Bun
- Node.js
- A compatible Web3 wallet
- Access to Arc Testnet

Installation

Clone the repository:

git clone https://github.com/Doooty/arc-propay.git
cd arc-propay

Install dependencies:

bun install

Start the development server:

bun run dev

Smart Contracts

Build contracts:

bun run contracts:build

Run contract tests:

bun run contracts:test

Project Structure

arc-propay/
├── contracts/     # Solidity smart contracts
├── scripts/       # Deployment and utility scripts
├── src/           # Application source code
├── lib/           # Contract libraries
├── index.html
├── package.json
├── foundry.toml
└── vite.config.ts

Project Links

- Live Application: https://arc-propay.netlify.app/
- GitHub Repository: https://github.com/Doooty/arc-propay
- Arc Website: https://arc.network/

Feedback and Contributions

Feedback, suggestions, and contributions are welcome.

If you find an issue or have an idea for improvement, feel free to open an issue or submit a pull request.

Disclaimer

Arc ProPay is an experimental project. Always verify payment details, wallet addresses, network selection, and transaction information before confirming a transaction.

---

Built with Arc Studio. Powered by USDC.
