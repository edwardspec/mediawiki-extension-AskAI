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

namespace MediaWiki\AskAI;

use ManualLogEntry;
use MediaWiki\AskAI\Service\IExternalService;
use MediaWiki\AskAI\Service\ServiceFactory;
use SpecialPage;
use Status;
use User;

/**
 * High-level interface for sending queries to AI.
 */
class AIQuery {
	/** @var User */
	protected $user;

	/** @var IExternalService */
	protected $service;

	/** @var string */
	protected $instructions;

	/** @var Status */
	protected $status;

	/**
	 * @param User $user
	 */
	public function __construct( User $user ) {
		$this->user = $user;
		$this->service = ServiceFactory::getAI();
		$this->status = Status::newGood();
	}

	/**
	 * Get Status object with any errors that might have occured during send().
	 * @return Status
	 */
	public function getStatus() {
		return $this->status;
	}

	/**
	 * Returns short name of the service (e.g. "OpenAI").
	 * @return string
	 */
	public function getServiceName() {
		if ( !$this->service ) {
			return 'none';
		}

		return $this->service->getName();
	}

	/**
	 * Set preferences on how AI should respond, e.g. "You are a research assistant".
	 * @param string $instructions
	 */
	public function setInstructions( $instructions ) {
		$this->instructions = $instructions;
	}

	/**
	 * Send an arbitrary question to AI and return the response.
	 * @param string $prompt Question to ask.
	 * @return string|null Text of response (if successful) or null.
	 */
	public function send( $prompt ) {
		if ( !$this->service ) {
			$this->status->fatal( 'askai-unknown-service' );
			return null;
		}

		$instructions = $this->instructions ?? '';
		$response = $this->service->query(
			$prompt,
			$instructions,
			$this->status
		);

		// Log the result.
		$logEntry = new ManualLogEntry( 'askai', 'query' );
		$logEntry->setPerformer( $this->user );
		$logEntry->setTarget( SpecialPage::getTitleFor( 'AI' ) );
		$logEntry->setParameters( [
			'prompt' => $prompt,

			// TODO: shorten the log by providing setInstructionsPage() and writing only the title.
			'instructions' => $instructions
		] );

		$logid = $logEntry->insert();
		$logEntry->publish( $logid );

		return $response;
	}
}
