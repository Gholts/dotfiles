return {
	"nyoom-engineering/oxocarbon.nvim",
	lazy = false,
	priority = 1000,
	config = function()
		vim.cmd.colorscheme("oxocarbon")
		vim.opt.termguicolors = true

		local colors = require("oxocarbon").oxocarbon

		if colors then
			vim.api.nvim_set_hl(0, "FloatBorder", { fg = colors.base03, bg = colors.blend })
			vim.api.nvim_set_hl(0, "FloatBorder", { fg = colors.base03, bg = "none" })
		end
	end,
}
