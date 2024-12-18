/* Shows "Chat with AI" button to Special:Search (after the "Search" button). */

$( function () {
	const $submit = $( '#search [type="submit"]' );
	if ( !$submit.length ) {
		return;
	}

	const $prompt = $( '#searchText input' ),
		api = new mw.Api();

	let $loading;

	// Add "Chat with AI" button.
	const $chatButton = $submit.clone()
		.attr( 'type', 'button' )
		.addClass( 'mw-askai-chatwith' )
		.click( prepareChat )
		.insertAfter( $submit );

	$chatButton.find( '.oo-ui-labelElement-label' ).text( mw.msg( 'askai-chatwith-button' ) );

	/**
	 * Add more HTML to the loading screen (shown after "Chat with AI" button is clicked).
	 *
	 * @param {string} html
	 * @return {jQuery} Newly added element.
	 */
	function displayProgress( html ) {
		if ( !$loading ) {
			// Replace current page with the loading screen.
			$loading = $( '<h1>' ).text( mw.msg( 'askai-chatwith-button' ) );
			mw.util.$content.empty().append( $loading );
		}

		return $( '<p>' ).append( html, ' ' ).appendTo( mw.util.$content );
	}

	/* Handler of "Chat with AI" button */
	function prepareChat() {
		const prompt = $prompt.val().trim();
		if ( !prompt ) {
			return;
		}

		// Initialize loading screen.
		let $todo = displayProgress( 'Performing fulltext search for [' + prompt + ']...' );

		const q = {
			formatversion: 2,
			action: 'query',
			list: 'search',
			srlimit: 500,
			srwhat: 'text',
			srsearch: prompt,
			srprop: 'snippet'
		};
		api.get( q ).fail( function ( code, ret ) {
			$todo.append( 'API query (list=search) failed: ' + JSON.stringify( ret ) );
		} ).done( function ( ret ) {
			if ( ret.query.search.length === 0 ) {
				$todo.append( 'Nothing found.' );
				return;
			}
			$todo.append( 'found ' + ret.query.search.length + ' results (total search hits: ' + ret.query.searchinfo.totalhits + ').' );

			const snippets = {};
			ret.query.search.forEach( ( found ) => {
				// Not all search results have a snippet. Snippet is necessary
				// to find relevant paragraphs, so skip results without a snippet.
				if ( found.snippet ) {
					const plaintextSnippet = $( '<div>' ).append( found.snippet ).text().trim();
					snippets[ found.title ] = plaintextSnippet;
				}
			} );

			const allPageNames = Object.keys( snippets );
			$todo = displayProgress( 'Asking AI to narrow down ' + allPageNames.length + ' search results...' );

			narrowDownPageNames( allPageNames ).then( ( pageNames ) => {
				if ( pageNames.length === 0 ) {
					$todo.append( 'AI hasn\'t found any relevant pages.' );
					return;
				}

				$todo.append( 'selected ' + pageNames.length + ' pages.' );

				// Download each of the articles and find the paragraphs that have the snippet.
				return Promise.all(
					pageNames.map( ( pageName ) => {
						const $todo2 = displayProgress( 'Scanning the page "' + pageName + '" for relevant paragraph numbers...' );

						return mw.askai.findparInPage(
							snippets[ pageName ],
							pageName
						).then( ( res ) => {
							$todo2.append( res ? ( 'found: ' + res ) : 'not found', '.' );
							return res;
						} );
					} )
				);
			} ).then( ( res ) => {
				const pages = res.filter( ( x ) => x );
				if ( !pages.length ) {
					displayProgress( 'Paragraph numbers not found in any of the titles.' );
					return;
				}

				displayProgress( 'Found relevant pages and paragraphs: ' + pages.join( ', ' ) );

				const specialTitle = new mw.Title( 'Special:AI' ),
					url = specialTitle.getUrl( {
						wpPages: pages.join( '\n' )
					} );

				displayProgress( $( '<a>' ).attr( 'href', url )
					.attr( 'class', 'mw-askai-search-view' )
					.append( mw.msg( 'askai-search-view' ) ) );

				// window.location.href = url;
			} );
		} );
	}

	/**
	 * Ask AI to narrow down successful search results (received from the API)
	 * to only the most relevant pages.
	 *
	 * @param {string[]} pageNames List of article names in this wiki.
	 * @return {Promise<string[]>} Shortened subset of pageNames.
	 */
	function narrowDownPageNames( pageNames ) {
		// DEBUG: uncomment the following line to test this on all pages (without asking the AI).
		// return $.Deferred().resolve( pageNames );

		const q = {
			formatversion: 2,
			action: 'query',
			prop: 'askai',
			aiinstructions: mw.msg( 'askai-chatwith-instructions' ),
			aiprompt: pageNames.join( '\n' )
		};
		return api.postWithToken( 'csrf', q ).then( function ( ret ) {
			console.log( 'Chat with API: API query (prop=askai) succeeded: ' + JSON.stringify( ret ) );

			const result = ret.query.askai;
			if ( result.service.indexOf( 'DebugService' ) !== -1 ) {
				// Allow to test this with DebugService, which doesn't know how to answer "narrow down" question.
				return pageNames;
			}

			return result.response.split( '\n' ).map( ( x ) => x.trim() ).filter( ( x ) => x );
		} ).fail( function ( code, ret ) {
			console.log( 'Chat with AI: API query (prop=askai) failed: ' + JSON.stringify( ret ) );
			return [];
		} );
	}
} );
