import { useState } from 'react'
import { Button } from './ui/button'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from './ui/dropdown-menu'

/**
 * The soldy menu preview in shadcn's Dropdown Menu: a group of checkboxes, a
 * group of radios, actions with shortcuts, a submenu with a submenu inside, a
 * disabled action and a destructive one — all of them its own parts.
 */
export default function Page() {
	const [grid, setGrid] = useState(true)
	const [ruler, setRuler] = useState(false)
	const [sort, setSort] = useState('name')

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline">Действия</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56">
				<DropdownMenuLabel>Вид</DropdownMenuLabel>
				<DropdownMenuCheckboxItem checked={grid} onCheckedChange={setGrid}>
					Сетка
				</DropdownMenuCheckboxItem>
				<DropdownMenuCheckboxItem checked={ruler} onCheckedChange={setRuler}>
					Линейка
				</DropdownMenuCheckboxItem>
				<DropdownMenuSeparator />
				<DropdownMenuLabel>Сортировка</DropdownMenuLabel>
				<DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
					<DropdownMenuRadioItem value="name">По имени</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="date">По дате</DropdownMenuRadioItem>
				</DropdownMenuRadioGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem>
						Изменить
						<DropdownMenuShortcut>Ctrl+E</DropdownMenuShortcut>
					</DropdownMenuItem>
					<DropdownMenuItem>
						Дублировать
						<DropdownMenuShortcut>Ctrl+D</DropdownMenuShortcut>
					</DropdownMenuItem>
					<DropdownMenuSub>
						<DropdownMenuSubTrigger>Поделиться</DropdownMenuSubTrigger>
						<DropdownMenuSubContent>
							<DropdownMenuItem>Ссылка</DropdownMenuItem>
							<DropdownMenuItem>Почта</DropdownMenuItem>
							<DropdownMenuSub>
								<DropdownMenuSubTrigger>Мессенджеры</DropdownMenuSubTrigger>
								<DropdownMenuSubContent>
									<DropdownMenuItem>Telegram</DropdownMenuItem>
									<DropdownMenuItem>WhatsApp</DropdownMenuItem>
								</DropdownMenuSubContent>
							</DropdownMenuSub>
						</DropdownMenuSubContent>
					</DropdownMenuSub>
					<DropdownMenuItem disabled>В архив</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem variant="destructive">
					Удалить
					<DropdownMenuShortcut>Del</DropdownMenuShortcut>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
