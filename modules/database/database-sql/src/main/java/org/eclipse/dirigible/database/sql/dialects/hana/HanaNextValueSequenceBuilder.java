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
package org.eclipse.dirigible.database.sql.dialects.hana;

import static java.text.MessageFormat.format;

import org.eclipse.dirigible.database.sql.ISqlDialect;
import org.eclipse.dirigible.database.sql.builders.sequence.NextValueSequenceBuilder;

/**
 * The HANA Next Value Sequence Builder.
 */
public class HanaNextValueSequenceBuilder extends NextValueSequenceBuilder {

	private static final String PATTERN_SELECT_NEXT_VAL_SEQUENCE = "SELECT {0}.NEXTVAL FROM DUMMY";

	/**
	 * Instantiates a new hana next value sequence builder.
	 *
	 * @param dialect
	 *            the dialect
	 * @param sequence
	 *            the sequence
	 */
	public HanaNextValueSequenceBuilder(ISqlDialect dialect, String sequence) {
		super(dialect, sequence);
	}

	/*
	 * (non-Javadoc)
	 * @see org.eclipse.dirigible.database.sql.builders.sequence.NextValueSequenceBuilder#generate()
	 */
	@Override
	public String generate() {
		String sequenceName = (isCaseSensitive()) ? encapsulate(this.getSequence()) : this.getSequence();
		String sql = format(PATTERN_SELECT_NEXT_VAL_SEQUENCE, sequenceName);
		return sql;
	}
}
