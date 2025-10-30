local g, opt, api = vim.g, vim.opt, vim.api

opt.nu = true
opt.rnu = true
opt.clipboard = "unnamedplus"
opt.softtabstop = 4
opt.expandtab = true
opt.smartindent = true
opt.wrap = false
opt.termguicolors = true
opt.tabstop = 4
opt.shiftwidth = 4
opt.autochdir = true
-- opt.laststatus = 3

opt.foldtext = ""
opt.foldcolumn = "0"
opt.foldmethod = "expr"
opt.foldexpr = "v:lua.vim.treesitter.foldexpr()"
opt.foldlevel = 10
opt.foldlevelstart = 3

g.loaded_netrw = 1
g.loaded_netrwPlugin = 1

local cmdline_group = api.nvim_create_augroup("StableCmdline", { clear = true })
opt.cmdheight = 0
opt.laststatus = 2
api.nvim_create_autocmd("CmdlineEnter", {
	group = cmdline_group,
	pattern = "*",
	callback = function()
		opt.laststatus = 2
		opt.cmdheight = 1
	end,
})
api.nvim_create_autocmd("CmdlineLeave", {
	group = cmdline_group,
	pattern = "*",
	callback = function()
		opt.cmdheight = 0
		opt.laststatus = 2
	end,
})
