<script lang="ts">
	import EventLog from './common/EventLog.svelte'
	import type { EventLogEntry } from './common/EventLog.svelte'
	import ButtonPlayground from './playgrounds/Button.svelte'
	import ComponentViewPlayground from './playgrounds/ComponentView.svelte'

	type PlaygroundKey = 'component-view' | 'button'

	const playgrounds = {
		'component-view': { component: ComponentViewPlayground, label: 'ComponentView' },
		button: { component: ButtonPlayground, label: 'Button' },
	} as const

	let active = $state<PlaygroundKey>('component-view')
	let activeView = $state<'sandbox' | 'logs'>('sandbox')
	let eventLog = $state<EventLogEntry[]>([])

	const Current = $derived(playgrounds[active]?.component)

	function handleLog(entry: EventLogEntry) {
		eventLog = [entry, ...eventLog].slice(0, 200)
	}
</script>

<div class="pg-app">
	<div class="pg-app__nav">
		<button
			class="pg-app__nav-btn"
			class:pg-app__nav-btn--active={activeView === 'sandbox'}
			onclick={() => (activeView = 'sandbox')}
		>
			Sandbox
		</button>
		<button
			class="pg-app__nav-btn"
			class:pg-app__nav-btn--active={activeView === 'logs'}
			onclick={() => (activeView = 'logs')}
		>
			Logs ({eventLog.length})
		</button>
	</div>

	<div class="pg-app__layout">
		<aside class="pg-app__sidebar">
			<h3 class="pg-app__sidebar-title">Components</h3>
			<nav class="pg-app__menu">
				{#each Object.entries(playgrounds) as [key, value] (key)}
					<button
						class="pg-app__menu-item"
						class:pg-app__menu-item--active={active === key}
						onclick={() => (active = key as PlaygroundKey)}
					>
						{value.label}
					</button>
				{/each}
			</nav>
		</aside>

		<main class="pg-app__main">
			<div class="pg-app__content">
				{#if activeView === 'sandbox'}
					{#if Current}
						<div class="pg-app__container">
							<!-- key: у каждого playground свой core-инстанс, при смене его надо пересоздать -->
							{#key active}
								<Current onLog={handleLog} />
							{/key}
						</div>
					{:else}
						<div class="pg-app__error">
							<div class="pg-app__error-content">
								<h1 class="pg-app__error-title">not found</h1>
								<p class="pg-app__error-text">Check the active variable</p>
							</div>
						</div>
					{/if}
				{:else}
					<div class="pg-app__logs">
						<EventLog events={eventLog} onClear={() => (eventLog = [])} />
					</div>
				{/if}
			</div>
		</main>
	</div>
</div>
