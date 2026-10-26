import { Button, Tooltip } from '@soldy-ui/solid'

export default function Page() {
	return (
		<Tooltip trigger={(scope) => <Button text="Наведи" {...scope.triggerAria} />}>
			Короткое пояснение к кнопке
		</Tooltip>
	)
}
