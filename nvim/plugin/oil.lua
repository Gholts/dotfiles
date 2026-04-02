require("oil").setup({
	default_file_explorer = true,
	win_options = {
		wrap = false,
		signcolumn = "auto",
	},
	float = {
		border = "single",
		preview_split = "right",
		win_options = {
			wrap = false,
		},
	},
	confirmation = {
		border = "single",
	},
	progress = {
		border = "single",
	},
	ssh = {
		border = "single",
	},
	keymaps_help = {
		border = "single",
	},
	view_options = {
		show_hidden = true,
		is_hidden_file = function(name)
			local m = name:match("^%.")
			return m ~= nil
		end,
		is_always_hidden = function(name)
			return name == ".DS_Store"
		end,
	},
})

vim.api.nvim_create_autocmd("FileType", {
	pattern = "oil_preview",
	callback = function(params)
		vim.keymap.set("n", "<CR>", "y", { buffer = params.buf, remap = true, nowait = true })
	end,
})
