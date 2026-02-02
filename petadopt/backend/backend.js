'use strict';

const express = require('express');
const cors = require('cors');

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');

const { buildCAClient, registerAndEnrollUser, enrollAdmin } =
  require('../../hyperledger/fabric-samples/test-application/javascript/CAUtil.js');
const { buildCCPOrg1, buildWallet } =
  require('../../hyperledger/fabric-samples/test-application/javascript/AppUtil.js');

const channelName = 'mychannel';
const chaincodeName = 'adoption';
const mspOrg1 = 'Org1MSP';

const walletPath = path.join(__dirname, 'wallet');
const userId = 'appUser2'; // keep for now

async function connect() {
  const ccp = buildCCPOrg1();
  const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');
  const wallet = await buildWallet(Wallets, walletPath);

  await enrollAdmin(caClient, wallet, mspOrg1);

  // don’t crash if CA already has it registered
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


const app = express();
app.use(cors());
app.use(express.json());
// for the image uploads
app.use("/uploads", express.static(path.join(__dirname, 'uploads')));


// TEST: list animals
app.get('/api/animals', async (req, res) => {
  let gateway;
  try {
    const connection = await connect();
    gateway = connection.gateway;

    const result = await connection.contract.evaluateTransaction('GetAllAnimals');
    const animals = JSON.parse(result.toString() || '[]');
    
    res.json(animals);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  } finally {
    if (gateway) gateway.disconnect();
  }
});

// TEST: get animal by ID
app.get('/api/animals/:id', async (req, res) => {
  let gateway;
  try {
    const connection = await connect();
    gateway = connection.gateway;
    
    const result = await connection.contract.evaluateTransaction('GetAnimalByID', req.params.id);
    const animal = JSON.parse(result.toString() || 'null');

    const pet = animals.find((a) => String(a.animalId) === String(req.params.id));
    if (!pet) return res.status(404).json({ error: 'Not found' });

    res.json(animal);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  } finally {
    if (gateway) gateway.disconnect();
  }
});

// TEST: create animal from UI
app.post('/api/animals', async (req, res) => {
  let gateway;
  try {
    const conn = await connect();
    gateway = conn.gateway;
    const c = conn.contract;

    const {
      animalId, name, species, breed, gender, age,
      shelterId, microchipNumber, vaccination, notes
    } = req.body;

    await c.submitTransaction(
      'CreateAnimal',
      String(animalId),
      String(name ?? 'Unknown'),
      String(species ?? 'Unknown'),
      String(breed ?? 'Unknown'),
      String(gender),
      String(age ?? 'Unknown'),
      String(shelterId ?? 'Unknown'),
      String(microchipNumber ?? 'Unknown'),
      String(vaccination ?? 'Unknown'),
      String(notes ?? 'Unknown')
    );

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  } finally {
    if (gateway) gateway.disconnect();
  }
});


const PORT = 4000;
app.listen(PORT, () => console.log(`Backend server running on http://localhost:${PORT}`));