return {
	"wansmer/treesj",
	dependencies = { "nvim-treesitter/nvim-treesitter" }, -- if you install parsers with `nvim-treesitter`
	config = function()
		require("treesj").setup({--[[ your config ]]
			use_default_keymaps = false,
			max_join_length = 720,
		})
		vim.keymap.set("n", "<leader>m", require("treesj").toggle)
	end,
}
