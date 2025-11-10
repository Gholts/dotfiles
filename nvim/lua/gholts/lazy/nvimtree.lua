return {
	"nvim-tree/nvim-tree.lua",
	version = "*",
	lazy = false,
	dependencies = {
		"nvim-tree/nvim-web-devicons",
	},
	config = function()
		require("nvim-tree").setup({
			hijack_cursor = true,
			sync_root_with_cwd = true,
			renderer = {
				full_name = true,
				group_empty = true,
				special_files = {},
				symlink_destination = true,
				indent_markers = {
					enable = true,
				},
				icons = {
					git_placement = "signcolumn",
					show = {
						file = true,
						folder = true,
						folder_arrow = true,
						git = true,
					},
					glyphs = {
						git = {
							untracked = "",
							ignored = "",
							unstaged = "󰄱",
							staged = "",
							unmerged = "",
							renamed = "",
							deleted = "",
						},
					},
				},
			},
			view = {
				centralize_selection = true,
				adaptive_size = true,
				side = "left",
				preserve_window_proportions = true,
				width = {
					max = -1,
				},
			},
			actions = {
				change_dir = {
					enable = true,
					global = true,
					restrict_above_cwd = false,
				},
				open_file = {
					resize_window = true,
					window_picker = {
						chars = "aoeui",
					},
				},
				remove_file = {
					close_window = false,
				},
			},
			update_focused_file = {
				enable = true,
				update_root = true,
				ignore_list = { "help" },
			},
			filters = {
				dotfiles = false,
				git_ignored = false,
				custom = {
					".DS_Store",
				},
			},
		})
	end,
}
