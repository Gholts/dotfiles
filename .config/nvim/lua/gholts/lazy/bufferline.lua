return {
  'akinsho/bufferline.nvim',
  version = "*",
  dependencies = {
    'nvim-tree/nvim-web-devicons',
  },
  config = function()
    vim.cmd.colorscheme("edge")
    vim.opt.termguicolors = true
    vim.o.mousemoveevent = true
    require('bufferline').setup {
        options = {
            indicator = {
                syyle = 'underline'
            },
            offsets = {
                {
                    filetype = "NvimTree",
                    text = "File Explorer",
                    text_align = "left",
                    separator = true
                }
            },
            hover = {
                enabled = true,
                delay = 200,
                reveal = {'close'}
            }
        },
    }
  end
}
