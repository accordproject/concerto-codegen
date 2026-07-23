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

const { VocabularyManager } = require('@accordproject/concerto-vocabulary');

/**
 * Parse and structurally validate Vocabulary YAML; throws on invalid content.
 * @param {string} contents Vocabulary YAML source
 * @returns {object} the parsed Vocabulary
 */
function validateVocabulary(contents) {
    const vocabularyManager = new VocabularyManager();
    return vocabularyManager.addVocabulary(contents);
}

/**
 * Read and validate a .voc file path (CLI entry).
 * @param {string} filePath path to a .voc file
 */
function main(filePath) {
    if (!filePath) {
        throw new Error('usage: validate.js <file.voc>');
    }
    const fs = require('fs');
    validateVocabulary(fs.readFileSync(filePath, 'utf8'));
}

module.exports = { validateVocabulary };

if (require.main === module) {
    try {
        main(process.argv[2]);
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err.message || err);
        process.exit(1);
    }
}
