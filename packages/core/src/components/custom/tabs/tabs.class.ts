import { TControl } from '../../base/control'
import type { IComponentViewOptions } from '../../base/component-view'
import { TComponentView } from '../../base/component-view'
import {
    TCollection,
    TPlainExtension,
    TBatchExtension,
    TSelectionExtension,
} from '../../base/collection'
import TTabItem from './tab-item/tab-item.class'
import type { ITabItem } from './tab-item/types'
import { TEvented } from '../../../common'
import type { TComponentSize, TComponentVariant, TValuePayload } from '../../../common'
import type {
    ITabs,
    ITabsProps,
    TTabsEvents,
    TTabsStates,
    TTabsOrientation,
    TTabsAlignment,
    TTabsPosition,
    TTabsView,
} from './types'

type TTabsExtensions = {
    plain: TPlainExtension<ITabItem>
    batch: TBatchExtension<ITabItem>
    selection: TSelectionExtension<ITabItem>
}

/**
 * Компонент табов (TTabs).
 * Управляет коллекцией табов на базе TCollection с расширениями (Plain, Batch, Selection).
 */
export class TTabs extends TControl<ITabsProps, TTabsEvents, TTabsStates> implements ITabs {
    static override baseClass = 's-tabs'

    static defaultValues: Partial<ITabsProps> = {
        ...TControl.defaultValues,
        orientation: 'horizontal',
        alignment: 'start',
        position: 'start',
        view: 'line',
        closable: false,
        variant: 'normal',
    }

    protected _orientation!: TTabsOrientation
    protected _alignment!: TTabsAlignment
    protected _position!: TTabsPosition
    protected _view!: TTabsView
    protected _closable!: boolean

    protected _collection: TCollection<ITabItem, TTabsExtensions>

    constructor(
        options: IComponentViewOptions<ITabsProps, TTabsStates> | Partial<ITabsProps> = {},
    ) {
        super(options)

        const ctor = new.target as typeof TTabs
        const { props = {} } = TComponentView.prepareOptions<ITabsProps, TTabsStates>(options)

        this._collection = new TCollection<ITabItem, TTabsExtensions>({
            extensions: {
                plain: new TPlainExtension<ITabItem>(),
                batch: new TBatchExtension<ITabItem>(),
                selection: new TSelectionExtension<ITabItem>(),
            },
        })

        this._applyOrientation(props.orientation ?? ctor.defaultValues.orientation!)
        this._applyAlignment(props.alignment ?? ctor.defaultValues.alignment!)
        this._applyPosition(props.position ?? ctor.defaultValues.position!)
        this._applyView(props.view ?? ctor.defaultValues.view!)
        this._applyClosable(props.closable ?? ctor.defaultValues.closable!)

        if (Array.isArray(props.items) && props.items.length > 0) {
            const preparedItems = props.items.map((item) =>
                item instanceof TTabItem ? item : new TTabItem({ props: item }),
            )
            this._collection.extensions.batch.add(preparedItems)
        }

        this._collection.engine.events.on('item:added', (item: ITabItem) => {
            item.events.on('close', () => this.closeTab(item))
            item.setClosableResolver(() => this._closable)

            item.events.on('change:closable', (value: boolean | undefined) => {
                ;(this.events as TEvented<TTabsEvents>).emit('item:closable', item, !!value)
            })

            item.events.on('change:disabled', (value: boolean) => {
                ;(this.events as TEvented<TTabsEvents>).emit('item:disabled', item, value)
            })

            item.events.on('change:text', (payload: TValuePayload<string>) => {
                ;(this.events as TEvented<TTabsEvents>).emit('item:text', item, payload.newValue)
            })

            item.events.on('change:rendered', (value: boolean) => {
                ;(this.events as TEvented<TTabsEvents>).emit('item:rendered', item, value)
            })

            item.events.on('change:visible', (value: boolean) => {
                ;(this.events as TEvented<TTabsEvents>).emit('item:visible', item, value)
            })

            item.events.on('change:present', (value: boolean) => {
                ;(this.events as TEvented<TTabsEvents>).emit('item:present', item, value)
            })

            item.disabled = this.disabled
            item.size = this.size
            item.variant = this.variant
        })

        this.events.relay(this._collection.engine.events, [
            'item:added',
            'item:removed',
            'item:updated',
            'item:moved',
            'change:items',
            'change:count',
            'reset',
        ])

        this.events.relay(this._collection.extensions.batch.events, [
            'items:added',
            'items:removed',
        ])

        this.events.relay(this._collection.extensions.selection.events, [
            'selection:changed',
        ])

        this.events.on('change:size', (payload: TValuePayload<TComponentSize>) => {
            this._collection.engine.forEach((item) => {
                item.size = payload.newValue
            })
        })

        this.events.on('change:variant', (payload: TValuePayload<TComponentVariant>) => {
            this._collection.engine.forEach((item) => {
                item.variant = payload.newValue
            })
        })

        this.events.on('change:disabled', (value: boolean) => {
            this._collection.engine.forEach((item) => {
                item.disabled = value
            })
        })
    }

