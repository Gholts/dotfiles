return {
	"nvim-treesitter/nvim-treesitter",
	dependencies = { "nvim-treesitter/nvim-treesitter-textobjects" },
	build = ":TSUpdate",
	config = function()
		local configs = require("nvim-treesitter.configs")

		configs.setup({
			ensure_installed = {
				"c",
				"lua",
				"vim",
				"vimdoc",
				"javascript",
				"html",
				"python",
				"typescript",
				"markdown",
				"markdown_inline",
				"json",
				"yaml",
				"css",
				"bash",
				"ssh_config",
				"vue",
				"astro",
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
