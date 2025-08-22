return {

  {
    'sainnhe/edge',
    lazy = false,
    priority = 1000,
    config = function()
      vim.g.edge_better_performance = 1
      vim.g.edge_transparent_background = 1
      vim.g.edge_enable_italic = true
      vim.cmd.colorscheme('edge')

   end,
 },

}
