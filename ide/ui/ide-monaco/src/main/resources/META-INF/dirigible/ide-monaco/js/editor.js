let messageHub = new FramesMessageHub();
let csrfToken;
let dirty = false;

let modulesSuggestions = [];
let codeCompletionSuggestions = {};
let codeCompletionAssignments = {};
let _editor;
let resourceApiUrl;
let editorUrl;

/*eslint-disable no-extend-native */
String.prototype.replaceAll = function (search, replacement) {
    let target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

function FileIO() {

    this.isReadOnly = function () {
        return editorUrl.searchParams.get('readOnly') || false;
    };
    this.resolveFileName = function () {
        let fileName = editorUrl.searchParams.get('file');
        this.readOnly = editorUrl.searchParams.get('readOnly') || false;
        return fileName;
    };
    this.resolveFileType = function (fileName) {
        fileName = fileName || this.resolveFileName();
        let mappings = [{
            extension: ".js",
            type: "javascript"
        }, {
            extension: ".html",
            type: "html"
        }, {
            extension: ".css",
            type: "css"
        }, {
            extension: ".json",
            type: "json"
        }, {
            extension: ".table",
            type: "json"
        }, {
            extension: ".view",
            type: "json"
        }, {
            extension: ".extensionpoint",
            type: "json"
        }, {
            extension: ".extension",
            type: "json"
        }, {
            extension: ".job",
            type: "json"
        }, {
            extension: ".listener",
            type: "json"
        }, {
            extension: ".access",
            type: "json"
        }, {
            extension: ".roles",
            type: "json"
        }, {
            extension: ".command",
            type: "json"
        }, {
            extension: ".xml",
            type: "xml"
        }, {
            extension: ".bpmn",
            type: "xml"
        }, {
            extension: ".model",
            type: "json"
        }, {
            extension: ".edm",
            type: "xml"
        }, {
            extension: ".schema",
            type: "json"
        }, {
            extension: ".odata",
            type: "json"
        }, {
            extension: ".sql",
            type: "sql"
        }, {
            extension: ".md",
            type: "markdown"
        }, {
            extension: ".xsjs",
            type: "javascript"
        }, {
            extension: ".xsjslib",
            type: "javascript"
        }, {
            extension: ".hdbsynonym",
            type: "json"
        }, {
            extension: ".hdi",
            type: "json"
        }, {
            extension: ".hdiconfig",
            type: "json"
        }, {
            extension: ".hdbcalculationview",
            type: "xml"
        }, {
            extension: ".hdbtable",
            type: "sql"
        }, {
            extension: ".hdbview",
            type: "sql"
        }, {
            extension: ".hdbprocedure",
            type: "sql"
        }, {
            extension: ".hdbtablefunction",
            type: "sql"
        }, {
            extension: ".hdbschema",
            type: "sql"
        }, {
            extension: ".hdbdd",
            type: "sql"
        }, {
            extension: ".xsodata",
            type: "sql"
        }, {
            extension: ".xsaccess",
            type: "json"
        }, {
            extension: ".xsprivileges",
            type: "json"
        }, {
            extension: ".csvim",
            type: "json"
        }];

        for (let i = 0; i < mappings.length; i++) {
            if (fileName.endsWith(mappings[i].extension)) {
                return mappings[i].type;
            }
        }

        return 'text';
    };
    this.loadText = function (fileName) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            fileName = fileName || this.resolveFileName();
            xhr.open('GET', resourceApiUrl + fileName);
            xhr.setRequestHeader('X-CSRF-Token', 'Fetch');
            xhr.setRequestHeader('Dirigible-Editor', 'Monaco');
            xhr.onload = () => {
                if (xhr.status === 200) {
                    resolve(xhr.responseText);
                } else {
                    reject(xhr.status, xhr.statusText)
                }
                csrfToken = xhr.getResponseHeader("x-csrf-token");
            };
            xhr.onerror = () => reject(xhr.status, xhr.statusText);
            xhr.send();
        });
    };
    this.saveText = function (text, fileName) {
        return new Promise((resolve, reject) => {
            fileName = fileName || this.resolveFileName();
            if (fileName) {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', resourceApiUrl + fileName);
                xhr.setRequestHeader('X-Requested-With', 'Fetch');
                xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                xhr.setRequestHeader('Dirigible-Editor', 'Monaco');
                xhr.onload = () => resolve(fileName);
                xhr.onerror = () => reject(xhr.statusText);
                xhr.send(text);
                messageHub.post({ data: fileName }, 'editor.file.saved');
                messageHub.post({
                    data: {
                        path: fileName
                    }
                }, 'workspace.file.selected');
                messageHub.post({ data: 'File [' + fileName + '] saved.' }, 'status.message');
                dirty = false;
            } else {
                reject('file query parameter is not present in the URL');
            }
        });
    };
};

