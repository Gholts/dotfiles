# Quick Remote

Fast SSH and VNC launcher for Alfred 5.

## Keywords

- `remote [query]`: SSH config entries + saved/cached VNC devices. Refreshes Bonjour cache in background.
- `ssh [query]`: SSH config entries only.
- `vnc [query or address]`: saved/cached VNC devices only. Enter a direct address such as `vnc://mac-mini.local`.

## Actions

- SSH Return → `ssh` in Alfred's default terminal.
- SSH Command-Return → `nvim oil-ssh://user@host/` in Alfred's default terminal.
- VNC Return → `/usr/bin/open` selected URL.

## Command-Return dependencies

- Neovim (`nvim`)
- [oil.nvim](https://github.com/stevearc/oil.nvim)

Both must exist in terminal `PATH`.

## Configuration

- **Saved VNC Addresses**: one address per line. Supports `vnc://name:password@host`, `vnc://name@host`, and `vnc://host`. Passwords are masked in results.
- **SSH Config Path**: defaults to `~/.ssh/config`. `Include` files and literal aliases from multi-host `Host` lines are supported. Wildcard patterns are ignored as destinations.

`vnc` reads Bonjour cache without scanning. `remote` refreshes `_rfb._tcp` and `_vnc._tcp` services when cache is older than 10 seconds, then reruns while discovery completes.
