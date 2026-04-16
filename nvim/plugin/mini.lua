require("mini.icons").setup()
MiniIcons.mock_nvim_web_devicons()

require("mini.bufremove").setup()
require("mini.splitjoin").setup()
require("mini.pairs").setup()
require("mini.surround").setup({
	mappings = {
		add = "S",
		delete = "ds",
		replace = "cs",
		find = "",
		find_left = "",
		highlight = "",
		suffix_last = "",
		suffix_next = "",
	},
	search_method = "cover_or_next",
	silent = true,
})
require("mini.hipatterns").setup({
	highlighters = {
		fix = { pattern = "%f[%w]()FIX()%f[%W]", group = "MiniHipatternsFixme" },
		todo = { pattern = "%f[%w]()TODO()%f[%W]", group = "MiniHipatternsTodo" },
		note = { pattern = "%f[%w]()NOTE()%f[%W]", group = "MiniHipatternsNote" },

		-- Highlight hex color strings (`#rrggbb`) using that color
		hex_color = require("mini.hipatterns").gen_highlighter.hex_color(),
	},
})
require("mini.indentscope").setup({
	mappings = {
		object_scope = "",
		object_scope_with_border = "",
		goto_top = "",
		goto_bottom = "",
	},
	options = {
		-- Whether to first check input line to be a border of adjacent scope.
		-- Use it if you want to place cursor on function header to get scope of
		-- its body.
		try_as_border = true,
	},
	symbol = "│",
})
require("mini.move").setup({
	mappings = {
		left = "<d-h>",
		right = "<d-l>",
		down = "<d-j>",
		up = "<d-k>",

		-- Move current line in Normal mode
		line_left = "<d-h>",
		line_right = "<d-l>",
		line_down = "<d-j>",
		line_up = "<d-k>",
	},
})
