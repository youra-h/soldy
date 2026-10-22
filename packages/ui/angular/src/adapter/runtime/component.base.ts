/**
 * TComponentBase — абстрактный базовый класс Angular-компонента soldy.
 *
 * Выносит общий жизненный цикл, чтобы убрать дублирование между компонентами:
 *
 * - constructor: связывает корень компонента с TElementPlugin по описанию
 *   корня (`TRootSpec`), у корня-хоста ещё снимает с элемента атрибуты-входы.
 *   Узел плагинам база отдаёт эффектом после отрисовки (`afterRenderEffect`),
 *   то есть только в браузере, как остальные адаптеры, у которых на сервере
 *   ни рефы, ни attachment-ы не зовутся: узел эмуляции DOM сервера плагинам
 *   мерить и слушать незачем, а без `requestAnimationFrame` в Node
 *   `TElementPlugin` его и не объявил бы. Классы, наборы и стиль ядра — обычные
 *   эффекты: они нужны и разметке сервера
 * - state: сигнал состояния Core (шаблон подписывается сам, без ChangeDetectorRef)
 * - ngOnInit: создаёт binding (createBinding) из заданных inputs — у корня-хоста
 *   вместе с его тегом — в контексте инъекции компонента и ставит приёмник
 *   событий ядра для выходов (syncEvents)
 * - ngOnChanges: пробрасывает изменённые inputs в Core (syncInputs)
 * - ngOnDestroy: очищает подписки и adapter.destroy()
 *
 * Подкласс обязан реализовать:
 * - createBinding(ctrl, inputs): создаёт TBinding через setup-функцию
 * - super(inputNames, root?) в конструкторе: имена входов и описание корня —
 *   `{ strategy: 'host' }`, когда корень — сам элемент потребителя (Button,
 *   ComponentView, Icon), `{ strategy: 'wrapped' }`, когда элемент
 *   потребителя — обёртка, а корень — элемент шаблона в ней (окно таблицы
 *   вокруг `table`), или `{ strategy: 'view' }` (по умолчанию), когда корень
 *   живёт в шаблоне. У корня-хоста там же — имя стиль-выхода компонента,
 *   прячет ли корень его видимость и уезжает ли он в слой (см. `TRootSpec`).
 *
 * Описание передаётся через конструктор (а не getter), т.к. оно нужно уже в
 * конструкторе, а TS запрещает обращение к абстрактному свойству в
 * конструкторе; имена входов — тем же вызовом.
 *
 * Корень значением шаблону — сигнал `rootElement()`: узел, который база отдала
 * `TElementPlugin`, — `null` на сервере и до первой отрисовки, после неё —
 * узел, как `rootElement` у Vue, Solid и Svelte и `useRootElement` у React.
 * Свой хост компонент взять не может (`inject` в компонентах запрещён), а
 * якорь панели — корень: Popover и Tooltip отдают его своему Frame
 * (`[anchor_anchor]="rootElement()"`).
 *
 * Корень-хост (`'host'`) — элемент, на котором потребитель написал селектор:
 * `<button so-button>`, `<a so-button href>`, `<div so-button>`. Всё, что
 * потребитель написал на элементе, относится к корню и работает без проброса,
 * а то, что пишет на корень ядро, раскладывает сама база — у компонентов нет
 * ни привязок хоста, ни эффектов:
 *
 * - тег — `localName` хоста. Имя тега у живого элемента не меняется, поэтому
 *   входа `tag` нет (`useInputs`): тег уходит ядру обычным пропом в сборку
 *   вместе с входами, а внешнему `ctrl` сборка пишет его сеттером;
 * - статический атрибут с именем входа (`text`, `size`, `disabled`,
 *   `aria_label`) — запись входа, а не атрибут. Angular ставит его на элемент
 *   ещё до конструктора, а значение входа берёт из скомпилированного шаблона, а
 *   не из DOM, поэтому база снимает такие атрибуты с хоста в конструкторе.
 *   Нативный `disabled` ведут только `attrs` ядра: иначе статический атрибут
 *   пережил бы включение кнопки;
 * - скрытие (`rendered` или `visible` равно `false`) — привязка хоста
 *   `[style.display]` этой директивы, её наследует каждый компонент. Со стилем
 *   потребителя её сливает Angular: `style`, `[style.x]` и `[style]`
 *   потребителя ставятся и снимаются сами, а шаблон потребителя главнее
 *   привязок хоста, поэтому инлайновый `display` потребителя главнее скрытия —
 *   во Vue и React наоборот. Перекрыть его можно только записью в обход стилей
 *   Angular, а такая запись спорила бы с его привязками. Корень, который
 *   видимость не прячет (`hides: false` — Skeleton), привязка не трогает;
 * - классы ядра и наборы `aria`, `attrs`, `dataset` — эффекты базы
 *   (`root-attributes.ts`). Всё, что называет ядро, база считает своим всегда,
 *   как привязку хоста `[attr.x]` или `[class.x]`, и пишет поверх того, что
 *   стоит на элементе, — статики потребителя, разметки сервера после
 *   гидратации; чего ядро не называет, не трогает. Какие наборы ложатся на
 *   корень, задаёт описание корня (`sets`): у поля `aria` стоит на вложенном
 *   `<input>`. Набор, который на корень кладёт разметка владельца
 *   (`AttributesDirective` на вложенной кнопке), главнее наборов корня: оба
 *   пишут через один раскладчик элемента (`TElementAttributes`). Классы — не
 *   привязка хоста `[class]`: статику шаблона потребителя Angular сверяет
 *   только у первой привязки директивы к классам или стилям
 *   (`directiveStylingLast` у узла одно на те и другие), а `[class]`
 *   компилятор ставит раньше `[style.*]`. С ней статический
 *   `style="display: …"` потребителя проигрывал бы скрытию, а у видимого
 *   корня снимался бы вовсе. `class`, `[class.x]` и `[ngClass]` потребителя
 *   ставят и снимают только свои имена;
 * - `id` корня у компонента, которому его некуда больше положить (DateInput,
 *   DatePicker), — тот же эффект набора `attrs`, под набором
 *   (`TRootSpec.id`): `id` — вход, и его статический атрибут база с хоста
 *   снимает, как любой вход;
 * - стиль — тоже эффект базы, по свойствам и тем же правилом: снизу выход
 *   плагина раскладки (`layout_styles`), поверх него стиль-выход компонента
 *   (`fractionStyle` у ProgressSpinner) и место элемента коллекции (`order`
 *   фасада) в свойстве, которое назвал компонент (`TRootSpec.order`): ряд
 *   коллекции — флексбокс, и элемент встаёт по номеру в коллекции (CSS
 *   `order`), а не по месту в разметке, как у Vue и Svelte; у тоста номер —
 *   его глубина в стопке (`--so-toasts-depth`).
 *   Свойства, которых ядро не называет, — потребителя или плагина,
 *   записавшего его в узел сам, — база не трогает. Не привязка хоста
 *   `[style]` — по той же причине, что классы:
 *   она стала бы первой привязкой стилей директивы. `[style.display]` скрытия
 *   остаётся привязкой;
 * - `rendered=false` прячет корень, как `visible=false`: убрать элемент
 *   потребителя компонент не может. Содержимое остаётся, `TElementPlugin`
 *   связан с хостом всё время. Так же корень прячет выход, который называет
 *   описание корня (`TRootSpec.shownBy` — `active` у панели таба), пока он не
 *   `true`;
 * - слой (`TRootSpec.teleport` — Frame, Dialog, Drawer) есть только в
 *   браузере, как оверлей CDK: элемент потребителя, со всем, что на нём
 *   написано, переносит в цель `teleportRoot` (`teleport.ts`) после
 *   отрисовки. Пока корень не в цели и не на месте — на сервере, до переноса,
 *   без цели, — слоя нет (`placed`): база корень прячет и классов, наборов и
 *   стиля ядра на нём не рисует. Подложку окна и выезжающей панели — соседку
 *   панели в телепорте Vue — шаблон рисует спутником корня (`#companion`):
 *   её база держит прямо перед корнем, где бы он ни стоял, и прячет тем же
 *   значением, что корень;
 * - выходы плагинов, которые у Vue лежат в `v-bind` корня (пометка панели
 *   владельцем `dismiss_ownerAttribute` у окна и выезжающей панели), база
 *   кладёт на корень своим слоем раскладчика (`TRootSpec.plugins`): свой хост
 *   шаблон Angular не адресует;
 * - у поля (`TRootSpec.control` — Input, NumberInput, Textarea, CheckBox,
 *   Switch, радио) атрибуты потребителя делятся между корнем и вложенным
 *   `<input>` (`#control` в шаблоне), как у Vue и React, у элемента коллекции
 *   (ListBox, Tabs, Accordion) — между корнем и строкой, а у самих ListBox и
 *   Tabs — между корнем и узлом списка с ролью (`listbox`, `tablist`). Класс и
 *   стиль остаются на корне, а остальное, что потребитель написал на
 *   компоненте, доходит до `#control` двумя путями. Статические атрибуты
 *   разметки Angular ставит на корень ещё до конструктора, и их база переносит
 *   сама (`_moveAttributes`). Привязки (`[attr.x]`, `[title]`) и слушатели
 *   (`(focus)`) Angular отдаёт рендереру шаблона потребителя, и их доносит
 *   рендерер адаптера (`provideAttrs()`): база регистрирует хост в его реестре
 *   и отдаёт ему узел (`_forward`). Какие атрибуты остаются на корне, у обоих
 *   путей одно правило (`staysOnHost`): класс, стиль, служебные атрибуты
 *   Angular, метки soldy (`so-*` — селектор радио); остаются и входы, а у
 *   рендерера ещё выходы `so*`, события движения и синтетика старых анимаций
 *   (`attrs/host.ts`). Без `provideAttrs()` такой компонент бросает ошибку:
 *   молча он работал бы наполовину — статика на поле, привязки и слушатели на
 *   корне.
 *
 * Корень внутри обёртки (`'wrapped'`) — у таблицы: элемент потребителя
 * (`<div so-table>`) — окно вокруг корня, а корень — элемент шаблона `#root`
 * (`table`), как `div.so-table__viewport` вокруг `table` у Vue и React.
 * Атрибуты потребителя делятся, как у поля: класс и стиль потребителя стоят
 * на обёртке сами, атрибуты-входы база снимает, скрытие — та же привязка
 * `[style.display]`, а остальное, что потребитель написал на таблице, —
 * статику и привязки со слушателями — база и рендерер адаптера доносят до
 * корня, где роль и имя таблицы; свой класс окна ставит компонент статикой
 * хоста. Тег обёртки ядру не уходит: тег корня — тег элемента шаблона,
 * умолчание ядра (`table`). Корню — то, что ядро пишет на корень: классы,
 * наборы и стиль теми же эффектами, что у корня-хоста, и `TElementPlugin`
 * после отрисовки, как у `'view'`.
 *
 * Корень внутри обёртки уезжает и в слой (`'wrapped'` с `teleport`) — регион
 * тостов в `<div so-toasts>`. Тогда обёртка — только место: в ней содержимое
 * потребителя (приложение), своей коробки у неё нет (`display: contents`
 * пишет база), и всё, что потребитель на ней написал, класс и стиль тоже, —
 * корню, как `$attrs` региона у Vue: статику переносит база, привязки,
 * `[class.x]`, `[style.x]` и слушатели — рендерер адаптера, у которого хост
 * без коробки (`boxless`). `visible` и `rendered` прячут корень его стилем, а
 * обёртку с содержимым не трогают. Корень шаблон рисует, только пока слой на
 * своём месте (`@if (placed())`), и перенос (`teleportRoot`) идёт за узлом
 * `#root`.
 *
 * Хост с шаблоном — элемент, который держит содержимое: на пустом элементе
 * HTML (`<input so-input>`) и на поле с текстом (`<textarea so-textarea>`)
 * атрибутный селектор тоже сработал бы, а шаблон в такой хост не отрисуется,
 * а на `<ng-container>` своего узла у хоста нет вовсе — Angular ставит на его
 * месте комментарий. Поэтому у `'host'` и `'wrapped'` такой хост — ошибка
 * (`assertTemplateHost`).
 *
 * Сборка (`createBinding`) идёт в контексте инъекции компонента
 * (`runInInjectionContext`): обёртка сборки
 * (`createAngularAdapterContext`) берёт из него локаль ближайшего
 * `LocaleProviderDirective`, а лифт коллекции (`TAngularElevator`) — слой
 * владельца. Сам `ngOnInit` в контексте не выполняется.
 *
 * У коллекционного компонента — владельца коллекции, её элемента, панели таба
 * — контекстов два, свой и фасада, и `createBinding` отдаёт их одной связкой
 * (`joinBindings`). Второй параметр типа базы — фасад: его свойства шаблон
 * читает из того же `state()`, а сам фасад база отдаёт шаблону сигналом
 * `facade()`, как инстанс — `instance()`. Третий — выходы плагинов
 * дескриптора компонента (`names_selectAll` у Table): шаблон читает их из
 * того же `state()`. У части, которая сразу и элемент коллекции над ней, и
 * владелец своей (пункт с подменю), контекстов три, и четвёртый параметр —
 * фасад владельца, своей коллекции: его свойства (`sections`, `submenus`)
 * шаблон читает из того же `state()`, а `facade()` — фасад элемента, через
 * который строка зовёт команды меню над ней.
 *
 * Эмиттеров заранее база не заводит. Выход — геттер, который кодогенератор
 * пишет в `T<Имя>Surface`, по одному на класс; первое чтение выхода — привязка
 * в шаблоне потребителя или подписка из кода — зовёт `createOutput`, и эмиттер
 * становится собственным свойством экземпляра. Приёмник событий ядра отдаёт
 * событие только такому, уже заведённому эмиттеру: на выход, который никто не
 * читал, отдавать некому.
 *
 * Входы идут по списку имён, поэтому в типе базы их нет, как и выходов.
 * Объявляет их и даёт им тип сгенерированный наследник `T<Имя>Surface`
 * (`generated/*.metadata.ts`: `inputs`/`outputs` декоратора, поля `declare` с
 * `TInputValue` и геттеры с `TOutputEmitter`), и компонент наследует его, а не
 * базу напрямую: строгий шаблон потребителя читает выход как свойство класса, а
 * значение входа сверяет с его полем.
 */

