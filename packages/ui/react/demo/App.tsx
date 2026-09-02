import { useState, type ComponentType } from 'react'
import EventLog from './common/EventLog'
import type { EventLogEntry } from './common/EventLog'
import ButtonPlayground from './playgrounds/Button'
import ComponentViewPlayground from './playgrounds/ComponentView'
import './demo.scss'

type PlaygroundKey = 'component-view' | 'button'

type PlaygroundComponent = ComponentType<{ onLog: (entry: EventLogEntry) => void }>

const playgrounds: Record<PlaygroundKey, { component: PlaygroundComponent; label: string }> = {
	'component-view': { component: ComponentViewPlayground, label: 'ComponentView' },
	button: { component: ButtonPlayground, label: 'Button' },
}

export default function App() {
	const [active, setActive] = useState<PlaygroundKey>('component-view')
	const [activeView, setActiveView] = useState<'sandbox' | 'logs'>('sandbox')
	const [eventLog, setEventLog] = useState<EventLogEntry[]>([])

	const handleLog = (entry: EventLogEntry) => {
		setEventLog((prev) => [entry, ...prev].slice(0, 200))
	}

	const handleClearLogs = () => {
		setEventLog([])
	}

	const Current = playgrounds[active]?.component

	return (
		<div className="pg-app">
			<div className="pg-app__nav">
				<button
					className={[
						'pg-app__nav-btn',
						activeView === 'sandbox' ? 'pg-app__nav-btn--active' : '',
					].join(' ')}
					onClick={() => setActiveView('sandbox')}
				>
					Sandbox
				</button>
				<button
					className={[
						'pg-app__nav-btn',
						activeView === 'logs' ? 'pg-app__nav-btn--active' : '',
					].join(' ')}
					onClick={() => setActiveView('logs')}
				>
					Logs ({eventLog.length})
				</button>
			</div>

			<div className="pg-app__layout">
				<aside className="pg-app__sidebar">
					<h3 className="pg-app__sidebar-title">Components</h3>
					<nav className="pg-app__menu">
						{Object.entries(playgrounds).map(([key, value]) => (
							<button
								key={key}
								className={[
									'pg-app__menu-item',
									active === key ? 'pg-app__menu-item--active' : '',
								].join(' ')}
								onClick={() => setActive(key as PlaygroundKey)}
							>
								{value.label}
							</button>
						))}
					</nav>
				</aside>

				<main className="pg-app__main">
					{activeView === 'sandbox' ? (
						<div className="pg-app__content">
							{Current ? (
								<div className="pg-app__container">
									<Current onLog={handleLog} />
								</div>
							) : (
								<div className="pg-app__error">
									<div className="pg-app__error-content">
										<h1 className="pg-app__error-title">not found</h1>
										<p className="pg-app__error-text">Check the active variable</p>
									</div>
								</div>
							)}
						</div>
					) : (
						<div className="pg-app__content">
							<div className="pg-app__logs">
								<EventLog events={eventLog} onClear={handleClearLogs} />
							</div>
						</div>
					)}
				</main>
			</div>
		</div>
	)
}
