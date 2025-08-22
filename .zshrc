# ==============================================================================
# Zsh Configuration (~/.zshrc)
# ==============================================================================

alias "gca"="git add . && git commit -m"

# ------------------------------------------------------------------------------
# §1. 環境變數 (Environment Variables)
# ------------------------------------------------------------------------------

export LANG="zh_TW.UTF-8"

export EDITOR="nvim"
export VISUAL=$EDITOR

# Disable brew auto update
export HOMEBREW_NO_AUTO_UPDATE=1

# Enable concurrent Downloads
export HOMEBREW_DOWNLOADS_CONCURRENCY=1

# Set default config directory to home path
export XDG_CONFIG_HOME="$HOME/.config"

# tj/n (node.js version manager)
export N_PREFIX="$HOME/.n"
export PATH="$N_PREFIX/bin:$PATH"

# Globlely add Repostory path cd execute
cdpath=("$HOME/Documents/Repostory" $cdpath)


# ------------------------------------------------------------------------------
# §2. 外掛與框架初始化 (Plugins & Frameworks)
# ------------------------------------------------------------------------------

# Starship
eval "$(starship init zsh)"

# Set up fzf key bindings and fuzzy completion
source <(fzf --zsh)

# Antidote
source $(brew --prefix)/opt/antidote/share/antidote/antidote.zsh
antidote load

# ------------------------------------------------------------------------------
# §3. 自訂函式 (Functions)
# ------------------------------------------------------------------------------

# Get current directory in finder
pfd() {
  osascript 2> /dev/null <<EOF
  tell application "Finder"
    return POSIX path of (target of window 1 as alias)
  end tell
EOF
}

# Quick cd to current directory in finder from terminal
cdf() { cd "$(pfd)"; }

# Make a folder and enter it
mkd() { mkdir -p "$1" && cd "$1"; }

# Touch a file and make upper directory if is doesn't exist
touch() { mkdir -p "$(dirname "$1")" && command touch "$1"; }

# --- 目錄特定的別名函式 ---

# 檢查是否在 miniblog 專案目錄下
_is_in_miniblog_project() {
  # 將目標目錄路徑中的 ~ 展開為您的家目錄
  local target_dir="$HOME/Documents/Repostory/miniblog"

  # 判斷目前目錄是否為目標目錄或其任何子目錄
  if [[ "$PWD" == "$target_dir" || "$PWD" == "$target_dir"/* ]]; then
    return 0 # 成功 (true)
  else
    return 1 # 失敗 (false)
  fi
}

# 定義 dev "別名"
dev() {
  if _is_in_miniblog_project; then
    # 在 miniblog 目錄下，執行 npm run dev
    echo "在 miniblog 專案中，執行: npm run dev"
    npm run dev
  else
    # 在其他目錄下，提示指令不可用或執行預設行為
    echo "錯誤：'dev' 指令僅在 miniblog 專案目錄下可用。"
    # 或者，如果您希望在其他地方執行系統原有的 dev 指令，可以使用 `command dev "$@"`
    # 但通常情況下，提示錯誤是更安全的選擇
    return 1
  fi
}

# 定義 format "別名"
format() {
  if _is_in_miniblog_project; then
    # 在 miniblog 目錄下，執行 npm run format
    echo "在 miniblog 專案中，執行: npm run format"
    npm run format
  else
    # 在其他目錄下，提示指令不可用
    echo "錯誤：'format' 指令僅在 miniblog 專案目錄下可用。"
    return 1
  fi
}

