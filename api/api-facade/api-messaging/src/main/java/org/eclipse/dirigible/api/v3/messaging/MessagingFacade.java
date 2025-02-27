/*
 * Copyright (c) 2021 SAP SE or an SAP affiliate company and Eclipse Dirigible contributors
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Eclipse Dirigible contributors
 * SPDX-License-Identifier: EPL-2.0
 */
package org.eclipse.dirigible.api.v3.messaging;

import org.eclipse.dirigible.commons.api.scripting.IScriptingFacade;
import org.eclipse.dirigible.core.messaging.api.IMessagingCoreService;
import org.eclipse.dirigible.core.messaging.service.MessagingConsumer;
import org.eclipse.dirigible.core.messaging.service.MessagingProducer;

/**
 * The Class MessagingFacade.
 */
public class MessagingFacade implements IScriptingFacade {

	/**
	 * Send a message to queue.
	 *
	 * @param destination the destination
	 * @param message the message
	 */
	public static final void sendToQueue(String destination, String message) {
		MessagingProducer producer = new MessagingProducer(destination, IMessagingCoreService.QUEUE, message);
		new Thread(producer).start();
	}
	
	/**
	 * Send a message to topic.
	 *
	 * @param destination the destination
	 * @param message the message
	 */
	public static final void sendToTopic(String destination, String message) {
		MessagingProducer producer = new MessagingProducer(destination, IMessagingCoreService.TOPIC, message);
		new Thread(producer).start();
	}
	
	/**
	 * Receive a message from queue.
	 *
	 * @param destination the destination
	 * @param timeout the timeout
	 * @return the message as JSON
	 */
	public static final String receiveFromQueue(String destination, int timeout) {
		MessagingConsumer consumer = new MessagingConsumer(destination, IMessagingCoreService.QUEUE, timeout);
		return consumer.receiveMessage();
	}
	
	/**
	 * Receive a message from topic.
	 *
	 * @param destination the destination
	 * @param timeout the timeout
	 * @return the the message as JSON
	 */
	public static final String receiveFromTopic(String destination, int timeout) {
		MessagingConsumer consumer = new MessagingConsumer(destination, IMessagingCoreService.TOPIC, timeout);
		return consumer.receiveMessage();
	}
	
}
