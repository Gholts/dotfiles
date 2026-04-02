local active_lsp_tasks = {}

vim.api.nvim_create_autocmd("LspProgress", {
	group = vim.api.nvim_create_augroup("GhosttyTerminalProgress", { clear = true }),
	callback = function(args)
		local client_id = args.data.client_id
		local token = args.data.params.token
		local value = args.data.params.value
		if not value then
			return
		end

		active_lsp_tasks[client_id] = active_lsp_tasks[client_id] or {}

		if value.kind == "begin" or value.kind == "report" then
			active_lsp_tasks[client_id][token] = value.percentage or "indeterminate"
		elseif value.kind == "end" then
			active_lsp_tasks[client_id][token] = nil
		end

		local total_pct = 0
		local task_count = 0
		local has_indeterminate = false

		for _, tasks in pairs(active_lsp_tasks) do
			for _, pct in pairs(tasks) do
				task_count = task_count + 1
				if type(pct) == "number" then
					total_pct = total_pct + pct
				else
					has_indeterminate = true
				end
			end
		end

		if task_count == 0 then
			io.stderr:write("\x1b]9;4;0;0\x07")
		elseif has_indeterminate and total_pct == 0 then
			io.stderr:write("\x1b]9;4;3;0\x07")
		else
			local avg_pct = math.floor(total_pct / task_count)
			io.stderr:write(string.format("\x1b]9;4;1;%d\x07", avg_pct))
		end
	end,
})

vim.api.nvim_create_autocmd("VimLeave", {
	callback = function()
		io.stderr:write("\x1b]9;4;0;0\x07")
	end,
})
