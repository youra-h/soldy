import { Show, type JSX } from 'solid-js'

type PanelDemoProps = {
	title?: string
	info?: string
	children: JSX.Element
}

export default function PanelDemo(props: PanelDemoProps): JSX.Element {
	return (
		<div class="panel-demo">
			<Show when={props.title}>
				<h3 class="panel-demo__title">{props.title}</h3>
			</Show>
			<div class="panel-demo__content">{props.children}</div>
			<Show when={props.info}>
				<div class="panel-demo__info">{props.info}</div>
			</Show>
		</div>
	)
}
