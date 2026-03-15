#!/bin/bash
# Mac Mini Agent Wrapper — Setup Script
# Run this on your Mac mini to get everything running

set -e

echo "┌─────────────────────────────────────────┐"
echo "│  Mac Mini Agent Wrapper — Setup          │"
echo "└─────────────────────────────────────────┘"
echo ""

# 1. Check prerequisites
echo "▶ Checking prerequisites..."

if ! command -v node &> /dev/null; then
  echo "✗ Node.js not found. Install it:"
  echo "  brew install node"
  exit 1
fi
echo "  ✓ Node.js $(node --version)"

if ! command -v claude &> /dev/null; then
  echo "✗ Claude Code CLI not found. Install it:"
  echo "  npm install -g @anthropic-ai/claude-code"
  exit 1
fi
echo "  ✓ Claude Code CLI found"

# 2. Install dependencies
echo ""
echo "▶ Installing dependencies..."
cd "$(dirname "$0")"
npm install

# 3. Create data directory
mkdir -p data

# 4. Auth token
echo ""
echo "▶ Security setup"
TOKEN_FILE="$(dirname "$0")/data/auth-token"
if [ -f "$TOKEN_FILE" ]; then
  echo "  ✓ Auth token already exists"
  echo "  Token: $(cat "$TOKEN_FILE")"
else
  echo "  Auth token will be auto-generated on first start."
  echo "  Check the server terminal output for your token."
fi
echo ""
echo "  The dashboard requires this token to log in."
echo "  You can also override it: export AGENT_API_KEY=your-custom-key"
echo ""

# 5. Check for cloudflared (optional, for remote access)
echo "▶ Remote access setup (optional)"
if command -v cloudflared &> /dev/null; then
  echo "  ✓ cloudflared found — you can expose the agent remotely"
  echo "    Run: cloudflared tunnel --url http://localhost:3456"
else
  echo "  cloudflared not installed. To access from your phone remotely:"
  echo "    brew install cloudflared"
  echo "    cloudflared tunnel --url http://localhost:3456"
  echo ""
  echo "  Or on your local network, just use your Mac mini's IP:"
  echo "    http://$(hostname).local:3456"
fi

echo ""
echo "┌─────────────────────────────────────────┐"
echo "│  Setup complete!                        │"
echo "│                                         │"
echo "│  Start the agent:                       │"
echo "│    npm start                            │"
echo "│                                         │"
echo "│  Or with tmux (persistent):             │"
echo "│    tmux new -s agent 'npm start'        │"
echo "│                                         │"
echo "│  Then open on your phone:               │"
echo "│    http://$(hostname).local:3456        │"
echo "└─────────────────────────────────────────┘"
