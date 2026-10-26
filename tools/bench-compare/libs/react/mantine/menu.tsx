import { Button, Menu, Text } from '@mantine/core'

/**
 * The soldy menu preview in Mantine: a group of checkboxes, a group of radios,
 * actions with shortcuts, a submenu with a submenu inside, a disabled action
 * and a destructive one — all of them Mantine's own `Menu` parts.
 */
const shortcut = (text: string) => (
	<Text size="xs" c="dimmed">
		{text}
	</Text>
)

export default function Page() {
	return (
		<Menu>
			<Menu.Target>
				<Button>Действия</Button>
			</Menu.Target>
			<Menu.Dropdown>
				<Menu.Label>Вид</Menu.Label>
				<Menu.CheckboxGroup defaultValue={['grid']}>
					<Menu.CheckboxItem value="grid">Сетка</Menu.CheckboxItem>
					<Menu.CheckboxItem value="ruler">Линейка</Menu.CheckboxItem>
				</Menu.CheckboxGroup>
				<Menu.Divider />
				<Menu.Label>Сортировка</Menu.Label>
				<Menu.RadioGroup defaultValue="name">
					<Menu.RadioItem value="name">По имени</Menu.RadioItem>
					<Menu.RadioItem value="date">По дате</Menu.RadioItem>
				</Menu.RadioGroup>
				<Menu.Divider />
				<Menu.Item rightSection={shortcut('Ctrl+E')}>Изменить</Menu.Item>
				<Menu.Item rightSection={shortcut('Ctrl+D')}>Дублировать</Menu.Item>
				<Menu.Sub>
					<Menu.Sub.Target>
						<Menu.Sub.Item>Поделиться</Menu.Sub.Item>
					</Menu.Sub.Target>
					<Menu.Sub.Dropdown>
						<Menu.Item>Ссылка</Menu.Item>
						<Menu.Item>Почта</Menu.Item>
						<Menu.Sub>
							<Menu.Sub.Target>
								<Menu.Sub.Item>Мессенджеры</Menu.Sub.Item>
							</Menu.Sub.Target>
							<Menu.Sub.Dropdown>
								<Menu.Item>Telegram</Menu.Item>
								<Menu.Item>WhatsApp</Menu.Item>
							</Menu.Sub.Dropdown>
						</Menu.Sub>
					</Menu.Sub.Dropdown>
				</Menu.Sub>
				<Menu.Item disabled>В архив</Menu.Item>
				<Menu.Divider />
				<Menu.Item color="red" rightSection={shortcut('Del')}>
					Удалить
				</Menu.Item>
			</Menu.Dropdown>
		</Menu>
	)
}
