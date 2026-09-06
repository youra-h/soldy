import { Show, type JSX } from 'solid-js'

type PlaygroundLayoutProps = {
	title: string
	properties?: JSX.Element
	propsDemo?: JSX.Element
	instanceDemo?: JSX.Element
	slotsDemo?: JSX.Element
}

export default function PlaygroundLayout(props: PlaygroundLayoutProps): JSX.Element {
	return (
		<div class="pg-layout">
			<div class="pg-layout__header">
				<h1 class="pg-layout__title">{props.title}</h1>
			</div>

			<div class="pg-layout__section pg-layout__section--properties">
				<h2 class="pg-layout__section-title">Properties</h2>
				{props.properties}
			</div>

			<div class="pg-layout__demo-grid">
				<Show when={props.propsDemo}>
					<div class="pg-layout__demo-column">
						<h3 class="pg-layout__demo-title">Props Demo</h3>
						<div class="pg-layout__demo-content">{props.propsDemo}</div>
					</div>
				</Show>

				<Show when={props.instanceDemo}>
					<div class="pg-layout__demo-column">
						<h3 class="pg-layout__demo-title">Instance Demo</h3>
						<div class="pg-layout__demo-content">{props.instanceDemo}</div>
					</div>
				</Show>

				<Show when={props.slotsDemo}>
					<div class="pg-layout__demo-column">
						<h3 class="pg-layout__demo-title">Slots Demo</h3>
						<div class="pg-layout__demo-content">{props.slotsDemo}</div>
					</div>
				</Show>
			</div>
		</div>
	)
}
