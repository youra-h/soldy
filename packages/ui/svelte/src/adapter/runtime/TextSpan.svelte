<script lang="ts">
	import { BROWSER } from 'esm-env'
	import type { Attachment } from 'svelte/attachments'
	import type { HTMLAttributes } from 'svelte/elements'

	type TTextSpanProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
		/** Текст узла целиком; `undefined` — пусто. */
		text: string | undefined
	}

	const { text, ...attributes }: TTextSpanProps = $props()

	/** Пишет текст, только когда он разошёлся с узлом; перечитывает на смену. */
	const write: Attachment<HTMLSpanElement> = (node) => {
		const content = text ?? ''

		if (node.textContent !== content) node.textContent = content
	}
</script>

<!--
	`span`, чей текст пишет только он сам, `textContent`, — часть поля даты:
	её правит браузер, и текстовый узел Svelte оказался бы вне документа.
	На сервере текст — содержимое. AGENTS.md (Svelte), «Текст поля».
-->
{#if BROWSER}<span {...attributes} {@attach write}></span>{:else}<span {...attributes}
		>{text}</span
	>{/if}
