'use strict';

const fs = require('fs');
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
const userId = 'appUser2';

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
  const dataPath = path.join(__dirname, '../pet_data/pet_data.json'
);
  const animals = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  let gateway;
  try {
    const connection= await connect();
    gateway = connection.gateway;
    const contract = connection.contract;

    for (const animal of animals) {
      console.log(`Creating ${animal.animalId}...`);
      
      // -1 is for unknown age for now, and default to false for unknown
      const age = Number.isFinite(Number(animal.age)) ? String(animal.age) : '-1';
      const vaccination = 
        String(animal.vaccination).toLowerCase() === 'true' ? 'true':
        String(animal.vaccination).toLowerCase() === 'false' ? 'false' :
        'false';
        
      await contract.submitTransaction(
        'CreateAnimal',
        String(animal.animalId),         
        String(animal.name ?? 'Unknown'),             
        String(animal.species ?? 'Unknown'),
        String(animal.breed ?? 'Unknown'),
        String(animal.gender),
        age,
        String(animal.shelterId ?? 'Unknown'),
        String(animal.microchipNumber ?? 'Unknown'),
        vaccination,
        String(animal.notes ?? 'Unknown')
      );
    }
    console.log('Import complete.');
  } finally {
    if (gateway) gateway.disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
