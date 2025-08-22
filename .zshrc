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
if [[ "${widgets[zle-keymap-select]#user:}" == "starship_zle-keymap-select" || \
      "${widgets[zle-keymap-select]#user:}" == "starship_zle-keymap-select-wrapped" ]]; then
    zle -N zle-keymap-select "";
fi
eval "$(starship init zsh)"

# Set up fzf key bindings and fuzzy completion
source <(fzf --zsh)

# Antidote
source $(brew --prefix)/opt/antidote/share/antidote/antidote.zsh
antidote load

# ------------------------------------------------------------------------------
# §3. 自訂函式 (Functions)
# ------------------------------------------------------------------------------

pfd() {
  osascript 2> /dev/null <<EOF
  tell application "Finder"
    return POSIX path of (target of window 1 as alias)
  end tell
EOF
}

cdf() { cd "$(pfd)"; }

mkd() { mkdir -p "$1" && cd "$1"; }

touch() { mkdir -p "$(dirname "$1")" && command touch "$1"; }

_is_in_miniblog_project() {
  local target_dir="$HOME/Documents/Repostory/miniblog"

  if [[ "$PWD" == "$target_dir" || "$PWD" == "$target_dir"/* ]]; then
    return 0
  else
    return 1
  fi
}

dev() {
  if _is_in_miniblog_project; then
    echo "在 miniblog 專案中，執行: npm run dev"
    npm run dev
  else
    echo "錯誤：'dev' 指令僅在 miniblog 專案目錄下可用。"
    return 1
  fi
}

format() {
  if _is_in_miniblog_project; then
    echo "在 miniblog 專案中，執行: npm run format"
    npm run format
  else
    echo "錯誤：'format' 指令僅在 miniblog 專案目錄下可用。"
    return 1
  fi
}

