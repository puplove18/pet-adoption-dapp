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
const userId = 'importUser';

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

// I added the import script to the deploy_latency.sh 
// this would let either import the default pet_data.json or another pets200.json for the latency test when the deploy_latency.sh
async function main() {
  const startWallClock = new Date();
  const startTime = process.hrtime.bigint();
  console.log(`IMPORT_START: ${startWallClock.toISOString()}`);

  const inputPath = process.argv[2] || process.env.PET_DATA_FILE;
  const dataPath = inputPath
    ? path.resolve(__dirname, inputPath)
    : path.join(__dirname, '../pet_data/pet_data.json');
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
      const adoptionStatus = ['AVAILABLE', 'RESERVED', 'ADOPTED'].includes(String(animal.adoptionStatus ?? '').toUpperCase())
        ? String(animal.adoptionStatus).toUpperCase()
        : 'AVAILABLE';
      const vaccination = 
        String(animal.vaccination).toLowerCase() === 'true' ? 'true':
        String(animal.vaccination).toLowerCase() === 'false' ? 'false' :
        'false';
        
      try {
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
          String(animal.notes ?? 'Unknown'),
          JSON.stringify(animal.currentOwner ?? null),
          JSON.stringify(Array.isArray(animal.formerOwners) ? animal.formerOwners : [])
        );

        if (adoptionStatus !== 'AVAILABLE') {
          await contract.submitTransaction(
            'UpdateAsset',
            String(animal.animalId),
            String(animal.name ?? 'Unknown'),
            String(animal.species ?? 'Unknown'),
            String(animal.breed ?? 'Unknown'),
            String(animal.gender ?? ''),
            age,
            String(animal.shelterId ?? 'Unknown'),
            adoptionStatus,
          );
        }
      } catch (e) {
        const message = String(e);
        if (
          message.includes('already exists')
          || message.includes('already assigned')
          || message.includes('15 digits')
        ) {
          console.warn(`Skipping ${animal.animalId}: ${message}`);
          continue;
        }
        throw e;
      }
    }
    console.log('Import complete.');
  } finally {
    if (gateway) gateway.disconnect();
    const endWallClock = new Date();
    const endTime = process.hrtime.bigint();
    const durationSeconds = Number(endTime - startTime) / 1e9;
    console.log(`IMPORT_END: ${endWallClock.toISOString()}`);
    console.log(`IMPORT_DURATION_SEC: ${durationSeconds.toFixed(3)}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
