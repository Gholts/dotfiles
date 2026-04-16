vim.api.nvim_create_autocmd("FileType", {
	pattern = { "css", "html", "javascript", "typescript", "tsx", "astro" },
	callback = function()
		vim.treesitter.start()
	end,
})
require("nvim-treesitter").install({
	"vimdoc",
	"javascript",
	"typescript",
	"lua",
	"json",
	"bash",
	"css",
	"html",
	"tsx",
	"vue",
	"astro",
	"svelte",
	"typst",
	"regex",
	"swift",
})
