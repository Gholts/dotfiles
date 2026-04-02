return {
	"MeanderingProgrammer/render-markdown.nvim",
	config = function()
		require("render-markdown").setup({
			vim.treesitter.language.register("markdown", "cmp_docs"),
			file_types = { "markdown", "cmp_docs" },
			completions = { lsp = { enabled = true } },
		})
	end,
}
