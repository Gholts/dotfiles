return {
	{
		"sphamba/smear-cursor.nvim",
		opts = {},
	},
	{
		"windwp/nvim-autopairs",
		event = "InsertEnter",
		config = true,
	},
	{
		"chaoren/vim-wordmotion",
		lazy = false,
		init = function()
			vim.g.wordmotion_spaces = { "-", "_", "\\/", "\\." }
		end,
	},
	{
		"kylechui/nvim-surround",
		version = "^3.0.0",
		event = "VeryLazy",
		keys = { "yss", "yS", "cs", "ds" },
		opts = { move_cursor = true, keymaps = { visual = "S" } },
	},
	{
		"catgoose/nvim-colorizer.lua",
		event = "BufReadPre",
		opts = {
			lazy_load = true,
		},
	},
}
