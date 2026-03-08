'use strict';

const path = require('path');

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');

const { buildCAClient, registerAndEnrollUser, enrollAdmin } =
  require('../../hyperledger/fabric-samples/test-application/javascript/CAUtil.js');
const { buildCCPOrg1, buildWallet } =
  require('../../hyperledger/fabric-samples/test-application/javascript/AppUtil.js');

const channelName = 'mychannel';
const chaincodeName = 'adoption';
const mspOrg1 = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');
const userId = 'seedUser';

const allowedUsersByOrg = {
  org1: ['center1', 'center2', 'admin1'],
  org2: ['vet1', 'vet2', 'doctor1'],
  org3: ['adopter1', 'adopter2', 'user1'],
};

async function connect() {
  const ccp = buildCCPOrg1();
  const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');
  const wallet = await buildWallet(Wallets, walletPath);

  await enrollAdmin(caClient, wallet, mspOrg1);
  try {
    await registerAndEnrollUser(caClient, wallet, mspOrg1, userId, 'org1.department1');
  } catch (e) {
    if (!String(e).includes('already registered')) throw e;
  }

  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: userId,
    discovery: { enabled: true, asLocalhost: true },
  });

  const network = await gateway.getNetwork(channelName);
  const contract = network.getContract(chaincodeName);
  return { gateway, contract };
}

async function main() {
  let gateway;
  try {
    const connection = await connect();
    gateway = connection.gateway;
    const contract = connection.contract;

    for (const [org, userIds] of Object.entries(allowedUsersByOrg)) {
      for (const allowedUserId of userIds) {
        await contract.submitTransaction('AllowUser', org, allowedUserId);
        console.log(`Allowed login identity ${allowedUserId} for ${org}`);
      }
    }

    console.log('Allowed user seeding complete.');
  } finally {
    if (gateway) gateway.disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
