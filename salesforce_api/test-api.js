const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');
const TERMHUB_URL = 'http://localhost:3000/cases/webhook/salesforce';
const WEBHOOK_SECRET = 'unified-super-secure-webhook-secret-key';
const URL = "https://deliveryhero.lightning.force.com/aura";

const AURA_TOKEN = env.AURA_TOKEN;
const AURA_CONTEXT = env.AURA_CONTEXT;
const COOKIE = env.COOKIE;
const X_SFDC_Page_Scope_Id = env.X_SFDC_Page_Scope_Id;

const MESSAGE_OBJ = {
  actions: [
    {
      id: "17404;a",
      descriptor: "serviceComponent://ui.analytics.reporting.runpage.ReportPageController/ACTION$runReport",
      callingDescriptor: "UNKNOWN",
      params: {
        reportId: "00ObO0000040xllUAA",
        reportMetadata: "{\"reportMetadata\":{\"aggregates\":[\"RowCount\"],\"chart\":{},\"crossFilters\":[],\"currency\":\"EGP\",\"dashboardSetting\":null,\"description\":null,\"detailColumns\":[\"CASE_NUMBER\",\"OWNER\",\"LAST_UPDATE\",\"ACCOUNT.NAME\",\"Case.Country__c\"],\"developerName\":\"NAT_Open_Cases\",\"division\":null,\"folderId\":\"00lw00000029XvJAAU\",\"groupingsAcross\":[],\"groupingsDown\":[{\"dateGranularity\":\"None\",\"name\":\"STATUS\",\"sortAggregate\":null,\"sortOrder\":\"Asc\"}],\"hasDetailRows\":true,\"hasRecordCount\":true,\"historicalSnapshotDates\":[],\"id\":\"00ObO0000040xllUAA\",\"name\":\"NAT Open Cases\",\"presentationOptions\":{\"hasStackedSummaries\":true},\"reportBooleanFilter\":null,\"reportFilters\":[{\"column\":\"STATUS\",\"filterType\":\"fieldValue\",\"isRunPageEditable\":true,\"operator\":\"equals\",\"value\":\"Menu Typing,Please Correct Errors,Final Check\"},{\"column\":\"SUBJECT\",\"filterType\":\"fieldValue\",\"isRunPageEditable\":true,\"operator\":\"equals\",\"value\":\"Menu Processing\"},{\"column\":\"Case.Country__c\",\"filterType\":\"fieldValue\",\"isRunPageEditable\":true,\"operator\":\"notEqual\",\"value\":\"Iraq\"},{\"column\":\"ACCOUNT.NAME\",\"filterType\":\"fieldValue\",\"isRunPageEditable\":true,\"operator\":\"notEqual\",\"value\":\"TEST LEAD,Production Test Restaurants - Test\"},{\"column\":\"OWNER\",\"filterType\":\"fieldValue\",\"isRunPageEditable\":true,\"operator\":\"notEqual\",\"value\":\"Talabat Menu Typing SSU GCC Food Queue,Khaled Ahmed Elsayed,Noha Abozeid,Youssef Duwaida,Ahmed AbdElAtie,Nahin Ahmed Jisun,Mohamed M Niazy\"}],\"reportFormat\":\"SUMMARY\",\"reportType\":{\"label\":\"Cases\",\"type\":\"CaseList\"},\"scope\":\"organization\",\"showGrandTotal\":true,\"showSubtotals\":true,\"sortBy\":[{\"sortColumn\":\"LAST_UPDATE\",\"sortOrder\":\"Asc\"}],\"standardDateFilter\":{\"column\":\"CREATED_DATEONLY\",\"durationValue\":\"CUSTOM\",\"endDate\":null,\"startDate\":null},\"standardFilters\":[{\"name\":\"units\",\"value\":\"h\"}],\"supportsRoleHierarchy\":false,\"userOrHierarchyFilterId\":null,\"customSummaryFormula\":{},\"customDetailFormula\":{},\"buckets\":[],\"userOrHierarchyFilterName\":null,\"dataCategoryFilters\":[],\"aggregateFilters\":[]}}",
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

function formatToTalabatEmail(name) {
  if (!name || name === '-') return null;
  
  let email = name.trim().toLowerCase().replace(/\s+/g, '.');
  
  if (!email.includes('_bseg')) {
    email += '_bseg.ext';
  } 
  else if (email.includes('_bseg') && !email.includes('.ext')) {
    email = email.replace('_bseg', '_bseg.ext');
  }

  if (!email.includes('@talabat.com')) {
    email += '@talabat.com';
  }
  
  return email;
}

async function sendToTermHub(payload) {
  const rawBody = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');

  try {
    await axios.post(TERMHUB_URL, rawBody, {
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signature
      }
    });
    console.log(`✅ [TermHub] Successfully synced Case: ${payload.caseNumber} - Assigned to: ${payload.caseOwner}`);
  } catch (err) {
    console.error(`❌ [TermHub] Failed to sync Case ${payload.caseNumber}:`, err.response?.data?.message || err.message);
  }
}

async function fetchData() {
  try {
    const messageObj = JSON.parse(JSON.stringify(MESSAGE_OBJ));
    messageObj.actions[0].id = Date.now() + ";a";
    const finalMessage = JSON.stringify(messageObj);

    const body =
      `message=${encodeURIComponent(finalMessage)}` +
      `&aura.context=${encodeURIComponent(AURA_CONTEXT)}` +
      `&aura.token=${encodeURIComponent(AURA_TOKEN)}`;

    const response = await axios.post(URL, body, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": COOKIE,
        "X-Requested-With": "XMLHttpRequest",
        "X-SFDC-Page-Scope-Id": X_SFDC_Page_Scope_Id
      }
    });

    let responseData = response.data;
    if (typeof responseData === 'string' && responseData.startsWith('/*')) {
      responseData = JSON.parse(responseData.replace(/^\/\*O\*\//, '')); 
    }

    if (!responseData?.actions?.[0]?.returnValue) {
      throw new Error("Invalid response format. Maybe session expired?");
    }

    const result = {
      "Menu Typing": [],
      "Please Correct Errors": [],
      "Final Check": []
    };

    const data = responseData.actions[0].returnValue;
    const factMap = data.factMap || {};
    const groupings = data.groupingsDown?.groupings || [];

    Object.keys(factMap).forEach((key) => {
      if (!key.includes('!T')) return;

      const groupIndex = parseInt(key.split('!')[0]); 
      const group = groupings[groupIndex];
      const status = group?.label;

      if (!result[status]) return;

      const rows = factMap[key].rows || [];

      rows.forEach(row => {
        const cells = row.dataCells;
        const rawOwnerName = cells[1]?.label;

        result[status].push({
          caseNumber: cells[0]?.label,
          caseOwner: formatToTalabatEmail(rawOwnerName),
          caseStartTime: cells[2]?.value,
          caseAccountName: cells[3]?.label,
          caseCountry: cells[4]?.label,
          caseType: status 
        });
      });
    });

    const timestamp = new Date().toLocaleString("en-US", { timeZone: "Africa/Cairo" });

    const outputDir = './output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(`${outputDir}/clean-data.json`, JSON.stringify(result, null, 2));
    
    console.log(`\n###############################################################################`);
    console.log(`=> Success at ${timestamp}`);
    console.log("=> Counts:", {
      "Menu Typing": result["Menu Typing"].length,
      "Please Correct Errors": result["Please Correct Errors"].length,
      "Final Check": result["Final Check"].length
    });
    console.log(`-------------------------------------------------------------------------------`);

    const casesToSend = [...result["Menu Typing"], ...result["Please Correct Errors"]];
    
    if (casesToSend.length > 0) {
      console.log(`🚀 Syncing ${casesToSend.length} cases to TermHub...`);
      for (const caseData of casesToSend) {
        await sendToTermHub(caseData);
      }
    }

  } catch (err) {
    const errorTime = new Date().toLocaleString("en-US", { timeZone: "Africa/Cairo" });
    console.log(`❌ ERROR at ${errorTime}:`, err.response?.status || err.message);
  }
}

setInterval(fetchData, 45000); // every 45 seconds for testing
fetchData();

// async function fetchData() {
//   try {
//     const messageObj = JSON.parse(JSON.stringify(MESSAGE_OBJ));
//     messageObj.actions[0].id = Date.now() + ";a";
//     const finalMessage = JSON.stringify(messageObj);

//     const body =
//       `message=${encodeURIComponent(finalMessage)}` +
//       `&aura.context=${encodeURIComponent(AURA_CONTEXT)}` +
//       `&aura.token=${encodeURIComponent(AURA_TOKEN)}`;

//     const response = await axios.post(URL, body, {
//       headers: {
//         "Content-Type": "application/x-www-form-urlencoded",
//         "Cookie": COOKIE,
//         "X-Requested-With": "XMLHttpRequest",
//         "X-SFDC-Page-Scope-Id": X_SFDC_Page_Scope_Id
//       }
//     });

//     let responseData = response.data;
//     if (typeof responseData === 'string' && responseData.startsWith('/*')) {
//       responseData = JSON.parse(responseData.replace(/^\/\*O\*\//, '')); 
//     }

//     if (!responseData?.actions?.[0]?.returnValue) {
//       throw new Error("Invalid response format. Maybe session expired?");
//     }

//     const result = {
//       "Menu Typing": [],
//       "Please Correct Errors": [],
//       "Final Check": []
//     };

//     const data = responseData.actions[0].returnValue;
//     const factMap = data.factMap || {};
//     const groupings = data.groupingsDown?.groupings || [];

//     Object.keys(factMap).forEach((key) => {
//       if (!key.includes('!T')) return;

//       const groupIndex = parseInt(key.split('!')[0]); 
//       const group = groupings[groupIndex];
//       const status = group?.label;

//       if (!result[status]) return;

//       const rows = factMap[key].rows || [];

//       rows.forEach(row => {
//         const cells = row.dataCells;
//         result[status].push({
//           caseNumber: cells[0]?.label,
//           owner: cells[1]?.label,
//           lastUpdate: cells[2]?.value,
//           account: cells[3]?.label,
//           country: cells[4]?.label
//         });
//       });
//     });

//     const timestamp = new Date().toLocaleString("en-US", {
//       timeZone: "Africa/Cairo",
//       year: "numeric",
//       month: "2-digit",
//       day: "2-digit",
//       hour: "2-digit",
//       minute: "2-digit",
//       second: "2-digit",
//       hour12: true
//     });

//     const outputDir = './output';
//     if (!fs.existsSync(outputDir)) {
//       fs.mkdirSync(outputDir, { recursive: true });
//     }

//     fs.writeFileSync(
//       `${outputDir}/clean-data.json`, 
//       JSON.stringify(result, null, 2)
//     );
//     console.log(`###############################################################################`);
//     console.log(`=> Success at ${timestamp}`);
//     console.log("=> Status:", response.status);
    
//     console.log("=> Counts:", {
//       "Menu Typing": result["Menu Typing"].length,
//       "Please Correct Errors": result["Please Correct Errors"].length,
//       "Final Check": result["Final Check"].length
//     });

//   } catch (err) {
//     const errorTime = new Date().toLocaleString("en-US", { timeZone: "Africa/Cairo" });
//     console.log(`❌ ERROR at ${errorTime}:`, err.response?.status || err.message);
//   }
// }


// setInterval(fetchData, 60000 * 15); // every 15 minutes
// fetchData();