function setResourceApiUrl() {
    editorUrl = new URL(window.location.href);
    let rtype = editorUrl.searchParams.get('rtype');
    if (rtype === "workspace") resourceApiUrl = "/services/v4/ide/workspaces";
    else if (rtype === "repository") resourceApiUrl = "/services/v4/core/repository";
    else if (rtype === "registry") resourceApiUrl = "/services/v4/core/registry";
    else resourceApiUrl = "/services/v4/ide/workspaces";
}

function createEditorInstance(readOnly = false) {
    return new Promise((resolve, reject) => {
        setTimeout(function () {
            try {
                let containerEl = document.getElementById('embeddedEditor');
                if (containerEl.childElementCount > 0) {
                    for (let i = 0; i < containerEl.childElementCount; i++)
                        containerEl.removeChild(containerEl.children.item(i));
                }
                let editor = monaco.editor.create(containerEl, {
                    value: "var x = 0;",
                    automaticLayout: true,
                    readOnly: readOnly
                });
                resolve(editor);
                window.onresize = function () {
                    editor.layout();
                };
            } catch (err) {
                reject(err);
            }
        });
    });
};

function createSaveAction() {
    let fileIO = new FileIO();
    return {
        // An unique identifier of the contributed action.
        id: 'dirigible-files-save',

        // A label of the action that will be presented to the user.
        label: 'Save',

        // An optional array of keybindings for the action.
        keybindings: [
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S
        ],

        // A precondition for this action.
        precondition: null,

        // A rule to evaluate on top of the precondition in order to dispatch the keybindings.
        keybindingContext: null,

        contextMenuGroupId: 'fileIO',

        contextMenuOrder: 1.5,

        // Method that will be executed when the action is triggered.
        // @param editor The editor instance is passed in as a convinience
        run: function (editor) {
            fileIO.saveText(editor.getModel().getValue());
            return null;
        }
    };
};

function createSearchAction() {
    return {
        // An unique identifier of the contributed action.
        id: 'dirigible-search',

        // A label of the action that will be presented to the user.
        label: 'Search',

        // An optional array of keybindings for the action.
        keybindings: [
            monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KEY_F
        ],

        // A precondition for this action.
        precondition: null,

        // A rule to evaluate on top of the precondition in order to dispatch the keybindings.
        keybindingContext: null,

        contextMenuGroupId: 'fileIO',

        contextMenuOrder: 1.5,

        // Method that will be executed when the action is triggered.
        // @param editor The editor instance is passed in as a convinience
        run: function (editor) {
            messageHub.post({
                viewId: "search"
            }, 'ide-core.openView');
        }
    };
};

function createCloseAction() {
    return {
        // An unique identifier of the contributed action.
        id: 'dirigible-close',

        // A label of the action that will be presented to the user.
        label: 'Close',

        // An optional array of keybindings for the action.
        keybindings: [
            monaco.KeyMod.Alt | monaco.KeyCode.KEY_W
        ],

        // A precondition for this action.
        precondition: null,

        // A rule to evaluate on top of the precondition in order to dispatch the keybindings.
        keybindingContext: null,

        contextMenuGroupId: 'fileIO',

        contextMenuOrder: 1.5,

        // Method that will be executed when the action is triggered.
        // @param editor The editor instance is passed in as a convinience
        run: function (editor) {
            let fileIO = new FileIO();
            let fileName = fileIO.resolveFileName();
            messageHub.post({ fileName: fileName }, 'ide-core.closeEditor');
        }
    };
};

