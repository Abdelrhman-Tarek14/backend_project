import axios from 'axios';
import {
    SALESFORCE_URL,
    REPORT_ID,
    ALLOWED_CASE_TYPES
} from '../config/env.js';
import { credentialsManager } from '../config/salesforce-credentials.js';
import { formatToTalabatEmail } from '../utils/formatters.js';
import { Logger } from '../core/logger.js';

interface SalesforceCase {
    caseNumber: string;
    caseOwner: string | null;
    caseStartTime: string;
    caseAccountName: string;
    caseCountry: string;
    caseType: string;
}

class SalesforceClient {
    private messageTemplate: any;
    private logger = new Logger('SalesforceClient');

    constructor() {
        this.messageTemplate = {
            actions: [
                {
                    id: "17404;a",
                    descriptor: "serviceComponent://ui.analytics.reporting.runpage.ReportPageController/ACTION$runReport",
                    callingDescriptor: "UNKNOWN",
                    params: {
                        reportId: REPORT_ID,
                        reportMetadata: JSON.stringify({
                            reportMetadata: {
                                aggregates: ["RowCount"],
                                chart: {},
                                crossFilters: [],
                                currency: "EGP",
                                dashboardSetting: null,
                                description: null,
                                detailColumns: ["CASE_NUMBER", "OWNER", "LAST_UPDATE", "ACCOUNT.NAME", "Case.Country__c"],
                                developerName: "NAT_Open_Cases",
                                division: null,
                                folderId: "00lw00000029XvJAAU",
                                groupingsAcross: [],
                                groupingsDown: [{ dateGranularity: "None", name: "STATUS", sortAggregate: null, sortOrder: "Asc" }],
                                hasDetailRows: true,
                                hasRecordCount: true,
                                historicalSnapshotDates: [],
                                id: REPORT_ID,
                                name: "NAT Open Cases",
                                presentationOptions: { hasStackedSummaries: true },
                                reportBooleanFilter: null,
                                reportFilters: [
                                    { column: "STATUS", filterType: "fieldValue", isRunPageEditable: true, operator: "equals", value: ALLOWED_CASE_TYPES },
                                    { column: "SUBJECT", filterType: "fieldValue", isRunPageEditable: true, operator: "equals", value: "Menu Processing" },
                                    { column: "Case.Country__c", filterType: "fieldValue", isRunPageEditable: true, operator: "notEqual", value: "Iraq" },
                                    { column: "ACCOUNT.NAME", filterType: "fieldValue", isRunPageEditable: true, operator: "notEqual", value: "TEST LEAD,Production Test Restaurants - Test,test" },
                                    { column: "OWNER", filterType: "fieldValue", isRunPageEditable: true, operator: "notEqual", value: "Talabat Menu Typing SSU GCC Food Queue,Khaled Ahmed Elsayed,Noha Abozeid,Youssef Duwaida,Ahmed AbdElAtie,Nahin Ahmed Jisun,Mohamed M Niazy" }
                                ],
                                reportFormat: "SUMMARY",
                                reportType: { label: "Cases", type: "CaseList" },
                                scope: "organization",
                                showGrandTotal: true,
                                showSubtotals: true,
                                sortBy: [{ sortColumn: "LAST_UPDATE", sortOrder: "Asc" }],
                                standardDateFilter: { column: "CREATED_DATEONLY", durationValue: "CUSTOM", endDate: null, startDate: null },
                                standardFilters: [{ name: "units", value: "h" }],
                                supportsRoleHierarchy: false,
                                userOrHierarchyFilterId: null,
                                customSummaryFormula: {},
                                customDetailFormula: {},
                                buckets: [],
                                userOrHierarchyFilterName: null,
                                dataCategoryFilters: [],
                                aggregateFilters: []
                            }
                        }),
                        isPreview: false,
                        createReportInstance: false,
                        fastCsv: false,
                        requestOrigin: "rpgd",
                        includeChartData: false,
                        skipReportResult: false,
                        skipRocs: false
                    },
                    storable: true
                }
            ]
        };
    }

    public async fetchOpenCasesReport(retries: number = 3): Promise<SalesforceCase[]> {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                if (attempt > 1) {
                    this.logger.warn(`Retrying report fetch (Attempt ${attempt}/${retries})...`);
                    await new Promise(resolve => setTimeout(resolve, 3000 * attempt));
                }

                const creds = credentialsManager.getCredentials();
                const messageObj = JSON.parse(JSON.stringify(this.messageTemplate));
                messageObj.actions[0].id = Date.now() + ";a";
                const finalMessage = JSON.stringify(messageObj);

                const body =
                    `message=${encodeURIComponent(finalMessage)}` +
                    `&aura.context=${encodeURIComponent(creds.auraContext || '')}` +
                    `&aura.token=${encodeURIComponent(creds.auraToken || '')}`;

                const response = await axios.post(SALESFORCE_URL || '', body, {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "Cookie": creds.cookie || '',
                        "X-Requested-With": "XMLHttpRequest",
                        "X-SFDC-Page-Scope-Id": creds.sfdcPageScopeId || ''
                    },
                    timeout: 15000 // 15s timeout for large reports
                });

                let responseData: any = response.data;
                if (typeof responseData === 'string' && responseData.startsWith('/*')) {
                    responseData = JSON.parse(responseData.replace(/^\/\*O\*\//, ''));
                }

                if (!responseData?.actions?.[0]?.returnValue) {
                    // This is the classic SF session expiration indicator
                    this.logger.warn('⚠️ Salesforce session might be expired (no returnValue). Triggering lazy refresh...');
                    await credentialsManager.refresh();
                    
                    // After refresh, if this was the first attempt, retry immediately once without counting as a full retry
                    if (attempt === 1) {
                        this.logger.info('Retrying immediately with new credentials...');
                        return this.fetchOpenCasesReport(retries - 1); // Recursive call with one less retry
                    }
                    throw new Error("Invalid response format. Maybe session expired?");
                }

                return this.parseReportData(responseData.actions[0].returnValue);
            } catch (err: any) {
                const status = err.response?.status;
                
                // Handle HTTP 401 Unauthorized specifically
                if (status === 401) {
                    this.logger.warn('⚠️ Received HTTP 401 from Salesforce. Triggering lazy refresh...');
                    await credentialsManager.refresh();
                    if (attempt === 1) {
                        return this.fetchOpenCasesReport(retries - 1);
                    }
                }

                this.logger.error(`❌ Attempt ${attempt} failed: ${status || err.message}`);

                if (attempt === retries) {
                    throw err; // Re-throw on last attempt
                }
            }
        }
        return [];
    }

    private parseReportData(data: any): SalesforceCase[] {
        const result: SalesforceCase[] = [];
        const factMap = data.factMap || {};
        const groupings = data.groupingsDown?.groupings || [];

        Object.keys(factMap).forEach((key) => {
            if (!key.includes('!T')) return;

            const groupIndex = parseInt(key.split('!')[0]);
            const group = groupings[groupIndex];
            const status = group?.label;

            const rows = factMap[key].rows || [];

            rows.forEach((row: any) => {
                const cells = row.dataCells;
                const rawOwnerName = cells[1]?.label;

                result.push({
                    caseNumber: cells[0]?.label,
                    caseOwner: formatToTalabatEmail(rawOwnerName),
                    caseStartTime: cells[2]?.value,
                    caseAccountName: cells[3]?.label,
                    caseCountry: cells[4]?.label,
                    caseType: status
                });
            });
        });

        return result;
    }
}

export default new SalesforceClient();
