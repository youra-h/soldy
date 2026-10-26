import { TextField } from '@kobalte/core/text-field'

export default function Page() {
	return (
		<TextField class="kb-text-field">
			<TextField.Input placeholder="Введите текст" />
		</TextField>
	)
}
