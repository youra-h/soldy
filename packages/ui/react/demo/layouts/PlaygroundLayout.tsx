import type { ReactNode } from 'react'

type PlaygroundLayoutProps = {
	title: string
	properties?: ReactNode
	propsDemo?: ReactNode
	instanceDemo?: ReactNode
	slotsDemo?: ReactNode
}

export default function PlaygroundLayout({
	title,
	properties,
	propsDemo,
	instanceDemo,
	slotsDemo,
}: PlaygroundLayoutProps) {
	return (
		<div className="pg-layout">
			<div className="pg-layout__header">
				<h1 className="pg-layout__title">{title}</h1>
			</div>

			<div className="pg-layout__section pg-layout__section--properties">
				<h2 className="pg-layout__section-title">Properties</h2>
				{properties}
			</div>

			<div className="pg-layout__demo-grid">
				{propsDemo && (
					<div className="pg-layout__demo-column">
						<h3 className="pg-layout__demo-title">Props Demo</h3>
						<div className="pg-layout__demo-content">{propsDemo}</div>
					</div>
				)}

				{instanceDemo && (
					<div className="pg-layout__demo-column">
						<h3 className="pg-layout__demo-title">Instance Demo</h3>
						<div className="pg-layout__demo-content">{instanceDemo}</div>
					</div>
				)}

				{slotsDemo && (
					<div className="pg-layout__demo-column">
						<h3 className="pg-layout__demo-title">Slots Demo</h3>
						<div className="pg-layout__demo-content">{slotsDemo}</div>
					</div>
				)}
			</div>
		</div>
	)
}
