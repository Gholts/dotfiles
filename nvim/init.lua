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
require("gholts.custom.cmdline").setup() -- Must be behind the settings required -- Minifier cmdline
------------------------------------------------------------------
-- Global namespace
------------------------------------------------------------------
local namespace = {}
_G.gl = gl or namespace
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
	spec = "gholts.lazy",
	change_detection = { notify = false },
})
