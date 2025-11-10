#------------------------------------------------------------------
#     █████████  █████               ████   █████
#    ███░░░░░███░░███               ░░███  ░░███
#   ███     ░░░  ░███████    ██████  ░███  ███████    █████
#  ░███          ░███░░███  ███░░███ ░███ ░░░███░    ███░░
#  ░███    █████ ░███ ░███ ░███ ░███ ░███   ░███    ░░█████
#  ░░███  ░░███  ░███ ░███ ░███ ░███ ░███   ░███ ███ ░░░░███
#   ░░█████████  ████ █████░░██████  █████  ░░█████  ██████
#    ░░░░░░░░░  ░░░░ ░░░░░  ░░░░░░  ░░░░░    ░░░░░  ░░░░░░
#----------------------------------------------------zprofile_debug
# if [[ -f ~/.config/zsh/.zprofile ]]; then
#     source ~/.config/zsh/.zprofile
# fi
#------------------------------------------------------------------
#-- Shell Setting
#------------------------------------------------------zsh_settings
HISTSIZE=5000                          # history file size
SAVEHIST=$HISTSIZE                     # saved history size
HISTFILE="$XDG_STATE_HOME/zsh/history" # history file dir
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
touch() {
    for arg in "$@"; do
        if [[ ! "$arg" == -* ]]; then
            mkdir -p "$(dirname "$arg")" && command touch "$arg"
        fi
    done
}
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
zstyle ':completion:*:descriptions' format "[%d]"
zstyle ':fzf-tab:*' fzf-flags --height=40% --min-height=15
zstyle ':fzf-tab:*' fzf-preview '[[ -d $realpath ]] && { echo "Directory: \e[1m$(basename "$realpath")\e[0m" && eza -1aT --level=3 --group-directories-first --color=always --ignore-glob ".DS_Store|.localized|.idea|.vscode" $realpath } || bat --color=always $realpath'
#------------------------------------------------------------------
#-- Bindkey
#------------------------------------------------------------------
bindkey -e
bindkey "^p" history-search-backward
bindkey "^n" history-search-forward
bindkey "," cd-dash
#------------------------------------------------------------------
#-- Alias
#------------------------------------------------------------------
alias "q"="exit"
alias "cd"="z" # alias to zoxide, for raw cd cmd, use `builtin cd`
alias ".."="cd ../"
alias "..."="cd ../../"
alias "...."="cd ../../../"
#------------------------------------------------------------eza/ls
alias "eza"="eza -I='.DS_Store|.localized|.CFUserTextEncoding' --group-directories-last"
alias "ls"="eza"
alias "la"="eza -lah"
alias "tr"="eza -T --level=4"
alias "tg"="eza -1a --git-ignore"
#------------------------------------------------------------------
alias "ff"="fastfetch"
alias "homebrew"="taproom" # brew is native one, taproom is TUI for homebrew cli
alias "gca"="git add . && git commit -m"
alias "rime-install"="~/plum/rime-install"
alias "tailscale"="/Applications/Tailscale.app/Contents/MacOS/Tailscale"
#---------------------------------------------------------xdg_alias
alias "adb"="HOME=$XDG_DATA_HOME/android adb"
alias "wget"="wget --hsts-file=$XDG_DATA_HOME/wget-hsts"
alias "mitmproxy"="mitmproxy --set confdir=$XDG_CONFIG_HOME/mitmproxy"
alias "mitmweb"="mitmweb --set confdir=$XDG_CONFIG_HOME/mitmproxy"
