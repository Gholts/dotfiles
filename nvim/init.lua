------------------------------------------------------------------
--     █████████  █████               ████   █████
--    ███░░░░░███░░███               ░░███  ░░███
--   ███     ░░░  ░███████    ██████  ░███  ███████    █████
--  ░███          ░███░░███  ███░░███ ░███ ░░░███░    ███░░
--  ░███    █████ ░███ ░███ ░███ ░███ ░███   ░███    ░░█████
--  ░░███  ░░███  ░███ ░███ ░███ ░███ ░███   ░███ ███ ░░░░███
--   ░░█████████  ████ █████░░██████  █████  ░░█████  ██████
--    ░░░░░░░░░  ░░░░ ░░░░░  ░░░░░░  ░░░░░    ░░░░░  ░░░░░░
-----------------------------------------------------------require
vim.loader.enable()
require("settings")
require("remapping")
------------------------------------------------------color_scheme
vim.pack.add({ "https://github.com/nyoom-engineering/oxocarbon.nvim" })
vim.opt.background = "dark"
vim.cmd.colorscheme("oxocarbon")
local colors = require("oxocarbon").oxocarbon
if colors then
	vim.api.nvim_set_hl(0, "FloatBorder", { fg = colors.base03, bg = colors.blend })
	vim.api.nvim_set_hl(0, "FloatBorder", { fg = colors.base03, bg = "none" })
end
------------------------------------------------------------------
-- Plugins
------------------------------------------------------------------
vim.pack.add({
	"https://github.com/nvim-lua/plenary.nvim",
	"https://github.com/nvim-treesitter/nvim-treesitter",
	"https://github.com/chaoren/vim-wordmotion",
	"https://github.com/abecodes/tabout.nvim",
	"https://github.com/bwpge/lualine-pretty-path",
	"https://github.com/nvim-lualine/lualine.nvim",
	"https://github.com/sphamba/smear-cursor.nvim",
	"https://github.com/serhez/bento.nvim",
	"https://github.com/stevearc/oil.nvim",
	"https://github.com/ibhagwan/fzf-lua",
	"https://github.com/nvim-mini/mini.nvim",
	"https://github.com/chrishrb/gx.nvim",
	"https://github.com/mbbill/undotree",
})
---------------------------------------------------------------lsp
vim.pack.add({
	"https://github.com/stevearc/conform.nvim",
	"https://github.com/williamboman/mason.nvim",
	"https://github.com/williamboman/mason-lspconfig.nvim",
	"https://github.com/hrsh7th/cmp-nvim-lsp",
	"https://github.com/hrsh7th/cmp-buffer",
	"https://github.com/hrsh7th/cmp-path",
	"https://github.com/hrsh7th/cmp-cmdline",
	"https://github.com/js-everts/cmp-tailwind-colors",
	"https://github.com/hrsh7th/nvim-cmp",
	"https://github.com/neovim/nvim-lspconfig",
})
