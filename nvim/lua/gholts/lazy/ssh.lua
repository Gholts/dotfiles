return {
	"amitds1997/remote-nvim.nvim",
	version = "*", -- Pin to GitHub releases
	dependencies = {
		"nvim-lua/plenary.nvim", -- For standard functions
		"MunifTanjim/nui.nvim", -- To build the plugin UI
		"nvim-telescope/telescope.nvim", -- For picking b/w different remote methods
	},
	config = true,
	opt = {
		ssh_config = {
			ssh_binary = "ssh", -- Binary to use for running SSH command
			scp_binary = "scp", -- Binary to use for running SSH copy commands
			ssh_config_file_paths = { "$HOME/.ssh/config" }, -- Which files should be considered to contain the ssh host configurations. NOTE: `Include` is respected in the provided files.
		},
		progress_view = {
			type = "split",
		},
	},
}
