return {
  "folke/snacks.nvim",
  priority = 1000,
  lazy = false,
  opts = {
    disabled_builtins = {
      "dashboard",
      "debug",
      "dim",
      "explorer",
      "git",
      "gitbrowse",
      "input",
      "layout",
      "lazygit",
      "notify",
      "picker",
      "profiler",
      "scroll",
      "scratch",
      "statuscolumn",
      "terminal",
      "toggle",
      "util",
      "win",
      "words",
      "zen",
    },
    bigfile = {
      enabled = true,
      filesize = 10,
      avg_line_len = 1000,
      notify = false,
    },
    bufdelete = {
      enabled = true,
      style = "default",
    },
    image = {
      enabled = true,
      backend = "ghostty",
      integrations = {
        markdown = {
          enabled = true,
          download = true,
          cache_dir = vim.fn.stdpath("cache") .. "/snacks/image/markdown",
        },
        neotree = {
          enabled = false,
          show_icon = true,
        },
        telescope = {
          enabled = false,
        },
        math = {
          enabled = true,
          engine = "mathtex",
          mathtex = {
            dpi = 150,
            fg = "#c0caf5",
            bg = "none",
          },
        },
      },
      float = {
        enabled = true,
        border = "rounded",
        relative = "cursor",
        -- 窗口 z-index
        zindex = 100,
        hide_in_insert = true,
      },
      max_width = 60,
      max_height = 30,
      cache_dir = vim.fn.stdpath("cache") .. "/snacks/image/render",
    },
    indent = {
      enabled = true,
      char = "│",
      tab_char = "│",
      hl = "IndentBlanklineChar",
    },
    notifier = {
      enabled = true,
      style = "simple",
      timeout = 3000,
      max_height = 10,
      max_width = 80,
      icons = {
        ERROR = "",
        WARN = "",
        INFO = "",
        DEBUG = "",
        TRACE = "✎",
      },
      title = true,
      -- status = true,
    },
    quickfile = {
      enabled = false,
    },
    rename = {
      enabled = true,
      backend = "default",
    },
    scope = {
      enabled = true,
      highlight = {
        enabled = true,
        hl = "IndentBlanklineContextChar",
      },
    },
    animate = {
      enabled = true,
      duration = 200,
      easing = "out_quad",
    },
  },
}
