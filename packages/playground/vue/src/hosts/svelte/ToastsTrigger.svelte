<script lang="ts">
	import type { TToastsItemType } from '@soldy-ui/core'
	import { TOASTS_ITEM_TYPES, TOAST_SAVING, toastSample } from '@soldy-ui/playground-shared'
	import { Button, useToasts } from '@soldy-ui/svelte'
	import ToastUndo from './ToastUndo.svelte'

	/**
	 * Тосты приходят из кода, а не из разметки: кнопки внутри менеджера берут
	 * API (`useToasts()`) и показывают тост. Что сообщает тост, — образцы
	 * стенда, одни на все хосты (`toastSample`), своё содержимое к ним — кнопка
	 * «Отменить» этого хоста. Текст начинается с номера: в стопке видно, какой
	 * тост где.
	 */
	const { show } = useToasts()

	let count = 0

	function notify(type?: TToastsItemType): void {
		const sample = toastSample(type, ToastUndo)

		count += 1
		show({ ...sample, text: `${count}. ${sample.text}`, type })
	}

	/** Работа идёт — тост ждёт; кончилась — тот же тост сообщает итог. */
	function save(): void {
		count += 1

		const toast = show({ text: `${count}. Сохраняем…`, loading: true })
		const done = `${count}. Сохранено`

		setTimeout(() => {
			if (!toast) return

			toast.loading = false
			toast.type = 'success'
			toast.text = done
		}, TOAST_SAVING)
	}
</script>

<!--
	Кнопка — на обычное сообщение и на каждый вид (`TOASTS_ITEM_TYPES`): тост
	показывает значок своего вида. Последняя — ожидание: «Сохраняем…» с кольцом
	на месте значка сам не закрывается, а через пару секунд тот же тост
	сообщает успех. Ряд кнопок — с переносом: в ячейку витрины шесть кнопок
	одной строкой не встают.
-->
<div style="display: flex; flex-wrap: wrap; gap: 8px">
	<Button text="обычное" onclick={() => notify()} />
	{#each TOASTS_ITEM_TYPES as type (type)}
		<Button text={type} onclick={() => notify(type)} />
	{/each}
	<Button text="загрузка → готово" onclick={save} />
</div>
