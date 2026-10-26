import { Switch } from 'antd'

/**
 * antd's Switch has no label of its own: a `label` around it, as the soldy
 * preview wraps its switch in `Label`, and the label's click reaches the switch.
 */
export default function Page() {
	return (
		<label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
			<Switch />
			Включено
		</label>
	)
}