function createCloseOthersAction() {
    return {
        // An unique identifier of the contributed action.
        id: 'dirigible-close-others',

        // A label of the action that will be presented to the user.
        label: 'Close Others',

        // An optional array of keybindings for the action.
        keybindings: [
            monaco.KeyMod.Alt | monaco.KeyMod.WinCtrl | monaco.KeyMod.Shift | monaco.KeyCode.KEY_W
        ],

        // A precondition for this action.
        precondition: null,

        // A rule to evaluate on top of the precondition in order to dispatch the keybindings.
        keybindingContext: null,

        contextMenuGroupId: 'fileIO',

        contextMenuOrder: 1.5,

        // Method that will be executed when the action is triggered.
        // @param editor The editor instance is passed in as a convinience
        run: function (editor) {
            let fileIO = new FileIO();
            let fileName = fileIO.resolveFileName();
            messageHub.post({ fileName: fileName }, 'ide-core.closeOtherEditors');
        }
    };
};

function createCloseAllAction() {
    return {
        // An unique identifier of the contributed action.
        id: 'dirigible-close-all',

        // A label of the action that will be presented to the user.
        label: 'Close All',

        // An optional array of keybindings for the action.
        keybindings: [
            monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KEY_W
        ],

        // A precondition for this action.
        precondition: null,

        // A rule to evaluate on top of the precondition in order to dispatch the keybindings.
        keybindingContext: null,

        contextMenuGroupId: 'fileIO',

        contextMenuOrder: 1.5,

        // Method that will be executed when the action is triggered.
        // @param editor The editor instance is passed in as a convinience
        run: function (editor) {
            messageHub.post('', 'ide-core.closeAllEditors');
        }
    };
};

function loadModuleSuggestions(modulesSuggestions) {
    let xhrModules = new XMLHttpRequest();
    xhrModules.open('GET', '/services/v4/js/ide-monaco-extensions/api/modules.js');
    xhrModules.setRequestHeader('X-CSRF-Token', 'Fetch');
    xhrModules.onload = function (xhrModules) {
        let modules = JSON.parse(xhrModules.target.responseText);
        modules.forEach(e => modulesSuggestions.push(e));
    };
    xhrModules.send();
}

function loadSuggestions(moduleName, suggestions) {
    if (moduleName.split("/").length <= 1) {
        return
    }

    if (suggestions[moduleName]) {
        return;
    }

    let xhr = new XMLHttpRequest();
    xhr.open('GET', '/services/v4/js/ide-monaco-extensions/api/suggestions.js?moduleName=' + moduleName);
    xhr.setRequestHeader('X-CSRF-Token', 'Fetch');
    xhr.onload = function (xhr) {
        if (xhr.target.status === 200) {
            let loadedSuggestions = JSON.parse(xhr.target.responseText);
            suggestions[moduleName] = loadedSuggestions;
        }
    };
    xhr.send();
}

