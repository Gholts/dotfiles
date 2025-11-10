return {
	"stevearc/conform.nvim",
	event = { "BufWritePre" },
	cmd = { "ConformInfo" },
	opts = {
		formatters_by_ft = {
			sh = { "shfmt" },
			zsh = { "shfmt" },
			bash = { "shfmt" },
			lua = { "stylua" },
			markdown = { "prettierd" },
			css = { "prettierd" },
			html = { "prettierd" },
			yaml = { "prettierd" },
			toml = { "taplo" },
		},
		-- Set default options
		default_format_ops = {
			lsp_format = "fallback",
		},
		-- Set up format-on-save
		format_on_save = {
			timeout_ms = 500,
		},
	},
}
