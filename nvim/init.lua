------------------------------------------------------------------
--     █████████  █████               ████   █████
--    ███░░░░░███░░███               ░░███  ░░███
--   ███     ░░░  ░███████    ██████  ░███  ███████    █████
--  ░███          ░███░░███  ███░░███ ░███ ░░░███░    ███░░
--  ░███    █████ ░███ ░███ ░███ ░███ ░███   ░███    ░░█████
--  ░░███  ░░███  ░███ ░███ ░███ ░███ ░███   ░███ ███ ░░░░███
--   ░░█████████  ████ █████░░██████  █████  ░░█████  ██████
--    ░░░░░░░░░  ░░░░ ░░░░░  ░░░░░░  ░░░░░    ░░░░░  ░░░░░░
-----------------------------------------------------------require
require("gholts.settings")
require("gholts.ui")
------------------------------------------------------------------
-- Global Namespace
------------------------------------------------------------------
local namespace = {}
_G.gl = gl or namespace
------------------------------------------------------------------
-- Auto Command
-----------------------------------------------------------autodir
local function change_cwd_to_arg()
	vim.schedule(function()
		local arg = vim.fn.argv(0)
		if not arg or arg == "" then
			return
		end

		if type(arg) == "string" and arg:match("^oil://") then
			arg = arg:gsub("^oil://", "")
		end

		if type(arg) == "string" and arg ~= "" then
			local full_path = vim.fn.fnamemodify(arg, ":p")
			if vim.fn.isdirectory(full_path) == 1 then
				vim.cmd.cd(full_path)
				if vim.fn.getcwd() == full_path:gsub("/$", "") then
					return
				else
					vim.notify("The attempt to switch failed.", vim.log.levels.WARN)
				end
			end
		end
	end)
end

vim.api.nvim_create_autocmd("VimEnter", {
	callback = change_cwd_to_arg,
})

if vim.v.vim_did_enter == 1 then
	change_cwd_to_arg()
end
------------------------------------------------------------------
-- Plugins
------------------------------------------------------------------
local data = vim.fn.stdpath("data")
local lazypath = data .. "/lazy/lazy.nvim"
if not (vim.uv or vim.loop).fs_stat(lazypath) then
	vim.fn.system({
		"git",
		"clone",
		"--filter=blob:none",
		"https://github.com/folke/lazy.nvim.git",
		"--branch=stable",
		lazypath,
	})
end
vim.opt.rtp:prepend(lazypath)
require("lazy").setup({
	spec = {
		{ import = "gholts.lazy" },
	},
	rocks = {
		hererocks = true,
	},
	change_detection = { notify = false },
	ui = {
		border = "single",
	},
})
