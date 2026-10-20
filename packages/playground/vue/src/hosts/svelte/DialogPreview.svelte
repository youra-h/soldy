<script lang="ts">
	import { Button, Dialog, Input } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()

	/**
	 * Окно на стенде открывает кнопка: закрытое оно спрятано, а открытое
	 * накрывает страницу подложкой, и показывать его сразу было бы нечестно по
	 * отношению к остальной странице.
	 *
	 * Открытость — своё состояние превью (это код стенда, а не компонент
	 * библиотеки): кнопка открывает окно, а крестик, Escape и подложка
	 * закрывают его через `onChangeVisible`. Строка `visible` задаёт его
	 * снаружи — своё состояние идёт за ней, только когда она сменилась, а не на
	 * каждую смену пропсов превью. С экземпляром ядра (вторая колонка) путь тот
	 * же: запись в `visible` инстанса открывает окно, и `onChangeVisible`
	 * доезжает сюда.
	 */
	const row = $derived(bind.visible === true)
	let shown = $derived(row)

	function setShown(value: boolean): void {
		shown = value
	}

	/** Своё состояние, затем обработчик страницы (журнал событий): он не затирается. */
	function onChangeVisible(value: boolean): void {
		setShown(value)

		const listener = bind.onChangeVisible

		if (typeof listener === 'function') listener(value)
	}
</script>

<Button text="Открыть окно" onclick={() => setShown(true)} />
<Dialog {...bind} visible={shown} {onChangeVisible}>
	{#snippet title()}Настройки{/snippet}
	<p style="margin: 0 0 8px">Произвольное содержимое: текст, поля, кнопки</p>
	<Input placeholder="Имя" />
	{#snippet footer()}
		<Button text="Отмена" onclick={() => setShown(false)} />
		<Button text="Сохранить" onclick={() => setShown(false)} />
	{/snippet}
</Dialog>
