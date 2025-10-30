return {
	"ibhagwan/fzf-lua",
	dependencies = { "nvim-tree/nvim-web-devicons" },
	config = function()
		require("fzf-lua").setup({
			winopts = {},
			keymap = {},
			actions = {},
			fzf_opts = {},
			fzf_colors = {},
			hls = {},
			previewers = {},
		})
	end,
}
