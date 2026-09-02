import { Button } from '@soldy/ui-react'
import type { TComponentSize, TComponentVariant } from '@soldy/core'

type ButtonSlotsDemoProps = {
	size?: TComponentSize
	variant?: TComponentVariant
	disabled?: boolean
}

export default function ButtonSlotsDemo({ size, variant, disabled }: ButtonSlotsDemoProps) {
	return (
		<div className="demo-container">
			<h3 className="demo-title">Views & Children</h3>

			<div className="demo-grid">
				<div className="demo-section">
					<h4 className="demo-section-title">Normal</h4>
					<div className="demo-section-content">
						<Button size={size} variant={variant} view="filled" text="Default" disabled={disabled} />
						<Button size={size} variant={variant} view="filled" disabled={disabled}>
							<span>Custom children</span>
						</Button>
					</div>
				</div>

				<div className="demo-section">
					<h4 className="demo-section-title">Plain</h4>
					<div className="demo-section-content">
						<Button size={size} variant={variant} view="plain" text="Default" disabled={disabled} />
						<Button size={size} variant={variant} view="plain" disabled={disabled}>
							<span>Custom children</span>
						</Button>
					</div>
				</div>

				<div className="demo-section">
					<h4 className="demo-section-title">Outlined</h4>
					<div className="demo-section-content">
						<Button size={size} variant={variant} view="outlined" text="Default" disabled={disabled} />
						<Button size={size} variant={variant} view="outlined" disabled={disabled}>
							<span>Custom children</span>
						</Button>
					</div>
				</div>
			</div>

			<div className="demo-info">Demonstrating different views with children</div>
		</div>
	)
}
