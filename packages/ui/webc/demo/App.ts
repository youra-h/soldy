import { h, replace } from './common/dom'
import { createEventLog, type EventLogEntry } from './common/EventLog'
import { buttonPlayground } from './playgrounds/Button'
import { componentViewPlayground } from './playgrounds/ComponentView'

type PlaygroundKey = 'component-view' | 'button'

const playgrounds: Record<
	PlaygroundKey,
	{ create: (onLog: (entry: EventLogEntry) => void) => HTMLElement; label: string }
> = {
	'component-view': { create: componentViewPlayground, label: 'ComponentView' },
	button: { create: buttonPlayground, label: 'Button' },
}

export function createApp(): HTMLElement {
	let active: PlaygroundKey = 'component-view'
	let activeView: 'sandbox' | 'logs' = 'sandbox'
	let events: EventLogEntry[] = []

	const handleLog = (entry: EventLogEntry) => {
		events = [entry, ...events].slice(0, 200)

		logsTab.textContent = `Logs (${events.length})`

		if (activeView === 'logs') eventLog.update(events)
	}

	const eventLog = createEventLog(() => {
		events = []
		eventLog.update(events)
		logsTab.textContent = 'Logs (0)'
	})

	const content = h('div', { class: 'pg-app__content' })
	const menu = h('nav', { class: 'pg-app__menu' })

	const sandboxTab = h('button', {
		class: 'pg-app__nav-btn',
		on: { click: () => setView('sandbox') },
	})
	sandboxTab.textContent = 'Sandbox'

	const logsTab = h('button', {
		class: 'pg-app__nav-btn',
		on: { click: () => setView('logs') },
	})
	logsTab.textContent = 'Logs (0)'

	function setView(next: 'sandbox' | 'logs'): void {
		activeView = next
		sandboxTab.classList.toggle('pg-app__nav-btn--active', next === 'sandbox')
		logsTab.classList.toggle('pg-app__nav-btn--active', next === 'logs')
		renderContent()
	}

	function setActive(next: PlaygroundKey): void {
		active = next

		for (const item of menu.children) {
			item.classList.toggle('pg-app__menu-item--active', item.getAttribute('data-key') === next)
		}

		if (activeView === 'sandbox') renderContent()
	}

	function renderContent(): void {
		if (activeView === 'logs') {
			eventLog.update(events)
			replace(content, h('div', { class: 'pg-app__logs' }, eventLog.el))

			return
		}

		// Playground пересоздаётся при переключении: у каждого свой core-инстанс
		replace(
			content,
			h('div', { class: 'pg-app__container' }, playgrounds[active].create(handleLog)),
		)
	}

	for (const [key, value] of Object.entries(playgrounds)) {
		const item = h('button', {
			class: 'pg-app__menu-item',
			'data-key': key,
			on: { click: () => setActive(key as PlaygroundKey) },
		})

		item.textContent = value.label
		menu.appendChild(item)
	}

	setActive(active)
	setView(activeView)

	return h(
		'div',
		{ class: 'pg-app' },
		h('div', { class: 'pg-app__nav' }, sandboxTab, logsTab),
		h(
			'div',
			{ class: 'pg-app__layout' },
			h(
				'aside',
				{ class: 'pg-app__sidebar' },
				h('h3', { class: 'pg-app__sidebar-title' }, 'Components'),
				menu,
			),
			h('main', { class: 'pg-app__main' }, content),
		),
	)
}
