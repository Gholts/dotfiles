return {
	"akinsho/toggleterm.nvim",
	event = "VeryLazy",
	opts = {
		open_mapping = [[<c-\>]],
		hide_numbers = true,
		shade_filetypes = {},
		direction = "horizontal",
		autochdir = true,
		persist_mode = true,
		insert_mappings = false,
		start_in_insert = true,
		highlights = {
			FloatBorder = { link = "FloatBorder" },
			NormalFloat = { link = "NormalFloat" },
		},
		float_opts = {
			border = "single",
			winblend = 3,
		},
		size = function(term)
			if term.direction == "horizontal" then
				return 15
			elseif term.direction == "vertical" then
				return math.floor(vim.o.columns * 0.4)
			end
		end,
	},
}
