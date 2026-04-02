vim.keymap.set({ "n", "x" }, "gx", "<cmd>Browse<cr>", {
	noremap = true,
	silent = true,
})

require("gx").setup({
	open_callback = function(url)
		vim.ui.open(url)
	end,
	open_browser_app = "true",
	open_browser_args = {},
	select_prompt = true,
	handlers = {
		plugin = true, -- open plugin links in lua (e.g. packer, lazy, ..)
		github = true, -- open github issues
		brewfile = true, -- open Homebrew formulaes and casks
		package_json = true, -- open dependencies from package.json
		search = true, -- search the web/selection on the web if nothing else is found
		go = true, -- open pkg.go.dev from an import statement (uses treesitter)
	},
	handler_options = {
		search_engine = "google",
		select_for_search = true,

		git_remotes = { "upstream", "origin" },
		git_remote_push = false,
	},
})
