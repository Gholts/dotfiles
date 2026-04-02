local map = vim.keymap.set

require("trouble").setup()

map(
	"n",
	"<leader>xx",
	"<cmd>Trouble diagnostics toggle<cr>",
	{ desc = "Diagnostics (Trouble)", silent = true, noremap = true }
)
map(
	"n",
	"<leader>xX",
	"<cmd>Trouble diagnostics toggle filter.buf=0<cr>",
	{ desc = "Buffer Diagnostics (Trouble)", silent = true, noremap = true }
)
map(
	"n",
	"<leader>cs",
	"<cmd>Trouble symbols toggle focus=false<cr>",
	{ desc = "Symbols (Trouble)", silent = true, noremap = true }
)
map(
	"n",
	"<leader>cl",
	"<cmd>Trouble lsp toggle focus=false win.position=right<cr>",
	{ desc = "LSP Definitions / references / ... (Trouble)", silent = true, noremap = true }
)
map(
	"n",
	"<leader>xL",
	"<cmd>Trouble loclist toggle<cr>",
	{ desc = "Location List (Trouble)", silent = true, noremap = true }
)
map(
	"n",
	"<leader>xQ",
	"<cmd>Trouble qflist toggle<cr>",
	{ desc = "Quickfix List (Trouble)", silent = true, noremap = true }
)
