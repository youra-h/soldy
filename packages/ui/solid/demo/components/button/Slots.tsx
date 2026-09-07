import { For, type JSX } from 'solid-js'
import { Button } from '@soldy/ui-solid'
import type { TComponentSize, TComponentVariant, TButtonView } from '@soldy/core'

type Props = {
	size?: TComponentSize
	variant?: TComponentVariant
	disabled?: boolean
}

const VIEWS: TButtonView[] = ['filled', 'plain', 'outlined']

export default function ButtonSlotsDemo(props: Props): JSX.Element {
	return (
		<div class="demo-container">
			<h3 class="demo-title">Views & Children</h3>

			<div class="demo-grid">
				<For each={VIEWS}>
					{(view) => (
						<div class="demo-section">
							<h4 class="demo-section-title">{view}</h4>
							<div class="demo-section-content">
								<Button
									size={props.size}
									variant={props.variant}
									view={view}
									text="Default"
									disabled={props.disabled}
								/>
								<Button
									size={props.size}
									variant={props.variant}
									view={view}
									disabled={props.disabled}
								>
									<span>Custom children</span>
								</Button>
							</div>
						</div>
					)}
				</For>
			</div>

			<h3 class="demo-title">Slots</h3>

			<div class="demo-section-content">
				<Button
					size={props.size}
					variant={props.variant}
					disabled={props.disabled}
					text="Both"
					leading={<span>◀</span>}
					trailing={<span>▶</span>}
				/>
				<Button size={props.size} variant={props.variant} disabled={props.disabled} text="Scoped">
					{(scope: { text: string }) => <b>{scope.text}!</b>}
				</Button>
			</div>

			<div class="demo-info">Слоты leading / default (scope { '{ text }' }) / trailing</div>
		</div>
	)
}
