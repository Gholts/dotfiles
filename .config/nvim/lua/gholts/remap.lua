-- 'n' = Normal 模式
-- 'i' = Insert 模式
-- 'v' = Visual 模式
-- 'x' = Visual Block 模式
-- 't' = Terminal 模式
-- 'o' = Operator pending 模式

-- 快速儲存
vim.keymap.set('n', '<leader>s', '<cmd>w<cr>', { desc = '[S]ave file', silent = true })

-- 關閉當前 buffer
vim.keymap.set('n', '<leader>w', '<cmd>bdelete<cr>', { desc = '[W]ipeout current buffer', silent = true })

-- 在視窗之間切換
vim.keymap.set('n', '<leader><Tab>', '<C-w>w', { desc = 'Switch to next window', silent = true })

-- 快速退出
vim.keymap.set('n', '<leader>qq', '<cmd>q<cr>', { desc = '[Q]uit current window', silent = true })

-- Bufferline - 左右切換 Buffer
vim.keymap.set('n', '<S-l>', '<cmd>BufferLineCycleNext<cr>', { desc = 'Next buffer', silent = true })

vim.keymap.set('n', '<S-h>', '<cmd>BufferLineCyclePrev<cr>', { desc = 'Previous buffer', silent = true })

-- NvimTree - 開關檔案瀏覽器
vim.keymap.set('n', '<D-C-c>', '<cmd>NvimTreeToggle<cr>', { desc = 'Toggle [C]ode explorer', silent = true })

-- 使用滑鼠中鍵新增多行游標
vim.keymap.set("n", "<MiddleMouse>", require("multicursor-nvim").handleMouse, { desc = "Multicursor: Add/Remove with middle mouse" })
vim.keymap.set("n", "<MiddleDrag>", require("multicursor-nvim").handleMouseDrag, { desc = "Multicursor: Drag with middle mouse" })
vim.keymap.set("n", "<MiddleRelease>", require("multicursor-nvim").handleMouseRelease, { desc = "Multicursor: End middle mouse drag" })
