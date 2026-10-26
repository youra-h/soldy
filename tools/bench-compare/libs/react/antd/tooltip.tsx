import { Button, Tooltip } from 'antd'

/** Opens on hover and on focus, as the soldy tooltip: focus is opt-in in antd. */
export default function Page() {
	return (
		<Tooltip title="Короткое пояснение к кнопке" trigger={['hover', 'focus']}>
			<Button>Наведи</Button>
		</Tooltip>
	)
}
