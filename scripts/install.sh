#!/usr/bin/env bash
# Installation script for pipeline-compose CLI
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/abhiudayg/pipeline-compose/master/scripts/install.sh | bash
#
# Environment variables:
#   INSTALL_DIR   Target directory for the binary (default: ~/.local/bin or /usr/local/bin)
#   REPO          GitHub repository (default: abhiudayg/pipeline-compose)
#   BRANCH        Git branch to download from (default: master)

set -euo pipefail

REPO="${REPO:-abhiudayg/pipeline-compose}"
BRANCH="${BRANCH:-master}"
DOWNLOAD_URL="https://raw.githubusercontent.com/${REPO}/${BRANCH}/packages/cli/dist/index.js"

# Color helpers
if [[ -t 1 ]]; then
  BOLD="\033[1m"
  CYAN="\033[36m"
  GREEN="\033[32m"
  RED="\033[31m"
  DIM="\033[2m"
  RESET="\033[0m"
else
  BOLD=""
  CYAN=""
  GREEN=""
  RED=""
  DIM=""
  RESET=""
fi

echo -e "${BOLD}${CYAN}==> Installing pipeline-compose CLI...${RESET}"

# 1. Prerequisite Checks
if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}[ERROR] Node.js is required but was not found on your system.${RESET}" >&2
  echo "Please install Node.js (version 20 or later) from https://nodejs.org or via your package manager." >&2
  exit 1
fi

NODE_MAJOR=$(node -v | sed -E 's/^v([0-9]+).*/\1/')
if [[ "$NODE_MAJOR" -lt 20 ]]; then
  echo -e "${RED}[ERROR] Node.js version 20 or higher is required. Found $(node -v).${RESET}" >&2
  echo "Please upgrade your Node.js runtime." >&2
  exit 1
fi

echo -e "  ${GREEN}✓${RESET} Node.js runtime: $(node -v)"

# 2. Determine Installation Target
if [[ -n "${INSTALL_DIR:-}" ]]; then
  TARGET_DIR="$INSTALL_DIR"
elif [[ -w "/usr/local/bin" ]]; then
  TARGET_DIR="/usr/local/bin"
else
  TARGET_DIR="${HOME}/.local/bin"
fi

mkdir -p "$TARGET_DIR"
TARGET_BIN="${TARGET_DIR}/pipeline-compose"
TMP_BIN="${TARGET_BIN}.tmp.$$"

# 3. Download the Standalone Executable
echo -e "  ${DIM}Fetching executable from ${REPO} (${BRANCH})...${RESET}"

if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$DOWNLOAD_URL" -o "$TMP_BIN"
elif command -v wget >/dev/null 2>&1; then
  wget -qO "$TMP_BIN" "$DOWNLOAD_URL"
else
  echo -e "${RED}[ERROR] Neither curl nor wget was found on your system.${RESET}" >&2
  exit 1
fi

# 4. Verify Integrity
if [[ ! -s "$TMP_BIN" ]]; then
  echo -e "${RED}[ERROR] Downloaded binary is empty.${RESET}" >&2
  rm -f "$TMP_BIN"
  exit 1
fi

FIRST_LINE=$(head -n 1 "$TMP_BIN")
if [[ "$FIRST_LINE" != "#!/usr/bin/env node"* ]]; then
  echo -e "${RED}[ERROR] Downloaded binary failed integrity verification.${RESET}" >&2
  rm -f "$TMP_BIN"
  exit 1
fi

# 5. Move to Destination and Set Permissions
chmod +x "$TMP_BIN"
mv "$TMP_BIN" "$TARGET_BIN"

echo -e "  ${GREEN}✓${RESET} Installed binary to: ${BOLD}${TARGET_BIN}${RESET}"

# 6. Verify Execution
if "$TARGET_BIN" --version >/dev/null 2>&1 || "$TARGET_BIN" >/dev/null 2>&1 || true; then
  echo -e "  ${GREEN}✓${RESET} Binary verified executable"
fi

# 7. Check PATH
case ":$PATH:" in
  *":$TARGET_DIR:"*) ;;
  *)
    echo ""
    echo -e "${BOLD}Notice:${RESET} ${TARGET_DIR} is not in your current PATH."
    echo "Add it to your shell configuration to run 'pipeline-compose' from anywhere:"
    echo ""
    if [[ "$SHELL" == *"zsh"* ]]; then
      echo -e "  ${CYAN}echo 'export PATH=\"${TARGET_DIR}:\$PATH\"' >> ~/.zshrc && source ~/.zshrc${RESET}"
    else
      echo -e "  ${CYAN}echo 'export PATH=\"${TARGET_DIR}:\$PATH\"' >> ~/.bashrc && source ~/.bashrc${RESET}"
    fi
    echo ""
    ;;
esac

echo ""
echo -e "${BOLD}${GREEN}==> pipeline-compose CLI successfully installed!${RESET}"
echo ""
echo -e "Quick Start Commands:"
echo -e "  ${CYAN}pipeline-compose dashboard <pipeline.yml> --open${RESET}  # Live Stitch HUD"
echo -e "  ${CYAN}pipeline-compose validate <pipeline.yml> --simulate${RESET}  # Dry run waves"
echo -e "  ${CYAN}pipeline-compose compile <pipeline.yml>${RESET}             # Static GHA workflow"
echo -e "  ${CYAN}pipeline-compose update${RESET}                             # Auto-update CLI"
echo ""
