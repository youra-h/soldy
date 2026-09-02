import type { ReactNode } from 'react'

type PanelDemoProps = {
	title?: string
	info?: string
	children: ReactNode
}

export default function PanelDemo({ title, info, children }: PanelDemoProps) {
	return (
		<div className="panel-demo">
			{title && <h3 className="panel-demo__title">{title}</h3>}
			<div className="panel-demo__content">{children}</div>
			{info && <div className="panel-demo__info">{info}</div>}
		</div>
	)
}
