local map = vim.keymap.set
local cmd, fn, api = vim.cmd, vim.fn, vim.api
------------------------------------------------------------------
map("n", "<leader>s", "<cmd>w<cr>") -- save
map("n", "<Bslash>q", "<cmd>q!<CR>") -- force quit
map("n", "<leader>qq", "<cmd>q<cr>") -- quit
map("n", "<leader>ro", "<cmd>so<CR>") -- source configs
------------------------------------------------------------buffer
map("n", "gn", "<cmd>tabnew<cr>") -- open new tab
map("n", "gw", "<cmd>tabclose<cr>") -- close tab

api.nvim_create_autocmd("FileType", {
	pattern = "help",
	callback = function(event)
		map("n", "F", "<C-w>T", { buffer = event.buf, silent = true }) -- quick fullscreen help buffer
		map("n", "q", "<cmd>q<cr>", { buffer = event.buf, silent = true }) -- quit help screen
	end,
})
------------------------------------------------------------------
map("n", "<leader>w", "<cmd>lua MiniBufremove.delete(0, false)<cr>") -- close current buffer
map("n", "<C-c>", "<cmd>lua require('oil').toggle_float()<cr>") -- toggle oil float
map("n", "-", "<cmd>Oil<cr>") -- open oil
map("n", "<c-/>", "<cmd>FzfLua files<cr>") -- fuzzy file search fzf-lua
map("n", "<d-c-v>", "<cmd>UndotreeToggle<cr>") -- toggle undotree
map("n", "<leader><tab>", "<c-w>w") -- switch to next window
--------------------------------------------------------navigation
map({ "n", "v" }, "gl", "g_") -- jump to last character of the line
map({ "n", "v" }, "gh", "^") -- jump to first character of the line
map("n", "<leader>o", "i<enter><esc>k$a") -- move what behind the cursor to next line, and into insert keep same line
map("n", "<leader>O", "DO<esc>pj$a") -- move what behind the cursor to previous line, and into insert keep same line
------------------------------------toggle_diagnostic_virtual_text
map("n", "<leader>vt", function()
	local current_config = vim.diagnostic.config() or {}
	local vt = current_config.virtual_text
	vim.diagnostic.config({ virtual_text = not vt })
	print("Virtual Text: " .. tostring(not vt))
end)
----------------------------------------------------switch_boolean
map("n", "<leader>t", function()
	local word = fn.expand("<cword>")
	if word == "true" then
		api.nvim_command("normal! ciwfalse")
	elseif word == "false" then
		api.nvim_command("normal! ciwtrue")
	end
end)
----------------------------------------------------copy_full_text
map("n", "<C-0>", function()
	local original_view = fn.winsaveview()
	cmd("normal! ggVGy")
	fn.winrestview(original_view)
end)
-----------------------------------------------------format_indent
map("n", "<C-=>", function()
	local original_view = fn.winsaveview()
	cmd("normal! ggVG=")
	fn.winrestview(original_view)
end)
