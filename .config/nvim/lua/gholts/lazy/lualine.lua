return {
  'nvim-lualine/lualine.nvim',
  dependencies = {
    'nvim-tree/nvim-web-devicons',
    'bwpge/lualine-pretty-path',
  },
  config = function()
    require('lualine').setup({
      options = {
        theme = 'oxocarbon',
        component_separators = '',
        section_separators = '',
      },
      sections = {
        lualine_a = { 'mode' },
        lualine_b = {
          {
            'branch',
            icon = '',
          },
          {
            'diff',
            symbols = { added = ' ', modified = ' ', removed = ' ' },
          },
          {
            'diagnostics',
            sources = { 'nvim_diagnostic' },
            symbols = { error = ' ', warn = ' ', info = ' ' },
          },
        },
        lualine_c = {
          {
            'pretty_path',
            -- 是否顯示檔案類型圖示。若設為 false，你可以在別處使用 lualine 的 'filetype' 元件。
            icon_show = true,
            -- 在非當前視窗（inactive）時是否顯示圖示。
            icon_show_inactive = false,
            -- 是否使用顏色高亮。設為 false 則所有路徑都是預設顏色。
            use_color = true,
            -- 是否使用絕對路徑。
            use_absolute = false,
            -- 是否顯示檔案狀態符號（如唯讀、修改等）。
            use_symbols = true,
            -- 未命名緩衝區的顯示文字。
            unnamed = '[Unnamed]',
            -- 自訂檔案狀態符號。
            symbols = {
              modified = '●',
              readonly = '',
              newfile = '',
              ellipsis = '…',
            },
            -- -- 目錄顯示相關設定。
            -- directories = {
            --   enable = true, -- 是否顯示目錄
            --   shorten = true, -- 是否縮短目錄
            --   -- 在這些檔案類型中不顯示目錄
            --   exclude_filetypes = { 'help', 'NvimTree' },
            --   -- 目錄最大深度，超過則會被縮短。
            --   max_depth = 2,
            -- },
            --
            -- -- 自訂各部分的高亮。可以是現有的高亮組名稱，也可以是自訂的 table。
            -- highlights = {
            --   directory = 'Directory', -- 目錄部分
            --   filename = 'Bold',       -- 檔案名稱部分
            --   id = 'Number',           -- 終端機 ID 等
            --   modified = 'MatchParen', -- 已修改檔案的名稱高亮
            --   newfile = 'Special',     -- 新檔案的高亮
            --   path_sep = 'Comment',    -- 路徑分隔符高亮
            --   symbols = '',            -- 符號部分高亮
            --   unnamed = 'Comment',     -- 未命名緩衝區高亮
            --   verbose = 'Comment',     -- 終端機 PID 等詳細資訊
            -- },
            -- 自訂特定檔案類型或名稱的圖示，格式為 { '圖示', '高亮組' }
            custom_icons = {
              gitrebase = { '', 'DevIconGitCommit' },
              help = { '󰋖', 'DevIconTxt' },
              oil = { '', 'OilDir' },
            },
            -- 某些圖示可能需要額外的邊距來對齊。
            icon_padding = {
              [''] = 1,
              [''] = 1,
            },
          },
          '%='
        },
        lualine_x = { 'encoding', 'fileformat', 'filetype' },
        lualine_y = { 'progress' },
        lualine_z = { 'location' },
      },
      inactive_sections = {
        lualine_a = {},
        lualine_b = {},
        lualine_c = { 'pretty_path' },
        lualine_x = { 'location' },
        lualine_y = {},
        lualine_z = {},
      },
    })
  end,
}