import {
	DestroyRef,
	Directive,
	ElementRef,
	EventEmitter,
	HostAttributeToken,
	Injector,
	Input,
	OnChanges,
	OnDestroy,
	OnInit,
	Renderer2,
	SimpleChanges,
	TemplateRef,
	afterRenderEffect,
	computed,
	contentChildren,
	effect,
	inject,
	runInInjectionContext,
	signal,
	viewChild,
	type Signal,
} from '@angular/core'
import type { IEntity } from '@soldy-ui/core'
import type { TStateSnapshot } from '@soldy-ui/setup'
import { marksHost, staysOnHost, type TForwardOptions } from '../attrs/host'
import { TForwardRegistry } from '../attrs/registry'
import {
	TElementAttributes,
	applyClasses,
	applyStyles,
	attributesOf,
	classesOf,
	orderOf,
	stylesOf,
	type TAppliedClasses,
	type TAppliedStyles,
	type TRootStyles,
} from './root-attributes'
import { SlotDirective } from './slot.directive'
import { teleportRoot } from './teleport'
import type { TBinding, TBindingState } from './useAdapter'

/**
 * Описание корня компонента — элемента, который описывает ядро (тег, классы,
 * наборы, стиль) и который связан с TElementPlugin. Второй параметр
 * конструктора базы.
 *
 * `strategy` — где корень:
 *
 * - `'host'` — корень — сам хост: элемент, на котором потребитель написал
 *   селектор (`<button so-button>`). Живёт всё время жизни компонента, поэтому
 *   привязка разовая, через инжектированный `ElementRef`;
 * - `'view'` — корень в шаблоне компонента, помечен `#root` и может
 *   пересоздаваться: сигнальный `viewChild('root')` переустанавливает связь
 *   при каждом пересоздании узла. Без `#root` — компонент без корня
 *   (`so-component`, `so-virtual`, `so-drag-and-drop`): это директива, её
 *   пишут на `<ng-container>`, и ни шаблона, ни своего узла у неё нет —
 *   запрос `#root` пуст, и `TElementPlugin` узла не получает;
 * - `'wrapped'` — корень внутри обёртки: хост — обёртка, корень — элемент
 *   шаблона `#root` в ней (`<div so-table>` и `table`). Обёртке база снимает
 *   атрибуты-входы и прячет её по `visible` и `rendered`, класс и стиль
 *   потребителя остаются на ней, а остальное, что потребитель на ней написал,
 *   переезжает на корень, как на поле у `control`; тег обёртки ядру не
 *   уходит. Корню — классы, все три набора и стиль ядра, как корню-хосту без
 *   настроек, и привязка к `TElementPlugin`, как у `'view'`: связь идёт за
 *   узлом `#root`, и память раскладки у нового узла начинается пустой.
 *
 *   Настройка у такого корня одна — `teleport`: корень уезжает в слой (регион
 *   тостов в `<div so-toasts>`), а обёртка остаётся местом — с содержимым
 *   потребителя (приложением) и без своей коробки (`display: contents`, его
 *   база пишет сама). Тогда внешний узел компонента — корень: всё, что
 *   потребитель написал на обёртке, класс и стиль тоже, переезжает на него, а
 *   `visible` и `rendered` прячут его, а не обёртку — содержимое остаётся на
 *   виду. Корень шаблон рисует, только пока слой на своём месте (`placed`), и
 *   перенос идёт за узлом `#root`.
 *
 * Корню-хосту база раскладывает ещё стиль и скрытие, и у него три настройки:
 *
 * - `style` — имя стиль-выхода компонента в состоянии: стиль, который считает
 *   ядро (`fractionStyle` у ProgressSpinner). Имя у каждого компонента своё,
 *   поэтому его называет компонент, как наборы ядра во Vue называет разметка.
 *   Нет — своего стиля у компонента нет, и на корне только выход плагина
 *   раскладки;
 * - `hides` — прячут ли `visible` и `rendered` корень, по умолчанию да. У
 *   Skeleton нет: они убирают только заглушку, а содержимое в корне остаётся
 *   на виду;
 * - `order` — имя свойства стиля, в которое ложится место корня в коллекции —
 *   `order` фасада элемента, поверх стиль-выхода. У элементов ListBox, Tabs и
 *   Accordion это CSS `order` — их ряд флексбокс, и элемент встаёт по номеру в
 *   коллекции; у тоста — глубина в стопке, переменная `--so-toasts-depth`, её
 *   читает тема, как `:style` корня тоста у Vue. Нет — место в стиль не
 *   ложится: у радио его нет, радио одной группы стоят где угодно, хоть в
 *   строках чужого списка, и номер увёл бы радио по чужому флекс-ряду, — как у
 *   Vue и Svelte;
 * - `shownBy` — выход состояния, без которого корень скрыт: пока он не
 *   `true`, корень прячется, как при `visible=false`. У панели таба это
 *   `active` фасада — панель видна, только пока активен её таб. Имя выхода
 *   называет компонент, как имена выходов слоя. Нет — корень прячут только
 *   `visible` и `rendered`;
 * - `teleport` — корень уезжает в слой: имена выходов состояния с селектором
 *   цели и с признаком «на месте» (`{ target: 'target', contained: 'contained' }`
 *   у Frame и Drawer, у окна — без «на месте»), их называет компонент, и есть
 *   ли у корня спутник (`companion` у Dialog и Drawer — подложка). Переносит
 *   корень `teleportRoot` (`teleport.ts`) — сам элемент потребителя. Пока
 *   корень не в цели и не на месте — на сервере, до переноса, без цели, —
 *   слоя нет (`placed`). Нет — корень стоит, где его написали;
 * - `sets` — наборы ядра, которые база кладёт на корень, по умолчанию все три.
 *   У поля — `attrs` и `dataset`: его `aria` стоит на вложенном `<input>`
 *   (`AttributesDirective` в шаблоне), а `dataset` — на корне, где его читает
 *   тема, как у остальных адаптеров;
 * - `plugins` — имена выходов плагинов, которые база кладёт на корень слоем
 *   `plugins` своего раскладчика, поверх наборов ядра (`ATTRIBUTE_LAYERS`):
 *   у окна и выезжающей панели — пометка владельцем `dismiss_ownerAttribute`,
 *   без которой плагины слоя не нашли бы панель. У Vue выход лежит в
 *   `v-bind` корня, а свой хост шаблон Angular не адресует. Нет — выходов
 *   плагинов на корне нет;
 * - `aria` — имя выхода состояния, чей набор база кладёт на корень слоем
 *   `aria`, по умолчанию сам `aria`. У Slider — `rootAria`: у нескольких ручек
 *   корень — группа с именем ползунка, у одной набор пуст, а `aria` ползунка
 *   уходит полям ручек — его кладёт шаблон из `thumbs`. Говорит только об
 *   источнике слоя: лежит ли он на корне, решает `sets`. Как `aria` в описании
 *   корня Web Components;
 * - `id` — имя выхода состояния, который база пишет атрибутом `id` корня: у
 *   DateInput и DatePicker — их `id`, своего поля ввода, на которое его
 *   положить, у них нет, и Vue пишет `:id` на корень. `id` — вход, и
 *   статический атрибут с его именем база с хоста снимает, как любой вход
 *   (`_clearInputAttributes`), а обратно его кладёт эта настройка. Слой —
 *   `attrs` раскладчика, под набором `attrs` ядра: у Vue `:id` стоит перед
 *   `v-bind` наборов, — и набор, назвавший `id`, главнее. Значения нет —
 *   атрибут снимается. Пишет его обычный эффект, как наборы, — `id` есть и в
 *   разметке сервера. Нет настройки — `id` корня не трогается;
 * - `control` — у корня есть вложенное поле, элемент шаблона `#control`
 *   (`<input>` у Input, CheckBox, Switch и радио, ввод числа — не скрытое поле
 *   формы — у NumberInput, `<textarea>` у Textarea, строка — у элемента
 *   коллекции, узел списка с ролью — у ListBox и Tabs), и
 *   всё, что потребитель записал на компонент, кроме того, что остаётся на
 *   корне (`staysOnHost`, входы, выходы `so*`), переезжает на него: статику
 *   переносит база, привязки и слушатели — рендерер адаптера
 *   (`provideAttrs()`).
 */
