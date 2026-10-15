<script lang="ts">
	/**
	 * Разметка потребителя: корень компонента он держит в своей переменной —
	 * `bind:ref={button}`, — как узел элемента `bind:this`. Переменная бывает
	 * и пустой, а не `null`, — `$state()`: так её объявляют чаще. Значения
	 * переменных обёртка отдаёт `onRefs` при каждой их смене.
	 *
	 * Третья кнопка привязана функциями, и сеттер читает проп обёртки `tick`:
	 * код потребителя, который пишет `ref`, вправе читать своё состояние, и
	 * смена прочитанного узел корня не перепривязывает.
	 */
	import { Button, Input } from '@soldy-ui/svelte'

	type THarnessProps = {
		/** Значения переменных `button` и `input`. */
		onRefs: (button: Element | null | undefined, input: Element | null | undefined) => void
		/** Состояние потребителя, которое читает сеттер третьей кнопки. */
		tick?: number
		/** Записи `ref` третьей кнопкой — с `tick`, прочитанным в сеттере. */
		onWrite?: (tick: number, node: Element | null | undefined) => void
		/** События привязки корня третьей кнопки. */
		onElementReady?: (element: Element) => void
		onElementRemoved?: () => void
	}

	const {
		onRefs,
		tick = 0,
		onWrite = () => {},
		onElementReady,
		onElementRemoved,
	}: THarnessProps = $props()

	let button: Element | null = $state(null)
	let input: Element | undefined | null = $state()
	let written: Element | null | undefined = null

	$effect(() => onRefs(button, input))
</script>

<Button bind:ref={button} /><Input bind:ref={input} /><Button
	class="written"
	bind:ref={() => written,
	(node) => {
		written = node
		onWrite(tick, node)
	}}
	{onElementReady}
	{onElementRemoved}
/>
