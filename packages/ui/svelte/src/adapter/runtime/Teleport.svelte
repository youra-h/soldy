<script lang="ts">
	import { getAllContexts, mount, unmount } from 'svelte'
	import Teleport from './Teleport.svelte'
	import type { TTeleportProps } from './types'

	const props: TTeleportProps = $props()

	// Контексты места, где Teleport стоит в дереве: корень в цели получает их
	// все — локаль поддерева и лифт коллекции в панели те же, что у триггера
	const context = getAllContexts()

	// Эффект идёт только на клиенте и после гидратации: на сервере и до неё
	// содержимого в цели нет. Смена цели или выключение снимают прежний корень
	$effect(() => {
		const { to, disabled, children } = props

		if (disabled || !to) return

		const target = document.querySelector(to)

		if (!target) return

		// В цели содержимое рисует тот же Teleport, выключенный: выключенный
		// рисует его на месте — отдельным корнем Svelte внутри цели
		const content = mount(Teleport, {
			target,
			props: { to, disabled: true, children },
			context,
		})

		return () => {
			void unmount(content)
		}
	})
</script>

<!--
	Teleport — аналог `<teleport :to>` Vue и `Teleport` React: рисует
	содержимое в другом месте документа, в элементе по селектору цели. Так Frame
	уводит панель в `body`, из-под `overflow` и контекстов наложения предков.

	Своего портала у Svelte нет, и содержимое в цели — отдельный корень
	(`mount`), снятие — `unmount`. Переносить узлы, которые уже нарисованы на
	месте, нельзя: Svelte сам вставляет и убирает узлы блоков (`{#if}`,
	`{#each}`), и перенесённые разошлись бы с ним.

	На сервере корня в цели нет — содержимое появляется после гидратации, как у
	React. Цель ищется при монтировании корня; её нет — ничего не рисуется.

	`disabled` — как у Vue: содержимое рисуется на месте, без портала, и тогда
	оно есть и на сервере.
-->
{#if props.disabled}
	{@render props.children?.()}
{/if}
