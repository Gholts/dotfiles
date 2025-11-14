return {
	"stevearc/oil.nvim",
	opts = {},
	dependencies = { "nvim-tree/nvim-web-devicons" },
	lazy = false,
	config = function()
		require("oil").setup({
			default_file_explorer = true,
			win_options = {
				wrap = false,
				signcolumn = "auto",
			},
			float = {
				border = "single",
				preview_split = "right",
				win_options = {
					wrap = false,
				},
			},
			confirmation = {
				border = "single",
			},
			progress = {
				border = "single",
			},
			ssh = {
				border = "single",
			},
			keymaps_help = {
				border = "single",
			},
		})
	end,
}
