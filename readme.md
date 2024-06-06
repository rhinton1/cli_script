### About aws-creds-fetcher
This script facilitates the setup of AWS credentials on your local machine path `C:\Users\<YOUR_USER_NAME>\.aws\credentials`. It utilizes the default SAML URL for the your AWS account to retrieve your SAML assertion and roles.

### Installing the Script
To install the script, follow these steps:

- Navigate to the script directory using the command cd.
- Run the command `npm install` to install the script's dependencies.
- **Optional**: To enable global use of the script on your machine, execute `npm install -g .` within the script directory. The script is aliased as `aws-creds-fetcher` for global usage. Global usage allows you to execute the script from any command line without navigating to the directory containing the script.


### Using the Script
There are two methods for using the script: directly from the script directory or as a global script.

**From the Script Directory:**
- Execute the command `node index.js`

**As a Global Script:**
- Execute the command `aws-creds-fetcher`.


Both methods will prompt you to select your role and then generate your credentials under the `default` profile. To utilize a different profile, append the profile option to the command as an argument. For example, for development profile, execute `aws-creds-fetcher --profile development` or `node index.js --profile development`.

Because the script connect to the VA SAML url to fetch your role assertion and roles, you need to be connected to the VPN to use it.
