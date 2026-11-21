# $bog_collider

Коллайдер менеджеров состояний: $mol против SolidJS, плюс два новичка. Наследник [$hyoo_js_perf](https://github.com/hyoo-ru/perf.js.hyoo.ru): тот же раннер, тот же граф из статьи [«Big State Managers Benchmark»](https://habr.com/ru/articles/707600/). Из 33 вариантов оригинала оставлены четыре. Добавлены два новичка и асинхронные варианты для $mol и Solid 2, чтобы сравнить их с Cruzo на равных.

Открыть: https://b-on-g.github.io/collider/

| Вариант | Что внутри |
| --- | --- |
| 🤓⏰ `$mol_wire_solo` | классы с мемо-свойствами, как пишут приложения на $mol |
| 😵⏰ `$mol_wire_let` | те же атомы на замыканиях |
| 😵🍔 SolidJS 1 | вариант из статьи без изменений, `solid-js@1` |
| 😵⏰ SolidJS 2 | `solid-js@2`: `batch` удалён, эффект двухфазный, синхронное применение через `flush()` |
| 😵🍔 `@pravosleva/reactive-engine` | [`@pravosleva/reactive-engine@3`](https://www.npmjs.com/package/@pravosleva/reactive-engine): сигналы с `.value`, `computed`, `effect`, `batch` |
| 🤓⏳ `$mol_wire_solo` await | те же атомы, эффекты применяются сами в микрозадаче, замер ждёт `await settle()` |
| 😵⏳ SolidJS 2 await | то же для `solid-js@2`, без `flush()` |
| 🤯⏳ Cruzo await | [`cruzo@1`](https://cruzo.org): `newRx` и `newRxFunc` с явным списком зависимостей, пересчёт в микрозадаче |

⏰ — изменения применяются явным синхронным вызовом, 🍔 — пачкой внутри `batch`, ⏳ — сами в микрозадаче, а замер ждёт, пока они применятся.

Пустая ссылка открывает этот набор. Правка любого поля форкает его в синхронизируемый бенчмарк с постоянной ссылкой `#!bench=…`, как в оригинале.

## Устройство

- `collider.view.tree` наследует `$hyoo_js_perf`, меняет только ссылку на исходники.
- `collider.view.ts` подставляет пресет, когда в адресе нет ни `bench`, ни параметров старого формата (`titles`, `sources`, …).
- `collider.view.ts` ещё учит раннер асинхронным кейсам. Если в коде кейса есть `await`, `measure_step` собирает его как async-функцию и ждёт результат через `$mol_wire_sync`, а синхронные кейсы идут через родительский `measure_step` без изменений.
- `preset/preset.ts` код вариантов. Загрузчик в коде кейсов назван `esm()`, а не `require()`: MAM ищет `require( '…' )` по исходникам, в том числе внутри строк, и вклеил бы найденные npm-пакеты в бандл.

Всё наследование целиком:

```tree
$bog_collider $hyoo_js_perf
	Source $mol_link_source
		uri \https://github.com/b-on-g/collider
```

```ts
titles() {
	if( !this.preset_used() ) return super.titles()
	return $bog_collider_preset.cases.map( one => one.title )
}
```

Так же переопределены `prefixes`, `sources`, `prefix`, `postfix`, `bench_title`. Остальное приложение, включая раннер, синхронизацию и форк, работает как у родителя.

## Граф

Граф одинаковый для всех вариантов. `A` и `B` это входы, `H`, `I`, `J` это побочные эффекты, которые пишут в `res`. `hard()` считает `fib(18)` и изображает дорогое вычисление.

```
C ← A, B
D ← A, B
E ← C, A, D
F ← D, B
G ← C, E (только если C ложно), D, F
H ← G
I ← G
J ← F
```

`G = C() + ( C() || E()%2 ) + D()[4].x + F()`. Когда `C()` истинно, `G` не читает `E`, и считать `E` незачем.

$mol, атомы на классах:

```js
class App extends $mol_object {
	@ $mol_wire_solo A( next = 0 ) { return next }
	@ $mol_wire_solo B( next = 0 ) { return next }
	@ $mol_wire_solo C() { return this.A()%2 + this.B()%2 }
	@ $mol_wire_solo D() { return numbers.map( i => ({ x: i + this.A()%2 - this.B()%2 }) ) }
	@ $mol_wire_solo E() { return hard( this.C() + this.A() + this.D()[0].x, 'E' ) }
	@ $mol_wire_solo F() { return hard( this.D()[2].x || this.B(), 'F' ) }
	@ $mol_wire_solo G() { return this.C() + ( this.C() || this.E()%2 ) + this.D()[4].x + this.F() }
	@ $mol_wire_solo H() { res.push( hard( this.G(), 'H' ) ) }
	@ $mol_wire_solo I() { res.push( this.G() ) }
	@ $mol_wire_solo J() { res.push( hard( this.F(), 'J' ) ) }
}

app.B( 1 ); app.A( 1 ); app.H(); app.I(); app.J() // считается H
app.A( 2 ); app.B( 2 ); app.H(); app.I(); app.J() // считается E и H
```

В бенчмарке декораторы применены вызовом `mem( App.prototype, 'A' )`, потому что код кейса исполняется в браузере без транспиляции.

Solid 2:

```js
const [ A, setA ] = createSignal( 0 )
const [ B, setB ] = createSignal( 0 )

createRoot( ()=> {
	const C = createMemo( ()=> A()%2 + B()%2 )
	const D = createMemo( ()=> numbers.map( i => ({ x: i + A()%2 - B()%2 }) ), { equals } )
	const E = createMemo( ()=> hard( C() + A() + D()[0].x, 'E' ) )
	const F = createMemo( ()=> hard( D()[2].x || B(), 'F' ) )
	const G = createMemo( ()=> C() + ( C() || E()%2 ) + D()[4].x + F() )
	createEffect( G, g => { res.push( hard( g, 'H' ) ) } )
	createEffect( G, g => { res.push( g ) } )
	createEffect( F, f => { res.push( hard( f, 'J' ) ) } )
} )

setB( 1 ); setA( 1 ); flush() // считается E и H
setA( 2 ); setB( 2 ); flush() // считается E и H
```

`equals` здесь `$mol_compare_deep`: без него `D` на каждый пересчёт выдаёт новый массив, и вниз по графу пересчитывается всё.

## Результаты

Headless Chrome 1234, macOS arm64, `--expose-gc`, 18–19.11.2026. Для $mol и Solid цифры повторились в трёх прогонах в пределах 3%, для новичков один прогон, частоты в операциях в секунду, память в байтах на итерацию.

| Вариант | Размер кода | 🥶 холодный | 🥵 горячий | Память |
| --- | --- | --- | --- | --- |
| `$mol_wire_solo` | 130 | 13 402 | 13 373 | 4–8 |
| `$mol_wire_let` | 96 | 13 955 | 13 897 | 3–5 |
| SolidJS 1 | 114 | 11 121 | 11 454 | 161–172 |
| SolidJS 2 | 116 | 10 074 | 10 830 | 224–294 |
| `@pravosleva/reactive-engine` | 132 | 9 084 | 9 194 | 3–9 |
| `$mol_wire_solo` await | 145 | 10 391 | — | — |
| Cruzo await | 147 | ❌ (без ассерта 5 077) | ❌ | — |

Время уходит на `hard()`, то есть на `fib(18)`. $mol быстрее на четверть, потому что считает меньше: в первом шаге он пересчитывает только `H`, а обе версии Solid пересчитывают `E` и `H` в обоих шагах. Это пункт «пропуск невостребованных вычислений» из статьи, и Solid 2 его так и не закрыл.

Сколько раз вызывается `hard()` в двух шагах замера, по метке в логе:

| Вариант | шаг 1 | шаг 2 | всего |
| --- | --- | --- | --- |
| $mol | H | E, H | 3 |
| `@pravosleva/reactive-engine` | H | E, H | 3 |
| Solid 1 и 2 | E, H | E, H | 4 |
| Cruzo | F, E, J, H | E, F, J, H | 8 |

### `@pravosleva/reactive-engine`

```js
const engine = new ReactiveEngine
const A = engine.signal( 0 )
const C = engine.computed( ()=> A.value%2 + B.value%2 )
const D = engine.computed( ()=> numbers.map( i => ({ x: i + A.value%2 - B.value%2 }) ) )
engine.effect( ()=> { res.push( hard( G.value, 'H' ) ) } )

engine.batch( ()=> { B.value = 1; A.value = 1 } )
```

(In progress...)

### Cruzo

```js
const rx = new AbstractService
const A = rx.newRx( 0 )
const C = rx.newRxFunc( ( a, b )=> a%2 + b%2, A, B )
const G = rx.newRxFunc( ( c, e, d, f )=> c + ( c || e%2 ) + d[4].x + f, C, E, D, F )
rx.newRxFunc( f => res.push( hard( f, 'J' ) ), F )

B.update( 1 ); A.update( 1 ); await settle()
```

Пачка у Cruzo асинхронная: `RxFunc.update` ставит пересчёт в `queueMicrotask`, а флаг `updateScheduled` склеивает изменения входов в один пересчёт узла, промежуточных состояний не видно. Синхронно сбросить очередь, как `flush()` в Solid 2, нечем, поэтому Cruzo замеряется в асинхронном режиме: после изменений кейс ждёт `settle()`, пока не отработают все микрозадачи. Так же замеряются `$mol_wire_solo` await и SolidJS 2 await, где эффекты тоже применяются сами в микрозадаче. Время ожидания входит в замер у всех трёх одинаково.

Даже в асинхронном режиме ассерт не проходит, ни в холодном, ни в горячем. Причин две, обе видны в `dist/rx.js`:

- Значения не сравниваются: `update()` всегда оповещает подписчиков. `F` в шаге не меняется, а `J` всё равно срабатывает и пишет лишнее значение. Если дождаться микрозадач, `res` получается `[…, 8364, 8364, 8372, 4191, 8364, 8369, 4188]` вместо `[…, 8372, 4191, 8369, 4188]`.
- Зависимости заданы списком заранее, поэтому `G` подписан на `E` всегда, и `E` считается, даже когда `C()` истинно.

Cruzo — это в первую очередь шаблонизатор с VM выражений, а не менеджер состояний. В статье он был бы в одном ряду с теми, кто не прошёл тесты корректности.

Размер пакета целиком по bundlephobia, gzip: `mol_wire_lib` 8,9 КБ, `solid-js@1` 8,6 КБ, `solid-js@2` 49,7 КБ (из них `@solidjs/signals` 43,2 КБ), `@pravosleva/reactive-engine@3.0.2` 9,0 КБ, `cruzo@1.3.1` 19,4 КБ (с шаблонизатором, роутером и HTTP). В приложении на $mol отдельного пакета нет: атомы входят в бандл как модули `mol/wire/*`, и тянутся только используемые.

## Сравнение с Solid 2.0

Пункты взяты из анонса [Solid 2.0: The Long Hold](https://www.solidjs.com/blog/solid-2-0-the-long-hold/), в том порядке, в каком Solid подаёт их как преимущества. Код Solid написан по API `solid-js@2.0.0` и примерам анонса, код $mol по исходникам `mol/`.

| # | Что обещает Solid 2.0 | Solid 2.0 | $mol |
| --- | --- | --- | --- |
| 1 | Асинхронность внутри графа | `createMemo` от Promise, `isPending`, `<Loading>` | синхронный код поверх асинхронного, ожидание и отмена сами |
| 2 | Server Functions в ядре | `"use server"`, `live` | аналога нет: `$mol_rest_server` или Giper Baza |
| 3 | Диагностика для AI-агентов | коды ошибок, поиск водопадов, Sentry | имена атомов-пути, ошибка на месте, `$mol_dev_format`, `$mol_wire_log` |
| 4 | Экспериментальный синтаксис | ReactiveScript, TSRX | `view.tree`, рабочий, а не экспериментальный |
| 5 | Без метафреймворка | ядро + Vite + TanStack | MAM, без конфигов и плагинов |
| 6 | Меньший API | убраны 7 функций | 3 декоратора, эффектов нет |
| 7 | Long Hold | предупреждение о долгом ожидании | аналога нет |
| 8 | Стабильность | 23 RC, API заморожен | версий нет, одна ветка |

### 1. Асинхронность внутри графа

Главная новость Solid 2. Мемо может вернуть Promise, и всё, что от него зависит, ждёт само. Пока данных нет, `<Loading>` показывает заглушку. Когда данные уже есть, но идёт перезапрос, `isPending` даёт понять, что значение устарело, а старое значение продолжает отдаваться.

```jsx
function Profile( props ) {
	const user = createMemo( ()=> fetchUser( props.id ) )
	return (
		<Loading fallback={ <Skeleton /> }>
			<div class={{ stale: isPending( ()=> user() ) }}>
				{ user().name }
			</div>
		</Loading>
	)
}
```

В $mol так устроено изначально. Свойство пишется синхронно, как будто данные уже пришли:

```ts
export class $my_profile extends $.$my_profile {

	@ $mol_mem
	user() {
		return this.$.$mol_fetch.json( `/api/user/${ this.id() }` ) as { name: string }
	}

	name() {
		return this.user().name
	}

}
```

```tree
$my_profile $mol_view
	id \
	sub /
		<= name \
```

Пока ответа нет, `$mol_fetch.json` бросает Promise. Атом `user` его ловит и запоминает, `name` и рендер прерываются, а когда Promise выполнится, вся цепочка перезапустится с того же места. `<Loading>` писать не нужно: вид, у которого вычисление ждёт, сам получает атрибут `mol_view_error="Promise"`, и тема рисует ему мигающую подложку. Ожидание при этом локально: соседние компоненты на той же странице показываются сразу.

Гонки решаются тем же механизмом. Сменился `id`, атом `user` перезапустился, старый запрос стал никому не нужен и уничтожается. У `$mol_fetch` деструктор вызывает `AbortController.abort()`, запрос реально отменяется в сети, а не просто игнорируется:

```ts
const promise = fetch( request ).finally( ()=> { done = true } )
return Object.assign( promise, {
	destructor: ()=> {
		if( !done && !controller.signal.aborted ) controller.abort()
	},
} )
```

Чужое промисное API заворачивается в синхронное через `$mol_wire_sync`, а синхронный метод отдаётся наружу промисом через `$mol_wire_async`:

```ts
name() {
	const response = $mol_wire_sync( window ).fetch( '/profile' )
	const json = $mol_wire_sync( response ).json()
	return json.user_name
}
```

```ts
const set_name = $mol_wire_async( user ).name
set_name( 'john' )
set_name( 'jin' ) // запись 'john' прерывается
```

На этом же строится дебаунс: внутри метода `this.$.$mol_wait_timeout( 500 )`, и каждый новый вызов отменяет предыдущий.

Чего в $mol нет: отката оптимистичных записей как отдельного механизма. В Solid 2 для этого `createOptimistic` и `action`: локальное значение показывается сразу и откатывается, если сервер ответил иначе. В $mol такое пишется руками.

### 2. Server Functions в ядре

Solid перенёс серверные функции из SolidStart в ядро. Функция с `"use server"` выполняется на сервере, клиент зовёт её как обычную, транспорт делается через Request/Response. Для потоков есть `live` поверх Server-Sent Events, его результат читается в мемо и обновляется сам:

```js
"use server"
import { live } from "@solidjs/web/server-functions"

export const stockPrice = live( async function* ( symbol ) {
	for await ( const tick of subscribe( symbol ) ) yield tick.price
} )
```

```jsx
const price = createMemo( ()=> stockPrice( props.symbol ) )
```

У $mol прямого аналога нет, вызов серверной функции как локальной он не делает. Сервер пишется отдельным модулем на `$mol_rest_server`. Одни и те же ресурсы отвечают и по HTTP, и по WebSocket:

```ts
export class $my_api extends $mol_rest_resource {

	GET( msg: $mol_rest_message ) {
		msg.reply({ path: msg.uri().pathname })
	}

	@ $mol_mem
	price() {
		return $my_api_price.make({})
	}

}
$my_api.serve()
```

Клиент читает это обычным `$mol_fetch` внутри атома, как в пункте 1.

Второй путь — вообще убрать серверный код. Giper Baza это CRDT-база с синхронизацией в реальном времени. Схема описывается классом, данные читаются и пишутся как свойства, изменения других пользователей приходят сами и перерисовывают ровно те виды, которые их читают:

```ts
export class $my_stock extends $giper_baza_dict.with({
	Price: $giper_baza_atom_real,
}) {}
```

```ts
stock() {
	return this.$.$giper_baza_glob.Pawn( this.link(), $my_stock )
}

price() {
	return this.stock().Price()?.val() ?? 0
}
```

Это ближе к `live`, чем к RPC: значение живое, но писать сервер не нужно вовсе.

### 3. Диагностика для AI-агентов

Тут Solid впереди. Дев-сборка выдаёт ошибки со стабильным кодом, местом в исходнике и ссылкой на доку, отдельно для людей и для агентов:

```
[STRICT_READ_UNTRACKED] Reactive value read directly in an effect callback will not update.
  at src/Item.tsx:12:19
```

Ещё Solid ищет водопады запросов, циклы эффектов и неудачные формы графа, пишет дорожки в Chrome Performance, а плагин Sentry переносит это в прод. Кодов ошибок и анализа формы графа у $mol нет.

Что есть у $mol. Каждый атом назван путём от корня приложения, и в стеке, логе или DevTools видно, где именно что-то пересчиталось или упало:

```
$bog_collider.Root(0).Case(3).sample()
```

Упавший компонент не роняет страницу. Ошибка рисуется на месте вида: атрибут `mol_view_error` с именем ошибки, красная штриховка и текст. Остальное приложение продолжает работать, а когда причина уйдёт, вид перерисуется сам.

`$mol_dev_format` регистрирует форматтеры для Chrome DevTools (Settings → Console → Custom formatters). Атом в консоли показывается с именем, текущим значением, подписками и подписчиками, а не как объект с внутренними полями.

`$mol_wire_log` уже лежит в тестовом бандле, который грузит `test.html`. В консоли указываешь корень, и он логирует каждое изменение состояний, от которых корень зависит явно или неявно:

```js
$mol_wire_log.watch( ()=> $my_app.Root(0).dom_tree() )
```

Изменившееся значение помечается `🔥 Next`, пересчитанное в то же самое `💧 Same`, в поле `place` стоит сам атом. Выключить: `$mol_wire_log.watch( null )`.

Так видно лишний пересчёт, тот самый, который в бенчмарке у Solid.

### 4. Экспериментальный синтаксис

Solid добавил ReactiveScript и TSRX. Это компилируемые диалекты, чтобы агентам было проще писать реактивный код. Оба экспериментальные.

**ReactiveScript** ([ryansolid/reactivescript](https://github.com/ryansolid/reactivescript), 0.1). Отдельный язык, файлы `.rx`, компилируется в обычный Solid 2.0. Имён три вида: `source x := 0` это состояние, писать в него можно только через `:=`. `y = x * 2` это уравнение, оно пересчитывается само. Записи разрешены только в обработчиках и `action`. Пример из README:

```rx
export default component Counter() {
  source count := 0
  double = count * 2

  <button onClick={() => { count := count + 1 }}>{count} × 2 = {double}</button>
}
```

Асинхронность — это `await` в уравнении. Компилятор требует границы ожидания и ошибки:

```rx
import pure { fetchUser } from "./api"

export default component Profile() {
  source id := 1
  user = await fetchUser(id)

  <section>
    <button onClick={() => { id := id + 1 }}>Next</button>
    {errored fallback(e) { <p>Couldn't load: {e.message}</p> } {
      {loading fallback { <p>Loading…</p> } {
        <h1>{user.name}</h1>
      }}
    }}
  </section>
}
```

Без `errored` код не компилируется:

```
profile.rx:10: error UNHANDLED_FAILURE [R-f-5] a reader of user.name (in <Profile>) can fail with Error and no catch or errored boundary above it ...
```

**TSRX** ([tsrx-org/tsrx](https://github.com/tsrx-org/tsrx), бета). Это не язык Solid, а расширение TSX сразу для нескольких рантаймов: React, Preact, Solid, Vue. Даёт `@{ … }` для кода рядом с разметкой, `@if`, `@for`, `@switch`, `@try` и `<style>` с областью видимости. Пример из README:

```tsx
export function TodoList({ items }: { items: Todo[] }) @{
  const visibleItems = items.filter((item) => !item.hidden);

  <>
    <ul>
      @for (const item of visibleItems; index i; key item.id) {
        <li>{i + 1}. {item.title}</li>
      } @empty {
        <li>No todos yet</li>
      }
    </ul>

    <style>
      ul {
        display: grid;
        gap: 0.5rem;
      }
    </style>
  </>
}
```

В $mol отдельный язык описания компонентов есть давно, и он основной. `view.tree` компилируется в TS-класс с типами. Тот же счётчик:

```tree
$my_counter $mol_view
	sub /
		<= Value $mol_view
			sub / <= value? 0
		<= Inc $mol_button_minor
			title \+
			click? <=> inc? null
```

Из этого получается класс со свойствами `Value()`, `value()`, `Inc()`, `inc()`. Логика дописывается в `.view.ts` переопределением:

```ts
export class $my_counter extends $.$my_counter {
	inc() {
		this.value( this.value() + 1 )
	}
}
```

Разделение `source` и уравнений из ReactiveScript здесь задаётся формой метода. Метод с `next` можно записать, без `next` он только вычисляется. Запись в вычисляемое свойство ловит тайпчек, потому что у метода нет параметра. Асинхронность не требует `await` и границ: `Profile` из пункта 1 пишется синхронно, а ожидание и ошибку вид показывает сам.

Тот же `TodoList`:

```tree
$my_todo_list $mol_list
	rows <= items_visible /$mol_view
	Item* $mol_view
		sub / <= item_title* \
	Empty $mol_view
		sub / \No todos yet
```

```ts
export class $my_todo_list extends $.$my_todo_list {

	items(): { id: string, title: string, hidden?: boolean }[] {
		return []
	}

	@ $mol_mem
	visible() {
		return this.items().filter( item => !item.hidden )
	}

	items_visible() {
		return this.visible().map( item => this.Item( item.id ) )
	}

	item_title( id: string ) {
		const index = this.visible().findIndex( item => item.id === id )
		return `${ index + 1 }. ${ this.visible()[ index ].title }`
	}

}
```

```ts
$mol_style_define( $my_todo_list, {
	display: 'grid',
	gap: '0.5rem',
} )
```

Ключ `key item.id` здесь — это ключ `Item*`. `@empty` писать не нужно: у `$mol_list` есть свой `Empty`, он показывается, когда `rows` пуст. Стили привязаны к классу компонента через атрибут `my_todo_list`, это и есть их область видимости.

Главное свойство дерева: любое вложенное свойство любого компонента переопределяется у наследника одной строкой, без пропсов и без форка. Сам коллайдер так и сделан, `Source` из глубины `$hyoo_js_perf` заменён тремя строками:

```tree
$bog_collider $hyoo_js_perf
	Source $mol_link_source
		uri \https://github.com/b-on-g/collider
```

### 5. Один фреймворк без метафреймворка

Solid вывел из употребления SolidStart. Метафреймворк теперь собирается из ядра, Vite-плагинов и сторонних библиотек. В анонсе в пример ставят TanStack Router и TanStack Query:

```sh
npm create solid@latest
npm i @tanstack/solid-router @tanstack/solid-query
```

плюс `vite.config.ts` с плагином Solid.

У $mol метафреймворка не было никогда. Сборку, проверку типов, тесты, дев-сервер и раскладку по платформам делает MAM, без конфигов:

```sh
npm exec mam@latest bog/collider
```

Остальное лежит в `mol/` и подключается по имени. Роутинг через адресную строку:

```ts
@ $mol_mem
bench_id() {
	return this.$.$mol_state_arg.value( 'bench' )
}
```

Состояние в `localStorage` через `$mol_state_local.value( key, next )`, офлайн через `include \/mol/offline/install` в `meta.tree`, кеш в самих атомах. Плагинов нет, потому что подключать нечего.

### 6. Меньший API

Solid удалил `createResource`, `batch`, `startTransition`, `on`, `produce`, `createComputed` и `createMutable`. `createEffect` разделён на две функции: первая читает зависимости, вторая делает побочное действие.

```js
createEffect(
	()=> count(),
	value => { console.log( value ) },
)
```

В анонсе пример с зависимыми выпадающими списками: штат, затем город. Примерно так:

```jsx
const states = createMemo( ()=> getStates( 'US' ) )
const [ state, setState ] = createSignal( '' )
const cities = createMemo( ()=> state() ? getCities( state() ) : [] )

<Loading fallback="Загрузка…">
	<select onChange={ e => setState( e.target.value ) }>
		<For each={ states() }>{ s => <option>{ s }</option> }</For>
	</select>
	<select disabled={ isPending( ()=> cities() ) }>
		<For each={ cities() }>{ c => <option>{ c }</option> }</For>
	</select>
</Loading>
```

У $mol реактивный API состоит из трёх декораторов: `$mol_mem` для свойства, `$mol_mem_key` для свойства с ключом, `$mol_action` для действия. Эффектов нет вообще. Побочное действие это тоже атом, и вызывается он потому, что его кто-то читает, обычно рендер. `batch` не нужен с самого начала: пересчёт отложен до кадра, а чтение синхронно отдаёт свежее значение.

Те же списки на $mol:

```tree
$my_geo $mol_list
	rows /
		<= State $mol_select
			value? <=> state? \
			options <= states /string
		<= City $mol_select
			value? <=> city? \
			options <= cities /string
```

```ts
export class $my_geo extends $.$my_geo {

	states() {
		return this.$.$mol_fetch.json( '/api/states?country=US' ) as string[]
	}

	cities() {
		if( !this.state() ) return []
		return this.$.$mol_fetch.json( `/api/cities?state=${ this.state() }` ) as string[]
	}

	@ $mol_mem
	city( next?: string ) {
		this.state()
		return next ?? ''
	}

}
```

Ни `Loading`, ни `isPending`, ни `disabled` нет: пока города грузятся, список городов сам в ожидании, а выбор штата доступен. `city` зависит от `state`, поэтому при смене штата выбранный город сбрасывается без эффекта.

### 7. Диагностика Long Hold

Название релиза отсюда. Solid предупреждает, если индикатор ожидания висит, а пользователь давно ничего не вводил: значит, что-то зависло.

Аналога в $mol нет. Ожидание видно на конкретном виде через `mol_view_error="Promise"`, но таймера, который бы о нём предупреждал, нет.

### 8. Стабильность и установка

Solid 2.0 стабилен: 23 релиз-кандидата, API заморожен с августа. Старт `npm create solid@latest`.

У $mol версий нет. Все модули живут в одной ветке и обновляются вместе, поэтому несовместимых между собой версий модулей не бывает. Для внешних потребителей npm-пакеты собираются автоматически на каждое изменение, `mol_wire_lib` сейчас `1.0.1845`. Старт:

```sh
npm create view-tree-lsp@latest my/app
```

или сразу собрать существующий модуль: `npm exec mam@latest путь/к/модулю`.

## Чего нет в анонсе Solid, но есть в $mol

### Невостребованное не считается

Видно в бенчмарке. Атом пересчитывается только если его значение кто-то прочитает. Пока `C()` истинно, `E` не читается и не считается, хотя его зависимости изменились.

### Одинаковые значения гасятся сами

Атом сравнивает старое и новое значение через `$mol_compare_deep`. Если массив пересобран, но по содержимому тот же, подписчики не пересчитываются:

```ts
@ $mol_mem
D() {
	return numbers.map( i => ({ x: i + this.A()%2 - this.B()%2 }) )
}
```

В Solid для того же нужен `{ equals }` и функция глубокого сравнения со стороны. В бенчмарке её берут у $mol.

### Детерминированное освобождение ресурсов

Атом, на который больше никто не подписан, уничтожается и вызывает `destructor()` у своего значения. Сборщик мусора и `onCleanup` не нужны:

```ts
@ $mol_mem
socket() {
	const socket = new WebSocket( this.uri() )
	return Object.assign( socket, {
		destructor: ()=> socket.close(),
	} )
}
```

Закрылся экран, который читал `socket()`, и соединение закрылось. Сменился `uri()`, и старое соединение закрылось, открылось новое.

### Динамические зависимости

Подписки пересобираются при каждом пересчёте. Ветка `C() || E()` подписана на `E` только тогда, когда реально его читает.

### Контекст вместо провайдеров

У каждого объекта есть `this.$`, контекст наследуется по дереву владения. Любую глобальную сущность можно подменить для поддерева или теста:

```ts
const app = $my_profile.make({
	$: $.$mol_ambient({
		$mol_fetch: $my_fetch_mock,
	}),
})
```

Все `this.$.$mol_fetch` внутри `app` и его детей получат заглушку. Провайдеров, `createContext` и `useContext` нет.

### Готовые компоненты

В `mol/` 246 модулей: списки, формы, таблицы, графики, редакторы кода, темы и больше тысячи иконок. Чужой компонент настраивается строкой у наследника, как `Source` выше.

`$mol_list` по умолчанию рендерит только видимые строки, виртуализацию включать не надо.

### Стили

Каждый вид получает атрибуты из имени класса и имени свойства в родителе, на них вешаются стили. Типизированный CSS пишется в `.view.css.ts`:

```ts
$mol_style_define( $my_counter, {
	Value: {
		font: { size: '2rem' },
	},
} )
```

Опечатка в имени вложенного вида или CSS-свойства ловится тайпчеком.

### Локализация

Строка с `@` в дереве уходит в `-view.tree/*.locale=en.json` сама:

```tree
	title @ \JS Benchmark
```

Перевод кладётся рядом в `perf.locale=ru.json` с ключом `$hyoo_js_perf_Common_title`, и интерфейс переключается по языку браузера.

### Граница ошибок и ожидания у каждого вида

`ErrorBoundary` и `Suspense` не расставляются руками. Любой вид, у которого вычисление упало или ждёт, показывает это у себя, родители и соседи продолжают работать.

## Чего нет в анонсе Solid, но есть в MAM

### Ноль конфигов

Зависимость появляется, когда в коде встречается имя. `$mol_button` в TS или `mol_button` в CSS подтянут модуль `mol/button/`, путь выводится из имени. Нет `import`, `package.json` для своих модулей, `vite.config` и `tsconfig` на проект.

### Только использованное

В бандл попадают только модули, имена которых встретились. Это не tree-shaking по импортам, а сборка по графу имён, поэтому неиспользуемое даже не читается.

### Один модуль, много языков

Модуль это папка. В ней лежат TS, `view.tree`, CSS, GLSL, JSON локалей. Теги в имени файла раскладывают их по бандлам:

```
my/app/
	app.view.tree
	app.view.ts
	app.view.css.ts
	app.web.ts          только в web.js
	app.node.ts         только в node.js
	app.test.ts         только в тестовые бандлы
	app.locale=ru.json  русская локаль
```

### Тесты в каждой сборке

Тесты лежат рядом с кодом, собираются в `node.test.js` и `web.test.js` и прогоняются при каждой сборке. Тест коллайдера:

```ts
'empty link opens $mol vs Solid preset'( $ ) {
	const app = $bog_collider.make({ $ })
	$mol_assert_equal( app.bench_title(), $bog_collider_preset.title )
}
```

### npm без установки

`require( 'pkg' )` в коде, и MAM поставит пакет сам. Обратная сторона: он находит такой вызов даже внутри строки, поэтому в коде кейсов коллайдера загрузчик назван `esm()`.

### Фрактальный монорепозиторий

Любой модуль выносится в свой репозиторий строкой в `meta.tree` родителя, и сборщик сам его клонирует, когда встретит имя. Так подключён и этот коллайдер:

```tree
pack collider git \https://github.com/b-on-g/collider.git
```

А сам он тянет `$hyoo_js_perf` по такой же строке из `hyoo/js/js.meta.tree`.

### Одна версия всего

Все модули из одной ветки, поэтому конфликтов версий, `peerDependencies` и дублей одной библиотеки в бандле не бывает.

## Разработка

```bash
npm exec mam@latest bog/collider
```

Или в поднятом дев-сервере: `http://localhost:9080/bog/collider/-/index.html`.
