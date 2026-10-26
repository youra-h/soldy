import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'

export default function Page() {
	return (
		<Tooltip title="Короткое пояснение к кнопке">
			<Button>Наведи</Button>
		</Tooltip>
	)
}
