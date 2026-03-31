return {
	"chaoren/vim-wordmotion",
	lazy = false,
	init = function()
		vim.g.wordmotion_spaces = { "-", "_", "\\/", "\\." }
	end,
}
