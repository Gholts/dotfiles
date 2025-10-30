return {
	"mbbill/undotree",
	event = "VeryLazy",
	keys = {
		{
			"å",
			function()
				vim.cmd.UndotreeToggle()
			end,
			desc = "Show nvim undotree",
		},
		config = true,
	},
}
