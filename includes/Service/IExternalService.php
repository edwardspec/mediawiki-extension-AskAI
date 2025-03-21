<?php

/**
 * Implements AskAI extension for MediaWiki.
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.
 * http://www.gnu.org/copyleft/gpl.html
 *
 * @file
 */

namespace MediaWiki\AskAI\Service;

use Status;

/**
 * Interface for external services that use AI to respond to arbitrary queries.
 */
interface IExternalService {

	/**
	 * Returns short name of the service (e.g. "OpenAI").
	 * @return string
	 */
	public function getName();

	/**
	 * Send an arbitrary question to AI and return the response.
	 * @param string $prompt Question to ask.
	 * @param string $instructions Preferences on how to respond, e.g. "You are a research assistant".
	 * @param Status $status If an error happened, implementation must call $status->fatal( 'error-code' )
	 * @return string|null Text of response (if successful) or null.
	 */
	public function query( $prompt, $instructions, Status $status );
}
