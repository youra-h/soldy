import { Button, Tooltip } from '@soldy-ui/react'

export default function Page() {
	return (
		<Tooltip trigger={({ triggerAria }) => <Button text="Наведи" {...triggerAria} />}>
			Короткое пояснение к кнопке
		</Tooltip>
	)
}
