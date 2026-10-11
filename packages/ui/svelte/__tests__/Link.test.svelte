<script lang="ts">
	/**
	 * Ссылка приложения — компонент в `tag` у Button: атрибуты корня и
	 * привязку (attachment приходит пропом с ключом-символом) кладёт на свой
	 * `<a>`, содержимое рисует внутри.
	 */
	import type { HTMLAnchorAttributes } from 'svelte/elements'

	const { children, ...attributes }: HTMLAnchorAttributes = $props()
</script>

<a href="/target" {...attributes}>{@render children?.()}</a>
