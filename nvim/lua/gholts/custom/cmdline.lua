------------------------------------ lua/gholts/custom/cmdline.lua
local M = {}
------------------------------------------------------------------
function M.setup()
	local api, opt = vim.api, vim.opt

	local cmdline_group = api.nvim_create_augroup("MinimalCmdLine", { clear = true })

	api.nvim_create_autocmd("CmdlineEnter", {
		group = cmdline_group,
		pattern = "*",
		callback = function()
			opt.laststatus = 2
			opt.cmdheight = 1
		end,
	})

	api.nvim_create_autocmd("CmdlineLeave", {
		group = cmdline_group,
		pattern = "*",
		callback = function()
			opt.cmdheight = 0
			opt.laststatus = 2
		end,
	})
end
------------------------------------------------------------------
return M
