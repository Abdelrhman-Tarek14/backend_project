import * as fs from 'fs';
import * as path from 'path';
import { STATE_FILE } from '../config/env.js';

interface CaseData {
    caseNumber: string;
    caseOwner: string | null;
    caseStartTime: string;
    caseAccountName: string;
    caseCountry: string;
    caseType: string;
}

interface StateCache {
    cases: Record<string, CaseData>;
    lastSync: string | null;
}

class StateManager {
    private cache: StateCache;

    constructor() {
        this.cache = {
            cases: {},
            lastSync: null
        };
        this.ensureDir();
        this.load();
    }

    private ensureDir(): void {
        if (!STATE_FILE) {
            throw new Error('[StateManager] CRITICAL: STATE_FILE environment variable is not defined. Check your .env configuration.');
        }
        const dir = path.dirname(STATE_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    private load(): void {
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
        } catch (err: any) {
            console.error('[StateManager] Failed to load state:', err.message);
        }
    }

    private save(): void {
        try {
            const data = JSON.stringify(this.cache, null, 2);
            fs.writeFileSync(STATE_FILE, data);
        } catch (err: any) {
            console.error('[StateManager] Failed to save state:', err.message);
        }
    }

    public getCases(): Record<string, CaseData> {
        return this.cache.cases;
    }

    public setCases(casesArray: CaseData[]): Record<string, CaseData> {
        // Convert array to map for faster lookup
        const casesMap: Record<string, CaseData> = {};
        casesArray.forEach(c => {
            casesMap[c.caseNumber] = c;
        });
        
        const previousCases = this.cache.cases;
        this.cache.cases = casesMap;
        this.cache.lastSync = new Date().toISOString();
        this.save();
        
        return previousCases;
    }

    public updateCase(caseNumber: string, caseData: CaseData): void {
        this.cache.cases[caseNumber] = caseData;
        this.save();
    }

    public removeCase(caseNumber: string): void {
        delete this.cache.cases[caseNumber];
        this.save();
    }

    public updateLastSync(): void {
        this.cache.lastSync = new Date().toISOString();
        this.save();
    }
}

export default new StateManager();
