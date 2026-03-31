-------------------------------------------------------no-whichkey
local map = vim.keymap.set
local cmd, fn, api = vim.cmd, vim.fn, vim.api
local ic = { "i", "c" }
------------------------------------------------------------------
-- Native
------------------------------------------------------------------
-- Source configs
map("n", "<leader>ro", ":so<CR>", { silent = true })
-- Save
map("n", "<leader>s", "<cmd>w<cr>")
-- Quit
map("n", "<leader>qq", "<cmd>q<cr>")
-- Quit All
map("n", "<leader>qa", "<cmd>qa<cr>")
-- Force Quit
map("n", "<Bslash>q", ":q!<CR>")
------------------------------------------------------------------
-- Buffer
------------------------------------------------------------------
-- Open New Tab
map("n", "gn", "<cmd>tabnew<cr>")
-- Close Tab
map("n", "gw", "<cmd>tabclose<cr>")
--
map("n", "<leader>bo", function()
	local buffers = vim.api.nvim_list_bufs()
	local current_buf = vim.api.nvim_get_current_buf()

	for _, bufnr in ipairs(buffers) do
		if vim.api.nvim_buf_is_loaded(bufnr) and bufnr ~= current_buf then
			vim.api.nvim_buf_delete(bufnr, { force = false })
		end
	end
end)
-- Go to Buffer
map("n", "<localleader>1", "<cmd>BufferLineGoToBuffer 1<cr>")
map("n", "<localleader>2", "<cmd>BufferLineGoToBuffer 2<cr>")
map("n", "<localleader>3", "<cmd>BufferLineGoToBuffer 3<cr>")
map("n", "<localleader>4", "<cmd>BufferLineGoToBuffer 4<cr>")
map("n", "<localleader>5", "<cmd>BufferLineGoToBuffer 5<cr>")
map("n", "<localleader>6", "<cmd>BufferLineGoToBuffer 6<cr>")
map("n", "<localleader>7", "<cmd>BufferLineGoToBuffer 7<cr>")
map("n", "<localleader>8", "<cmd>BufferLineGoToBuffer 8<cr>")
map("n", "<localleader>9", "<cmd>BufferLineGoToBuffer 9<cr>")
------------------------------------------------------------------
-- Windows
------------------------------------------------------------------
-- Close Current Buffer
map("n", "<leader>w", function()
	require("snacks").bufdelete(0)
end)
-- fuzzy file search fzf-lua
map("n", "<c-/>", "<cmd>FzfLua files<cr>")
-- toggle oil float
map("n", "<C-c>", function()
	require("oil").toggle_float()
end)
-- open oil
map("n", "-", "<cmd>Oil<cr>")
-- toggle undotree
map("n", "<d-c-v>", "<cmd>UndotreeToggle<cr>")
-- switch to next window
map("n", "<leader><tab>", "<c-w>w")
------------------------------------------------------------------
-- Navigation
------------------------------------------------------------------
map(ic, "<c-k>", "<up>")
map(ic, "<c-j>", "<down>")
map(ic, "<c-h>", "<left>")
map(ic, "<c-l>", "<right>")
-- goto first/last character of the line
map({ "n", "v" }, "gl", "g_")
map({ "n", "v" }, "gh", "^")
-- move what behind the cursor to next line, and into insert keep same line
map("n", "<leader>o", "i<enter><esc>k$a") -- insert, return new line, back to normal, move cursor up once, goto to end of the line, into append mode.
-- move what behind the cursor to previous line, and into insert keep same line
map("n", "<leader>O", "DO<esc>pj$a") -- cut the selected to end of the line, add new line above it, back to normal, paste, move cursor down once, goto end of the line, into append mode.
------------------------------------------------------------------
-- Diagnostic virtual text toggle
------------------------------------------------------------------
vim.keymap.set("n", "<leader>vt", function()
	local current_config = vim.diagnostic.config() or {}
	local vt = current_config.virtual_text
	vim.diagnostic.config({ virtual_text = not vt }) -- set to opposite value
	print("Virtual Text: " .. tostring(not vt))
end)
------------------------------------------------------------------
-- Boolean switch
------------------------------------------------------------------
map("n", "<leader>t", function()
	local word = fn.expand("<cword>") -- get current word under cursor
	if word == "true" then
		api.nvim_command("normal! ciwfalse") -- make it false
	elseif word == "false" then
		api.nvim_command("normal! ciwtrue") -- make it true
	end
end)
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
end)
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
end)
