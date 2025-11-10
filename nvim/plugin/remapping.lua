-------------------------------------------------------no-whichkey
local bind = vim.keymap.set
local bo, cmd, fn, api = vim.bo, vim.cmd, vim.fn, vim.api
local ic = { "i", "c" }
local mapOption = { noremap = true, silent = true }
------------------------------------------------------------------
-- Native
------------------------------------------------------------------
-- Save
bind("n", "<leader>s", "<cmd>w<cr>", mapOption)
-- Quit
bind("n", "<leader>qq", "<cmd>q<cr>", mapOption)
-- Force Quit
bind("n", "<Bslash>q", ":q!<CR>", mapOption)
------------------------------------------------------------------
-- Buffer
------------------------------------------------------------------
-- Cycle Switch Buffer by Buffer Line
bind("n", "<C-p>", "<cmd>BufferLineCycleNext<cr>", mapOption)
bind("n", "<C-n>", "<cmd>BufferLineCyclePrev<cr>", mapOption)
-- Go to Buffer
bind("n", "<localleader>1", "<cmd>BufferLineGoToBuffer 1<cr>", mapOption)
bind("n", "<localleader>2", "<cmd>BufferLineGoToBuffer 2<cr>", mapOption)
bind("n", "<localleader>3", "<cmd>BufferLineGoToBuffer 3<cr>", mapOption)
bind("n", "<localleader>4", "<cmd>BufferLineGoToBuffer 4<cr>", mapOption)
bind("n", "<localleader>5", "<cmd>BufferLineGoToBuffer 5<cr>", mapOption)
bind("n", "<localleader>6", "<cmd>BufferLineGoToBuffer 6<cr>", mapOption)
bind("n", "<localleader>7", "<cmd>BufferLineGoToBuffer 7<cr>", mapOption)
bind("n", "<localleader>8", "<cmd>BufferLineGoToBuffer 8<cr>", mapOption)
bind("n", "<localleader>9", "<cmd>BufferLineGoToBuffer 9<cr>", mapOption)
------------------------------------------------------------------
-- Windows
------------------------------------------------------------------
-- Close Current Buffer
bind("n", "<leader>w", function()
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
bind("n", "<C-/>", "<cmd>FzfLua files<cr>", mapOption)
-- Toggle NvimTree
bind("n", "<D-C-c>", "<cmd>NvimTreeToggle<cr>", mapOption)
-- Switch to Next Window
bind("n", "<leader><Tab>", "<C-w>w", mapOption)
------------------------------------------------------------------
-- Navigation
------------------------------------------------------------------
bind(ic, "<C-k>", "<Up>", mapOption)
bind(ic, "<C-j>", "<Down>", mapOption)
bind(ic, "<C-h>", "<Left>", mapOption)
bind(ic, "<C-l>", "<Right>", mapOption)
-- Goto first/last character of the line
bind({ "n", "v" }, "gl", "$", mapOption)
bind({ "n", "v" }, "gh", "^", mapOption)
------------------------------------------------------------------
-- Boolean Switch
------------------------------------------------------------------
bind("n", "<leader>t", function()
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
bind("n", "<C-0>", function()
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
bind("n", "<C-=>", function()
	local function indent_restore_cursor()
		local original_view = fn.winsaveview()
		cmd("normal! ggVG=") -- built-in indent
		-- vim.lsp.buf.format({ async = false }) -- lsp format
		fn.winrestview(original_view)
	end
	indent_restore_cursor()
end, mapOption)
