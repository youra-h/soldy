import type { IPreviewHandle, IPreviewHost } from '../host'
import type { IScenarioHost, TScenarioMount } from './types'

/** Узлы блока сценария на странице. */
export type TSceneNodes = {
	/** Сцена: в ней сценарий ищет разметку, ей он задаёт ширину. */
	scene: HTMLElement
	/** Пустой узел внутри сцены — корень, в который хост превью монтирует компонент. */
	target: HTMLElement
}

export type TScenarioHostOptions = {
	/**
	 * На сцене появился компонент или сцену сняли. Оболочке — показать или
	 * убрать заглушку пустой сцены.
	 */
	onStage?: (id: string, staged: boolean) => void
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * Хост сценариев — поверх хоста превью фреймворка.
 *
 * Общий для всех фреймворков: монтирует компонент сценария в узел его сцены
 * хостом превью и пишет в журнал прогона все события, которые компонент
 * объявил, — под полными именами ядра. Сценарий видит ровно то, что получил бы
 * потребитель фреймворка. Сцены регистрирует оболочка: блок сценария отдаёт
 * свои узлы, пока смонтирован.
 *
 * Компонент на сцене один: монтирование того же сценария сначала снимает
 * прежний.
 */
export class TScenarioHost implements IScenarioHost {
	private readonly _scenes = new Map<string, TSceneNodes>()
	private readonly _handles = new Map<string, IPreviewHandle>()

	constructor(
		private readonly _preview: IPreviewHost,
		private readonly _options: TScenarioHostOptions = {},
	) {}

	/** Блок сценария на странице: туда хост и монтирует. */
	attach(id: string, nodes: TSceneNodes): void {
		this._scenes.set(id, nodes)
	}

	/** Блок ушёл со страницы. Чужая сцена — уже другого блока того же сценария — остаётся. */
	detach(id: string, scene: HTMLElement): void {
		if (this._scenes.get(id)?.scene === scene) this._scenes.delete(id)
	}

	/**
	 * Компонент сценария — на его сцену: стартовые пропы сценария, `ctrl` с
	 * экземпляром, фикстура, события — в журнал.
	 *
	 * Отдаёт сцену кадром позже, а не сразу: `TElementPlugin` отдаёт узел
	 * плагинам через requestAnimationFrame, и до него компонент нарисован, но
	 * DOM ещё не слушает — клик сценария ушёл бы в пустоту.
	 */
	async mount({ scenario, instance, journal }: TScenarioMount): Promise<HTMLElement> {
		const nodes = this._scenes.get(scenario.id)

		if (!nodes) throw new Error(`у сценария «${scenario.id}» нет блока на странице`)

		this._release(scenario.id)
		this._handles.set(
			scenario.id,
			this._preview.mount(nodes.target, {
				component: scenario.component,
				fixture: scenario.fixture,
				props: { ...scenario.props, ctrl: instance },
				onEvent: (name, args) => journal.record(name, args),
			}),
		)
		this._options.onStage?.(scenario.id, true)

		await nextFrame()

		return nodes.scene
	}

	/** Хост превью снимает компонент синхронно — к разрешению его уже нет. */
	async unmount(id: string): Promise<void> {
		this._release(id)
	}

	private _release(id: string): void {
		const handle = this._handles.get(id)

		if (!handle) return

		this._handles.delete(id)
		handle.unmount()
		this._options.onStage?.(id, false)
	}
}
