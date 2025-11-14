-------------------------------------------------------no-whichkey
local map = vim.keymap.set
local bo, cmd, fn, api = vim.bo, vim.cmd, vim.fn, vim.api
local ic = { "i", "c" }
local mapOption = { noremap = true, silent = true }
------------------------------------------------------------------
-- Native
------------------------------------------------------------------
-- Source configs
map("n", "<leader>ro", ":so<CR>", mapOption)
-- Save
map("n", "<leader>s", "<cmd>w<cr>", mapOption)
-- Quit
map("n", "<leader>qq", "<cmd>qa<cr>", mapOption)
-- Force Quit
map("n", "<Bslash>q", ":q!<CR>", mapOption)
------------------------------------------------------------------
-- Buffer
------------------------------------------------------------------
-- Go to Buffer
map("n", "<localleader>1", "<cmd>BufferLineGoToBuffer 1<cr>", mapOption)
map("n", "<localleader>2", "<cmd>BufferLineGoToBuffer 2<cr>", mapOption)
map("n", "<localleader>3", "<cmd>BufferLineGoToBuffer 3<cr>", mapOption)
map("n", "<localleader>4", "<cmd>BufferLineGoToBuffer 4<cr>", mapOption)
map("n", "<localleader>5", "<cmd>BufferLineGoToBuffer 5<cr>", mapOption)
map("n", "<localleader>6", "<cmd>BufferLineGoToBuffer 6<cr>", mapOption)
map("n", "<localleader>7", "<cmd>BufferLineGoToBuffer 7<cr>", mapOption)
map("n", "<localleader>8", "<cmd>BufferLineGoToBuffer 8<cr>", mapOption)
map("n", "<localleader>9", "<cmd>BufferLineGoToBuffer 9<cr>", mapOption)
------------------------------------------------------------------
-- Windows
------------------------------------------------------------------
-- Close Current Buffer
map("n", "<leader>w", function()
	local function smart_close()
		if bo.filetype == "NvimTree" then
			cmd.NvimTreeClose()
		else
			require("snacks").bufdelete(0)
		end
	end
	smart_close()
end, mapOption)
-- Fuzzy File Search fzf-lua
map("n", "<C-/>", "<cmd>FzfLua files<cr>", mapOption)
-- Toggle Oil float
map("n", "<D-C-c>", function()
	require("oil").toggle_float()
end, mapOption)
-- Open Oil
map("n", "-", "<cmd>Oil<cr>", mapOption)
-- Toggle Undotree
map("n", "<D-C-v>", "<cmd>UndotreeToggle<cr>", mapOption)
-- Switch to Next Window
map("n", "<leader><Tab>", "<C-w>w", mapOption)
------------------------------------------------------------------
-- Navigation
------------------------------------------------------------------
map(ic, "<C-k>", "<Up>", mapOption)
map(ic, "<C-j>", "<Down>", mapOption)
map(ic, "<C-h>", "<Left>", mapOption)
map(ic, "<C-l>", "<Right>", mapOption)
-- Goto first/last character of the line
map({ "n", "v" }, "gl", "$", mapOption)
map({ "n", "v" }, "gh", "^", mapOption)
------------------------------------------------------------------
-- Boolean Switch
------------------------------------------------------------------
map("n", "<leader>t", function()
	local word = fn.expand("<cword>") -- get current word under cursor
	if word == "true" then
		api.nvim_command("normal! ciwfalse") -- make it false
	elseif word == "false" then
		api.nvim_command("normal! ciwtrue") -- make it true
	end
end, mapOption)
------------------------------------------------------------------
-- Copy Full Text
------------------------------------------------------------------
map("n", "<C-0>", function()
	local function indent_restore_cursor()
		local original_view = fn.winsaveview()
		cmd("normal! ggVGy")
		fn.winrestview(original_view)
	end
	indent_restore_cursor()
end, mapOption)
------------------------------------------------------------------
-- Format
------------------------------------------------------------------
map("n", "<C-=>", function()
	local function indent_restore_cursor()
		local original_view = fn.winsaveview()
		cmd("normal! ggVG=") -- built-in indent
		fn.winrestview(original_view)
	end
	indent_restore_cursor()
end, mapOption)