export type TRootSpec =
	| { readonly strategy: 'view' }
	| { readonly strategy: 'wrapped'; readonly teleport?: TRootTeleport }
	| {
			readonly strategy: 'host'
			readonly style?: string
			readonly hides?: boolean
			readonly order?: string
			readonly shownBy?: string
			readonly teleport?: TRootTeleport
			readonly sets?: readonly TRootSet[]
			readonly aria?: string
			readonly plugins?: readonly string[]
			readonly control?: boolean
			readonly id?: string
	  }

/** Описание корня-хоста — элемента потребителя (`TRootSpec` со стратегией `'host'`). */
type TRootHost = Extract<TRootSpec, { readonly strategy: 'host' }>

/**
 * Что база раскладывает на корень, — часть описания корня-хоста: стиль-выход,
 * место в коллекции, наборы, выход слоя `aria`, выходы плагинов и `id`. Корень
 * внутри обёртки берёт умолчания: все три набора из одноимённых выходов, без
 * своего стиля, места, выходов плагинов и `id`.
 */
type TRootPaint = Pick<TRootHost, 'style' | 'order' | 'sets' | 'aria' | 'plugins' | 'id'>

/**
 * Память раскладки на одном узле — что база поставила на него в прошлый раз.
 * Узел корня в шаблоне бывает новым, и на новом узле память начинается
 * пустой: первая раскладка пишет всё.
 */
type TPainted<TApplied> = { readonly on: Element | null; readonly applied: TApplied }

/** Ни одного класса база ещё не поставила. */
const NO_APPLIED_CLASSES: TAppliedClasses = new Set()

/** Ни одного свойства стиля база ещё не поставила. */
const NO_APPLIED_STYLES: TAppliedStyles = new Map()

/** Спутник на виду: своего стиля база ему не пишет. */
const COMPANION_SHOWN: TRootStyles = new Map()

