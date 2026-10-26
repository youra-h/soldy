import { Tooltip } from '@kobalte/core/tooltip'

/**
 * The open delay is the soldy one (400 ms) rather than Kobalte's 700 ms: the
 * hover step of the scenario waits 450 ms for the tooltip to show.
 */
export default function Page() {
	return (
		<Tooltip openDelay={400}>
			<Tooltip.Trigger class="kb-tooltip-trigger">Наведи</Tooltip.Trigger>
			<Tooltip.Portal>
				<Tooltip.Content class="kb-tooltip">Короткое пояснение к кнопке</Tooltip.Content>
			</Tooltip.Portal>
		</Tooltip>
	)
}
