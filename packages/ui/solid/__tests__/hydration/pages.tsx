/**
 * Страницы гидратации — одна разметка на две сборки.
 *
 * Серверный прогон собирает их для сервера и сверяет их разметку с фикстурой
 * (`markup.server.spec.tsx` → `markup/*.html`), прогон гидратации собирает
 * для браузера с метками гидратации и гидратирует фикстуру той же страницей
 * (`*.hydration.spec.tsx`). Узлы сервера браузер находит по ключам
 * гидратации, а ключи выводятся из места компонента в дереве — поэтому
 * страница у обоих прогонов одна.
 *
 * Движок снаружи (`engine`) — только у гидратации: по нему тест меняет
 * коллекцию после гидратации. Сервер рисует страницу без него, и разметка от
 * этого не меняется — движок пуст, и элементы разметки входят в него в том
 * же порядке.
 */

import { createSignal, type JSX } from 'solid-js'
import type { TAttributesMap, TTabsCollection, TTagsCollection } from '@soldy-ui/core'
import {
	Field,
	Input,
	RadioGroup,
	Tabs,
	Tags,
	createPartProps,
	createRootProps,
} from '@soldy-ui/solid'

/** Движок табов страницы — только у гидратации. */
export type TTabsPageProps = { readonly engine?: TTabsCollection }

/** Движок тегов страницы — только у гидратации. */
export type TTagsPageProps = { readonly engine?: TTagsCollection }

/** Табы разметкой, активный вторым: у сервера остановок Tab две (`collections.md`, «Цена»). */
export function TabsActiveSecond(props: TTabsPageProps): JSX.Element {
	return (
		<Tabs engine={props.engine}>
			<Tabs.Item value="a" text="A" />
			<Tabs.Item value="b" text="B" active />
		</Tabs>
	)
}

/** Табы разметкой, активный первым: остановка Tab одна и у сервера. */
export function TabsActiveFirst(props: TTabsPageProps): JSX.Element {
	return (
		<Tabs engine={props.engine}>
			<Tabs.Item value="a" text="A" active />
			<Tabs.Item value="b" text="B" />
		</Tabs>
	)
}

/** Теги разметкой с выбором, выбран второй: у сервера остановок Tab две, как у табов. */
export function TagsSelectedSecond(props: TTagsPageProps): JSX.Element {
	return (
		<Tags mode="single" engine={props.engine}>
			<Tags.Item value="a" text="A" />
			<Tags.Item value="b" text="B" selected />
		</Tags>
	)
}

/** Счётчик зонда — только у гидратации: мемо раскладки зовёт его на каждый свой пересчёт. */
export type TRootProbeProps = { readonly onCompute?: () => void }

/**
 * Корень, чью раскладку гидратация не меняет, — зонд второго прохода: его
 * мемо раскладки (`createRootProps`) зовёт `onCompute` на каждый пересчёт.
 */
export function RootProbe(props: TRootProbeProps): JSX.Element {
	const root = createRootProps(() => {
		props.onCompute?.()

		return { state: { classes: ['probe'] }, sets: [{ 'data-probe': 'served' }], forward: {} }
	})

	return <div {...root()} />
}

/** Вход соседа зонда части: задаёт набор узлу выше при своей сборке, как контрол — `for` подписи. */
function PartProbeEntry(props: { readonly enter: () => void }): JSX.Element {
	props.enter()

	return <i />
}

/**
 * Узел, у которого набора до входа соседа нет (`undefined`), — зонд первого
 * значения помощника части (`createPartProps`): сосед ниже задаёт набор,
 * когда узел уже напечатан, — у сервера в разметке, у браузера во время
 * гидратации.
 */
export function PartProbe(): JSX.Element {
	const [set, setSet] = createSignal<TAttributesMap>()
	const part = createPartProps(set)

	return (
		<div>
			<span {...part()} />
			<PartProbeEntry enter={() => setSet({ 'data-probe': 'entered' })} />
		</div>
	)
}

/**
 * Поле с контролом со своим `id`: подпись сервер печатает раньше, чем контрол
 * вошёл в поле, и её `for` ведёт на `id` поля контрола от поля
 * (`<id монтирования>-control`), а не на `email` (`field.server.spec.tsx`).
 */
export function FieldOwnId(): JSX.Element {
	return (
		<Field label="Почта">
			<Input id="email" />
		</Field>
	)
}

/**
 * Поле с группой: группу подпись называет ссылкой `aria-labelledby`, а `for`
 * сервер печатает — подпись у него раньше, чем группа вошла в поле.
 */
export function FieldGroup(): JSX.Element {
	return (
		<Field label="Выбор">
			<RadioGroup>
				<RadioGroup.Item value="a">А</RadioGroup.Item>
			</RadioGroup>
		</Field>
	)
}
