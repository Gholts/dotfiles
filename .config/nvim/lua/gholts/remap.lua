local bind = vim.keymap.set
local ic = { "i", "c" }

-- Save
bind("n", "<leader>s", "<cmd>w<cr>", { desc = "[S]ave file", noremap = true, silent = true })

-- Quit
bind("n", "<leader>qq", "<cmd>q<cr>", { desc = "[Q]uit current window", noremap = true, silent = true })

-- Force Quit
bind("n", "<Bslash>q", ":q!<CR>", { desc = "Force Quit", noremap = true, silent = true })

-- Smart Close Buffer
local function smart_close()
	if vim.bo.filetype == "NvimTree" then
		vim.cmd.NvimTreeClose()
	else
		require("snacks").bufdelete(0)
	end
end

-- Close Current Buffer
bind("n", "<leader>w", smart_close, { desc = "[W]ipeout current buffer", noremap = true, silent = true })

-- Switch to Next Window
bind("n", "<leader><Tab>", "<C-w>w", { desc = "Switch to next window", noremap = true, silent = true })

-- Cycle Switch Buffer by Buffer Line
bind("n", "<C-p>", "<cmd>BufferLineCycleNext<cr>", { desc = "Next buffer", noremap = true, silent = true })
bind("n", "<C-n>", "<cmd>BufferLineCyclePrev<cr>", { desc = "Previous buffer", noremap = true, silent = true })

-- Fuzzy File Search
bind("n", "<C-/>", "<cmd>FzfLua files<cr>", { desc = "FzfLua flie search", noremap = true, silent = true })

-- Toggle NvimTree
bind("n", "<D-C-c>", "<cmd>NvimTreeToggle<cr>", { desc = "Toggle [C]ode explorer", noremap = true, silent = true })

-- Temporary Move
bind(ic, "<C-k>", "<Up>", { desc = "Navigate Up", noremap = true, silent = true })
bind(ic, "<C-j>", "<Down>", { desc = "Navigate Down", noremap = true, silent = true })
bind(ic, "<C-h>", "<Left>", { desc = "Navigate Left", noremap = true, silent = true })
bind(ic, "<C-l>", "<Right>", { desc = "Navigate Right", noremap = true, silent = true })

-- Paste No Copy
bind("v", "p", '"_dP', { noremap = true, silent = true })

-- Boolean Switch
bind("n", "<leader>t", function()
	local word = vim.fn.expand("<cword>") -- get current word under cursor
	if word == "true" then
		vim.api.nvim_command("normal! ciwfalse") -- make it false
	elseif word == "false" then
		vim.api.nvim_command("normal! ciwtrue") -- make it true
	end
end, { desc = "Toggle true/false", silent = true })

-- Fully Indent
bind("n", "<C-=>", "ggVG=", { desc = "Select all and indent", noremap = true, silent = true })
