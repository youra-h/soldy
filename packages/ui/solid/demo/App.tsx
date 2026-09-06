import { Dynamic } from 'solid-js/web'
import { For, Show, createSignal, type JSX } from 'solid-js'
import EventLog from './common/EventLog'
import type { EventLogEntry } from './common/EventLog'
import ButtonPlayground from './playgrounds/Button'
import ComponentViewPlayground from './playgrounds/ComponentView'

type PlaygroundKey = 'component-view' | 'button'

const playgrounds: Record<PlaygroundKey, { component: any; label: string }> = {
	'component-view': { component: ComponentViewPlayground, label: 'ComponentView' },
	button: { component: ButtonPlayground, label: 'Button' },
}

export default function App(): JSX.Element {
	const [active, setActive] = createSignal<PlaygroundKey>('component-view')
	const [activeView, setActiveView] = createSignal<'sandbox' | 'logs'>('sandbox')
	const [eventLog, setEventLog] = createSignal<EventLogEntry[]>([])

	const handleLog = (entry: EventLogEntry) =>
		setEventLog((prev) => [entry, ...prev].slice(0, 200))

	return (
		<div class="pg-app">
			<div class="pg-app__nav">
				<button
					class="pg-app__nav-btn"
					classList={{ 'pg-app__nav-btn--active': activeView() === 'sandbox' }}
					onClick={() => setActiveView('sandbox')}
				>
					Sandbox
				</button>
				<button
					class="pg-app__nav-btn"
					classList={{ 'pg-app__nav-btn--active': activeView() === 'logs' }}
					onClick={() => setActiveView('logs')}
				>
					Logs ({eventLog().length})
				</button>
			</div>

			<div class="pg-app__layout">
				<aside class="pg-app__sidebar">
					<h3 class="pg-app__sidebar-title">Components</h3>
					<nav class="pg-app__menu">
						<For each={Object.entries(playgrounds)}>
							{([key, value]) => (
								<button
									class="pg-app__menu-item"
									classList={{ 'pg-app__menu-item--active': active() === key }}
									onClick={() => setActive(key as PlaygroundKey)}
								>
									{value.label}
								</button>
							)}
						</For>
					</nav>
				</aside>

				<main class="pg-app__main">
					<div class="pg-app__content">
						<Show
							when={activeView() === 'sandbox'}
							fallback={
								<div class="pg-app__logs">
									<EventLog events={eventLog()} onClear={() => setEventLog([])} />
								</div>
							}
						>
							<div class="pg-app__container">
								{/* Dynamic пересоздаёт playground при смене: у каждого свой core-инстанс */}
								<Dynamic component={playgrounds[active()].component} onLog={handleLog} />
							</div>
						</Show>
					</div>
				</main>
			</div>
		</div>
	)
}
