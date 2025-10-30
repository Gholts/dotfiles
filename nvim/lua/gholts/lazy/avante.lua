return {
	"yetone/avante.nvim",
	build = vim.fn.has("win32") ~= 0 and "powershell -ExecutionPolicy Bypass -File Build.ps1 -BuildFromSource false"
		or "make",
	event = "VeryLazy",
	keys = {
		{
			"<leader>a+",
			function()
				local tree_ext = require("avante.extensions.nvim_tree")
				tree_ext.add_file()
			end,
			desc = "Select file in NvimTree",
			ft = "NvimTree",
		},
		{
			"<leader>a-",
			function()
				local tree_ext = require("avante.extensions.nvim_tree")
				tree_ext.remove_file()
			end,
			desc = "Deselect file in NvimTree",
			ft = "NvimTree",
		},
	},
	version = false, -- Never set this value to "*"! Never!
	opts = {
		instructions_file = "avante.md",
		provider = "gemini",
		selector = {
			provider = "snacks",
		},
		providers = {
			gemini = {
				endpoint = "https://generativelanguage.googleapis.com/v1beta/models",
				model = "gemini-2.5-pro",
				timeout = 30000, -- Timeout in milliseconds
				context_window = 1048576,
				use_ReAct_prompt = true,
				extra_request_body = {
					generationConfig = {
						temperature = 0.75,
						thinkingBudget = 32768,
					},
				},
			},
		},
		acp_providers = {
			["gemini-cli"] = {
				command = "gemini",
				args = { "--experimental-acp" },
				env = {
					NODE_NO_WARNINGS = "1",
					GEMINI_API_KEY = os.getenv("GEMINI_API_KEY"),
				},
			},
		},
	},
	dependencies = {
		"nvim-lua/plenary.nvim",
		"MunifTanjim/nui.nvim",
		{
			"HakonHarnes/img-clip.nvim",
			event = "VeryLazy",
			opts = {
				default = {
					embed_image_as_base64 = false,
					prompt_for_file_name = false,
					drag_and_drop = {
						insert_mode = true,
					},
				},
			},
		},
		{
			"MeanderingProgrammer/render-markdown.nvim",
			opts = {
				file_types = { "markdown", "Avante" },
			},
			ft = { "markdown", "Avante" },
		},
	},
}
