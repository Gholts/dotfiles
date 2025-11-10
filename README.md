## About

This repository contains my personal configuration files for Daily-Driving on macOS.

It's not recommended to directly copy my configs, unless you know what they mean.

Check out my [blog](https://gholts.top/).

## Dependencies

```
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
├── lua
│   └── gholts
│       ├── settings.lua
│       ├── custom
│       │   └── cmdline.lua
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
│           ├── nvimtree.lua
│           ├── snacks.lua
│           ├── treesitter.lua
│           ├── trouble.lua
│           └── undotree.lua
└── plugin
    └── remapping.lua
```
