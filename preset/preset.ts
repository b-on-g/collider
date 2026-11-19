namespace $ {

	const wire_solo_setup = [
		`// https://github.com/hyoo-ru/mam_mol/tree/master/wire`,
		`const { $mol_wire_solo: mem } = esm( 'mol_wire_lib/web' ).default`,
		`class App extends $mol_object {`,
		`	/*@mem*/ A( next = 0 ) { return next }`,
		`	/*@mem*/ B( next = 0 ) { return next }`,
		`	/*@mem*/ C() { return this.A()%2 + this.B()%2 }`,
		`	/*@mem*/ D() { return numbers.map( i => ({ x: i + this.A()%2 - this.B()%2 }) ) }`,
		`	/*@mem*/ E() { return hard( this.C() + this.A() + this.D()[0].x, 'E' ) }`,
		`	/*@mem*/ F() { return hard( this.D()[2].x || this.B(), 'F' ) }`,
		`	/*@mem*/ G() { return this.C() + ( this.C() || this.E()%2 ) + this.D()[4].x + this.F() }`,
		`	/*@mem*/ H() { res.push( hard( this.G(), 'H' ) ) }`,
		`	/*@mem*/ I() { res.push( this.G() ) }`,
		`	/*@mem*/ J() { res.push( hard( this.F(), 'J' ) ) }`,
		`}`,
		`/*//*/ mem( App.prototype, 'A' ); mem( App.prototype, 'B' )`,
		`/*//*/ mem( App.prototype, 'C' ); mem( App.prototype, 'D' )`,
		`/*//*/ mem( App.prototype, 'E' ); mem( App.prototype, 'F' )`,
		`/*//*/ mem( App.prototype, 'G' ); mem( App.prototype, 'H' )`,
		`/*//*/ mem( App.prototype, 'I' ); mem( App.prototype, 'J' )`,
		`const app = new App`,
		`/*//*/ const tick = ()=> {`,
		`/*//*/ 	app.H(); app.I(); app.J() // $mol_wire_fiber.sync()`,
		`/*//*/ }`,
		`tick()`,
	].join( '\n' )

	const wire_solo_measure = [
		`res.length = 3`,
		`app.B(1); app.A(1+{#}*2); /*//*/ tick() // H`,
		`app.A(2+{#}*2); app.B(2); /*//*/ tick() // EH`,
	].join( '\n' )

	const wire_let_setup = [
		`// https://github.com/hyoo-ru/mam_mol/tree/master/wire`,
		`const { $mol_wire_let: Let } = esm( 'mol_wire_lib/web' ).default`,
		`const { A, B, C, D, E, F, G, H, I, J } = Let({`,
		`	A: n => n ?? 0,`,
		`	B: n => n ?? 0,`,
		`	C: ()=> A()%2 + B()%2,`,
		`	D: ()=> numbers.map( i => ({ x: i + A()%2 - B()%2 }) ),`,
		`	E: ()=> hard( C() + A() + D()[0].x, 'E' ),`,
		`	F: ()=> hard( D()[2].x || B(), 'F' ),`,
		`	G: ()=> C() + ( C() || E()%2 ) + D()[4].x + F(),`,
		`	H: ()=> res.push( hard( G(), 'H' ) ),`,
		`	I: ()=> res.push( G() ),`,
		`	J: ()=> res.push( hard( F(), 'J' ) ),`,
		`})`,
		`/*//*/ const tick = ()=> {`,
		`/*//*/ 	H(); I(); J() // $mol_wire_fiber.sync()`,
		`/*//*/ }`,
		`tick()`,
	].join( '\n' )

	const wire_let_measure = [
		`res.length = 3`,
		`B(1); A(1+{#}*2); /*//*/ tick() // H`,
		`A(2+{#}*2); B(2); /*//*/ tick() // EH`,
	].join( '\n' )

	const solid1_setup = [
		`// https://www.solidjs.com/docs/latest/api`,
		`const { createSignal, createMemo, createEffect, batch } = esm( 'solid-js@1' )`,
		`const { $mol_compare_deep: equals } = esm( 'mol_compare_deep/web' ).default`,
		`const [ A, setA ] = createSignal(0)`,
		`const [ B, setB ] = createSignal(0)`,
		`const C = createMemo( ()=> A()%2 + B()%2 )`,
		`const D = createMemo( ()=> numbers.map( i => ({ x: i + A()%2 - B()%2 }) ), 0, { equals } )`,
		`const E = createMemo( ()=> hard( C() + A() + D()[0].x, 'E' ) )`,
		`const F = createMemo( ()=> hard( D()[2].x || B(), 'F' ) )`,
		`const G = createMemo( ()=> C() + ( C() || E()%2 ) + D()[4].x + F() )`,
		`const H = createEffect( ()=> res.push( hard( G(), 'H' ) ) )`,
		`const I = createEffect( ()=> res.push( G() ) )`,
		`const J = createEffect( ()=> res.push( hard( F(), 'J' ) ) )`,
	].join( '\n' )

	const solid1_measure = [
		`res.length = 3`,
		`batch( ()=> { setB(1); setA(1+{#}*2) } ) // EH`,
		`batch( ()=> { setA(2+{#}*2); setB(2) } ) // EH`,
	].join( '\n' )

	const solid2_setup = [
		`// https://www.solidjs.com/blog/solid-2-0-the-long-hold/`,
		`const { createSignal, createMemo, createEffect, createRoot, flush } = esm( 'solid-js@2' )`,
		`const { $mol_compare_deep: equals } = esm( 'mol_compare_deep/web' ).default`,
		`const [ A, setA ] = createSignal(0)`,
		`const [ B, setB ] = createSignal(0)`,
		`createRoot( ()=> {`,
		`	const C = createMemo( ()=> A()%2 + B()%2 )`,
		`	const D = createMemo( ()=> numbers.map( i => ({ x: i + A()%2 - B()%2 }) ), { equals } )`,
		`	const E = createMemo( ()=> hard( C() + A() + D()[0].x, 'E' ) )`,
		`	const F = createMemo( ()=> hard( D()[2].x || B(), 'F' ) )`,
		`	const G = createMemo( ()=> C() + ( C() || E()%2 ) + D()[4].x + F() )`,
		`	createEffect( G, g => { res.push( hard( g, 'H' ) ) } )`,
		`	createEffect( G, g => { res.push( g ) } )`,
		`	createEffect( F, f => { res.push( hard( f, 'J' ) ) } )`,
		`} )`,
		`flush()`,
	].join( '\n' )

	const solid2_measure = [
		`res.length = 3`,
		`setB(1); setA(1+{#}*2); flush() // EH`,
		`setA(2+{#}*2); setB(2); flush() // EH`,
	].join( '\n' )

	const engine_setup = [
		`// https://www.npmjs.com/package/@pravosleva/reactive-engine`,
		`const { ReactiveEngine } = esm( '@pravosleva/reactive-engine@3' )`,
		`const engine = new ReactiveEngine`,
		`const A = engine.signal( 0 )`,
		`const B = engine.signal( 0 )`,
		`const C = engine.computed( ()=> A.value%2 + B.value%2 )`,
		`const D = engine.computed( ()=> numbers.map( i => ({ x: i + A.value%2 - B.value%2 }) ) )`,
		`const E = engine.computed( ()=> hard( C.value + A.value + D.value[0].x, 'E' ) )`,
		`const F = engine.computed( ()=> hard( D.value[2].x || B.value, 'F' ) )`,
		`const G = engine.computed( ()=> C.value + ( C.value || E.value%2 ) + D.value[4].x + F.value )`,
		`engine.effect( ()=> { res.push( hard( G.value, 'H' ) ) } )`,
		`engine.effect( ()=> { res.push( G.value ) } )`,
		`engine.effect( ()=> { res.push( hard( F.value, 'J' ) ) } )`,
	].join( '\n' )

	const engine_measure = [
		`res.length = 3`,
		`engine.batch( ()=> { B.value = 1; A.value = 1+{#}*2 } ) // H`,
		`engine.batch( ()=> { A.value = 2+{#}*2; B.value = 2 } ) // EH`,
	].join( '\n' )

	const cruzo_setup = [
		`// https://cruzo.org`,
		`const { AbstractService } = esm( 'cruzo@1' )`,
		`const rx = new AbstractService`,
		`const A = rx.newRx( 0 )`,
		`const B = rx.newRx( 0 )`,
		`const C = rx.newRxFunc( ( a, b )=> a%2 + b%2, A, B )`,
		`const D = rx.newRxFunc( ( a, b )=> numbers.map( i => ({ x: i + a%2 - b%2 }) ), A, B )`,
		`const E = rx.newRxFunc( ( c, a, d )=> hard( c + a + d[0].x, 'E' ), C, A, D )`,
		`const F = rx.newRxFunc( ( d, b )=> hard( d[2].x || b, 'F' ), D, B )`,
		`const G = rx.newRxFunc( ( c, e, d, f )=> c + ( c || e%2 ) + d[4].x + f, C, E, D, F )`,
		`rx.newRxFunc( g => res.push( hard( g, 'H' ) ), G )`,
		`rx.newRxFunc( g => res.push( g ), G )`,
		`rx.newRxFunc( f => res.push( hard( f, 'J' ) ), F )`,
	].join( '\n' )

	const cruzo_measure = [
		`res.length = 3`,
		`B.update( 1 ); A.update( 1+{#}*2 ) // EH`,
		`A.update( 2+{#}*2 ); B.update( 2 ) // EH`,
	].join( '\n' )

	export const $bog_collider_preset = {

		title: '$mol vs SolidJS',

		prefix: [
			`// Article about:`,
			`// https://habr.com/ru/articles/707600/`,
			``,
			`let res = []`,
			``,
			`const numbers = Array.from(`,
			`	{ length: 5 },`,
			`	( _, i )=> i,`,
			`)`,
			``,
			`const fib = n => n < 2 ? 1`,
			`	: fib( n - 1 ) + fib( n - 2 )`,
			``,
			`const hard = ( n, l )=> n + fib(18)`,
			``,
			`function esm( name ) {`,
			`	return $mol_import.module( 'https://esm.sh/' + name )`,
			`}`,
		].join( '\n' ),

		postfix: [
			`$mol_assert_like( res,`,
			`[ 8369, 4188, 8364, 8372, 4191, 8369, 4188 ]`,
			`)`,
		].join( '\n' ),

		cases: [
			{ title: '🤓⏰ $mol_wire_solo', setup: wire_solo_setup, measure: wire_solo_measure },
			{ title: '😵⏰ $mol_wire_let', setup: wire_let_setup, measure: wire_let_measure },
			{ title: '😵🍔 SolidJS 1', setup: solid1_setup, measure: solid1_measure },
			{ title: '😵⏰ SolidJS 2', setup: solid2_setup, measure: solid2_measure },
			{ title: '😵🍔 @pravosleva/reactive-engine', setup: engine_setup, measure: engine_measure },
			{ title: '🤯🍔 Cruzo', setup: cruzo_setup, measure: cruzo_measure },
		],

	}

}
