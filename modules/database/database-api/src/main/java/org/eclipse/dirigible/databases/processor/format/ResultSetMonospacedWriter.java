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
package org.eclipse.dirigible.databases.processor.format;

import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

/**
 * The ResultSet Monospaced Writer.
 */
public class ResultSetMonospacedWriter implements ResultSetWriter<String> {

	private static final int LIMIT = 100;

	private static final String EMPTY_RESULT_SET = "Empty result set";

	public static final String DELIMITER = "|"; //$NON-NLS-1$

	public static final String NEWLINE_CHARACTER = System.getProperty("line.separator"); //$NON-NLS-1$

	private HeaderFormatter<?> headerFormat = new StringHeaderFormatter();

	private RowFormatter<?> rowFormat = new StringRowFormatter();

	private boolean limited = true;

	/**
	 * Checks if is limited.
	 *
	 * @return true, if is limited
	 */
	public boolean isLimited() {
		return limited;
	}

	/**
	 * Sets the limited.
	 *
	 * @param limited
	 *            the new limited
	 */
	public void setLimited(boolean limited) {
		this.limited = limited;
	}

	/*
	 * (non-Javadoc)
	 * @see org.eclipse.dirigible.databases.processor.format.ResultSetWriter#write(java.sql.ResultSet)
	 */
	@Override
	public String write(ResultSet resultSet) throws SQLException {

		StringBuilder buffer = new StringBuilder();

		List<ColumnDescriptor> columnHeaderDescriptors = new ArrayList<ColumnDescriptor>();
		ResultSetMetaData resultSetMetaData = resultSet.getMetaData();

		int count = 0;
		while (resultSet.next()) {

			resultSetMetaData = resultSet.getMetaData();// needs an update on each iteration for nosql dbs as it can
														// change with each document

			List<String> headersForRow = this.getHeader(resultSetMetaData);

			for (String headerForRow : headersForRow) {

				ColumnDescriptor columnDescriptor = new ColumnDescriptor();

				columnDescriptor.setName(headerForRow);

				int columnIndex = this.getColumnIndexByName(columnDescriptor.getName(), resultSetMetaData);

				columnDescriptor.setLabel(resultSetMetaData.getColumnLabel(columnIndex));
				if (columnDescriptor.getLabel() == null) {
					columnDescriptor.setLabel(columnDescriptor.getName());
				}

				columnDescriptor.setSqlType(resultSetMetaData.getColumnType(columnIndex));

				int displaySize = resultSetMetaData.getColumnDisplaySize(columnIndex);
				if (displaySize > 256) {
					displaySize = 256;
				}
				columnDescriptor.setDisplaySize(displaySize);
				if (columnDescriptor.getDisplaySize() < columnDescriptor.getName().length()) {
					columnDescriptor.setDisplaySize(columnDescriptor.getName().length());// make sure headers never get
																							// truncated
				}

				if (!columnHeaderDescriptors.contains(columnDescriptor)) {
					columnHeaderDescriptors.add(columnDescriptor);
				}
			}

			buffer.append(this.rowFormat.write(columnHeaderDescriptors, resultSetMetaData, resultSet));

			if (this.isLimited() && (++count > LIMIT)) {
				buffer.append("..."); //$NON-NLS-1$
				break;
			}
		}

		if (columnHeaderDescriptors.size() > 0) {
			String headers = (String) this.headerFormat.write(columnHeaderDescriptors);
			buffer.insert(0, headers);
		} else {
			buffer.append(EMPTY_RESULT_SET);
		}

		return buffer.toString();
	}

	/**
	 * Gets the colum index by name.
	 *
	 * @param columnName
	 *            the column name
	 * @param metadata
	 *            the metadata
	 * @return the column index by name
	 * @throws SQLException
	 *             the SQL exception
	 */
	int getColumnIndexByName(String columnName, ResultSetMetaData metadata) throws SQLException {
		for (int i = 1; i < (metadata.getColumnCount() + 1); i++) {
			if (columnName.equals(metadata.getColumnName(i))) {
				return i;
			}
		}
		return Integer.MIN_VALUE;
	}

	/**
	 * Gets the header.
	 *
	 * @param resultSetMetaData
	 *            the result set meta data
	 * @return the header
	 * @throws SQLException
	 *             the SQL exception
	 */
	List<String> getHeader(ResultSetMetaData resultSetMetaData) throws SQLException {

		List<String> columnHeaderLabels = new ArrayList<String>();

		for (int i = 1; i <= resultSetMetaData.getColumnCount(); i++) {

			String columnHeaderLabel = resultSetMetaData.getColumnLabel(i);
			columnHeaderLabels.add(columnHeaderLabel);
		}

		return columnHeaderLabels;
	}

	/**
	 * Gets the header format.
	 *
	 * @return the header format
	 */
	public HeaderFormatter<?> getHeaderFormat() {
		return headerFormat;
	}

	/**
	 * Sets the header format.
	 *
	 * @param headerFormat
	 *            the new header format
	 */
	public void setHeaderFormat(HeaderFormatter<?> headerFormat) {
		this.headerFormat = headerFormat;
	}

	/**
	 * Gets the row format.
	 *
	 * @return the row format
	 */
	public RowFormatter<?> getRowFormat() {
		return rowFormat;
	}

	/**
	 * Sets the row format.
	 *
	 * @param rowFormat
	 *            the new row format
	 */
	public void setRowFormat(RowFormatter<?> rowFormat) {
		this.rowFormat = rowFormat;
	}

}
