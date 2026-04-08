/**
 * ETA Calculator Logic based on Google Sheets Formula
 * * Mapping Reference:
 * - Case Type: Column F
 * - Items: Column I
 * - Choices: Column J
 * - Descriptions: Column K
 * - Images: Column L
 * - Areas (TMP): Column M
 * - Extra Branches: Column N
 * - Break Time: Column H
 */

export const CASE_TYPES = [
    "Menu Creation - Excel Menu",
    "Shared Case - Excel Menu - Assigned by SME",
    "Shared Case - Excel Menu - Handover",
    "Menu Creation - JPG/PDF",
    "Shared Case - JPG/PDF - Assigned by SME",
    "Shared Case - JPG/PDF - Handover",
    "Images Only",
    "Correct Errors",
    "Franchise Extension - TMP",
    "Franchise Extension - OD",
    "Copy Menu",
    "Dine-out Branch"
];

/**
 * Calculates the Estimated Time of Arrival (ETA) in minutes.
 * @param {object} inputs - Object containing counts
 * @param {string} inputs.caseType - The selected case type
 * @param {number|string} inputs.items - Count of items
 * @param {number|string} inputs.choices - Count of choices
 * @param {number|string} inputs.descriptions - Count of descriptions
 * @param {number|string} inputs.images - Count of images
 * @param {number|string} inputs.areas - Count of areas
 * @param {number|string} inputs.extraBranches - Count of extra branches
 * @param {number|string} inputs.breakTime - Break duration in minutes
 * @returns {number} ETA in Minutes (Rounded)
 */
export const calculateETA = (inputs) => {
    const {
        caseType = "",
        items = 0,
        choices = 0,
        descriptions = 0,
        images = 0,
        areas = 0,
        extraBranches = 0,
        breakTime = 0
    } = inputs;

    // Helper to ensure values are numbers
    const N = (val) => Number(val) || 0;

    let totalSeconds = 0;
    const breakSeconds = N(breakTime) * 60;

    // Time Constants (Seconds)
    const T_ITEM_EXCEL = 36;
    const T_CHOICE_EXCEL = 36;
    const T_DESC_EXCEL = 72;

    const T_ITEM_PDF = 45;
    const T_CHOICE_PDF = 45;
    const T_DESC_PDF = 90;

    const T_IMAGE = 60;
    const T_AREA = 60;
    const T_BRANCH = 900; // 15 mins

    switch (caseType) {
        // --- Group A: Excel Menus ---
        case "Menu Creation - Excel Menu":
        case "Shared Case - Excel Menu - Assigned by SME":
        case "Shared Case - Excel Menu - Handover":
            totalSeconds =
                (N(items) * T_ITEM_EXCEL) + (N(choices) * T_CHOICE_EXCEL) + (N(descriptions) * T_DESC_EXCEL) +
                (N(images) * T_IMAGE) + (N(areas) * T_AREA) + (N(extraBranches) * T_BRANCH) +
                1200 + breakSeconds;
            break;

        // --- Group B: JPG/PDF Menus ---
        case "Menu Creation - JPG/PDF":
        case "Shared Case - JPG/PDF - Assigned by SME":
        case "Shared Case - JPG/PDF - Handover":
            totalSeconds =
                (N(items) * T_ITEM_PDF) + (N(choices) * T_CHOICE_PDF) + (N(descriptions) * T_DESC_PDF) +
                (N(images) * T_IMAGE) + (N(areas) * T_AREA) + (N(extraBranches) * T_BRANCH) +
                1200 + breakSeconds;
            break;

        // --- Group C: Special Cases ---
        case "Images Only":
            totalSeconds = (N(images) * 50) + 900 + breakSeconds;
            break;

        case "Correct Errors":
            // Formula: Base items calculation + 70% Extra on Items + Fixed Base
            totalSeconds =
                (N(items) * 36) + (N(choices) * 36) + (N(descriptions) * 72) +
                (N(items) * 36 * 0.7) +
                (N(images) * 60) + (N(areas) * 60) +
                750 + breakSeconds;
            break;

        case "Franchise Extension - TMP":
            totalSeconds = (N(areas) * 60) + 1200 + breakSeconds;
            break;

        case "Franchise Extension - OD":
            totalSeconds = 1200 + breakSeconds;
            break;

        case "Copy Menu":
            totalSeconds = 1500 + breakSeconds;
            break;

        case "Dine-out Branch":
            totalSeconds = 3600 + breakSeconds;
            break;

        default:
            return 0;
    }

    return Math.round(totalSeconds / 60);
};