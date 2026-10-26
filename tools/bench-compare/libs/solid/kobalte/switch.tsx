import { Switch } from '@kobalte/core/switch'

export default function Page() {
	return (
		<Switch class="kb-switch">
			<Switch.Input />
			<Switch.Control>
				<Switch.Thumb />
			</Switch.Control>
			<Switch.Label>Включено</Switch.Label>
		</Switch>
	)
}
