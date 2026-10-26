import { useState } from 'react'
import { Button, Input, Modal } from 'antd'

/** A button opens a dialog with a field inside, as the soldy preview. */
export default function Page() {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button onClick={() => setOpen(true)}>Открыть окно</Button>
			<Modal
				open={open}
				title="Настройки"
				onCancel={() => setOpen(false)}
				footer={
					<>
						<Button onClick={() => setOpen(false)}>Отмена</Button>
						<Button onClick={() => setOpen(false)}>Сохранить</Button>
					</>
				}
			>
				<p style={{ margin: '0 0 8px' }}>Произвольное содержимое: текст, поля, кнопки</p>
				<Input placeholder="Имя" />
			</Modal>
		</>
	)
}
