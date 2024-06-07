#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');
const { STSClient, AssumeRoleWithSAMLCommand } = require('@aws-sdk/client-sts');
const { program } = require('commander');
const inquirer = require('inquirer');
const { Builder, Browser, By } = require('selenium-webdriver');
const Chrome = require('selenium-webdriver/chrome');

/**
 *  MAIN PROGRAM
 */

const SAML_LOGIN_PAGE_FOR_AWS = '';

program
  .name('aws-credentials-writer')
  .version('0.0.1')
  .option('-p, --profile <profile>', 'AWS profile name', 'default')
  .action(async options => {
    try {
      console.log(`Writing AWS credentials for profile ${options.profile}`);

      const { samlAssertion, roleArns } = await getSAMLAssertionAndRoleArns();
      const roleArn = await selectRoleArn(roleArns);
      const principalArn = createPrincipalArn(roleArn);
      const credentials = await getAWSCredentials(samlAssertion, roleArn, principalArn);
      await updateCredentialsFile(options.profile, credentials);

      console.log(`finished writing credentials for aws default ${options.profile}`);
    } catch (error) {
      console.error('Error occured while writing your credentials', `Error: ${error.message}`);
    }
  });


program.parse();



/**
 *  HELPER FUNCTIONS
 */

async function getSAMLAssertionAndRoleArns() {
  let driver;

  try {
    driver = new Builder().
      forBrowser(Browser.CHROME).
      setChromeOptions(new Chrome.Options().addArguments('--headless=new')).
      build();
    await driver.get(SAML_LOGIN_PAGE_FOR_AWS);

    const [ samlAssertion, roleArns ] = await Promise.all([
      driver.findElement(By.name('SAMLResponse')).getAttribute("value"),
      (async () => {
        const roleIndexElements = await driver.findElements(By.name('roleIndex'));
        return await Promise.all(roleIndexElements.map(ele => ele.getAttribute("value")));
      })(),
    ]);

    return { roleArns, samlAssertion };
  } finally {
    driver && await driver.quit();
  }
}

async function getAWSCredentials(samlAssertion, roleArn, principalArn) {
  const assumeRoleCommand = new AssumeRoleWithSAMLCommand({
    RoleArn: roleArn,
    PrincipalArn: principalArn,
    SAMLAssertion: samlAssertion,
  });

  const sts = new STSClient({ region: '' });
  const { Credentials: creds } = await sts.send(assumeRoleCommand);

  return creds
};

function formatCredentials(credentials, profile) {
  return [
    `[${profile}]`,
    `region=us-gov-west-1\naws_access_key_id=${credentials.AccessKeyId}`,
    `aws_secret_access_key=${credentials.SecretAccessKey}`,
    `aws_session_token=${credentials.SessionToken}`
  ].join('\n');
}

async function updateCredentialsFile(profile, credentials) {
  const credentialsFilePath = path.join(process.env.HOME || process.env.USERPROFILE, '.aws', 'credentials');
  let fileContents = await fs.readFile(credentialsFilePath, 'utf8').catch((_error) => '');
  const profileRegex = new RegExp(`(\\[${profile}\\][^\\[]*)([\\[]|$)`, 'g');
  let newProfileData = formatCredentials(credentials, profile);
  newProfileData = fileContents.length ? `\n${newProfileData}` : newProfileData;

  if (fileContents.includes(`[${profile}]`)) {
    fileContents = fileContents.replace(profileRegex, (_, _match, nextProfileHeader) => `${newProfileData}\n${nextProfileHeader}`);
  } else {
    fileContents += `${newProfileData}`;
  }

  await fs.writeFile(credentialsFilePath, fileContents);
  console.log(`Credentials for profile '${profile}' have been updated.`);
}

async function selectRoleArn(roleArns) {
  const { roleArn } = await inquirer.prompt({
    type: 'rawlist',
    message: 'Please select your AWS role arn',
    name: 'roleArn',
    choices: roleArns
  });

  return roleArn;
}

function createPrincipalArn(roleArn) {
  const accountId = roleArn.split('::')[1].split(':')[0];
  return `arn:aws-us-gov:iam::${accountId}:saml-provider/ADFS`
}

