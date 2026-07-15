#!/usr/bin/env node
/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const fs = require('fs');
const { JSDOM } = require('jsdom');

/**
 * Install a minimal DOM so mermaid.parse can sanitise text under Node.
 */
function installDom() {
    const { window } = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    global.window = window;
    global.document = window.document;
    global.DOMParser = window.DOMParser;
    global.HTMLElement = window.HTMLElement;
    global.SVGElement = window.SVGElement;
    global.Element = window.Element;
    global.Node = window.Node;
    global.DocumentFragment = window.DocumentFragment;
    global.XMLSerializer = window.XMLSerializer;
    global.getComputedStyle = window.getComputedStyle.bind(window);
}

/**
 * Parse a Mermaid diagram definition; throws on invalid syntax.
 * @param {string} text Mermaid source
 * @returns {Promise<object>} parse result from mermaid.parse
 */
async function parseMermaid(text) {
    if (!global.window) {
        installDom();
    }
    const mermaid = (await import('mermaid')).default;
    return mermaid.parse(text);
}

/**
 * Read and parse a .mmd file path (CLI entry).
 * @param {string} filePath path to a .mmd file
 */
async function main(filePath) {
    if (!filePath) {
        throw new Error('usage: validate.js <file.mmd>');
    }
    await parseMermaid(fs.readFileSync(filePath, 'utf8'));
}

module.exports = { parseMermaid, installDom };

if (require.main === module) {
    main(process.argv[2]).catch((err) => {
        // eslint-disable-next-line no-console
        console.error(err.message || err);
        process.exit(1);
    });
}
