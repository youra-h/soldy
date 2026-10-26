import { For, createSignal } from 'solid-js'
import { DropdownMenu } from '@kobalte/core/dropdown-menu'

type TEntry = string | [string, TEntry[]]

/** A submenu of entries; an entry with entries is a submenu inside. */
function Submenu(props: { text: string; items: TEntry[] }) {
	return (
		<DropdownMenu.Sub>
			<DropdownMenu.SubTrigger>{props.text} ›</DropdownMenu.SubTrigger>
			<DropdownMenu.Portal>
				<DropdownMenu.SubContent class="kb-menu">
					<For each={props.items}>
						{(item) =>
							typeof item === 'string' ? (
								<DropdownMenu.Item>{item}</DropdownMenu.Item>
							) : (
								<Submenu text={item[0]} items={item[1]} />
							)
						}
					</For>
				</DropdownMenu.SubContent>
			</DropdownMenu.Portal>
		</DropdownMenu.Sub>
	)
}

/** An action with its shortcut hint. */
function Action(props: { text: string; shortcut: string; color?: string }) {
	return (
		<DropdownMenu.Item style={props.color ? { color: props.color } : undefined}>
			<DropdownMenu.ItemLabel>{props.text}</DropdownMenu.ItemLabel>
			<span style={{ 'margin-left': '16px', opacity: 0.6 }}>{props.shortcut}</span>
		</DropdownMenu.Item>
	)
}

/**
 * The soldy menu preview in Kobalte: a group of checkboxes, a group of radios,
 * actions with shortcuts, a submenu with a submenu inside, a disabled action
 * and a destructive one. Kobalte has all of these parts; a shortcut is a hint
 * next to the label and the destructive action is colored by the page, since
 * Kobalte is unstyled. The soldy item with a calendar panel has no
 * counterpart (Kobalte has no calendar), as with the other neighbors.
 */
export default function Page() {
	const [grid, setGrid] = createSignal(true)
	const [ruler, setRuler] = createSignal(false)
	const [sort, setSort] = createSignal('name')

	return (
		<DropdownMenu>
			<DropdownMenu.Trigger class="kb-menu-trigger">Действия</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content class="kb-menu">
					<DropdownMenu.Group>
						<DropdownMenu.GroupLabel>Вид</DropdownMenu.GroupLabel>
						<DropdownMenu.CheckboxItem checked={grid()} onChange={setGrid}>
							<DropdownMenu.ItemIndicator>✓</DropdownMenu.ItemIndicator>
							Сетка
						</DropdownMenu.CheckboxItem>
						<DropdownMenu.CheckboxItem checked={ruler()} onChange={setRuler}>
							<DropdownMenu.ItemIndicator>✓</DropdownMenu.ItemIndicator>
							Линейка
						</DropdownMenu.CheckboxItem>
					</DropdownMenu.Group>
					<DropdownMenu.Separator />
					<DropdownMenu.Group>
						<DropdownMenu.GroupLabel>Сортировка</DropdownMenu.GroupLabel>
						<DropdownMenu.RadioGroup value={sort()} onChange={setSort}>
							<DropdownMenu.RadioItem value="name">
								<DropdownMenu.ItemIndicator>•</DropdownMenu.ItemIndicator>
								По имени
							</DropdownMenu.RadioItem>
							<DropdownMenu.RadioItem value="date">
								<DropdownMenu.ItemIndicator>•</DropdownMenu.ItemIndicator>
								По дате
							</DropdownMenu.RadioItem>
						</DropdownMenu.RadioGroup>
					</DropdownMenu.Group>
					<DropdownMenu.Separator />
					<Action text="Изменить" shortcut="Ctrl+E" />
					<Action text="Дублировать" shortcut="Ctrl+D" />
					<Submenu
						text="Поделиться"
						items={['Ссылка', 'Почта', ['Мессенджеры', ['Telegram', 'WhatsApp']]]}
					/>
					<DropdownMenu.Item disabled>В архив</DropdownMenu.Item>
					<DropdownMenu.Separator />
					<Action text="Удалить" shortcut="Del" color="crimson" />
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu>
	)
}
