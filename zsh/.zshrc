#------------------------------------------------------------------
#     █████████  █████               ████   █████
#    ███░░░░░███░░███               ░░███  ░░███
#   ███     ░░░  ░███████    ██████  ░███  ███████    █████
#  ░███          ░███░░███  ███░░███ ░███ ░░░███░    ███░░
#  ░███    █████ ░███ ░███ ░███ ░███ ░███   ░███    ░░█████
#  ░░███  ░░███  ░███ ░███ ░███ ░███ ░███   ░███ ███ ░░░░███
#   ░░█████████  ████ █████░░██████  █████  ░░█████  ██████
#    ░░░░░░░░░  ░░░░ ░░░░░  ░░░░░░  ░░░░░    ░░░░░  ░░░░░░
#------------------------------------------------------------------
#-- Directory Setting
#-----------------------------------------------------------xdg-dir
export XDG_CONFIG_HOME="$HOME/.config"
export XDG_DATA_HOME="$HOME/.local/share"
export XDG_STATE_HOME="$HOME/.local/state"
export XDG_CACHE_HOME="$HOME/.cache"
export XDG_RUNTIME_DIR="$HOME/.cache"
#---------------------------------------------------------xdg-ninja
export ANDROID_USER_HOME="$XDG_DATA_HOME"/android
export LESSHISTFILE="${XDG_STATE_HOME}"/lesshst
export TERMINFO="$XDG_DATA_HOME"/terminfo
export TERMINFO_DIRS="$XDG_DATA_HOME"/terminfo:/usr/share/terminfo
export NPM_CONFIG_INIT_MODULE="$XDG_CONFIG_HOME"/npm/config/npm-init.js
export NPM_CONFIG_CACHE="$XDG_CACHE_HOME"/npm
#---------------------------------------------------------xdg_alias
alias adb='HOME="$XDG_DATA_HOME"/android adb'
alias wget="wget --hsts-file=$XDG_DATA_HOME/wget-hsts"
alias mitmproxy="mitmproxy --set confdir=$XDG_CONFIG_HOME/mitmproxy"
alias mitmweb="mitmweb --set confdir=$XDG_CONFIG_HOME/mitmproxy"
#----------------------------------------------------------packages
# tj/n (node.js version manager)
export N_PREFIX="$HOME/.n"
export PATH="$N_PREFIX/bin:$PATH"
#------------------------------------------------------------------
#-- Shell Setting
#------------------------------------------------------------------
# editor
export EDITOR="nvim"
export VISUAL=$EDITOR
# homebrew
export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_DOWNLOADS_CONCURRENCY=5
# fzf
export FZF_DEFAULT_OPTS_FILE=~/.config/fzf/config
export FZF_DEFAULT_COMMAND="fd"
#------------------------------------------------------zsh_settings
HISTSIZE=5000                          # history file size
SAVEHIST=$HISTSIZE                     # saved history size
HISTFILE="$XDG_STATE_HOME"/zsh/history # history file dir
#---------------------------------------------------no_dup_historys
HISTDUP=erase
setopt hist_ignore_all_dups
setopt hist_ignore_dups
setopt hist_save_no_dups
setopt hist_find_no_dups
#------------------------------------------------------------------
setopt hist_ignore_space # ignore only space history
setopt appendhistory     # save history when session ended
setopt sharehistory      # history across different session
#------------------------------------------------------------------
#-- Variable
#---------------------------------------------fzf-tab_smart_preview
local ftb_preview_script='_ftb_previewer() {
    local preview_output=""
    if [[ "$group" == "options" || "$word" == -* ]]; then
        preview_output=$(tldr --color always ${words[@]} 2>/dev/null)
    fi
    if [[ -z "$preview_output" ]]; then
        preview_output=$(tldr --color always ${words[@]} "$word" 2>/dev/null)
    fi
    if [[ -z "$preview_output" ]]; then
        preview_output=$(tldr --color always "$word" 2>/dev/null)
    fi
    if [[ -n "$preview_output" ]]; then
        echo "$preview_output"
        return
    fi
    if [[ -n "$realpath" ]]; then
        if [[ -d "$realpath" ]]; then
            if command -v eza >/dev/null 2>&1; then
                { print "Directory: \e[1m$(basename "$realpath")\e[0m" && eza --tree --level=4 --color=always --ignore-glob ".DS_Store|.localized|.idea|.vscode" "$realpath" }
            fi
        else
            if command -v bat >/dev/null 2>&1; then
                bat --color=always "$realpath"
            else
                head -n 100 "$realpath"
            fi
        fi
        return
    fi
}
_ftb_previewer'
#------------------------------------------------------------------
#-- Function
#--------------------------change_directory_to_current_finder_opend
# get finder dir
pfd() {
    osascript 2>/dev/null <<EOF
  tell application "Finder"
    return POSIX path of (target of window 1 as alias)
end tell
EOF
}
# enter it
cdf() { cd "$(pfd)"; }
#------------------------------------------------------------------
# make dir and enter it immediatelly
mkd() { mkdir -p "$1" && cd "$1"; }
# smtart touch
touch() { mkdir -p "$(dirname "$1")" && command touch "$1"; }
# keybind by `cd -` silently and refresh prompt
cd-dash() {
    builtin cd - >/dev/null 2>&1
    zle reset-prompt
}
zle -N cd-dash # registry ZLE widget
#------------------------------------------------------------------
#-- Initialization
#------------------------------------------------------------------
# starship
if [[ "${widgets[zle - keymap - select]#user:}" == "starship_zle-keymap-select" ||
    "${widgets[zle - keymap - select]#user:}" == "starship_zle-keymap-select-wrapped" ]]; then
    zle -N zle-keymap-select ""
