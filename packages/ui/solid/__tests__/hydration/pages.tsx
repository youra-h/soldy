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
 *
 * Ожидание данных границы `Suspense` (`wait`) — только у сервера: такую
 * страницу он отдаёт потоком и содержимое границы досылает после оболочки
 * (`markup.server.spec.tsx`). Браузер получает данные вместе с разметкой, и
 * у гидратации они готовы сразу.
 */

import { Show, Suspense, createResource, createSignal, type Accessor, type JSX } from 'solid-js'
import type { TAttributesMap, TTabsCollection, TTagsCollection } from '@soldy-ui/core'
import {
	Field,
	ListBox,
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

/** Вход соседа зонда: меняет набор узла выше при своей сборке, как контрол — `for` подписи. */
function ProbeEntry(props: { readonly enter: () => void }): JSX.Element {
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
			<ProbeEntry enter={() => setSet({ 'data-probe': 'entered' })} />
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

/**
 * ListBox разметкой со слотом пустого списка: слот стоит после элементов, и
 * сервер решает, рисовать ли его, когда элементы уже вошли в коллекцию, —
 * его в разметке нет. Браузер при гидратации обязан решить так же
 * (`list-box.hydration.spec.tsx`).
 */
export function ListBoxWithEmpty(): JSX.Element {
	return (
		<ListBox empty={<span class="empty">Пусто</span>}>
			<ListBox.Item value="a" text="A" />
		</ListBox>
	)
}

/**
 * Ожидание данных границы `Suspense` — только у сервера: он дорисовывает
 * границу, когда `wait` разрешился, а оболочку отдаёт раньше.
 */
export type TStreamedPageProps = { readonly wait?: Promise<void> }

/**
 * Содержимое границы `Suspense`, которое ждёт данных: у сервера — пока не
 * разрешился `wait`, у браузера данные готовы сразу, как пришедшие с
 * разметкой. Ждёт ресурс: его чтение и держит границу у сервера.
 */
function WithData(props: TStreamedPageProps & { readonly children: JSX.Element }): JSX.Element {
	const [ready] = createResource(() => props.wait?.then(() => true) ?? true)

	return <Show when={ready()}>{props.children}</Show>
}

/**
 * Табы целиком за границей `Suspense`: сервер досылает их потоком после
 * оболочки, с двумя остановками Tab, и браузер гидратирует их позже основной
 * гидратации — все мемо раскладки собраны в позднем окне.
 */
export function TabsStreamed(props: TTabsPageProps & TStreamedPageProps): JSX.Element {
	return (
		<Suspense>
			<WithData wait={props.wait}>
				<Tabs engine={props.engine}>
					<Tabs.Item value="a" text="A" />
					<Tabs.Item value="b" text="B" active />
				</Tabs>
			</WithData>
		</Suspense>
	)
}

/**
 * Табы, активный за границей `Suspense`: таб выше сервер печатает в оболочке
 * с остановкой Tab, и его гидратирует основная гидратация, а активный —
 * поздняя: остановку он забирает у таба, гидратированного раньше.
 */
export function TabsActiveStreamed(props: TTabsPageProps & TStreamedPageProps): JSX.Element {
	return (
		<Tabs engine={props.engine}>
			<Tabs.Item value="a" text="A" />
			<Suspense>
				<WithData wait={props.wait}>
					<Tabs.Item value="b" text="B" active />
				</WithData>
			</Suspense>
		</Tabs>
	)
}

/** Теги с выбором, выбранный за границей `Suspense` — как у табов. */
export function TagsSelectedStreamed(props: TTagsPageProps & TStreamedPageProps): JSX.Element {
	return (
		<Tags mode="single" engine={props.engine}>
			<Tags.Item value="a" text="A" />
			<Suspense>
				<WithData wait={props.wait}>
					<Tags.Item value="b" text="B" selected />
				</WithData>
			</Suspense>
		</Tags>
	)
}

/**
 * Поле, контрол со своим `id` за границей `Suspense`: подпись гидратирует
 * основная гидратация, с `for` на `id` поля контрола от поля, а контрол —
 * поздняя.
 */
export function FieldControlStreamed(props: TStreamedPageProps): JSX.Element {
	return (
		<Field label="Почта">
			<Suspense>
				<WithData wait={props.wait}>
					<Input id="email" />
				</WithData>
			</Suspense>
		</Field>
	)
}

/**
 * Корень, набор которого меняют обе гидратации: вход соседа в основной и вход
 * соседа за границей `Suspense` в поздней. Зонд мемо раскладки, которое к
 * позднему окну уже отдаёт живое: сервер напечатал `served`, основная
 * гидратация дописала `main`, поздняя должна дописать `late`.
 */
export function RootProbeStreamed(props: TStreamedPageProps): JSX.Element {
	const [mark, setMark] = createSignal('served')
	const root = createRootProps(() => ({
		state: {},
		sets: [{ 'data-probe': mark() }],
		forward: {},
	}))

	return (
		<div {...root()}>
			<ProbeEntry enter={() => setMark('main')} />
			<Suspense>
				<WithData wait={props.wait}>
					<ProbeEntry enter={() => setMark('late')} />
				</WithData>
			</Suspense>
		</div>
	)
}

/**
 * Остров с корнем, набор которого задаёт состояние снаружи острова (`mark`),
 * — зонд мемо раскладки, которое меняет гидратация другого острова: у
 * каждого острова свой `hydrate()`, и окно второго открывается, когда корень
 * первого уже гидратирован.
 */
export function IslandProbe(props: { readonly mark: Accessor<string> }): JSX.Element {
	const root = createRootProps(() => ({
		state: {},
		sets: [{ 'data-probe': props.mark() }],
		forward: {},
	}))

	return <div {...root()} />
}

/** Остров со входом, который при своей сборке меняет состояние снаружи острова (`enter`). */
export function IslandEntry(props: { readonly enter: () => void }): JSX.Element {
	return <ProbeEntry enter={props.enter} />
}
