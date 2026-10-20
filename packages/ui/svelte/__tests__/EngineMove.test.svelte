<script lang="ts">
	/**
	 * Тестовая обёртка: список над движком снаружи без `ctrl` в одной из двух
	 * веток `{#if}` — в разных родителях. Смена `swapped` в `reactiveProps` —
	 * перенос списка за одну перерисовку: новую ветку Svelte собирает раньше,
	 * чем ставит на паузу прежнюю. `outro` — длительность ухода первой ветки:
	 * пока уход идёт, ветка жива, и вернувшийся `swapped` возобновляет её без
	 * новой сборки.
	 */
	import type { TransitionConfig } from 'svelte/transition'
	import type { TListBoxCollection } from '@soldy-ui/core'
	import { ListBox } from '@soldy-ui/svelte'

	type THarnessProps = {
		/** Движок списка — один на обе ветки. */
		engine: TListBoxCollection
		/** Список — во второй ветке. */
		swapped: boolean
		/** Проп `disabled` списка. */
		disabled?: boolean
		/** Длительность ухода первой ветки, мс; ноль — ветка снимается сразу. */
		outro?: number
	}

	const { engine, swapped, disabled = false, outro = 0 }: THarnessProps = $props()

	/** Уход ветки длительностью `duration`. */
	function leave(_node: Element, duration: number): TransitionConfig {
		return { duration }
	}
</script>

{#if !swapped}
	<div class="so-test-first" out:leave={outro}><ListBox {engine} {disabled} /></div>
{:else}
	<section class="so-test-second"><ListBox {engine} {disabled} /></section>
{/if}
