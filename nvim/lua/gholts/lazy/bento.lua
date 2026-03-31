return {
	"serhez/bento.nvim",
	config = function()
		require("bento").setup({
			main_keymap = ";", -- Main toggle/expand key
			lock_char = "🔒", -- Character shown before locked buffer names
			max_open_buffers = nil, -- Max buffers (nil = unlimited)
			buffer_deletion_metric = "frecency_access", -- Metric for buffer deletion (see below)
			buffer_notify_on_delete = true, -- Notify when deleting a buffer (false for silent deletion)
			ordering_metric = "access", -- Buffer ordering: nil (arbitrary), "access", or "edit"
			default_action = "open", -- Action when pressing label directly

			ui = {
				mode = "floating", -- "floating" | "tabline"
				floating = {
					position = "middle-right", -- See position options below
					offset_x = 0, -- Horizontal offset from position
					offset_y = 0, -- Vertical offset from position
					dash_char = "─", -- Character for collapsed dashes
					label_padding = 1, -- Padding around labels
					minimal_menu = "dashed", -- nil | "dashed" | "filename" | "full"
					max_rendered_buffers = nil, -- nil (no limit) or number for pagination
				},
			},

			-- Highlight groups
			highlights = {
				current = "Bold", -- Current buffer filename (in last editor window)
				active = "Normal", -- Active buffers visible in other windows
				inactive = "Comment", -- Inactive/hidden buffer filenames
				modified = "DiagnosticWarn", -- Modified/unsaved buffer filenames and dashes
				inactive_dash = "Comment", -- Inactive buffer dashes in collapsed state
				previous = "Search", -- Label for previous buffer (main_keymap label)
				label_open = "DiagnosticVirtualTextHint", -- Labels in open action mode
				label_delete = "DiagnosticVirtualTextError", -- Labels in delete action mode
				label_vsplit = "DiagnosticVirtualTextInfo", -- Labels in vertical split mode
				label_split = "DiagnosticVirtualTextInfo", -- Labels in horizontal split mode
				label_lock = "DiagnosticVirtualTextWarn", -- Labels in lock action mode
				label_minimal = "Visual", -- Labels in collapsed "full" mode
				window_bg = "BentoNormal", -- Menu window background
				page_indicator = "Comment", -- Pagination indicators (● ○ ○ for floating, ❮/❯ for tabline)
				separator = "Normal", -- Separator between buffer components in tabline
			},
		})
	end,
}