function getModuleImports(text) {
    let moduleImports = text.match(/(var|let)\s[a-zA-Z0-9_-]+\s?=\s?require\(('|")[a-zA-Z0-9_.-//-]+('|")\)/gm);

    if (!moduleImports) {
        moduleImports = [];
    }

    moduleImports = moduleImports.map(function (text) {
        let split = text.split("=");
        let keyWord = split[0].replace("var ", "").replace("let ", "").trim();
        let module = split[1].replace("require(", "").replace(")", "").replaceAll("\"", "").replaceAll("'", "").trim();
        return {
            keyWord: keyWord,
            module: module
        };
    });

    return moduleImports;
}

function traverseAssignment(assignment, assignmentInfo) {
    if (assignment.parentModule) {
        traverseAssignment(assignment.parentModule, assignmentInfo);
    }
    if (assignment.parentModule && !assignment.parentModule.parentModule) {
        assignmentInfo.parentModule = assignment.parentModule
    }
    if (assignment.method) {
        assignmentInfo.methods.push(assignment.method);
    }
}

(function init() {
    setResourceApiUrl();
    require.config({
        paths: {
            'vs': 'monaco-editor/min/vs',
            'parser': 'js/parser'
        }
    });

    loadModuleSuggestions(modulesSuggestions);

    require(['vs/editor/editor.main', 'parser/acorn-loose.min'], function (monaco, acornLoose) {
        let fileIO = new FileIO();
        let fileName = fileIO.resolveFileName();
        let readOnly = fileIO.isReadOnly();

        let _fileText;
        fileIO.loadText(fileName)
            .then((fileText) => {
                _fileText = fileText;
                return createEditorInstance(readOnly);
            })
            .catch((statusCode, statusText) => {
                let fileIO = new FileIO();
                let fileName = fileIO.resolveFileName();
                messageHub.post({ fileName: fileName }, 'ide-core.closeEditor');
            })
            .then((editor) => {
                _editor = editor;
                return _fileText;
            })
            .then((fileText) => {
                let fileType = fileIO.resolveFileType(fileName);

                let moduleImports = getModuleImports(fileText);
                codeCompletionAssignments = parseAssignments(acornLoose, fileText);

                moduleImports.forEach(e => loadSuggestions(e.module, codeCompletionSuggestions));

                messageHub.subscribe(function () {
                    if (dirty) {
                        fileIO.saveText(_editor.getModel().getValue());
                    }
                }, "workbench.editor.save");

                let model = monaco.editor.createModel(fileText, fileType || 'text');
                _editor.setModel(model);
                if (!readOnly) {
                    _editor.addAction(createSaveAction());
                }
                _editor.addAction(createSearchAction());
                _editor.addAction(createCloseAction());
                _editor.addAction(createCloseOthersAction());
                _editor.addAction(createCloseAllAction());
                _editor.onDidChangeCursorPosition(function (e) {
                    let caretInfo = "Line " + e.position.lineNumber + " : Column " + e.position.column;
                    messageHub.post({ data: caretInfo }, 'status.caret');
                });
                _editor.onDidChangeModelContent(function (e) {
                    if (e.changes && e.changes[0].text === ".") {
                        codeCompletionAssignments = parseAssignments(acornLoose, _editor.getValue());
                    }
                    let newModuleImports = getModuleImports(_editor.getValue());
                    if (e && !dirty) {
                        dirty = true;
                        messageHub.post({ data: fileName }, 'editor.file.dirty');
                    }
                    newModuleImports.forEach(function (module) {
                        if (module.module.split("/").length > 0) {
                            let newModule = moduleImports.filter(e => e.keyWord === module.keyWord && e.module === module.module)[0];
                            let moduleChanged = moduleImports.filter(e => e.keyWord === module.keyWord && e.module !== module.module)[0];
                            let keyWordChanged = moduleImports.filter(e => e.keyWord !== module.keyWord && e.module === module.module)[0];
                            if (!newModule) {
                                loadSuggestions(module.module, codeCompletionSuggestions);
                                moduleImports.push(module);
                            } else if (moduleChanged) {
                                moduleChanged.module = module.module;
                                loadSuggestions(module.module, codeCompletionSuggestions);
                            } else if (keyWordChanged) {
                                keyWordChanged.keyWord = module.keyWord;
                            }
                        }
                    });
                });
                monaco.languages.typescript.javascriptDefaults.addExtraLib('/** Loads external module: \n\n> ```\nlet res = require("http/v4/response");\nres.println("Hello World!");``` */ var require = function(moduleName: string) {return new Module();};', 'js:require.js');
                monaco.languages.typescript.javascriptDefaults.addExtraLib('/** $. XSJS API */ var $: any;', 'ts:$.js');
                monaco.languages.registerCompletionItemProvider('javascript', {
                    triggerCharacters: ["\"", "'"],
                    provideCompletionItems: function (model, position) {
                        let token = model.getValueInRange({ startLineNumber: position.lineNumber, startColumn: 1, endLineNumber: position.lineNumber, endColumn: position.column })
                        if (token.indexOf('require("') < 0 && token.indexOf('require(\'') < 0) {
                            return { suggestions: [] };
                        }
                        let wordPosition = model.getWordUntilPosition(position);
                        let word = wordPosition.word;
                        let range = {
                            startLineNumber: position.lineNumber,
                            endLineNumber: position.lineNumber,
                            startColumn: wordPosition.startColumn,
                            endColumn: wordPosition.endColumn
                        };
                        return {
                            suggestions: modulesSuggestions
                                .filter(function (e) {
                                    if (word.length > 0) {
                                        return e.name.toLowerCase().indexOf(word.toLowerCase()) >= 0;
                                    }
                                    return true;
                                }).map(function (e) {
                                    return {
                                        label: e.name,
                                        kind: monaco.languages.CompletionItemKind.Module,
                                        documentation: e.documentation,
                                        detail: e.description,
                                        insertText: e.name,
                                        range: range
                                    }
                                })
                        };
                    }
                });
                monaco.languages.registerCompletionItemProvider('javascript', {
                    triggerCharacters: ["."],
                    provideCompletionItems: function (model, position) {
                        let token = model.getValueInRange({ startLineNumber: position.lineNumber, startColumn: 1, endLineNumber: position.lineNumber, endColumn: position.column })

                        let moduleImport = moduleImports.filter(e => token.match(new RegExp(e.keyWord + "\." + "([a-zA-Z0-9]+)?", "g")))[0];
                        let afterDotToken = token.substring(token.indexOf(".") + 1);
                        let tokenParts = token.split(".");
                        let moduleName = moduleImport ? moduleImport.module : null;
                        if (tokenParts != null && tokenParts.length > 2) {
                            moduleName = null;
                        }
                        let nestedObjectKeyword = null;
                        if (!moduleName) {
                            let nestedKeyword = token.split(" ").filter(e => e.indexOf(".") > 0)[0]
                            if (nestedKeyword) {
                                nestedObjectKeyword = nestedKeyword.split(".")[0];
                            }
                        }
                        if (!moduleName && !nestedObjectKeyword) {
                            return { suggestions: [] };
                        }
                        let wordPosition = model.getWordUntilPosition(position);
                        let word = wordPosition.word;
                        let range = {
                            startLineNumber: position.lineNumber,
                            endLineNumber: position.lineNumber,
                            startColumn: wordPosition.startColumn,
                            endColumn: wordPosition.endColumn
                        };
                        let suggestions = [];
                        let moduleSuggestions = codeCompletionSuggestions[moduleName];
                        if (moduleSuggestions) {
                            Object.keys(moduleSuggestions["exports"]).forEach(suggestionName => {
                                let suggestion = moduleSuggestions["exports"][suggestionName];
                                suggestion.name = suggestion.definition;
                                suggestions.push(suggestion);
                            });
                        } else if (nestedObjectKeyword) {
                            let assignment = codeCompletionAssignments[nestedObjectKeyword];
                            if (assignment) {
                                let assignmentInfo = {
                                    parentModule: null,
                                    methods: []
                                };
                                traverseAssignment(assignment, assignmentInfo);

                                let parentObject = "exports";
                                for (let i = 0; i < assignmentInfo.methods.length; i++) {
                                    parentObject = codeCompletionSuggestions[assignmentInfo.parentModule][parentObject][assignmentInfo.methods[i]].returnType;
                                }

                                let moduleSuggestions = codeCompletionSuggestions[assignmentInfo.parentModule];
                                Object.keys(moduleSuggestions[parentObject]).forEach(suggestionName => {
                                    let suggestion = moduleSuggestions[parentObject][suggestionName];
                                    suggestion.name = suggestion.definition;
                                    suggestions.push(suggestion);
                                });
                            }
                        }
                        return {
                            suggestions: suggestions
                                .filter(function (e) {
                                    if (word.length > 0) {
                                        return e.name.toLowerCase().startsWith(word.toLowerCase());
                                    }
                                    return true;
                                })
                                .map(function (e) {
                                    return {
                                        label: e.name,
                                        kind: e.isFunction ? monaco.languages.CompletionItemKind.Function : monaco.languages.CompletionItemKind.Field,
                                        documentation: {
                                            value: e.documentation
                                        },
                                        detail: e.isFunction ? "function " + e.name : e.name,
                                        insertText: e.name,
                                        range: range
                                    }
                                })
                        };
                    }
                });
            });
        monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: false,
            noSyntaxValidation: false,
            noSuggestionDiagnostics: false,
            diagnosticCodesToIgnore: [
                2304, // Cannot find name 'exports'.(2304)
                2683, // 'this' implicitly has type 'any' because it does not have a type annotation.(2683)
                7005, // Variable 'ctx' implicitly has an 'any' type.(7005)
                7006, // Parameter 'ctx' implicitly has an 'any' type.(7006),
                7009, // 'new' expression, whose target lacks a construct signature, implicitly has an 'any' type.(7009)
                7034  // Variable 'ctx' implicitly has type 'any' in some locations where its type cannot be determined.(7034)
            ]
        });
        monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ES2020,
            strict: true,
            strictNullChecks: true,
            strictPropertyInitialization: true,
            alwaysStrict: true,
            allowNonTsExtensions: true,
            allowUnreachableCode: false,
            allowUnusedLabels: false,
            noUnusedParameters: true,
            noUnusedLocals: true,
            checkJs: true,
            noFallthroughCasesInSwitch: true
        });
        monaco.editor.setTheme(monacoTheme);
    });
})();