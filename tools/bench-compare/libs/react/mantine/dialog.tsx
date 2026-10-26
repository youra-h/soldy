import { useState } from 'react'
import { Button, Group, Modal, TextInput } from '@mantine/core'

/** A button opens a dialog with a field inside, as the soldy preview. */
export default function Page() {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button onClick={() => setOpen(true)}>Открыть окно</Button>
			<Modal opened={open} onClose={() => setOpen(false)} title="Настройки">
				<p style={{ margin: '0 0 8px' }}>Произвольное содержимое: текст, поля, кнопки</p>
				<TextInput placeholder="Имя" />
				<Group justify="flex-end" mt="md">
					<Button onClick={() => setOpen(false)}>Отмена</Button>
					<Button onClick={() => setOpen(false)}>Сохранить</Button>
				</Group>
			</Modal>
		</>
	)
}
