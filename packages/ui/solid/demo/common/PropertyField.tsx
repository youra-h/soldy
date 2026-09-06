import type { JSX } from 'solid-js'

type PropertyFieldProps = {
	label: string
	children: JSX.Element
}

export default function PropertyField(props: PropertyFieldProps): JSX.Element {
	return (
		<div class="property-field">
			{/* span, а не label: контрол приходит как children, связать по `for` нечем */}
			<span class="property-field__label">{props.label}:</span>
			<div class="property-field__control">{props.children}</div>
		</div>
	)
}
