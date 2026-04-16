require("lualine").setup({
	options = {
		theme = "auto",
		component_separators = "",
		section_separators = "",
		globalstatus = false,
		disabled_filetypes = {
			statusline = { "mason", "undotree" },
		},
		ignore_focus = { "fzf" },
	},
	sections = {
		lualine_a = { "mode" },
		lualine_b = {
			{
				function()
					return vim.g.SSH_CLIENT and ("Remote: %s"):format(vim.uv.os_gethostname()) or ""
				end,
				padding = { right = 1, left = 1 },
			},
			{
				"branch",
				icon = "",
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
					enable = true,
					shorten = false,
					exclude_filetypes = { "help" },
					max_depth = 4,
				},
				highlights = {
					directory = "Directory",
					filename = "Bold",
					id = "Number",
					modified = "MatchParen",
					newfile = "Special",
					path_sep = "Comment",
					symbols = "",
					unnamed = "Comment",
					verbose = "Comment",
				},
				custom_icons = {
					gitrebase = { "", "DevIconGitCommit" },
					help = { "󰋖", "DevIconTxt" },
				},
				cond = function()
					return vim.bo.filetype ~= "oil"
				end,
			},
			{
				"filename",
				path = 1,
				cond = function()
					return vim.bo.filetype == "oil"
				end,
			},
		},
		lualine_x = { "filetype" },
		lualine_y = { "searchcount", "progress" },
		lualine_z = { "location" },
	},
	inactive_sections = {
		lualine_a = {
			{
				function()
					return vim.g.SSH_CLIENT and ("Remote: %s"):format(vim.uv.os_gethostname()) or ""
				end,
				padding = { right = 1, left = 1 },
			},
			{
				"branch",
				icon = "",
			},
		},
		lualine_b = {
			{
				"diagnostics",
				sources = { "nvim_diagnostic" },
				symbols = { error = " ", warn = " ", info = " " },
			},
		},
		lualine_c = {
			{
				"pretty_path",
				cond = function()
					return vim.bo.filetype ~= "oil"
				end,
			},
			{
				"filename",
				path = 1,
				cond = function()
					return vim.bo.filetype == "oil"
				end,
			},
		},
		lualine_x = {},
		lualine_y = {},
		lualine_z = { "filetype" },
	},
})
