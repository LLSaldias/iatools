/* eslint-disable max-len */
const colors = require('@colors/colors');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

printAuditTable();
evaluateSeverity();

/**
 * @description: Evaluate the security levels of the overall */
async function evaluateSeverity() {
  const auditInfo = await getAuditInfo();
  const { moderate, high, critical } = auditInfo.data.vulnerabilities;
  if (moderate > 0 || high > 0 || critical > 0) {
    console.error(
      colors.bold.red(
        '\nSecurity test failed!',
        '\nYour project has moderate, high or critical vulnerabilities',
        '\nCheck packages that need attention.'
      )
    );
    throw new Error(
      'Your project has moderate, high or critical vulnerabilities'
    );
  }
}

/**
 * @description: Retrive json object with audited info */
async function getAuditInfo() {
  let auditInfo;
  try {
    const { stdout } = await exec(
      'npm audit --groups dependencies --json | grep auditSummary'
    );
    auditInfo = stdout;
  } catch (error) {
    if (!error.stdout) {
      throw error;
    }
    auditInfo = error.stdout;
  }

  return JSON.parse(auditInfo);
}

/**
 * @description: Log in console table with audited packages */
async function printAuditTable() {
  let auditTable;
  try {
    const { stdout } = await exec(
      'npm audit --groups dependencies'
    );
    auditTable = stdout;
  } catch (error) {
    if (!error.stdout) {
      throw error;
    }
    auditTable = error.stdout;
  }

  console.log(auditTable);
}
