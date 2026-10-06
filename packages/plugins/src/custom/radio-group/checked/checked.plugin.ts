import type { TRadioGroupCollection } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin, TCollectionElements } from '../../collection'
import type { IDomEventTarget } from '../../../utils'

/**
 * TRadioGroupCheckedPlugin — отметка полей группы по модели после выбора
 * пользователя.
 *
 * Браузер отмечает нажатое радио и снимает отметку с соседа ещё до клика, а
 * коллекция вправе выбор не принять: его отменил подписчик
 * `item:activate:before`. Модель тогда не сменилась, и разметка поля не
 * перерисует: и Vue, и React пишут `checked` в узел только на смену своего
 * значения. Без этой записи на экране осталось бы отмеченным нажатое радио,
 * а в модели — прежнее или ничего, и повторный клик по нажатому не выбрал бы
 * ничего: отмеченному радио браузер `change` не шлёт.
 *
 * Поэтому после каждого `change` в группе плагин пишет `checked` каждому радио
 * коллекции — по его активности. Плагин группы, а не радио: соседу, с которого
 * браузер снял отметку, `change` не приходит, и вернуть её может только тот,
 * кто видит все радио. Слушатель — на корне, в фазе всплытия: выбор
 * пользователя коллекции отдаёт разметка радио — Vue на `change` самого поля,
 * React ещё на `click`, — и до корня `change` доходит, когда модель уже
 * решила.
 *
 * Пишется и отметка, совпавшая с узлом. React узнаёт отметку поля только по
 * записи свойства и по ней решает, сменил ли клик отметку, прежде чем отдать
 * `onChange` (см. `NativeInput` адаптера React). А нажатому радио отметку
 * снимает и браузер — когда плагин возвращает её соседу, стоящему раньше:
 * узел уже совпал с моделью, но React помнит отметку, увиденную на клике, и
 * без записи повторный клик по этому радио `onChange` не дал бы.
 *
 * Радио — из коллекции группы (`engine:bound`), его узел — у реестра узлов
 * (`TCollectionElements`), поле — первый `input` в узле. Радио без узла
 * пропускается: поля, которое надо вернуть, у него нет.
 */
export class TRadioGroupCheckedPlugin extends TBasePlugin {
	/** Корень группы: на нём слушатель. */
	private _root: IDomEventTarget | null = null
	private _elements: TCollectionElements | null = null
	private _engine: TRadioGroupCollection | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._elements = ctx.get(TCollectionElements) ?? null

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => this._attach(element))
		elementPlugin?.events.on('removed', () => this._detach())

		// Коллекция привязывается после install — ждём момент привязки
		ctx.get(TCollectionBundlesPlugin)?.events.on(
			'engine:bound',
			(engine: TRadioGroupCollection) => {
				this._engine = engine
			},
		)
	}

	override destroy(): void {
		this._detach()

		this._elements = null
		this._engine = null

		super.destroy()
	}

	private _attach(root: IDomEventTarget): void {
		this._detach()

		this._root = root
		root.addEventListener('change', this._onChange)
	}

	private _detach(): void {
		this._root?.removeEventListener('change', this._onChange)
		this._root = null
	}

	/** Каждое поле группы — по активности его радио в коллекции. */
	private readonly _onChange = (): void => {
		const engine = this._engine

		if (!engine) return

		const activation = engine.extensions.activation

		for (const item of engine.extensions.batch.items) {
			const input = this._elements?.getElementByItem(item)?.querySelector('input')

			if (input) input.checked = activation.isActive(item)
		}
	}
}
