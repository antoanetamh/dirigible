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

package org.eclipse.dirigible.database.sql.builders.table;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.eclipse.dirigible.database.sql.ISqlDialect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * The Create Table Builder.
 */
public class AlterTableBuilder extends AbstractTableBuilder<AlterTableBuilder> {

    private static final Logger logger = LoggerFactory.getLogger(AlterTableBuilder.class);

    private String action = null;

    private List<CreateTableForeignKeyBuilder> foreignKeys = new ArrayList<CreateTableForeignKeyBuilder>();

    private List<CreateTableUniqueIndexBuilder> uniqueIndices = new ArrayList<CreateTableUniqueIndexBuilder>();

    /**
     * Instantiates a new creates the table builder.
     *
     * @param dialect the dialect
     * @param table   the table
     */
    public AlterTableBuilder(ISqlDialect dialect, String table) {
        super(dialect, table);
    }

    public AlterTableBuilder add() {
        this.action = KEYWORD_ADD;
        return this;
    }


    public AlterTableBuilder alter() {
        this.action = KEYWORD_ALTER;
        return this;
    }

    public AlterTableBuilder drop() {
        this.action = KEYWORD_DROP;
        return this;
    }

    /**
     * Gets the action.
     *
     * @return the action
     */
    protected String getAction() {
        return action;
    }

    /**
     * Gets the foreignKeys list
     *
     * @return the foreignKeys
     */
    public List<CreateTableForeignKeyBuilder> getForeignKeys() {
        return foreignKeys;
    }

    public List<CreateTableUniqueIndexBuilder> getUniqueIndices() {
        return uniqueIndices;
    }

    /**
     * Foreign Key
     *
     * @param name              the name of the foreign key
     * @param columns           the local columns
     * @param referencedTable   the reference table
     * @param referencedColumns the referenced columns
     * @return the AlterTableBuilder object
     */
    public AlterTableBuilder foreignKey(String name, String[] columns, String referencedTable, String[] referencedColumns) {
        logger.trace("foreignKey: " + name + ", columns" + Arrays.toString(columns) + ", referencedTable: " + referencedTable
                + ", referencedColumns: " + Arrays.toString(referencedColumns));
        CreateTableForeignKeyBuilder foreignKey = new CreateTableForeignKeyBuilder(this.getDialect(), name);
        for (String column : columns) {
            foreignKey.column(column);
        }
        foreignKey.referencedTable(referencedTable);
        for (String column : referencedColumns) {
            foreignKey.referencedColumn(column);
        }
        this.foreignKeys.add(foreignKey);
        return this;
    }

    @Override
    public AlterTableBuilder unique(String name, String[] columns) {
        logger.trace("unique: " + name + ", columns" + Arrays.toString(columns));
        CreateTableUniqueIndexBuilder uniqueIndex = new CreateTableUniqueIndexBuilder(this.getDialect(), name);
        for (String column : columns) {
            uniqueIndex.column(column);
        }
        this.uniqueIndices.add(uniqueIndex);
        return this;
    }

    /*
     * (non-Javadoc)
     * @see org.eclipse.dirigible.database.sql.ISqlBuilder#generate()
     */
    @Override
    public String generate() {

        StringBuilder sql = new StringBuilder();

        // ALTER
        generateAlter(sql);

        // TABLE
        generateTable(sql);

        sql.append(SPACE);

        if (KEYWORD_ADD.equals(this.action)) {
            sql.append(KEYWORD_ADD);
            if (!getColumns().isEmpty()) {
                // COLUMNS
                generateColumns(sql);
            }
        } else if (KEYWORD_DROP.equals(this.action)) {
            if (!getColumns().isEmpty()) {
                // COLUMNS
                generateColumnNamesForDrop(sql);
            }
        } else {
            if (!getColumns().isEmpty()) {
                // COLUMNS
                sql.append(KEYWORD_ALTER);
                generateColumnsForAlter(sql);
            }
        }

        if (!getForeignKeys().isEmpty()) {
            // FOREIGN KEYS
            generateForeignKeyNames(sql);
        }
        if (!getUniqueIndices().isEmpty()) {
            generateUniqueIndices(sql);
        }
        String generated = sql.append(SEMICOLON).toString().trim();

        logger.trace("generated: " + generated);

        return generated;
    }


    protected void generateForeignKeyNames(StringBuilder sql) {
        StringBuilder snippet = new StringBuilder();
        for (CreateTableForeignKeyBuilder foreignKey : this.getForeignKeys()) {
            snippet.append(SPACE)
                    .append(KEYWORD_CONSTRAINT)
                    .append(SPACE)
                    .append(foreignKey.getName())
                    .append(SPACE)
                    .append(SPACE)
                    .append(KEYWORD_FOREIGN)
                    .append(SPACE)
                    .append(KEYWORD_KEY)
                    .append(SPACE)
                    .append(OPEN)
                    .append(traverseNames(foreignKey.getColumns())).append(CLOSE)
                    .append(SPACE)
                    .append(KEYWORD_REFERENCES)
                    .append(SPACE)
                    .append(foreignKey.getReferencedTable())
                    .append(SPACE)
                    .append(OPEN)
                    .append(traverseNames(foreignKey.getReferencedColumns())).append(CLOSE)
                    .append(COMMA).append(SPACE);
        }
        sql.append(snippet.substring(0, snippet.length() - 2));
    }

    /**
     * Generate unique indices.
     *
     * @param sql the sql
     */
    protected void generateUniqueIndices(StringBuilder sql) {
        for (CreateTableUniqueIndexBuilder uniqueIndex : this.uniqueIndices) {
            generateUniqueIndex(sql, uniqueIndex);
            sql.append(COMMA);
        }
    }

    /**
     * Generate unique index.
     *
     * @param sql         the sql
     * @param uniqueIndex the unique index
     */
    protected void generateUniqueIndex(StringBuilder sql, CreateTableUniqueIndexBuilder uniqueIndex) {
        if (uniqueIndex != null) {
            if (uniqueIndex.getName() != null) {
                String uniqueIndexName = (isCaseSensitive()) ? encapsulate(uniqueIndex.getName()) : uniqueIndex.getName();
                sql.append(KEYWORD_CONSTRAINT).append(SPACE).append(uniqueIndexName).append(SPACE);
            }
            sql.append(KEYWORD_UNIQUE).append(SPACE).append(OPEN).append(traverseNames(uniqueIndex.getColumns())).append(CLOSE);
        }
    }


}
