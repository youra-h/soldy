import { Button, Calendar, Menu } from '@soldy-ui/solid'

export default function Page() {
	return (
		<Menu
			trigger={(scope) => (
				<Button text="Действия" {...scope.triggerAria} {...scope.triggerDataset} />
			)}
		>
			<Menu.Group label="Вид">
				<Menu.CheckboxItem value="grid" text="Сетка" selected />
				<Menu.CheckboxItem value="ruler" text="Линейка" />
			</Menu.Group>
			<Menu.Separator />
			<Menu.RadioGroup label="Сортировка" value="name">
				<Menu.RadioItem value="name" text="По имени" />
				<Menu.RadioItem value="date" text="По дате" />
			</Menu.RadioGroup>
			<Menu.Separator />
			<Menu.Item value="edit" text="Изменить" trailing="Ctrl+E" />
			<Menu.Item value="copy" text="Дублировать" trailing="Ctrl+D" />
			<Menu.Submenu value="share" text="Поделиться">
				<Menu.Item value="link" text="Ссылка" />
				<Menu.Item value="mail" text="Почта" />
				<Menu.Submenu value="messengers" text="Мессенджеры">
					<Menu.Item value="telegram" text="Telegram" />
					<Menu.Item value="whatsapp" text="WhatsApp" />
				</Menu.Submenu>
			</Menu.Submenu>
			<Menu.PopoverItem value="due" text="Срок" lazyMount>
				<Calendar />
			</Menu.PopoverItem>
			<Menu.Item value="archive" text="В архив" disabled />
			<Menu.Separator />
			<Menu.Item value="remove" text="Удалить" variant="negative" trailing="Del" />
		</Menu>
	)
}