fi
eval "$(starship init zsh)"
# fzf
source <(fzf --zsh)
# antidote, zsh plugin manager
source $(brew --prefix)/opt/antidote/share/antidote/antidote.zsh
antidote load
# zsh completion
autoload -U compinit && compinit -d "$XDG_CACHE_HOME"/zsh/zcompdump-"$ZSH_VERSION"
#------------------------------------------------------------------
#-- Plugin Configuration
#------------------------------------------------------------------
# disable case-sensitive
zstyle ':completion:*' matcher-list 'm:{a-z}={A-Za-z}'
# fzf-tab function
zstyle ':fzf-tab:*:*' fzf-preview "$ftb_preview_script" # fzf-tab_smart_preview
zstyle ':completion:*:descriptions' format "[%d]"
zstyle ':fzf-tab:*' switch-group "<" ">" fzf-flags --height "47%" --color="fg:#d0d0d0,fg+:#d0d0d0,bg:-1,bg+:#262626" --color="hl:#08bdba,hl+:#5fd7ff,info:#78a9ff,marker:#ee5396" --color="prompt:#33b1ff,spinner:#ff7eb6,pointer:#42be65,header:#be95ff" --color="border:#262626,label:#aeaeae,query:#d9d9d9" --border="rounded" --border-label="" --preview-window="border-rounded" --prompt="> " --marker=">" --separator="─" --scrollbar="│" #  --preview-window "wrap"
unset ftb_preview_script
#------------------------------------------------------------------
#-- Bindkey
#------------------------------------------------------------------
bindkey "," cd-dash
#------------------------------------------------------------------
#-- Alias
#------------------------------------------------------------------
alias "q"="exit"
alias "cd"="z" # zoxide
alias ","="cd -"
alias ".."="cd ../"
alias "..."="cd ../../"
alias "...."="cd ../../../"
#------------------------------------------------------------eza/ls
alias "eza"="eza -I='.DS_Store|.localized|.CFUserTextEncoding' --group-directories-last"
alias "ls"="eza -1"
alias "la"="eza -lah"
alias "tr"="eza -T --level=4"
alias "tg"="eza -1a --git-ignore"
#------------------------------------------------------------------
alias "ff"="fastfetch"
alias "gca"="git add . && git commit -m"
alias "rime-install"="~/plum/rime-install"
alias "tailscale"="/Applications/Tailscale.app/Contents/MacOS/Tailscale"
