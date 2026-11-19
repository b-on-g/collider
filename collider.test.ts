namespace $ {

	$mol_test({

		'empty link opens $mol vs Solid preset'( $ ) {

			const app = $bog_collider.make({ $ })

			$mol_assert_equal( app.bench_title(), $bog_collider_preset.title )
			$mol_assert_equal( app.titles(), [ '🤓⏰ $mol_wire_solo', '😵⏰ $mol_wire_let', '😵🍔 SolidJS 1', '😵⏰ SolidJS 2', '😵🍔 @pravosleva/reactive-engine', '🤓⏳ $mol_wire_solo await', '😵⏳ SolidJS 2 await', '🤯⏳ Cruzo await' ] )
			$mol_assert_equal( app.Case( 3 ).sample().includes( `esm( 'solid-js@2' )` ), true )
			$mol_assert_equal( app.Case( 3 ).sample().includes( `$mol_assert_like( res,` ), true )

		},

	})

}
