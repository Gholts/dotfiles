return {
	"nyoom-engineering/oxocarbon.nvim",
	lazy = false,
	priority = 1000,
	config = function()
		vim.cmd.colorscheme("oxocarbon")
		vim.opt.termguicolors = true
	end,
}
