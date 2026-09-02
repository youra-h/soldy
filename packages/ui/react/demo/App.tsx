import { useState } from 'react'
import { Button, ComponentView } from '@soldy/ui-react'

export default function App() {
	const [visible, setVisible] = useState(true)

	return (
		<div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
			<h1 style={{ marginBottom: 16 }}>Soldy · React</h1>

			<div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
				<Button
					text="Toggle visible"
					view="filled"
					variant="accent"
					onClick={() => setVisible((value) => !value)}
				/>
				<Button text="Plain" view="plain" />
				<Button text="Outlined" view="outlined" disabled />
			</div>

			<ComponentView
				tag="div"
				visible={visible}
				onReady={(value) => console.log('component-view ready', value)}
				onChangeVisible={(value) => console.log('change:visible', value)}
			>
				ComponentView content — visible: {String(visible)}
			</ComponentView>
		</div>
	)
}
