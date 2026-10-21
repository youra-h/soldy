<script lang="ts">
	import { getAllContexts, mount, unmount, untrack } from 'svelte'
	import Teleport from './Teleport.svelte'
	import type { TTeleportProps } from './types'

	const props: TTeleportProps = $props()

	/** Фаза Teleport — только растёт: нет → на месте → в обёртке (см. ниже). */
	type TPhase = 'none' | 'placed' | 'wrapped'

	// Контексты места, где Teleport стоит в дереве: корень в обёртке получает
	// их все — локаль поддерева и лифт коллекции в панели те же, что у триггера
	const context = getAllContexts()

	// Первая отрисовка одна на сервере и в браузере: с `disabled` дети — на месте
	let phase: TPhase = $state(untrack(() => props.disabled) ? 'placed' : 'none')

	/** Обёртка — одна на всё монтирование; заводится в браузере, когда впервые нужна. */
	let wrapper: HTMLDivElement | null = null

	function wrapperNode(): HTMLDivElement {
		if (!wrapper) {
			wrapper = document.createElement('div')
			wrapper.style.display = 'contents'
		}

		return wrapper
	}

	/** Цель по селектору. */
	function targetOf(selector: string | undefined): Element | null {
		return selector ? document.querySelector(selector) : null
	}

	/** Вынуть обёртку из `parent`, если она ещё там. */
	function takeFrom(parent: Element): void {
		if (wrapper && wrapper.parentNode === parent) wrapper.remove()
	}

	// Фаза растёт до отрисовки, в том же такте: содержимое на месте уходит
	// раньше, чем эффект ниже смонтирует корень, — двух копий панели не бывает.
	// Эффекты идут только в браузере, поэтому на сервере фаза — первая
	$effect.pre(() => {
		if (phase === 'wrapped') return

		const { to, disabled } = props

		if (phase === 'placed' ? !disabled : disabled || targetOf(to) !== null) {
			phase = 'wrapped'
		}
	})

	// Обёртку — в цель; с `disabled` её держит узел места, и эффект её не
	// трогает. Цели нет — обёртка вне документа
	$effect(() => {
		if (phase !== 'wrapped' || props.disabled) return

		const target = targetOf(props.to)

		if (!target) return

		target.appendChild(wrapperNode())

		return () => takeFrom(target)
	})

	// Корень — в обёртку, один раз: заново только на смену `children`. Обёртка
	// к этому времени на месте или в цели — эффекты корня (attachment-ы панели и
	// потребителя) пойдут позже, следующим тактом. В обёртке содержимое рисует
	// тот же Teleport, выключенный: выключенный с первой отрисовки рисует его на
	// месте — в обёртке
	$effect(() => {
		if (phase !== 'wrapped') return

		const content = mount(Teleport, {
			target: wrapperNode(),
			props: { to: undefined, disabled: true, children: props.children },
			context,
		})

		return () => {
			void unmount(content)
		}
	})

	/** Attachment узла места: обёртку — в него, при снятии — вон из него. */
	function place(node: Element): () => void {
		node.appendChild(wrapperNode())

		return () => takeFrom(node)
	}
</script>

<!--
	Teleport — аналог `<teleport :to>` Vue и `Teleport` React: рисует
	содержимое в другом месте документа, в элементе по селектору цели. Так Frame
	уводит панель в `body`, из-под `overflow` и контекстов наложения предков.

	Своего портала у Svelte нет. Содержимое — отдельный корень (`mount`) в
	обёртке, обычном `div` со стилем `display: contents`, без класса и `data-*`.
	Корень монтируется в неё один раз, а Teleport двигает саму обёртку: в цель, с
	`disabled` — в узел места, без цели — вон из документа. Поэтому смена
	`disabled` и цели переносит панель тем же узлом, и набранное в её полях
	остаётся. Узлы, которые рисует Svelte, Teleport не переносит: Svelte сам
	вставляет и убирает узлы блоков (`{#if}`, `{#each}`), и перенесённые
	разошлись бы с ним.

	Узел места — такой же `div`, и рисует его разметка Teleport, только с
	`disabled`: снятие и перестановку Svelte делает со своими узлами, и обёртка
	в узле места ходит вместе с местом. Кладёт её туда attachment узла.

	Фаза у Teleport одна и только растёт:

	- «нет» — содержимого нет: на сервере без `disabled`, в браузере — пока нет ни
	  цели, ни `disabled`. Без цели содержимое не собирается;
	- «на месте» — дети прямо на месте, без обёртки, как их рисует сервер. Svelte
	  не говорит компоненту, гидратация ли это, поэтому на месте начинает любая
	  панель с `disabled` с первой отрисовки — и остаётся там, пока не уйдёт с
	  места;
	- «в обёртке» — с первого ухода с места или с первого места в браузере (цель
	  или `disabled`), и навсегда. Цель пропала на лету — обёртка вне документа,
	  вернулась — получает тот же узел.

	Цена: панель, начавшая на месте, при первом уходе с места один раз
	собирается заново.

	На сервере эффектов нет, и корня в обёртке тоже — без `disabled` содержимое
	появляется после гидратации, как у React. Цель ищется в браузере.
-->
{#if phase === 'placed'}
	{@render props.children?.()}
{:else if phase === 'wrapped' && props.disabled}
	<div style="display: contents" {@attach place}></div>
{/if}
