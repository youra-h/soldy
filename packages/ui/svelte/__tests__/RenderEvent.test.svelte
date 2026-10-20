<script lang="ts">
	/**
	 * Тестовая обёртка: событие DOM посреди отрисовки Svelte.
	 *
	 * Браузер шлёт `focusout` узлу в фокусе, который Svelte вынимает из
	 * документа или переставляет петлёй с ключом, — тем же вызовом DOM, внутри
	 * эффекта блока. jsdom фокус при перестановке не снимает, поэтому событие
	 * здесь шлёт условие блока `{#if}` — тоже из эффекта блока: `blur: true`
	 * отдаёт кнопке `focusout`, как браузер.
	 */
	import type { TButton } from '@soldy-ui/core'
	import { Button } from '@soldy-ui/svelte'

	type THarnessProps = {
		ctrl: TButton
		/** Отдать кнопке `focusout` посреди отрисовки. */
		blur?: boolean
	}

	const props: THarnessProps = $props()

	let node: Element | undefined = $state()

	/** `focusout` кнопки — из условия блока, внутри эффекта Svelte. */
	function blurred(): boolean {
		node?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))

		return true
	}
</script>

<Button ctrl={props.ctrl} bind:ref={node} />{#if props.blur && blurred()}<span
		class="blurred"
	></span>{/if}
