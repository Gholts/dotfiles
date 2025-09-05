-- 'n' = Normal 模式
-- 'i' = Insert 模式
-- 'v' = Visual 模式
-- 'x' = Visual Block 模式
-- 't' = Terminal 模式
-- 'o' = Operator pending 模式

-- 快速儲存
vim.keymap.set('n', '<leader>s', '<cmd>w<cr>', { desc = '[S]ave file', silent = true })

-- 智慧關閉當前 buffer 的函數
local function smart_close()
    -- 檢查當前 buffer 的檔案類型 (filetype)
    if vim.bo.filetype == "NvimTree" then
        -- 如果是 NvimTree，就執行關閉 NvimTree 的命令
        vim.cmd.NvimTreeClose()
    else
        -- 如果是其他任何 buffer，就執行 bufdelete
        -- 將 require 放在函數內部，因為它只在這裡被使用
        require("snacks").bufdelete(0)
    end
end

-- 關閉當前 buffer
vim.keymap.set('n', '<leader>w', smart_close, { desc = '[W]ipeout current buffer', silent = true })

-- 快速退出
vim.keymap.set('n', '<leader>qq', '<cmd>q<cr>', { desc = '[Q]uit current window', silent = true })

-- 在視窗之間切換
vim.keymap.set('n', '<leader><Tab>', '<C-w>w', { desc = 'Switch to next window', silent = true })

-- 左右切換 Buffer (使用 BufferLine)
vim.keymap.set('n', '<C-n>', '<cmd>BufferLineCycleNext<cr>', { desc = 'Next buffer', silent = true })
vim.keymap.set('n', '<C-p>', '<cmd>BufferLineCyclePrev<cr>', { desc = 'Previous buffer', silent = true })


vim.keymap.set('n', '<C-/>', '<cmd>FzfLua files<cr>', { desc = 'FzfLua flie search', silent = true })

-- NvimTree 開關檔案瀏覽器
vim.keymap.set('n', '<D-C-c>', '<cmd>NvimTreeToggle<cr>', { desc = 'Toggle [C]ode explorer', silent = true })

-- 在插入模式 (i) 和命令行模式 (c) 下进行映射
local modes = { 'i', 'c' }
-- 选项
local opts = {
    noremap = true,
    silent = true,
}

-- 使用 Control + HJKL 进行导航
vim.keymap.set(modes, '<C-k>', '<Up>', { desc = "Navigate Up", noremap = true, silent = true })
vim.keymap.set(modes, '<C-j>', '<Down>', { desc = "Navigate Down", noremap = true, silent = true })
vim.keymap.set(modes, '<C-h>', '<Left>', { desc = "Navigate Left", noremap = true, silent = true })
vim.keymap.set(modes, '<C-l>', '<Right>', { desc = "Navigate Right", noremap = true, silent = true })

