import { createSignal } from 'solid-js'
import { Button } from '@kobalte/core/button'
import { Dialog } from '@kobalte/core/dialog'
import { TextField } from '@kobalte/core/text-field'

/** A button opens a dialog with a field inside, as the soldy preview. */
export default function Page() {
	const [open, setOpen] = createSignal(false)

	return (
		<Dialog open={open()} onOpenChange={setOpen}>
			<Dialog.Trigger class="kb-dialog-trigger">Открыть окно</Dialog.Trigger>
			<Dialog.Portal>
				<Dialog.Overlay />
				<Dialog.Content class="kb-dialog">
					<Dialog.Title>Настройки</Dialog.Title>
					<Dialog.CloseButton aria-label="Закрыть">×</Dialog.CloseButton>
					<p style={{ margin: '0 0 8px' }}>
						Произвольное содержимое: текст, поля, кнопки
					</p>
					<TextField>
						<TextField.Input placeholder="Имя" />
					</TextField>
					<Button onClick={() => setOpen(false)}>Отмена</Button>
					<Button onClick={() => setOpen(false)}>Сохранить</Button>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog>
	)
}
