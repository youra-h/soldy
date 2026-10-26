import { Button, Tooltip } from '@mantine/core'

/** Opens on hover and on focus, as the soldy tooltip: focus is opt-in in Mantine. */
export default function Page() {
	return (
		<Tooltip
			label="Короткое пояснение к кнопке"
			events={{ hover: true, focus: true, touch: false }}
		>
			<Button>Наведи</Button>
		</Tooltip>
	)
}
