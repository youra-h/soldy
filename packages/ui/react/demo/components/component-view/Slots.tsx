import { ComponentView } from '@soldy/ui-react'
import PanelDemo from '../../common/PanelDemo'

type ComponentViewSlotsDemoProps = {
	visible?: boolean
	rendered?: boolean
	tag?: string
}

export default function ComponentViewSlotsDemo({ visible, rendered, tag }: ComponentViewSlotsDemoProps) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
			<PanelDemo title="Default Slot">
				<ComponentView
					tag={tag}
					visible={visible}
					rendered={rendered}
					style={{ border: '2px solid #a855f7', borderRadius: '0.5rem', padding: '1rem' }}
				>
					<div style={{ textAlign: 'center' }}>
						<div style={{ fontWeight: 600, color: '#7c3aed' }}>Default Slot</div>
						<div style={{ fontSize: '0.75rem', color: '#666' }}>Simple text content</div>
					</div>
				</ComponentView>
			</PanelDemo>

			<PanelDemo title="Multiple Children">
				<ComponentView
					tag={tag}
					visible={visible}
					rendered={rendered}
					style={{ border: '2px solid #f97316', borderRadius: '0.5rem', padding: '1rem' }}
				>
					<div
						style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
					>
						<div style={{ fontWeight: 600, color: '#ea580c' }}>Multiple Children</div>
						<button
							style={{
								padding: '0.25rem 0.5rem',
								background: '#f97316',
								color: 'white',
								borderRadius: '0.25rem',
								fontSize: '0.75rem',
								border: 'none',
								cursor: 'pointer',
							}}
						>
							Button
						</button>
						<p style={{ fontSize: '0.75rem', color: '#666', margin: 0 }}>Some paragraph text</p>
					</div>
				</ComponentView>
			</PanelDemo>

			<PanelDemo title="Complex Content">
				<ComponentView
					tag={tag}
					visible={visible}
					rendered={rendered}
					style={{ border: '2px solid #ec4899', borderRadius: '0.5rem', padding: '1rem' }}
				>
					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
						{[1, 2, 3, 4].map((item) => (
							<div
								key={item}
								style={{
									background: '#fce7f3',
									padding: '0.5rem',
									borderRadius: '0.25rem',
									fontSize: '0.75rem',
									textAlign: 'center',
								}}
							>
								Item {item}
							</div>
						))}
					</div>
				</ComponentView>
			</PanelDemo>
		</div>
	)
}
