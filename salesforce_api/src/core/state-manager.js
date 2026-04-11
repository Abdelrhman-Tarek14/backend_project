const fs = require('fs');
const path = require('path');
const { STATE_FILE } = require('../config/env');

class StateManager {
    constructor() {
        this.cache = {
            cases: {},
            lastSync: null
        };
        this.ensureDir();
        this.load();
    }

    ensureDir() {
        const dir = path.dirname(STATE_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    load() {
        try {
            if (fs.existsSync(STATE_FILE)) {
                const data = fs.readFileSync(STATE_FILE, 'utf8');
                const parsed = JSON.parse(data);
                this.cache = {
                    cases: parsed.cases || {},
                    lastSync: parsed.lastSync || null
                };
                console.log(`[StateManager] Loaded ${Object.keys(this.cache.cases).length} cases from state.`);
            }
        } catch (err) {
            console.error('[StateManager] Failed to load state:', err.message);
        }
    }

    save() {
        try {
            const data = JSON.stringify(this.cache, null, 2);
            fs.writeFileSync(STATE_FILE, data);
        } catch (err) {
            console.error('[StateManager] Failed to save state:', err.message);
        }
    }

    getCases() {
        return this.cache.cases;
    }

    setCases(casesArray) {
        // Convert array to map for faster lookup
        const casesMap = {};
        casesArray.forEach(c => {
            casesMap[c.caseNumber] = c;
        });
        
        const previousCases = this.cache.cases;
        this.cache.cases = casesMap;
        this.cache.lastSync = new Date().toISOString();
        this.save();
        
        return previousCases;
    }

    updateCase(caseNumber, caseData) {
        this.cache.cases[caseNumber] = caseData;
        this.save();
    }

    removeCase(caseNumber) {
        delete this.cache.cases[caseNumber];
        this.save();
    }

    updateLastSync() {
        this.cache.lastSync = new Date().toISOString();
        this.save();
    }
}

module.exports = new StateManager();
