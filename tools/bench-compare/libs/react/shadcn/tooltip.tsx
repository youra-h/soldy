import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

export default function Page() {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button variant="outline">Наведи</Button>
			</TooltipTrigger>
			<TooltipContent>Короткое пояснение к кнопке</TooltipContent>
		</Tooltip>
	)
}
