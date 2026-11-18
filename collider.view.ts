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

	}

}
