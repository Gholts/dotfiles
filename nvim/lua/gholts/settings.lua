------------------------------------------------------------------
local g, opt = vim.g, vim.opt
------------------------------------------------------------------
g.mapleader = " " -- remap leader key
g.maplocalleader = "," -- remap local leader key
----------------------------------------------------------minimize
g.loaded_netrw = 1 -- disable netrw
g.loaded_netrwPlugin = 1 -- disable netrw plugins
------------------------------------------------------------------
opt.nu = true -- line number
opt.rnu = true -- relative line number
opt.wrap = true -- line warpping
opt.scrolloff = 10 -- add n(10) line offset from the windows edge
opt.splitkeep = "screen" -- make split keep same line
opt.termguicolors = true -- true color
opt.softtabstop = 4 -- in I, make <Tab> like 4 spaces
opt.tabstop = 4 -- what tab character occupies looks like
opt.shiftwidth = 4 -- how many space for indent
opt.expandtab = true -- make <Tab> actually type space
------------------------------------------------------------------
opt.clipboard = "unnamedplus" -- make (y),(p) directly work with system clipboard
opt.smartindent = true -- like smart indent
opt.autochdir = true -- automatically change current dir
opt.undofile = true -- persistent undo
------------------------------------------------------------------
-- For smart hidden cmd line default value
------------------------------------/lua/gholts/custom/cmdline.lua
opt.cmdheight = 0
opt.laststatus = 2
