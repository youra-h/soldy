import type { ReactNode } from 'react'

type PropertyFieldProps = {
	label: string
	children: ReactNode
}

export default function PropertyField({ label, children }: PropertyFieldProps) {
	return (
		<div className="property-field">
			<label className="property-field__label">{label}:</label>
			<div className="property-field__control">{children}</div>
		</div>
	)
}
