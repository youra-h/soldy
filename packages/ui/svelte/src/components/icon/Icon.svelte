<script lang="ts">
	import { Dynamic, toRootProps } from '../../adapter'
	import { setupIcon } from './setup.component'
	import type { IconProps } from './base.component'

	const props: IconProps = $props()
	const mountId = $props.id()

	const binding = setupIcon(() => props, mountId)
	const state = binding.state
</script>

<!--
	Icon — корень по `tag`, без содержимого: картинку рисует сам тег.

	`tag` — имя элемента, компонент Svelte (SVG-иконка приложения) или метка
	иконки по роли из пакета иконок (`roleIcon(role)` адаптера). Компонент
	получает атрибуты корня и привязку к `TElementPlugin` пропсами и обязан
	положить их на свой корень: без привязки не придёт `element:ready`, без
	класса и стиля — размер, без ARIA иконка перестанет быть скрытой от
	скринридера.

	Размер (`width`, `height`) приходит стилем от плагина раскладки, имя — от
	плагина доступного имени: без него иконка скрыта (`aria-hidden`), с ним
	становится `role="img"`.
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(state, [state.attrs, state.aria], binding.forwardProps)}
		attach={binding.attachElement}
	/>
{/if}
