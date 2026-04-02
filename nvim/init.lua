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
----------------------------------------------------------auto_dir
local function change_cwd_to_arg()
	vim.schedule(function()
		local arg = vim.fn.argv(0)
		if not arg or arg == "" then
			return
		end

		if type(arg) == "string" and arg:match("^oil://") then
			arg = arg:gsub("^oil://", "")
		end

		if type(arg) == "string" and arg ~= "" then
			local full_path = vim.fn.fnamemodify(arg, ":p")
			if vim.fn.isdirectory(full_path) == 1 then
				vim.cmd.cd(full_path)
				if vim.fn.getcwd() == full_path:gsub("/$", "") then
					return
				else
					vim.notify("The attempt to switch failed.", vim.log.levels.WARN)
				end
			end
		end
	end)
end

vim.api.nvim_create_autocmd("VimEnter", {
	callback = change_cwd_to_arg,
})

if vim.v.vim_did_enter == 1 then
	change_cwd_to_arg()
end
------------------------------------------------------------------
-- Plugins
------------------------------------------------------------------
vim.pack.add({
	"https://github.com/nvim-lua/plenary.nvim",
	"https://github.com/nvim-treesitter/nvim-treesitter",
	"https://github.com/nvim-treesitter/nvim-treesitter-textobjects",
	"https://github.com/nvim-tree/nvim-web-devicons",
	"https://github.com/bwpge/lualine-pretty-path",
	"https://github.com/nvim-lualine/lualine.nvim",
	"https://github.com/sphamba/smear-cursor.nvim",
	"https://github.com/serhez/bento.nvim",
	"https://github.com/stevearc/oil.nvim",
	"https://github.com/ibhagwan/fzf-lua",
	"https://github.com/nvim-mini/mini.nvim",
	"https://github.com/chrishrb/gx.nvim",
	"https://github.com/folke/trouble.nvim",
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
	"https://github.com/hrsh7th/nvim-cmp",
	"https://github.com/L3MON4D3/LuaSnip",
	"https://github.com/saadparwaiz1/cmp_luasnip",
	"https://github.com/j-hui/fidget.nvim",
	"https://github.com/neovim/nvim-lspconfig",
})
