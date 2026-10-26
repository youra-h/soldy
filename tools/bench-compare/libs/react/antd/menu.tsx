import { useState } from 'react'
import { Button, Dropdown, type MenuProps } from 'antd'

/**
 * The soldy menu preview in antd: a group of checkboxes, a group of radios,
 * actions with shortcuts, a submenu with a submenu inside, a disabled action
 * and a destructive one. antd's menu has groups, submenus, `extra` and `danger`
 * but no checkbox or radio items: those are items with a mark that keep the
 * menu open — the way antd's docs keep a dropdown open on a menu click
 * (controlled `open`, `onOpenChange` with `source`). The trigger opens on
 * click, as the soldy one; antd's default is hover.
 */
const KEEP_OPEN = new Set(['grid', 'ruler', 'name', 'date'])

export default function Page() {
	const [open, setOpen] = useState(false)
	const [checked, setChecked] = useState(() => new Set(['grid']))
	const [sort, setSort] = useState('name')
	const toggle = (value: string) =>
		setChecked((prev) => {
			const next = new Set(prev)

			if (!next.delete(value)) next.add(value)

			return next
		})
	const mark = (on: boolean, glyph: string) => (
		<span style={{ display: 'inline-block', width: 12 }}>{on ? glyph : ''}</span>
	)
	const items: MenuProps['items'] = [
		{
			type: 'group',
			label: 'Вид',
			children: [
				{ key: 'grid', label: 'Сетка', icon: mark(checked.has('grid'), '✓') },
				{ key: 'ruler', label: 'Линейка', icon: mark(checked.has('ruler'), '✓') },
			],
		},
		{ type: 'divider' },
		{
			type: 'group',
			label: 'Сортировка',
			children: [
				{ key: 'name', label: 'По имени', icon: mark(sort === 'name', '•') },
				{ key: 'date', label: 'По дате', icon: mark(sort === 'date', '•') },
			],
		},
		{ type: 'divider' },
		{ key: 'edit', label: 'Изменить', extra: 'Ctrl+E' },
		{ key: 'copy', label: 'Дублировать', extra: 'Ctrl+D' },
		{
			key: 'share',
			label: 'Поделиться',
			children: [
				{ key: 'link', label: 'Ссылка' },
				{ key: 'mail', label: 'Почта' },
				{
					key: 'messengers',
					label: 'Мессенджеры',
					children: [
						{ key: 'telegram', label: 'Telegram' },
						{ key: 'whatsapp', label: 'WhatsApp' },
					],
				},
			],
		},
		{ key: 'archive', label: 'В архив', disabled: true },
		{ type: 'divider' },
		{ key: 'remove', label: 'Удалить', danger: true, extra: 'Del' },
	]

	return (
		<Dropdown
			trigger={['click']}
			open={open}
			onOpenChange={(next, info) => {
				if (info.source === 'trigger' || next) setOpen(next)
			}}
			menu={{
				items,
				onClick: ({ key }) => {
					if (key === 'grid' || key === 'ruler') toggle(key)
					else if (key === 'name' || key === 'date') setSort(key)

					if (!KEEP_OPEN.has(key)) setOpen(false)
				},
			}}
		>
			<Button>Действия</Button>
		</Dropdown>
	)
}
