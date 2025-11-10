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
clear # clear last login message
#------------------------------------------------------------------
#-- Directory Setting
#----------------------------------------------------------homebrew
eval "$(/opt/homebrew/bin/brew shellenv)"
#-------------------------------------------------------------shell
export SHELL_SESSIONS_DISABLE=1 # turn off zsh_sessions file
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
#----------------------------------------------------------packages
# bun
export PATH="/Users/gholts/.cache/.bun/bin:$PATH"
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
export FZF_DEFAULT_OPTS_FILE="$HOME/.config/fzf/config"
export FZF_DEFAULT_COMMAND="fd"
export FZF_CTRL_T_COMMAND="fd"
