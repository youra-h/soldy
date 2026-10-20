<script lang="ts">
	/**
	 * Тестовая обёртка: выезжающая панель в контейнере `.so-test-host` рядом с
	 * кнопкой страницы, которая её открывает. Открытость тест возвращает пропом
	 * (`visible` и колбэк `onChangeVisible` в пропсах панели), как привязка.
	 * Заголовок и содержимое разметкой пишутся только в `.svelte`.
	 *
	 * С `dialog` панель — внутри модального окна (пропсы окна — `dialog`),
	 * рядом с его кнопкой `so-test-in-dialog`, а в панели — кнопка
	 * `so-test-in-drawer`.
	 */
	import { Dialog, Drawer, type DialogProps, type DrawerProps } from '@soldy-ui/svelte'

	type THarnessProps = {
		drawer?: DrawerProps
		dialog?: DialogProps
	}

	const { drawer = {}, dialog }: THarnessProps = $props()
</script>

{#snippet title()}Фильтры{/snippet}

{#if dialog}
	<Dialog {...dialog}>
		<button class="so-test-in-dialog">В окне</button>
		<Drawer {...drawer}>
			<button class="so-test-in-drawer">В панели</button>
		</Drawer>
	</Dialog>
{:else}
	<div class="so-test-host">
		<button class="so-test-opener">Открыть</button>
		<Drawer {title} {...drawer}>
			<button class="so-test-first">Первая</button>
			<button class="so-test-second">Вторая</button>
		</Drawer>
	</div>
{/if}
