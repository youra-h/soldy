import { useState, type MouseEvent } from 'react'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import ListSubheader from '@mui/material/ListSubheader'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

/**
 * The soldy menu preview in MUI: a group of checkboxes, a group of radios,
 * actions with shortcuts, a submenu with a submenu inside, a disabled action
 * and a destructive one. MUI has no checkbox items and no submenus: checkbox
 * and radio items are `MenuItem` with `role` and a mark, a submenu is a nested
 * `Menu` anchored on its item — the way the MUI docs suggest building them.
 */
function Submenu({ text, items }: { text: string; items: (string | [string, string[]])[] }) {
	const [anchor, setAnchor] = useState<HTMLElement | null>(null)

	return (
		<>
			<MenuItem
				aria-haspopup="menu"
				aria-expanded={anchor !== null}
				onClick={(event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget)}
			>
				<ListItemText>{text}</ListItemText>›
			</MenuItem>
			<Menu
				anchorEl={anchor}
				open={anchor !== null}
				onClose={() => setAnchor(null)}
				anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
			>
				{items.map((item) =>
					typeof item === 'string' ? (
						<MenuItem key={item} onClick={() => setAnchor(null)}>
							{item}
						</MenuItem>
					) : (
						<Submenu key={item[0]} text={item[0]} items={item[1]} />
					),
				)}
			</Menu>
		</>
	)
}

export default function Page() {
	const [anchor, setAnchor] = useState<HTMLElement | null>(null)
	const [checked, setChecked] = useState(() => new Set(['grid']))
	const [sort, setSort] = useState('name')
	const close = () => setAnchor(null)
	const toggle = (value: string) =>
		setChecked((prev) => {
			const next = new Set(prev)

			if (!next.delete(value)) next.add(value)

			return next
		})
	const shortcut = (text: string) => (
		<Typography variant="body2" color="text.secondary">
			{text}
		</Typography>
	)

	return (
		<>
			<Button
				aria-haspopup="menu"
				aria-expanded={anchor !== null}
				onClick={(event) => setAnchor(event.currentTarget)}
			>
				Действия
			</Button>
			<Menu anchorEl={anchor} open={anchor !== null} onClose={close}>
				<ListSubheader>Вид</ListSubheader>
				{[
					['grid', 'Сетка'],
					['ruler', 'Линейка'],
				].map(([value, text]) => (
					<MenuItem
						key={value}
						role="menuitemcheckbox"
						aria-checked={checked.has(value)}
						onClick={() => toggle(value)}
					>
						<ListItemIcon>{checked.has(value) ? '✓' : ''}</ListItemIcon>
						<ListItemText>{text}</ListItemText>
					</MenuItem>
				))}
				<Divider />
				<ListSubheader>Сортировка</ListSubheader>
				{[
					['name', 'По имени'],
					['date', 'По дате'],
				].map(([value, text]) => (
					<MenuItem
						key={value}
						role="menuitemradio"
						aria-checked={sort === value}
						onClick={() => setSort(value)}
					>
						<ListItemIcon>{sort === value ? '•' : ''}</ListItemIcon>
						<ListItemText>{text}</ListItemText>
					</MenuItem>
				))}
				<Divider />
				<MenuItem onClick={close}>
					<ListItemText>Изменить</ListItemText>
					{shortcut('Ctrl+E')}
				</MenuItem>
				<MenuItem onClick={close}>
					<ListItemText>Дублировать</ListItemText>
					{shortcut('Ctrl+D')}
				</MenuItem>
				<Submenu
					text="Поделиться"
					items={['Ссылка', 'Почта', ['Мессенджеры', ['Telegram', 'WhatsApp']]]}
				/>
				<MenuItem disabled>В архив</MenuItem>
				<Divider />
				<MenuItem onClick={close} sx={{ color: 'error.main' }}>
					<ListItemText>Удалить</ListItemText>
					{shortcut('Del')}
				</MenuItem>
			</Menu>
		</>
	)
}
