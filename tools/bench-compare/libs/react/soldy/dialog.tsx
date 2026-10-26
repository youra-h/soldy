import { useState } from 'react'
import { Button, Dialog, Input } from '@soldy-ui/react'

export default function Page() {
	const [shown, setShown] = useState(false)

	return (
		<>
			<Button text="Открыть окно" onClick={() => setShown(true)} />
			<Dialog
				visible={shown}
				onChangeVisible={setShown}
				title="Настройки"
				footer={
					<>
						<Button text="Отмена" onClick={() => setShown(false)} />
						<Button text="Сохранить" onClick={() => setShown(false)} />
					</>
				}
			>
				<p style={{ margin: '0 0 8px' }}>Произвольное содержимое: текст, поля, кнопки</p>
				<Input placeholder="Имя" />
			</Dialog>
		</>
	)
}