/** Спутник скрыт — тем же значением, что корень (`_hidden`). */
const COMPANION_HIDDEN: TRootStyles = new Map([['display', 'none']])

/**
 * Слой стиля скрытого корня, который база прячет стилем, а не привязкой хоста:
 * корень в слое внутри обёртки (`_bindLayered`). Верхний: скрытие главнее
 * раскладки.
 */
const HIDDEN_ROOT: object = Object.freeze({ display: 'none' })

/**
 * Обёртка без своей коробки: корень уехал в слой, и место в раскладке — у
 * содержимого потребителя, как будто обёртки нет (`_bindLayered`).
 */
const BOXLESS: TRootStyles = new Map([['display', 'contents']])

/** Набор ядра, который база может положить на корень-хост (`TRootSpec.sets`). */
export type TRootSet = 'attrs' | 'aria' | 'dataset'

/** Слой в описании корня (`TRootSpec.teleport`): имена выходов состояния и спутник. */
export type TRootTeleport = {
	/** Выход с селектором цели: `target` у Frame, Dialog и Drawer. */
	readonly target: string
	/**
	 * Выход «корень на месте, без переноса»: `contained` у Frame и Drawer. Нет
	 * — места на месте у слоя нет (окно): корень всегда в цели.
	 */
	readonly contained?: string
	/**
	 * У корня есть спутник — узел шаблона `#companion`, который стоит прямо
	 * перед корнем: подложка окна и выезжающей панели, у Vue — соседка панели в
	 * телепорте. Ставит, увозит и снимает его перенос (`teleportRoot`), а
	 * прячет база тем же значением, что корень. Привязки спутника — в шаблоне.
	 * Нет — спутника нет.
	 */
	readonly companion?: boolean
}

/** Где корень компонента — см. `TRootSpec`. */
export type TRootStrategy = TRootSpec['strategy']

/** Корня-хоста нет: корень в шаблоне или его нет вовсе. */
const VIEW_ROOT: TRootSpec = { strategy: 'view' }

/** Корень внутри обёртки берёт умолчания раскладки: все три набора, без своего стиля и места. */
const WRAPPED_PAINT: TRootPaint = {}

/** Корень, который в слой не уезжает, всегда на своём месте. */
const IN_PLACE: Signal<boolean> = signal(true).asReadonly()

/** Корень, которого стиль не прячет: скрытие у него — привязка хоста или его нет. */
const NEVER_HIDDEN: Signal<boolean> = signal(false).asReadonly()

/** Пустое состояние — его база рисует на корне слоя, которого нет. */
const NO_STATE: TStateSnapshot = Object.freeze({})

/** Наборы ядра, которые база раскладывает на корень-хост, если описание корня не сузило. */
const ROOT_SETS: readonly TRootSet[] = ['attrs', 'aria', 'dataset']

/**
 * Элементы, в которые шаблон компонента не отрисуется: пустые элементы HTML —
 * у них нет детей — и поля, у которых дети — текст (`textarea`) или опции
 * (`select`). Атрибутный селектор совпадёт и с ними: `<input so-input>`,
 * `<textarea so-textarea>`.
 */
const NO_TEMPLATE_HOSTS: ReadonlySet<string> = new Set([
	'area',
	'base',
	'br',
	'col',
	'embed',
	'hr',
	'img',
	'input',
	'link',
	'meta',
	'param',
	'source',
	'track',
	'wbr',
	'textarea',
	'select',
])

/** Узел — элемент: `nodeType` элемента DOM (`Node.ELEMENT_NODE`). */
const ELEMENT_NODE = 1

/** Узел хоста — элемент, а не комментарий `<ng-container>`. */
function isElement(node: Node): node is Element {
	return node.nodeType === ELEMENT_NODE
}

/**
 * Хост компонента с шаблоном (`'host'`, `'wrapped'`) — элемент, который держит
 * содержимое, иначе ошибка.
 *
 * - `<ng-container so-toasts>`: узла у контейнера нет — Angular ставит на его
 *   месте комментарий, — и всё, что потребитель написал на компоненте, ему
 *   некуда положить: `[class.x]`, `[style.x]` и `(click)` Angular на
 *   контейнере молча выкидывает. Корню компонента нужен элемент. В режиме
 *   разработки компонент на контейнере называет ошибкой сам Angular, раньше
 *   конструктора, а в продакшене его проверки нет, и без этой компонент упал
 *   бы на первой записи в узел без подсказки;
 * - пустой элемент HTML (`<input so-input>`) и поле с текстом
 *   (`<textarea so-textarea>`): атрибутный селектор совпадёт и с ними, а
 *   шаблон Angular положил бы в элемент, которого документ не покажет, и
 *   компонент молча остался бы пустым.
 *
 * Из модуля выходит ради спека: хоста без узла в режиме разработки Angular до
 * базы не доводит. Бочка адаптера её не отдаёт.
 */
export function assertTemplateHost(node: Node): asserts node is Element {
	if (!isElement(node)) {
		throw new Error(
			`@soldy-ui/angular: компонент на <ng-container> — у контейнера нет своего узла, а корню компонента нужен элемент: на него ложится всё, что написано на компоненте. Пишите компонент на элементе: по умолчанию это тег из селектора компонента (<div so-toasts>, <button so-button>).`,
		)
	}

	if (!NO_TEMPLATE_HOSTS.has(node.localName)) return

	throw new Error(
		`@soldy-ui/angular: <${node.localName}> не может быть корнем компонента — его шаблон в этот элемент не отрисуется. Пишите компонент на элементе, который держит содержимое: по умолчанию это тег из селектора компонента (<div so-input>, <span so-check-box>).`,
	)
}

/**
 * Реестр рендерера адаптера (`provideAttrs()`) для хоста, который делит
 * написанное на нём с внутренним узлом (`TRootSpec.control`, `'wrapped'`).
 * Проверяется подмена рендерера, а не найденный реестр: `provideAttrs()` в
 * провайдерах маршрута реестр даст, а рендерер приложения не подменит. Без
 * подмены — ошибка, всегда, а не только при разработке: молча компонент
 * работал бы наполовину — статика на узле, привязки и слушатели на корне.
 */
function forwardRegistry(host: Element): TForwardRegistry {
	const registry = inject(TForwardRegistry, { optional: true })

	if (registry?.served) return registry

	throw new Error(
		`@soldy-ui/angular: компонент на <${host.localName}> отдаёт привязки ([attr.x], [title]) и слушатели ((focus)) своему внутреннему узлу, а донести их может только provideAttrs(). Подключите provideAttrs() из @soldy-ui/angular в providers приложения (appConfig) — и в браузере, и на сервере: в провайдерах маршрута или компонента он рендерер не подменит.`,
	)
}

@Directive({
	standalone: true,
	host: {
		'[style.display]': '_rootDisplay()',
	},
})
export abstract class TComponentBase<
	TInstance extends IEntity,
	TFacade = unknown,
	TOutputs = unknown,
	TOwnerFacade = unknown,
