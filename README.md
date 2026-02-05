# AI-First Company

Automatisiertes System zur Produktentwicklung mit AI-Agents.

## Struktur
├── scripts/ # Meta-Layer (Python) │ ├── agents/ # Agent-Implementierungen │ ├── pipeline/ # Pipeline-Orchestrierung │ └── utils/ # Shared Utilities │ ├── governance/ # System-weite Rules │ ├── CLAUDE.md # Agent Instructions │ ├── code-standards.yaml │ └── security-policies.yaml │ ├── products/ # Product-Layer │ └── {product-name}/ │ ├── specs/ # Feature Specifications │ ├── personas/ # User Personas │ ├── generated/ # Generated Code │ ├── feedback/ # User Feedback │ └── challenges/# Quality Reports │ ├── exploration/ # Learning Layer │ ├── insights/ # Wöchentliche Insights │ └── tasks/ # Exploration Tasks │ ├── templates/ # Project Templates └── docs/ # Documentation ├── architecture/ # ADRs (Architecture Decision Records) └── learnings/ # Learning Checkpoints


## Setup

```bash
# 1. Virtual Environment
python3 -m venv .venv
source .venv/bin/activate

# 2. Dependencies
pip3 install -r requirements.txt

# 3. Environment Variables
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# 4. Test API
python3 test_api.py
