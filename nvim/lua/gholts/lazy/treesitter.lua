return {
	"nvim-treesitter/nvim-treesitter",
	lazy = false,
	build = ":TSUpdate",
	config = function()
		local configs = require("nvim-treesitter.configs")

		configs.setup({
			ensure_installed = {
				"vimdoc",
				"javascript",
				"typescript",
				"c",
				"lua",
				"json",
				"bash",
				"scss",
				"html",
				"tsx",
				"vue",
				"astro",
				"svelte",
				"typst",
				"regex",
				"swift",
			},
			sync_install = false,
			auto_install = true,
			ignore_install = { "" },

			highlight = { enable = true },
			indent = { enable = true },

			modules = {},
		})
	end,
}