>
	implements OnInit, OnChanges, OnDestroy
{
	/** Готовый core-инстанс (если не передан, создаётся из ctor дескриптора). */
	@Input() ctrl?: TInstance

	protected abstract createBinding(
		ctrl: TInstance | undefined,
		inputs: object,
	): TBinding<TInstance, TFacade, TOutputs, TOwnerFacade>

	private readonly _inputNames: readonly string[]

	/**
	 * Хост-элемент, если корень — он (стратегия `'host'`), иначе `null`: его тег
	 * сборка отдаёт ядру. У обёртки (`'wrapped'`) тег свой, а не корня, и ядру
	 * не уходит.
	 */
	private readonly _host: Element | null

	/**
	 * Прячет ли видимость (`visible`, `rendered`) внешний узел компонента:
	 * корень-хост (`TRootSpec.hides`), обёртку корня (`'wrapped'`) и корень в
	 * слое внутри обёртки; у корня в шаблоне — нет.
	 */
	private readonly _hides: boolean

	/**
	 * Скрытие ложится на корень — узел шаблона `#root`, — а не на хост: корень в
	 * слое внутри обёртки (`'wrapped'` с `teleport`), регион тостов. Обёртка там
	 * — только место с содержимым потребителя и остаётся на виду. Стиль корня
	 * пишет база (`_paint`), а привязка хоста `[style.display]` молчит. У
	 * остальных внешний узел — хост, и прячет его привязка.
	 */
	private readonly _hidesRoot: boolean

	/** Выход, без которого корень-хост скрыт (`TRootSpec.shownBy`); нет — не прячет. */
	private readonly _shownBy: string | undefined

	/**
	 * Корень там, где ему место: у слоя (`TRootSpec.teleport`) — в цели или,
	 * если так задано, на месте, и только в браузере, после отрисовки
	 * (`teleportRoot`); у остальных — всегда. Пока слой не на своём месте — на
	 * сервере, до переноса, без цели, — его нет: база корень прячет и ничего от
	 * ядра на нём не рисует, а шаблон слоя по этому же сигналу не рисует
	 * содержимое (`@if (placed())` у Frame).
	 */
	protected readonly placed: Signal<boolean>

	private readonly _binding = signal<
		TBinding<TInstance, TFacade, TOutputs, TOwnerFacade> | undefined
	>(undefined)
	private _eventsCleanup?: () => void

	/** Узел, который база отдала `TElementPlugin`, — его читает шаблон (`rootElement`). */
	private readonly _boundRoot = signal<Element | null>(null)

	/**
	 * Корень компонента значением для шаблона — тот узел, который база отдала
	 * `TElementPlugin`: `null` на сервере и до первой отрисовки, после неё —
	 * узел. У корня в шаблоне (`'view'`, корень внутри обёртки `'wrapped'`) —
	 * новый узел, когда `#root` пересоздан, и `null`, когда его нет. Аналог
	 * `rootElement` у Vue, Solid и Svelte и `useRootElement` у React: Popover и
	 * Tooltip отдают его своему Frame якорем (`[anchor_anchor]="rootElement()"`),
	 * а взять свой хост сам компонент не может — `inject` в компонентах запрещён.
	 *
	 * Пишет его тот же эффект после отрисовки, что отдаёт узел плагинам: на
	 * сервере его нет, а узел эмуляции DOM якорю ни к чему, как и плагинам.
	 */
	protected readonly rootElement: Signal<Element | null> = this._boundRoot.asReadonly()

	/**
	 * Инжектор компонента. В его контексте `createOutput` заводит эмиттер, а
	 * `ngOnInit` собирает компонент. Эмиттер берёт из контекста `DestroyRef`
	 * компонента, и `outputToObservable` по выходу завершается вместе с
	 * компонентом, как у эмиттера, заведённого в конструкторе; сборка — локаль
	 * ближайшего провайдера. Первое чтение выхода идёт уже вне контекста — из
	 * шаблона потребителя или кода, — и `ngOnInit` тоже.
	 */
	private readonly _injector = inject(Injector)

	/**
	 * Состояние Core с выходами плагинов — у коллекционного компонента вместе
	 * со свойствами фасада, у части с тремя контекстами (пункт с подменю) — и
	 * фасада владельца. Сигнал, т.к. binding появляется только в ngOnInit.
	 */
	readonly state = computed<TBindingState<TInstance, TFacade, TOutputs, TOwnerFacade>>(
		() => this._binding()?.state() ?? {},
	)

	/**
	 * Инстанс ядра — внешний `ctrl` или собранный в `ngOnInit`; до сборки его
	 * нет. Шаблон отдаёт его в scope слотов (`{ ctrl }` у Input и Switch) и
	 * зовёт его команды (`clear` кнопки очистки), как `ctrl` в шаблоне Vue.
	 */
	protected readonly instance = computed<TInstance | undefined>(() => this._binding()?.ctrl)

	/**
	 * Фасад коллекции — у компонента с двумя контекстами; до сборки и у
	 * остальных его нет. Через его контекст шаблон элемента зовёт команды
	 * коллекции: выбрать (`choose`), раскрыть (`toggle`), активировать, закрыть
	 * таб, — как `context` в шаблоне Vue.
	 */
	protected readonly facade = computed<TFacade | undefined>(() => this._binding()?.facade)

	/**
	 * Состояние, которое база рисует на корне: классы, наборы, стиль. У слоя не
	 * на своём месте оно пустое: такого слоя нет, и на элементе потребителя
	 * остаётся только написанное им самим (`placed`).
	 */
	private readonly _drawn = computed<TStateSnapshot>(() =>
		this.placed() ? this.state() : NO_STATE,
	)

	/**
	 * Внешний узел компонента скрыт: прячут и `visible`, и `rendered` — кроме
	 * корня, который видимость не прячет (`hides: false`), — выход, без которого
	 * корня нет (`shownBy`), и слой не на своём месте — на сервере, до переноса в
	 * цель, без цели (`placed`): от элемента потребителя остаётся пустой скрытый
	 * узел. У корня в шаблоне скрывать нечего.
	 *
	 * Инстанса компонента база не знает (у `so-component` нет ни классов, ни
	 * наборов), поэтому состояние читает по именам — как запись
	 * `имя → значение` — и вид значения проверяет на месте.
	 */
	private readonly _hidden = computed(() => {
		const state: TStateSnapshot = this.state()
		const hidden = this._hides && (state['rendered'] === false || state['visible'] === false)
		// Выход, без которого корня нет: у панели таба — активен ли её таб
		const absent = this._shownBy !== undefined && state[this._shownBy] !== true

		return hidden || absent || !this.placed()
	})

	/**
	 * Скрытие хоста — привязка `[style.display]` декоратора (`_hidden`). Хост —
	 * корень-хост или обёртка корня (окно таблицы: прячется окно, а не `table` в
	 * нём). Корень в слое внутри обёртки база прячет стилем самого корня
	 * (`_hidesRoot`), и обёртке привязка не достаётся ничего: в ней содержимое
	 * потребителя.
	 *
	 * Не скрыт — `undefined`, а не `null`: `undefined` привязки стиля Angular
	 * понимает как «своего мнения нет» и берёт значение ниже по приоритету —
	 * статику хоста, — а `null` сняла бы её. Статика и привязки потребителя
	 * главнее привязки хоста при любом значении. На `<ng-container>` (директива
	 * без корня, `so-virtual`) стилей нет вовсе: привязку стиля на узле, который
	 * не элемент, Angular пропускает.
	 */
	protected readonly _rootDisplay = computed(() =>
		!this._hidesRoot && this._hidden() ? 'none' : undefined,
	)

	/**
	 * Корень шаблона, помеченный `#root`. Читают его стратегии `'view'` (см.
	 * `_bindView`) и `'wrapped'` — корень внутри обёртки (`_bindWrapped`,
	 * `_bindLayered`): у `'host'` корень — сам хост, и `#root` в шаблоне нет.
	 *
	 * Сигнальный viewChild(), а не @ViewChild: обычный запрос читается
	 * один раз в ngAfterViewInit и после пересоздания узла указывает на
	 * мёртвый элемент.
	 *
	 * Поле, а не вызов в `_bindView`: сигнальные запросы компилятор Angular
	 * распознаёт только в инициализаторе поля, вызов в методе роняет AOT с
	 * NG8110. Поле инициализируется до тела конструктора, откуда зовётся
	 * `_bindView`.
	 *
	 * Параметры заданы явно: первый — тип локатора, здесь строка, второй —
	 * то, что отдаёт `read`. Без него `nativeElement` был бы `any`, и
	 * несовпадение с узлом `TElementPlugin` не было бы видно.
	 */
	private readonly _root = viewChild<unknown, ElementRef<Element>>('root', { read: ElementRef })

	/**
	 * Вложенное поле, помеченное `#control`, — у корня-хоста поля
	 * (`TRootSpec.control`): на него переезжают статические атрибуты
	 * потребителя (см. `_moveAttributes`). Сигнальный запрос и поле — по тем же
	 * причинам, что `_root`.
	 */
	private readonly _control = viewChild<unknown, ElementRef<Element>>('control', {
		read: ElementRef,
	})

	/**
	 * Спутник корня, помеченный `#companion`, — у слоя со спутником
	 * (`TRootTeleport.companion`): подложка окна и выезжающей панели. Шаблон
	 * рисует его, только пока слой на своём месте, и после ухода места рисует
	 * заново — узел бывает новым. Сигнальный запрос и поле — по тем же
	 * причинам, что `_root`.
	 */
	private readonly _companion = viewChild<unknown, ElementRef<Element>>('companion', {
		read: ElementRef,
	})

	/** Объявленные потребителем `<ng-template slot="...">`. */
	private readonly _slots = contentChildren(SlotDirective)

	/**
	 * Шаблон scoped-слота по имени из контракта.
	 *
	 * Сигнальный запрос, а не @ContentChildren: результат читается прямо из
	 * шаблона, и обычный запрос не уведомил бы об изменении.
	 */
	protected slot(name: string): TemplateRef<unknown> | null {
		return this._slots().find((slot) => slot.name === name)?.template ?? null
	}

	constructor(inputNames: readonly string[], root: TRootSpec = VIEW_ROOT) {
		this._inputNames = inputNames

		if (root.strategy === 'host') {
			// `ElementRef<Node>`, а не `any` по умолчанию: на `<ng-container>` хост —
			// комментарий, и что это элемент — узел `TElementPlugin`, — проверяет
			// `assertTemplateHost`, а не параметр типа
			const host = inject<ElementRef<Node>>(ElementRef).nativeElement

			assertTemplateHost(host)

			// Без рендерера адаптера поле не собирается — до всего остального
			const registry = root.control ? forwardRegistry(host) : null

			this._host = host
			this._hides = root.hides ?? true
			this._hidesRoot = false
			this._shownBy = root.shownBy
			this.placed = root.teleport ? this._teleport(() => host, root.teleport) : IN_PLACE
			this._bindHost(host, root)

			if (registry) {
				// Поле — узел шаблона `#control`
				const control = () => this._control()?.nativeElement ?? null

				this._moveAttributes(host, control, staysOnHost)
				this._forward(registry, host, control)
			}
		} else if (root.strategy === 'wrapped') {
			const wrapper = inject<ElementRef<Node>>(ElementRef).nativeElement

			assertTemplateHost(wrapper)

			const registry = forwardRegistry(wrapper)
			// Корень — узел шаблона `#root`: до первой отрисовки его нет, и он бывает новым
			const node = () => this._root()?.nativeElement ?? null

			// Хост — обёртка корня: её тег ядру не уходит. Видимость прячет её, а
			// корень, который уехал в слой, — его самого: обёртка с содержимым
			// потребителя остаётся на виду
			this._host = null
			this._hides = true
			this._hidesRoot = root.teleport !== undefined
			this._shownBy = undefined

			if (root.teleport) {
				this.placed = this._teleport(node, root.teleport)
				this._bindLayered(wrapper, registry, node)
			} else {
				this.placed = IN_PLACE
				this._bindWrapped(wrapper, registry, node)
			}
		} else {
			this._host = null
			this._hides = false
			this._hidesRoot = false
			this._shownBy = undefined
			this.placed = IN_PLACE
			this._bindView()
		}
	}

	ngOnInit(): void {
		// Первый ngOnChanges пришёл раньше связки и ничего не записал: заданные
		// при монтировании входы применяет сборка контекста
		const inputs = this.collectInputs()

		// Тег корня-хоста — у самого элемента: входа `tag` нет (`useInputs`). У
		// корня в шаблоне тег — умолчание ядра
		if (this._host) inputs['tag'] = this._host.localName

		// Сборка — в контексте инъекции компонента: локаль поддерева обёртка
		// сборки берёт у ближайшего провайдера (`createAngularAdapterContext`)
		const binding = runInInjectionContext(this._injector, () =>
			this.createBinding(this.ctrl, inputs),
		)

		this._eventsCleanup = binding.syncEvents((name) => this._createdOutput(name))

		this._binding.set(binding)
	}

	ngOnChanges(changes: SimpleChanges): void {
		const binding = this._binding()

		if (!binding) return

		const inputs: Record<string, unknown> = {}

		for (const key of Object.keys(changes)) {
			inputs[key] = changes[key].currentValue
		}

		binding.syncInputs(inputs)
	}

	ngOnDestroy(): void {
		this._eventsCleanup?.()
		this._binding()?.destroy()
	}

	protected collectInputs(): Record<string, unknown> {
		const inputs: Record<string, unknown> = {}

		for (const name of this._inputNames) {
			const value: unknown = Reflect.get(this, name)
			if (value !== undefined) inputs[name] = value
		}

		return inputs
	}

	/**
	 * Заводит эмиттер выхода `name` — его зовёт геттер выхода из
	 * `T<Имя>Surface` при первом чтении. Эмиттер становится собственным
	 * свойством экземпляра под именем выхода и заслоняет геттер прототипа:
	 * следующие чтения отдают его без вызова, а приёмник событий находит его по
	 * имени (`_createdOutput`). Хранилище одно — само свойство.
	 *
	 * Свойство только для чтения, как поле выхода в типе: повторный вызов по
	 * тому же имени — ошибка, а не подмена эмиттера, на который уже подписаны.
	 */
	protected createOutput<T>(name: string): EventEmitter<T> {
		const emitter = runInInjectionContext(this._injector, () => new EventEmitter<T>())

		Object.defineProperty(this, name, { value: emitter, enumerable: true })

		return emitter
	}

	/**
	 * Корень — сам хост (`'host'`). Элемент потребителя живёт всё время жизни
	 * компонента: привязка к TElementPlugin разовая и только в браузере, после
	 * отрисовки, а классы, наборы и стиль ядра база раскладывает на него сама —
	 * шаблона на хост нет. Зовётся из конструктора: эффектам нужен injection
	 * context.
	 *
	 * Из описания корня здесь — имя стиль-выхода компонента (`style`), место в
	 * коллекции (`order`), наборы ядра на корне (`sets`), выход слоя `aria`
	 * (`aria`) и выход `id` корня (`id`).
	 */
	private _bindHost(host: Element, root: TRootHost): void {
		this._clearInputAttributes(host)

		// Узел — плагинам только в браузере: на сервере эффекта после отрисовки
		// нет. Тот же узел — шаблону (`rootElement`)
		afterRenderEffect(() => {
			const binding = this._binding()

			if (!binding) return

			binding.bindElement(host)
			this._boundRoot.set(host)
		})

		this._paint(() => host, root)
	}

	/**
	 * Корень внутри обёртки (`'wrapped'`): хост — обёртка, корень — элемент
	 * шаблона `#root`. С обёртки база снимает атрибуты-входы, как с корня-хоста,
	 * класс и стиль на ней — потребителя, а остальное, что потребитель на ней
	 * написал, доходит до корня, где роль и имя компонента: статику база
	 * переносит сама (`_moveAttributes`), привязки и слушатели — рендерер
	 * адаптера (`_forward`). Корень привязан к TElementPlugin, как у `'view'`, —
	 * после отрисовки и за узлом `#root`, — а классы, наборы и стиль ядра база
	 * раскладывает на него теми же эффектами, что на корень-хост. Узла `#root`
	 * до первой отрисовки нет: эффекты переноса и раскладки ждут его запроса.
	 *
	 * Перенос заводится раньше раскладки: эффекты базы идут в проходе
	 * представления, где написан компонент, в порядке создания, — атрибуты
	 * потребителя встают на новый узел раньше наборов ядра, и имя, которое
	 * называет ядро, остаётся за ядром, как на корне-хосте. Зовётся из
	 * конструктора: `HostAttributeToken` разрешается только там, а эффектам
	 * нужен injection context.
	 */
	private _bindWrapped(
		wrapper: Element,
		registry: TForwardRegistry,
		root: () => Element | null,
	): void {
		this._clearInputAttributes(wrapper)
		this._bindView()
		this._moveAttributes(wrapper, root, staysOnHost)
		this._forward(registry, wrapper, root)
		this._paint(root, WRAPPED_PAINT)
	}

	/**
	 * Корень внутри обёртки уезжает в слой (`'wrapped'` с `teleport`): регион
	 * тостов в `<div so-toasts>`. Обёртка остаётся местом — с содержимым
	 * потребителя (приложением) и без своей коробки: место в раскладке у
	 * содержимого, как будто обёртки нет, а `display: contents` база пишет на неё
	 * сама, мимо стилей Angular, — это вид компонента, а не потребителя. Внешний
	 * узел компонента здесь — корень, как регион у Vue, у которого обёртки нет
	 * вовсе, и всё, что потребитель написал на обёртке, — его: статику, класс и
	 * стиль тоже, база переносит сама (`_moveAttributes`), а привязки, `[class.x]`,
	 * `[style.x]` и слушатели — рендерер адаптера (`_forward`, хост без коробки).
	 * На обёртке остаются только её метки — селектор, служебные атрибуты Angular
	 * — и входы, которые база снимает, как с любого хоста.
	 *
	 * Остальное — как у корня внутри обёртки (`_bindWrapped`): привязка к
	 * `TElementPlugin` и раскладка ядра идут за узлом `#root`, перенос статики и
	 * привязок заведён раньше раскладки. Своё — скрытие: `visible` и `rendered`
	 * прячут корень, стилем самого корня (`_paint`, `_hidesRoot`), а обёртку с
	 * содержимым потребителя не трогают. Перенос в слой база завела раньше
	 * (`_teleport`): корень шаблон рисует, только пока слой на своём месте.
	 */
	private _bindLayered(
		wrapper: Element,
		registry: TForwardRegistry,
		root: () => Element | null,
	): void {
		this._clearInputAttributes(wrapper)
		this._bindView()
		this._moveAttributes(wrapper, root, marksHost)
		// Статика потребителя снята — своя коробка обёртки, поверх ничего не осталось
		applyStyles(wrapper, BOXLESS, NO_APPLIED_STYLES)
		this._forward(registry, wrapper, root, { boxless: true })
		this._paint(root, WRAPPED_PAINT, this._hidden)
	}

	/**
	 * Атрибут с именем входа — запись входа, а не атрибут элемента (см. шапку):
	 * Angular ставит его на элемент потребителя ещё до конструктора.
	 */
	private _clearInputAttributes(element: Element): void {
		for (const name of ['ctrl', ...this._inputNames]) element.removeAttribute(name)
	}

	/**
	 * Раскладка ядра на корень: эффект на классы, на каждый набор и на стиль —
	 * перекладывается только сменившееся. Корень — `target()`: у корня-хоста
	 * это всегда хост, у корня внутри обёртки — узел `#root`, которого до
	 * отрисовки нет и который бывает новым. Память раскладки — на узел: на новом
	 * она начинается пустой, и первая раскладка пишет всё. Пустой она
	 * начинается и на гидратации: первая раскладка в браузере пишет всё, что
	 * называет ядро, поверх напечатанного сервером.
	 *
	 * `hidden` — у корня, которого прячет не привязка хоста, а его стиль (корень
	 * в слое внутри обёртки, `_hidesRoot`): скрытый корень получает
	 * `display: none` верхним слоем стиля. Нет — скрытие не здесь.
	 */
	private _paint(
		target: () => Element | null,
		paint: TRootPaint,
		hidden: Signal<boolean> = NEVER_HIDDEN,
	): void {
		const styleName = paint.style
		const classes = computed(() => classesOf(this._drawn()['classes']))

		let painted: TPainted<TAppliedClasses> = { on: null, applied: NO_APPLIED_CLASSES }

		effect(() => {
			const element = target()

			if (!element) return

			const applied = painted.on === element ? painted.applied : NO_APPLIED_CLASSES

			painted = { on: element, applied: applyClasses(element, classes(), applied) }
		})

		// Наборы — слоями раскладчика элемента: на корень вложенного компонента
		// свой набор поверх кладёт ещё и разметка владельца (`AttributesDirective`).
		// Раскладчик — у каждого узла свой, со своей памятью. Слой `aria` — из
		// выхода, который назвало описание корня (`rootAria` у Slider), а в слое
		// `attrs` под набором — `id` корня, если его назвало описание (`_rootLayer`)
		const sets = paint.sets ?? ROOT_SETS

		for (const name of ROOT_SETS) {
			const layer = this._rootLayer(name, paint, sets)

			if (!layer) continue

			effect(() => {
				const element = target()

				if (element) TElementAttributes.of(element).set(name, layer())
			})
		}

		if (paint.plugins) this._paintPlugins(target, paint.plugins)

		// Слои стиля — значения состояния как есть: связка заменяет их только
		// на смену содержимого, и эффект не будит смена чужих свойств
		const layout = computed(() => this._drawn()['layout_styles'])
		const own = computed(() => (styleName === undefined ? undefined : this._drawn()[styleName]))
		const order = computed(() => (paint.order ? this._drawn()['order'] : undefined))

		let styled: TPainted<TAppliedStyles> = { on: null, applied: NO_APPLIED_STYLES }

		// Снизу выход плагина раскладки, поверх — стиль-выход компонента, место
		// элемента коллекции, если корень стоит по нему, и скрытие корня, если
		// его прячет стиль
		effect(() => {
			const element = target()

			if (!element) return

			const applied = styled.on === element ? styled.applied : NO_APPLIED_STYLES
			const styles = stylesOf(
				layout(),
				own(),
				orderOf(paint.order, order()),
				hidden() ? HIDDEN_ROOT : undefined,
			)

			styled = { on: element, applied: applyStyles(element, styles, applied) }
		})
	}

	/**
	 * Слой `name` раскладчика корня — то, что в него кладёт база: набор ядра из
	 * своего выхода, если описание корня кладёт этот набор на корень (`sets`), а
	 * в слое `attrs` под набором — `id` корня из выхода, который назвало
	 * описание (`TRootSpec.id`): у Vue `:id` стоит перед `v-bind` наборов, и
	 * набор, назвавший `id`, главнее. Класть нечего — слоя нет.
	 *
	 * Набор — значение состояния как есть: связка заменяет его только на смену
	 * содержимого, и эффект слоя смена чужих свойств не будит. Слой с `id`
	 * собирается заново только на смену `id` или набора.
	 */
	private _rootLayer(
		name: TRootSet,
		paint: TRootPaint,
		sets: readonly TRootSet[],
	): Signal<object> | null {
		const output = name === 'aria' ? (paint.aria ?? 'aria') : name
		const own = sets.includes(name) ? computed(() => attributesOf(this._drawn()[output])) : null
		const idOutput = name === 'attrs' ? paint.id : undefined

		if (idOutput === undefined) return own

		const id = computed(() => this._drawn()[idOutput])

		return computed(() => ({ id: id(), ...own?.() }))
	}

	/**
	 * Выходы плагинов на корне (`TRootSpec.plugins`) — слоем `plugins`
	 * раскладчика элемента, поверх наборов ядра, в порядке имён: у Vue они
	 * лежат в `v-bind` корня следом за наборами (`dismiss_ownerAttribute` окна
	 * и выезжающей панели). Выход — набор, как у ядра, и правило у него то же:
	 * что называет, — за базой. Эффект один на слой и будит его смена одного из
	 * выходов: каждый — значение состояния как есть, и связка заменяет его
	 * только на смену содержимого.
	 */
	private _paintPlugins(target: () => Element | null, names: readonly string[]): void {
		const outputs = names.map((name) => computed(() => attributesOf(this._drawn()[name])))

		effect(() => {
			const element = target()

			if (!element) return

			const layer: Record<string, unknown> = {}

			for (const output of outputs) Object.assign(layer, output())

			TElementAttributes.of(element).set('plugins', layer)
		})
	}

	/**
	 * Атрибуты потребителя делятся (`TRootSpec.control` у корня-хоста и
	 * `'wrapped'`): статические атрибуты, которые потребитель записал на
	 * компонент, переезжают с его элемента `host` на узел шаблона `target()`,
	 * как атрибуты снаружи у Vue и React, — на вложенное поле `#control` или на
	 * корень внутри обёртки `#root`. На элементе остаётся то же, что оставляет
	 * на нём рендерер адаптера, — правило `stays` у них одно: у хоста с коробкой
	 * (`staysOnHost`) класс и стиль — вид корня или окна, — служебные атрибуты
	 * Angular и метки soldy с префиксом `so-` — селектор
	 * (`<label so-radio-group-item>`) и директивы адаптера; у обёртки без
	 * коробки (`marksHost`, корень в слое) — только метки, а класс и стиль — тоже
	 * корню. Атрибуты-входы база уже сняла (`_clearInputAttributes`). Пометку
	 * `ng-version` Angular пишет в разметку хоста корневого компонента сам, и
	 * для `HostAttributeToken` она выглядит атрибутом из разметки, хотя
	 * потребитель её не писал: компонент бывает и корневым — созданным
	 * `createComponent` или `TestBed`. Класс и стиль `HostAttributeToken`
	 * отдаёт статикой разметки вместе со статикой хоста самого компонента
	 * (`host` декоратора), поэтому у компонента, чья обёртка их отдаёт корню,
	 * своих статических класса и стиля хоста нет: свой вид обёртки пишет база.
	 *
	 * Чей атрибут, база узнаёт не по узлу, а по скомпилированной разметке
	 * потребителя (`HostAttributeToken`): на узле стоит и то, чего потребитель
	 * не писал, — атрибут инкапсуляции стилей его компонента (`_ngcontent-*`),
	 * а при гидратации — всё, что напечатал сервер, с наборами ядра и пометкой
	 * гидратации (`ngh`) вместе. Статические атрибуты разметки Angular при
	 * гидратации ставит на узел сервера заново, и база переносит их так же — на
	 * узел шаблона из разметки сервера, где они уже стоят.
	 *
	 * На узел их ставит эффект, когда узел шаблона есть, — раньше, чем на него
	 * ляжет набор ядра: на поле его кладёт шаблон (`AttributesDirective`), а
	 * эффекты базы идут в проходе представления, где написан компонент, до его
	 * собственного шаблона; на корень внутри обёртки — эффекты раскладки базы,
	 * и перенос заводится раньше них (`_bindWrapped`). Поэтому имя, которое
	 * называет ядро, остаётся за ядром, как на корне. Зовётся из конструктора:
	 * `HostAttributeToken` разрешается только там, а эффекту нужен injection
	 * context.
	 *
	 * Ставит их рендерер компонента — рендерер адаптера, — а не запись в узел:
	 * узел бывает хостом сам (поле `<div so-input>` в шаблоне Select), и статика
	 * идёт к его узлу тем же путём, что привязки, — записью хоста, по её
	 * правилам (`attrs/host.ts`, «Цепочка хостов»).
	 */
	private _moveAttributes(
		host: Element,
		target: () => Element | null,
		stays: (name: string) => boolean,
	): void {
		const moved = new Map<string, string>()

		for (const name of host.getAttributeNames()) {
			if (stays(name)) continue

			const value = inject(new HostAttributeToken(name), { optional: true })

			// Атрибута нет в разметке потребителя — его поставил не он
			if (value === null) continue

			moved.set(name, value)
			host.removeAttribute(name)
		}

		if (moved.size === 0) return

		const renderer = inject(Renderer2)

		effect(() => {
			const node = target()

			if (!node) return

			for (const [name, value] of moved) renderer.setAttribute(node, name, value)
		})
	}

	/**
	 * Привязки и слушатели потребителя на хосте — узлу шаблона `target()`
	 * (`TRootSpec.control` у корня-хоста и `'wrapped'`). Их Angular отдаёт
	 * рендереру шаблона потребителя, а рендерер адаптера (`provideAttrs()`)
	 * отдаёт команду на хост, зарегистрированный здесь, его записи в реестре:
	 * та ставит значение на узел, а пока узла нет — держит. Узел записи отдаёт
	 * обычный эффект, а не эффект после отрисовки: привязки нужны и разметке
	 * сервера. Заводится после переноса статики (`_moveAttributes`), и
	 * привязка на имени статического атрибута главнее него, как на обычном
	 * элементе, — и раньше раскладки корня внутри обёртки: имя, которое
	 * называет ядро, на первой отрисовке остаётся за ядром, как у `[attr.x]` на
	 * корне-хосте. Снятый компонент снимает хост с реестра и слушатели — с узла.
	 *
	 * Атрибут с именем входа и `ctrl` остаётся на хосте: это запись входа, а не
	 * атрибут поля (`_clearInputAttributes`). У обёртки без коробки
	 * (`options.boxless`, корень в слое) на узел уходят и класс со стилем —
	 * `[class.x]`, `[style.x]`, `[ngClass]`.
	 */
	private _forward(
		registry: TForwardRegistry,
		host: Element,
		target: () => Element | null,
		options: TForwardOptions = {},
	): void {
		const forwarded = registry.register(host, ['ctrl', ...this._inputNames], options)

		effect(() => forwarded.attach(target()))
		inject(DestroyRef).onDestroy(() => forwarded.release())
	}

	/**
	 * Слой (`TRootSpec.teleport`): корень уезжает в цель — корень-хост или
	 * корень внутри обёртки (`root()`, узел `#root`). Цель и «на месте» база
	 * читает из состояния по именам выходов, которые назвал компонент, а
	 * переносит корень `teleportRoot`. Выхода «на месте» нет — у слоя нет места
	 * на месте (окно, регион тостов), и корень всегда в цели. Спутник корня
	 * (`#companion`) база отдаёт переносу, а прячет сама (`_hideCompanion`).
	 * Зовётся из конструктора: эффектам нужен injection context.
	 *
	 * Отдаёт сигнал «корень на своём месте» (`placed`): пока он ложь, слоя нет.
	 */
	private _teleport(root: () => Element | null, names: TRootTeleport): Signal<boolean> {
		const contained = names.contained
		const companion = names.companion
			? computed(() => this._companion()?.nativeElement ?? null)
			: undefined

		if (companion) this._hideCompanion(companion)

		return teleportRoot(
			root,
			{
				// Селектор — непустая строка, всё остальное — цели нет
				target: computed(() => {
					const state: TStateSnapshot = this.state()
					const value = state[names.target]

					return typeof value === 'string' && value !== '' ? value : null
				}),
				contained: computed(() => {
					const state: TStateSnapshot = this.state()

					return contained !== undefined && state[contained] === true
				}),
			},
			companion,
		)
	}

	/**
	 * Спутник прячется тем же значением, что корень (`_hidden`): закрытое
	 * окно спрятано вместе с подложкой, как `v-show` обоих у Vue, — и
	 * `rendered=false` тоже, ведь элемент потребителя не снимается, а
	 * прячется. Скрытие — свойство стиля спутника, которое база пишет и
	 * снимает по своей памяти, как стиль корня (`applyStyles`): привязки
	 * спутника в шаблоне (`[style]` подложки — её `z-index`) его не трогают.
	 * Узел спутника бывает новым, и на новом память начинается пустой.
	 */
	private _hideCompanion(companion: Signal<Element | null>): void {
		let styled: TPainted<TAppliedStyles> = { on: null, applied: NO_APPLIED_STYLES }

		effect(() => {
			const element = companion()

			if (!element) return

			const styles = this._hidden() ? COMPANION_HIDDEN : COMPANION_SHOWN
			const applied = styled.on === element ? styled.applied : NO_APPLIED_STYLES

			styled = { on: element, applied: applyStyles(element, styles, applied) }
		})
	}

	/**
	 * Корень в шаблоне (`'view'`, и внутри обёртки — `'wrapped'`): существует не
	 * всегда и может пересоздаваться, поэтому эффект перечитывает `#root` и
	 * переустанавливает связь — после отрисовки, только в браузере, как у
	 * корня-хоста, — и тот же узел отдаёт шаблону (`rootElement`). Зовётся из
	 * конструктора: эффекту нужен injection context.
	 */
	private _bindView(): void {
		afterRenderEffect(() => {
			const binding = this._binding()
			const ref = this._root()

			if (!binding) return

			const element = ref?.nativeElement ?? null

			binding.bindElement(element)
			this._boundRoot.set(element)
		})
	}

	/**
	 * Эмиттер выхода `name`, если его уже завёл `createOutput`, — иначе ничего.
	 * Читает собственное свойство, а не через геттер: поиск эмиттер не заводит.
	 */
	private _createdOutput(name: string): EventEmitter<unknown> | undefined {
		const output: unknown = Object.getOwnPropertyDescriptor(this, name)?.value

		return output instanceof EventEmitter ? output : undefined
	}
}
