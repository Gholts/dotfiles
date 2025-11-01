return {
	"nvim-lualine/lualine.nvim",
	dependencies = {
		"nvim-tree/nvim-web-devicons",
		"bwpge/lualine-pretty-path",
	},
	config = function()
		require("lualine").setup({
			options = {
				theme = "auto",
				component_separators = "",
				section_separators = "",
				globalstatus = false,
			},
			sections = {
				lualine_a = { "mode" },
				lualine_b = {
					{
						function()
							return vim.g.remote_neovim_host and ("Remote: %s"):format(vim.uv.os_gethostname()) or ""
						end,
						padding = { right = 1, left = 1 },
					},
					{
						"branch",
						icon = "",
					},
					{
						"diff",
						symbols = { added = " ", modified = " ", removed = " " },
					},
					{
						"diagnostics",
						sources = { "nvim_diagnostic" },
						symbols = { error = " ", warn = " ", info = " " },
					},
				},
				lualine_c = {
					{
						"pretty_path",
						icon_show = false,
						icon_show_inactive = false,
						use_color = true,
						use_absolute = false,
						use_symbols = true,
						unnamed = "[Unnamed]",
						symbols = {
							modified = "●",
							readonly = "",
							newfile = "",
							ellipsis = "…",
						},
						directories = {
							enable = true, -- 是否顯示目錄
							shorten = false, -- 是否縮短目錄
							exclude_filetypes = { "help", "NvimTree" },
							max_depth = 4,
						},
						highlights = {
							directory = "Directory", -- 目錄部分
							filename = "Bold", -- 檔案名稱部分
							id = "Number", -- 終端機 ID 等
							modified = "MatchParen", -- 已修改檔案的名稱高亮
							newfile = "Special", -- 新檔案的高亮
							path_sep = "Comment", -- 路徑分隔符高亮
							symbols = "", -- 符號部分高亮
							unnamed = "Comment", -- 未命名緩衝區高亮
							verbose = "Comment", -- 終端機 PID 等詳細資訊
						},
						custom_icons = {
							gitrebase = { "", "DevIconGitCommit" },
							help = { "󰋖", "DevIconTxt" },
							trouble = { "󰔫", "DevIconGitConfig" },
							Trouble = { "󰔫", "DevIconGitConfig" },
						},
					},
				},
				lualine_x = { "encoding", "filetype" },
				lualine_y = { "searchcount", "progress" },
				lualine_z = { "location", "showcmd" },
			},
			inactive_sections = {
				lualine_a = {},
				lualine_b = {},
				lualine_c = { "pretty_path" },
				lualine_x = {},
				lualine_y = {},
				lualine_z = {},
			},
		})
	end,
}
