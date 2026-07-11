import { useState } from 'react'
import { TComponentView } from '@soldy/core'
import { ComponentView } from '@soldy/ui-react'

function InstanceDemo() {
	const [instance] = useState(() => new TComponentView({
		rendered: true,
		visible: true,
		tag: 'section',
	}))

	return (
		<ComponentView ctrl={instance}>
			<h2 className="text-lg font-semibold">Instance-based ComponentView</h2>
			<p>Managed by external TComponentView instance.</p>
		</ComponentView>
	)
}

function PropsDemo() {
	const [rendered, setRendered] = useState(true)
	const [visible, setVisible] = useState(true)

	return (
		<div className="space-y-4">
			<div className="flex gap-4">
				<label className="flex items-center gap-2">
					<input type="checkbox" checked={rendered} onChange={(e) => setRendered(e.target.checked)} />
					Rendered
				</label>
				<label className="flex items-center gap-2">
					<input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
					Visible
				</label>
			</div>

			<ComponentView rendered={rendered} visible={visible}>
				<h2 className="text-lg font-semibold">Props-based ComponentView</h2>
				<p>visible={String(visible)} · rendered={String(rendered)}</p>
			</ComponentView>
		</div>
	)
}

export default function App() {
	const [tab, setTab] = useState<'props' | 'instance'>('props')

	return (
		<main className="p-8 max-w-2xl mx-auto">
			<h1 className="text-2xl font-bold mb-6">Soldy · React</h1>

			<div className="flex gap-2 mb-6">
				<button
					className={`px-4 py-2 rounded ${tab === 'props' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
					onClick={() => setTab('props')}
				>
					Props Demo
				</button>
				<button
					className={`px-4 py-2 rounded ${tab === 'instance' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
					onClick={() => setTab('instance')}
				>
					Instance Demo
				</button>
			</div>

			{tab === 'props' ? <PropsDemo /> : <InstanceDemo />}
		</main>
	)
}
