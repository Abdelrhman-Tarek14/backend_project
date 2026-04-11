const axios = require('axios');
const crypto = require('crypto');
const inquirer = require('inquirer');
const chalk = require('chalk');
require('dotenv').config();

const BACKEND_URL = process.env.BACKEND_URL;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
  console.error(chalk.red('Error: WEBHOOK_SECRET is not defined in .env'));
  process.exit(1);
}

/**
 * Calculates HMAC SHA256 signature for the payload
 */
function calculateSignature(payload) {
  const jsonPayload = JSON.stringify(payload);
  return crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(jsonPayload)
    .digest('hex');
}

/**
 * Sends a POST request to the backend with the required signature header
 */
async function sendWebhook(endpoint, payload) {
  const signature = calculateSignature(payload);
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
  console.log(chalk.yellow.bold('\n--- GAS/Salesforce API Simulation ---'));
  
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to simulate?',
      choices: [
        { name: '1. [SF] Create New Case', value: 'sf-new' },
        { name: '2. [GAS] Submit Form (ETA)', value: 'gas-form' },
        { name: '3. [GAS] Submit Validation (Metrics)', value: 'gas-validated' },
        { name: '4. [GAS] Submit Evaluation (Quality)', value: 'gas-evaluation' },
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
    case 'gas-form':
      await simulateGasForm();
      break;
    case 'gas-validated':
      await simulateGasValidated();
      break;
    case 'gas-evaluation':
      await simulateGasEvaluation();
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

async function simulateGasForm() {
  const answers = await inquirer.prompt([
    { name: 'caseNumber', message: 'Case Number:', default: lastCase.caseNumber },
    { name: 'caseOwner', message: 'Agent Email:', default: lastCase.caseOwner },
    { name: 'caseETA', message: 'ETA (Minutes):', type: 'number', default: 45 },
    { name: 'formType', message: 'Form Type:', default: 'Menu Typing' },
  ]);

  const payload = {
    ...answers,
    formSubmitTime: new Date().toISOString(),
  };

  await sendWebhook('/cases/webhook/gas-form', payload);
}

async function simulateGasValidated() {
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

  await sendWebhook('/cases/webhook/gas-validated', payload);
}

async function simulateGasEvaluation() {
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

  await sendWebhook('/cases/webhook/gas-evaluation', payload);
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
