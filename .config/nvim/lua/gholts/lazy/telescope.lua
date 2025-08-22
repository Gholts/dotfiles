return {
  'nvim-telescope/telescope.nvim',
  tag = '0.1.8', -- or, branch = '0.1.x',
  dependencies = { 'nvim-lua/plenary.nvim' },
  keys = {
    -- desc 是對快捷鍵的描述，會被 which-key.nvim 等插件使用
    { '<leader>ff', '<cmd>Telescope find_files<cr>', desc = 'Find Files' },
    { '<leader>fg', '<cmd>Telescope git_files<cr>',  desc = 'Find Git Files' },
    { '<leader>fl', '<cmd>Telescope live_grep<cr>',  desc = 'Live Grep' },
    { ';',         '<cmd>Telescope buffers<cr>',    desc = 'Buffers' },
    { '<leader>fh', '<cmd>Telescope help_tags<cr>',  desc = 'Help Tags' },
  },
}
