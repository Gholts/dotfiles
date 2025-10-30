return {
	"numToStr/Comment.nvim",
	event = "VeryLazy",
	dependencies = {
		"JoosepAlviste/nvim-ts-context-commentstring",
	},
	config = function()
		local keys_to_unmap = {
			n = { "gc", "gcc" },
			x = { "gc" },
			o = { "gc" },
		}
		for mode, keys in pairs(keys_to_unmap) do
			for _, key in ipairs(keys) do
				pcall(vim.keymap.del, mode, key)
			end
		end

		require("Comment").setup({
			padding = true,
			sticky = true,
			ignore = "^$",
			toggler = {
				line = "gcc",
				block = "gbc",
			},
			opleader = {
				line = "gc",
				block = "gb",
			},
			extra = {
				above = "gcO",
				below = "gco",
				eol = "gcA",
			},
			mappings = {
				basic = true,
				extra = false,
			},
			pre_hook = require("ts_context_commentstring.integrations.comment_nvim").create_pre_hook(),
			post_hook = nil,
		})
	end,
}
