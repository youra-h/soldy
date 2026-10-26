import { Checkbox } from '@kobalte/core/checkbox'

/** A checkbox with its label; the mark is the indicator Kobalte shows when checked. */
export default function Page() {
	return (
		<Checkbox class="kb-checkbox">
			<Checkbox.Input />
			<Checkbox.Control>
				<Checkbox.Indicator>✓</Checkbox.Indicator>
			</Checkbox.Control>
			<Checkbox.Label>Согласен</Checkbox.Label>
		</Checkbox>
	)
}
