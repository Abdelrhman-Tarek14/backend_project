const axios = require('axios');
const crypto = require('crypto');
const inquirer = require('inquirer');
const chalk = require('chalk');
const dotenv = require('dotenv');
const path = require('path');

const envPath = process.env.NODE_ENV === 'production' ? '.env' : '.env.development';
dotenv.config({ path: path.resolve(process.cwd(), envPath), quiet: false });

const BACKEND_URL = process.env.BACKEND_URL;
const Sheet_SECRET = process.env.SHEET_WEBHOOK_SECRET;
const SF_SECRET = process.env.SALESFORCE_WEBHOOK_SECRET;

if (!Sheet_SECRET || !SF_SECRET) {
  console.error(chalk.red('Error: Both SHEET_WEBHOOK_SECRET and SALESFORCE_WEBHOOK_SECRET must be defined in .env'));
  process.exit(1);
}

/**
 * Calculates HMAC SHA256 signature for the payload
 */
function calculateSignature(payload, secret) {
  const jsonPayload = JSON.stringify(payload);
  return crypto
    .createHmac('sha256', secret)
    .update(jsonPayload)
    .digest('hex');
}

/**
 * Sends a POST request to the backend with the required signature header
 */
async function sendWebhook(endpoint, payload) {
  const secret = endpoint.includes('salesforce') ? SF_SECRET : Sheet_SECRET;
  const signature = calculateSignature(payload, secret);
  const url = `${BACKEND_URL}${endpoint}`;

  console.log(chalk.cyan(`\nSending webhook to ${endpoint}...`));
  console.log(chalk.gray('Payload:'), JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signature,
      },
    });

    console.log(chalk.green(`✓ Response (${response.status}):`), response.data);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(chalk.red(`✗ Error (${error.response.status}):`), error.response.data);
    } else {
      console.error(chalk.red('✗ Error:'), error.message);
    }
  }
}

// Memory to store last used case details
let lastCase = {
  caseNumber: process.env.DEFAULT_CASE_NUMBER || '12345678',
  caseOwner: process.env.DEFAULT_AGENT_EMAIL || 'agent@example.com',
};

/**
 * Main Interactive Menu
 */
async function mainMenu() {
  console.log(chalk.yellow.bold('\n--- Sheet/Salesforce API Simulation ---'));

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to simulate?',
      choices: [
        { name: '1. [SF] Create New Case', value: 'sf-new' },
        { name: '2. [Sheet] Submit Form (Unified)', value: 'sheet-form' },
        { name: '3. [Sheet] Submit Validation (Metrics)', value: 'sheet-validated' },
        { name: '4. [Sheet] Submit Evaluation (Quality)', value: 'sheet-evaluation' },
        { name: '5. [SF] Close Case', value: 'sf-close' },
        { name: '6. Update Case/Agent Defaults', value: 'update-defaults' },
        { name: 'Exit', value: 'exit' },
      ],
    },
  ]);

  switch (action) {
    case 'sf-new':
      await simulateSfNew();
      break;
    case 'sheet-form':
      await simulateSheetForm();
      break;
    case 'sheet-validated':
      await simulateSheetValidated();
      break;
    case 'sheet-evaluation':
      await simulateSheetEvaluation();
      break;
    case 'sf-close':
      await simulateSfClose();
      break;
    case 'update-defaults':
      await updateDefaults();
      break;
    case 'exit':
      process.exit(0);
  }

  // Back to main menu
  mainMenu();
}

async function simulateSfNew() {
  const answers = await inquirer.prompt([
    { name: 'caseNumber', message: 'Case Number:', default: lastCase.caseNumber },
    { name: 'caseOwner', message: 'Agent Email:', default: lastCase.caseOwner },
    { name: 'caseAccountName', message: 'Account Name:', default: 'test name' },
    { name: 'caseCountry', message: 'Country:', default: 'egypt' },
    { name: 'caseType', message: 'Case Type:', default: 'Menu Typing' },
  ]);

  lastCase.caseNumber = answers.caseNumber;
  lastCase.caseOwner = answers.caseOwner;

  const payload = {
    ...answers,
    caseStartTime: new Date().toISOString(),
  };

  await sendWebhook('/cases/webhook/salesforce', payload);
}

async function simulateSheetForm() {
  const answers = await inquirer.prompt([
    { name: 'caseNumber', message: 'Case Number:', default: lastCase.caseNumber },
    { name: 'caseOwner', message: 'Agent Email:', default: lastCase.caseOwner },
    { name: 'formType', message: 'Form Type:', default: 'Menu Typing' },
    { name: 'items', message: 'Items:', type: 'number', default: 5 },
    { name: 'choices', message: 'Choices:', type: 'number', default: 2 },
    { name: 'description', message: 'Description (Count):', type: 'number', default: 1 },
    { name: 'images', message: 'Images (Count):', type: 'number', default: 1 },
    { name: 'tmpAreas', message: 'TMP Areas:', type: 'number', default: 1 },
    { name: 'formValidation', message: 'Validation:', default: 'Valid' },
    { name: 'eta', message: 'ETA (Minutes):', type: 'number', default: 45 },
  ]);

  const payload = {
    ...answers,
    formSubmitTime: new Date().toISOString(),
  };

  await sendWebhook('/cases/webhook/sheet-open-cases', payload);
}

async function simulateSheetValidated() {
  const answers = await inquirer.prompt([
    { name: 'caseNumber', message: 'Case Number:', default: lastCase.caseNumber },
    { name: 'caseOwner', message: 'Agent Email:', default: lastCase.caseOwner },
    { name: 'items', message: 'Items Count:', type: 'number', default: 5 },
    { name: 'choices', message: 'Choices Count:', type: 'number', default: 3 },
    { name: 'images', message: 'Images Count:', type: 'number', default: 2 },
    { name: 'tmparea', message: 'TMP Area Count:', type: 'number', default: 12 },
    { name: 'formValidation', message: 'Validation Status:', default: 'valid' },
    // { name: 'isOnTime', message: 'Is On Time:', type: 'confirm', default: true },
  ]);

  const payload = {
    ...answers,
    formSubmitTime: new Date().toISOString(),
  };

  await sendWebhook('/cases/webhook/sheet-validated', payload);
}

async function simulateSheetEvaluation() {
  const answers = await inquirer.prompt([
    { name: 'caseNumber', message: 'Case Number:', default: lastCase.caseNumber },
    { name: 'caseOwner', message: 'Agent Email:', default: lastCase.caseOwner },
    { name: 'qualityScore', message: 'Quality Score (Pass/Fail):', type: 'confirm', default: true },
    { name: 'finalCheckScore', message: 'Final Check (Pass/Fail):', type: 'confirm', default: true },
  ]);

  const payload = {
    ...answers,
    evaluationTime: new Date().toISOString(),
  };

  await sendWebhook('/cases/webhook/sheet-evaluation', payload);
}
async function simulateSfClose() {
  const answers = await inquirer.prompt([
    { name: 'caseNumber', message: 'Case Number:', default: lastCase.caseNumber },
    { name: 'caseOwner', message: 'Agent Email:', default: lastCase.caseOwner },
  ]);

  await sendWebhook('/cases/webhook/salesforce/close', answers);
}

async function updateDefaults() {
  const answers = await inquirer.prompt([
    { name: 'caseNumber', message: 'New Default Case Number:', default: lastCase.caseNumber },
    { name: 'caseOwner', message: 'New Default Agent Email:', default: lastCase.caseOwner },
  ]);
  lastCase = answers;
}

// Start simulation
mainMenu();
