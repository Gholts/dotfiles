# Starship
if [[ "${widgets[zle-keymap-select]#user:}" == "starship_zle-keymap-select" || \
    "${widgets[zle-keymap-select]#user:}" == "starship_zle-keymap-select-wrapped" ]]; then
zle -N zle-keymap-select "";
fi
eval "$(starship init zsh)"

# Set up fzf key bindings and fuzzy completion
source <(fzf --zsh)
zstyle ':fzf-tab:*' fzf-preview '[[ -d $realpath ]] && { echo "       Directory: \e[1m$(basename "$realpath")\e[0m" && eza -1a --group-directories-first --color=always --ignore-glob ".DS_Store|.localized|.idea|.vscode" $realpath } || bat --color=always $realpath'

source $(brew --prefix)/opt/antidote/share/antidote/antidote.zsh
antidote load

############################################

export LANG="zh_TW.UTF-8"
export EDITOR="nvim"
export VISUAL=$EDITOR
export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_DOWNLOADS_CONCURRENCY=5

export XDG_CONFIG_HOME="$HOME/.config"
export XDG_DATA_HOME="$HOME/.local/share"
export XDG_STATE_HOME="$HOME/.local/state"
export XDG_CACHE_HOME="$HOME/.cache"
export XDG_RUNTIME_DIR="$HOME/.cache"

export ANDROID_USER_HOME="$XDG_DATA_HOME"/android
export LESSHISTFILE="${XDG_STATE_HOME}"/lesshst
export TERMINFO="$XDG_DATA_HOME"/terminfo
export TERMINFO_DIRS="$XDG_DATA_HOME"/terminfo:/usr/share/terminfo
export NPM_CONFIG_INIT_MODULE="$XDG_CONFIG_HOME"/npm/config/npm-init.js
export NPM_CONFIG_CACHE="$XDG_CACHE_HOME"/npm

zstyle ':completion:*' cache-path "$XDG_CACHE_HOME"/zsh/zcompcache
autoload -U compinit && compinit -d "$XDG_CACHE_HOME"/zsh/zcompdump-"$ZSH_VERSION"

# tj/n (node.js version manager)
export N_PREFIX="$HOME/.n"
export PATH="$N_PREFIX/bin:$PATH"

# fzf color scheme
export FZF_DEFAULT_OPTS="$FZF_DEFAULT_OPTS --color=fg:#d0d0d0,fg+:#d0d0d0,bg:-1,bg+:#262626 --color=hl:#08bdba,hl+:#5fd7ff,info:#78a9ff,marker:#ee5396 --color=prompt:#33b1ff,spinner:#ff7eb6,pointer:#42be65,header:#be95ff --color=border:#262626,label:#aeaeae,query:#d9d9d9 --border='rounded' --border-label='' --preview-window='border-rounded' --prompt='> ' --marker='>' --separator='─' --scrollbar='│'"

############################################

alias adb='HOME="$XDG_DATA_HOME"/android adb'
alias wget="wget --hsts-file=$XDG_DATA_HOME/wget-hsts"

alias "cd"="z"
alias "...."="cd ../../../"
alias "..."="cd ../../"
alias ".."="cd ../"
alias ","="cd -"
alias "q"="exit"
alias "eza"='eza -I=".DS_Store|.localized|.CFUserTextEncoding" --group-directories-last'
alias "ls"="eza -1"
alias "la"="eza -lah"
alias "tr"="eza -T"
alias "tg"="eza -1a --git-ignore"
alias "ff"="fastfetch"
alias "status"="git status"
alias "clone"="git clone"
alias "push"="git push"
alias "add"="git add"
alias "commit"="git commit -m"
alias "gca"="git add . && git commit -m"
alias "rime-install"="~/plum/rime-install"
alias "tailscale"="/Applications/Tailscale.app/Contents/MacOS/Tailscale"

############################################

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

############################################

HISTSIZE=5000
HISTFILE="$XDG_STATE_HOME"/zsh/history
SAVEHIST=$HISTSIZE
HISTDUP=erase
setopt appendhistory
setopt sharehistory
setopt hist_ignore_space
setopt hist_ignore_all_dups
setopt hist_save_no_dups
setopt hist_ignore_dups
setopt hist_find_no_dups
zstyle ':completion:*' matcher-list 'm:{a-z}={A-Za-z}'

############################################

bindkey "^p" history-search-backward
bindkey "^n" history-search-forward
bindkey '^_' fzf-cd-widget
