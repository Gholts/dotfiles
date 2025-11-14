## About

This repository contains my personal configuration files for Daily-Driving on macOS.

It's not recommended to directly copy my configs, unless you know what they mean.

Check out my [blog](https://gholts.top/).

```shell
cd dotfiles
stow -t ~/.config . # it just works
```

## Dependencies

```
├── stow
├── eza
├── bat
├── ripgrep
└── tldr
```

## Neovim

```
./nvim
├── init.lua
├── lazy-lock.json
├── ftdetect
│   └── applescript.vim
├── lua
│   └── gholts
│       ├── settings.lua
│       ├── ui.lua
│       ├── custom
│       │   ├── cmdline.lua
│       │   └── diag.lua
│       └── lazy
│           ├── avante.lua
│           ├── bufferline.lua
│           ├── colorscheme.lua
│           ├── comment.lua
│           ├── conform.lua
│           ├── fzf.lua
│           ├── gx.lua
│           ├── lsp.lua
│           ├── lualine.lua
│           ├── misc.lua
│           │   ├── windwp/nvim-autopairs
│           │   ├── chaoren/vim-wordmotion
│           │   ├── kylechui/nvim-surround
│           │   ├── wansmer/treesj
│           │   ├── catgoose/nvim-colorizer.lua
│           │   └── abecodes/tabout.nvim
│           ├── oil.lua
│           ├── snacks.lua
│           ├── treesitter.lua
│           ├── trouble.lua
│           └── undotree.lua
├── plugin
│   └── remapping.lua
└── syntax
    └── applescript.vim
```
