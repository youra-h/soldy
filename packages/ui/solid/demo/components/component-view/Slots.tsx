import type { JSX } from 'solid-js'
import { ComponentView } from '@soldy/ui-solid'
import PanelDemo from '../../common/PanelDemo'

type Props = {
	visible?: boolean
	rendered?: boolean
	tag?: string
}

export default function ComponentViewSlotsDemo(props: Props): JSX.Element {
	return (
		<div class="cv-slots">
			<PanelDemo title="Default Slot">
				<ComponentView
					tag={props.tag}
					visible={props.visible}
					rendered={props.rendered}
					class="cv-box cv-box--violet"
				>
					<div class="cv-box__title">Default Slot</div>
					<div class="cv-box__hint">Simple text content</div>
				</ComponentView>
			</PanelDemo>

			<PanelDemo title="Multiple Children">
				<ComponentView
					tag={props.tag}
					visible={props.visible}
					rendered={props.rendered}
					class="cv-box cv-box--orange"
				>
					<div class="cv-box__title">Multiple Children</div>
					<button class="cv-box__button">Nested button</button>
					<div class="cv-box__hint">Any markup works</div>
				</ComponentView>
			</PanelDemo>
		</div>
	)
}
