import { useState } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'

/** A button opens a dialog with a field inside, as the soldy preview. */
export default function Page() {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button onClick={() => setOpen(true)}>Открыть окно</Button>
			<Dialog open={open} onClose={() => setOpen(false)}>
				<DialogTitle>Настройки</DialogTitle>
				<DialogContent>
					<p style={{ margin: '0 0 8px' }}>
						Произвольное содержимое: текст, поля, кнопки
					</p>
					<TextField placeholder="Имя" />
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setOpen(false)}>Отмена</Button>
					<Button onClick={() => setOpen(false)}>Сохранить</Button>
				</DialogActions>
			</Dialog>
		</>
	)
}
