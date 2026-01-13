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
export LESSHISTFILE="$XDG_STATE_HOME"/lesshst
export TERMINFO="$XDG_DATA_HOME"/terminfo
export TERMINFO_DIRS="$XDG_DATA_HOME"/terminfo:/usr/share/terminfo
export ANDROID_USER_HOME="$XDG_DATA_HOME"/android
export CARGO_HOME="$XDG_DATA_HOME"/cargo
export PYTHON_HISTORY="$XDG_STATE_HOME"/python/python_history
# ruby
export BUNDLE_USER_CONFIG="$XDG_CONFIG_HOME"/bundle
export BUNDLE_USER_CACHE="$XDG_CACHE_HOME"/bundle
export BUNDLE_USER_PLUGIN="$XDG_DATA_HOME"/bundle
export RBENV_ROOT="$XDG_DATA_HOME"/rbenv
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
# fzf
export FZF_DEFAULT_OPTS_FILE="$HOME/.config/fzf/config"
export FZF_DEFAULT_COMMAND="fd -iIH"
export FZF_CTRL_T_COMMAND="fd"
