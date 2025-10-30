return {
	{
		"folke/snacks.nvim",
		priority = 1000,
		lazy = false,
		opts = {
			dashboard = { enabled = false },
			debug = { enabled = false },
			dim = { enabled = false },
			explorer = { enabled = false },
			git = { enabled = false },
			gitbrowse = { enabled = false },
			layout = { enabled = false },
			lazygit = { enabled = false },
			profiler = { enabled = false },
			scratch = { enabled = false },
			terminal = { enabled = false },
			toggle = { enabled = false },
			win = { enabled = false },
			words = { enabled = false },
			zen = { enabled = false },
			statuscolumn = { enabled = false },
			-- true --
			scope = { enabled = true },
			bufdelete = { enabled = true },
			quickfile = { enabled = false },
			rename = { enabled = true },
			scroll = {
				enabled = false,
				animate = {
					duration = { step = 7, total = 150 },
					easing = "linear",
				},
				animate_repeat = {
					delay = 100, -- delay in ms before using the repeat animation
					duration = { step = 5, total = 30 },
					easing = "linear",
				},
				filter = function(buf)
					return vim.g.snacks_scroll ~= false
						and vim.b[buf].snacks_scroll ~= false
						and vim.bo[buf].buftype ~= "terminal"
				end,
			},
			styles = {
				snacks_image = {
					relative = "cursor",
					border = true,
					focusable = false,
					backdrop = true,
					row = 1,
					col = 1,
				},
			},
			bigfile = {
				enabled = true,
				size = 10 * 1024 * 1024,
				notify = false,
				line_length = 1000,
			},
			image = {
				enabled = true,
				backend = "ghostty",
				doc = {
					enabled = true,
					inline = false,
					float = true,
					max_width = 60,
					max_height = 20,
				},
				img_dirs = { "img", "images", "assets", "static", "public", "media", "attachments" },
				wo = {
					wrap = false,
					number = false,
					relativenumber = false,
					cursorcolumn = false,
					signcolumn = "no",
					foldcolumn = "0",
					list = false,
					spell = false,
					statuscolumn = "",
				},
				cache = vim.fn.stdpath("cache") .. "/snacks/image",
				icons = {
					math = "󰪚 ",
					chart = "󰄧 ",
					image = " ",
				},
				convert = {
					notify = true, -- show a notification on error
					mermaid = function()
						local theme = vim.o.background == "neutral" and "light" or "dark"
						return { "-i", "{src}", "-o", "{file}", "-b", "transparent", "-t", theme, "-s", "{scale}" }
					end,
					magick = {
						default = { "{src}[0]", "-scale", "1920x1080>" }, -- default for raster images
						vector = { "-density", 192, "{src}[{page}]" }, -- used by vector images like svg
						math = { "-density", 192, "{src}[{page}]", "-trim" },
						pdf = { "-density", 192, "{src}[{page}]", "-background", "white", "-alpha", "remove", "-trim" },
					},
				},
				math = {
					enabled = false, -- enable math expression rendering
				},
			},
			indent = {
				enabled = true,
				animate = {
					enabled = vim.fn.has("nvim-0.10") == 1,
					style = "out",
					easing = "linear",
					duration = {
						step = 40, -- ms per step
						total = 500, -- maximum duration
					},
				},
				scope = {
					enabled = true, -- enable highlighting the current scope
					priority = 200,
					char = "│",
					underline = false, -- underline the start of the scope
					only_current = false, -- only show scope in the current window
					hl = "SnacksIndentScope", ---@type string|string[] hl group for scopes
				},
			},
			notifier = {
				enabled = true,
				style = "minimal",
				top_down = true,
				timeout = 6000,
				width = { min = 40, max = 0.4 },
				height = { min = 1, max = 0.6 },
				icons = {
					error = " ",
					warn = " ",
					info = " ",
					debug = " ",
					trace = " ",
				},
			},
			animate = {
				enabled = true,
				easing = "linear",
				duration = {
					step = 40, -- ms per step
					total = 500, -- maximum duration
				},
			},
		},
	},
}