    get orientation(): TTabsOrientation {
        return this._orientation
    }

    set orientation(value: TTabsOrientation) {
        if (this._orientation !== value) {
            this._applyOrientation(value, this._orientation)
            ;(this.events as TEvented<TTabsEvents>).emit('change:orientation', value)
        }
    }

    protected _applyOrientation(newValue: TTabsOrientation, oldValue?: TTabsOrientation) {
        this._classes.swapClass({
            oldClass: `--${oldValue}`,
            newClass: `--${newValue}`,
        })
        this._orientation = newValue
    }

    get alignment(): TTabsAlignment {
        return this._alignment
    }

    set alignment(value: TTabsAlignment) {
        if (this._alignment !== value) {
            this._applyAlignment(value, this._alignment)
            ;(this.events as TEvented<TTabsEvents>).emit('change:alignment', value)
        }
    }

    protected _applyAlignment(newValue: TTabsAlignment, oldValue?: TTabsAlignment) {
        this._classes.swapClass({
            oldClass: `--${oldValue}`,
            newClass: newValue !== 'start' ? `--${newValue}` : '',
        })
        this._alignment = newValue
    }

    get position(): TTabsPosition {
        return this._position
    }

    set position(value: TTabsPosition) {
        if (this._position !== value) {
            this._applyPosition(value, this._position)
            ;(this.events as TEvented<TTabsEvents>).emit('change:position', value)
        }
    }

    protected _applyPosition(newValue: TTabsPosition, oldValue?: TTabsPosition) {
        this._classes.remove(`--position-${oldValue}`)
        if (this._orientation === 'vertical' && newValue !== 'start') {
            this._classes.add(`--position-${newValue}`)
        }
        this._position = newValue
    }

    get view(): TTabsView {
        return this._view
    }

    set view(value: TTabsView) {
        if (this._view !== value) {
            this._applyView(value, this._view)
            ;(this.events as TEvented<TTabsEvents>).emit('change:view', value)
        }
    }

    protected _applyView(newValue: TTabsView, oldValue?: TTabsView) {
        this._classes.swapClass({
            oldClass: `--${oldValue}`,
            newClass: `--${newValue}`,
        })
        this._view = newValue
    }

    get closable(): boolean {
        return this._closable
    }

    set closable(value: boolean) {
        if (this._closable !== value) {
            this._applyClosable(value)
            ;(this.events as TEvented<TTabsEvents>).emit('change:closable', value)
        }
    }

    protected _applyClosable(value: boolean) {
        this._closable = value
        this._collection.engine.forEach((item) => {
            if (item instanceof TTabItem) {
                item.notifyClosableChange(this._closable || item.closable)
            }
        })
    }

    get activeItem(): ITabItem | undefined {
        return this._collection.extensions.selection.getSelected()[0]
    }

    get count(): number {
        return this._collection.engine.length
    }

    get collection(): TCollection<ITabItem, TTabsExtensions> {
        return this._collection
    }

    closeTab(item: ITabItem): boolean {
        if (!item.closable) return false
        ;(this.events as TEvented<TTabsEvents>).emit('item:close', item)
        this._collection.extensions.plain.remove(item)
        return true
    }

    hasEnabledTabs(): boolean {
        return this._collection.engine.some(
            (item) => !item.disabled && item.visible && item.rendered,
        )
    }

    override getProps(): ITabsProps {
        return {
            ...super.getProps(),
            orientation: this._orientation,
            alignment: this._alignment,
            position: this._position,
            view: this._view,
            closable: this._closable,
        }
    }
}
