namespace $.$$ {

	export class $bog_collider extends $.$bog_collider {

		permalink() {
			return `https://b-on-g.github.io/collider/#!bench=${ this.bench_id() }`
		}

		preset_used() {
			if( this.bench() ) return false

			const arg = this.$.$mol_state_arg
			return ![ 'titles', 'prefixes', 'sources', 'prefix', 'common', 'postfix', 'title' ].some( key => arg.value( key ) !== null )
		}

		titles() {
			if( !this.preset_used() ) return super.titles()
			return $bog_collider_preset.cases.map( one => one.title )
		}

		prefixes() {
			if( !this.preset_used() ) return super.prefixes()
			return $bog_collider_preset.cases.map( one => one.setup )
		}

		sources() {
			if( !this.preset_used() ) return super.sources()
			return $bog_collider_preset.cases.map( one => one.measure )
		}

		prefix( next?: string ) {
			if( next !== undefined || !this.preset_used() ) return super.prefix( next )
			return $bog_collider_preset.prefix
		}

		postfix( next?: string ) {
			if( next !== undefined || !this.preset_used() ) return super.postfix( next )
			return $bog_collider_preset.postfix
		}

		bench_title( next?: string ) {
			if( next !== undefined || !this.preset_used() ) return super.bench_title( next )
			return $bog_collider_preset.title
		}

		@ $mol_action
		measure_step( count: number, prefix: string, inner: string, postfix: string ) {
			const perf = $hyoo_js_perf.prototype
			if( !/\bawait\b/.test( prefix + inner ) ) return perf.measure_step.call( this, count, prefix, inner, postfix )

			const token = perf.token.call( this )
			const hot_def = `const case_${ token } = iter_${ token } =>`
			const hot_call = `case_${ token }({#})`

			for( const [ , name ] of ( prefix + inner ).matchAll( /esm\(\s*'([^']+)'\s*\)/g ) ) {
				this.$.$mol_import.module( 'https://esm.sh/' + name )
			}

			this.$.$mol_wait_rest()

			return $mol_wire_sync( this ).measure_step_async(
				count,
				prefix.replace( hot_def, `const case_${ token } = async iter_${ token } =>` ),
				inner === hot_call ? `await ${ hot_call }` : inner,
				postfix,
			)
		}

		async measure_step_async( count: number, prefix: string, inner: string, postfix: string ) {
			const token = $hyoo_js_perf.prototype.token.call( this )

			prefix = prefix.replace( /\{#\}/g, `${ count }` )
			postfix = postfix.replace( /\{#\}/g, `${ count }` )
			inner = Array.from( { length: count }, ( _, i )=> inner.replace( /\{#\}/g, `${ i }` ) ).join( ';\n' )

			const source = [
				`let total_${ token } = -performance.now()`,
				prefix,
				`if( window.gc ) gc(), gc()`,
				`let mem_${ token } = -performance.memory?.usedJSHeapSize ?? 0`,
				`let time_${ token } = -performance.now()`,
				inner,
				`time_${ token } += performance.now()`,
				postfix,
				`if( window.gc ) gc(), gc()`,
				`mem_${ token } += performance.memory?.usedJSHeapSize ?? 0`,
				`total_${ token } += performance.now()`,
				`return { total: total_${ token }, time: time_${ token }, mem: window.gc ? mem_${ token } : 0 }`,
			].join( ';\n' )

			const Async = ( async ()=> {} ).constructor as new ( ...args: string[] )=> ()=> Promise< { total: number, time: number, mem: number } >
			const func = new Async( '', source )

			const backup = $mol_wire_auto()
			$mol_wire_auto( null )
			const promise = func()
			$mol_wire_auto( backup )

			return await promise
		}

	}

}
