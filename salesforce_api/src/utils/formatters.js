/**
 * Formats a name to a Talabat internal email format.
 * Example: "Ahmed Ali" -> "ahmed.ali_bseg.ext@talabat.com"
 */
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

/**
 * Normalizes case data for comparison and storage.
 */
function normalizeCase(rawCase) {
    return {
        caseNumber: rawCase.caseNumber,
        caseOwner: rawCase.caseOwner,
        caseStartTime: rawCase.caseStartTime, // UTC value usually
        caseAccountName: rawCase.caseAccountName,
        caseCountry: rawCase.caseCountry,
        caseType: rawCase.caseType
    };
}

module.exports = {
    formatToTalabatEmail,
    normalizeCase
};
