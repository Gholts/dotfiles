require("vim._core.ui2").enable({
	enable = true,
	msg = {
		targets = "msg",
		msg = {
			timeout = 3000,
		},
	},
})

vim.api.nvim_create_autocmd("FileType", {
	group = vim.api.nvim_create_augroup("UI2_Window_Settings", { clear = true }),
	pattern = { "msg", "cmd", "dialog", "pager" },
	callback = function()
		vim.wo.winblend = 100
	end,
})
