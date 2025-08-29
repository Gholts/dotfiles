return {
    'akinsho/bufferline.nvim',
    version = "*",
    dependencies = {
        'nvim-tree/nvim-web-devicons',
    },
    config = function()
        vim.cmd.colorscheme("oxocarbon")
        vim.opt.termguicolors = true
        vim.o.mousemoveevent = true
        require('bufferline').setup {
            options = {
                indicator = {
                    style = 'underline'
                },

                max_name_length = 14,
                max_prefix_length = 13,
                tab_size = 10,
                show_tab_indicators = true,
                enforce_regular_tabs = false,
                show_buffer_close_icons = true,
                show_close_icon = false,
                separator_style = "thick",
                always_show_bufferline = true,

                hover = {
                    enabled = true,
                    delay = 200,
                    reveal = {'close'}
                },

                offsets = {
                    {
                        filetype = "NvimTree",
                        text = "File Explorer",
                        text_align = "left",
                        separator = true
                    }
                }
            },
        }
    end
}
