'use strict';

const express = require('express');
const cors = require('cors');

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const fs = require('fs');
const util = require('util');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());
// for the image uploads
app.use("/uploads", express.static(path.join(__dirname, 'uploads')));
// serve pet images from pet_data/images (off-chain, persistent)
const PET_IMAGES_DIR = path.join(__dirname, '../pet_data/images');
app.use("/pet_images", express.static(PET_IMAGES_DIR));

// ── Multer config: save uploaded images as {animalId}.jpg ──
const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(PET_IMAGES_DIR, { recursive: true });
      cb(null, PET_IMAGES_DIR);
    },
    filename: (req, _file, cb) => {
      const animalId = req.params.id || req.body.animalId || 'unknown';
      cb(null, `${animalId}.jpg`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

const CHANNEL = 'mychannel';
const CC = 'adoption';

function logTs() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

// Transaction Log on terminal as I was told to have it somewhere 
function txLog(action, org, userId, animalId, extra = '') {
  const pad = (s, n) => s.padEnd(n);
  const line = `[${logTs()}] TX  | ${pad(action, 10)} | ${pad(org, 4)} ${pad(userId, 12)} | ${animalId}${extra ? ' | ' + extra : ''}`;
  console.log('\x1b[36m%s\x1b[0m', line);  // cyan color
}

function eventLog(event, org = '-', userId = '-', extra = '') {
  const pad = (s, n) => String(s).padEnd(n);
  const line = `[${logTs()}] EVT | ${pad(event, 10)} | ${pad(org, 4)} ${pad(userId, 12)}${extra ? ' | ' + extra : ''}`;
  console.log('\x1b[35m%s\x1b[0m', line);  // magenta color
}

function authForLog(req) {
  const org = req.header('x-org') || req.body?.org || '-';
  const userId = req.header('x-user') || req.body?.userId || '-';
  return { org, userId };
}

// Request-level terminal audit line for every API call
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/')) return next();

  const started = Date.now();
  const { org, userId } = authForLog(req);
  res.on('finish', () => {
    const ms = Date.now() - started;
    const pad = (s, n) => String(s).padEnd(n);
    const line = `[${logTs()}] REQ | ${pad(req.method, 6)} ${pad(req.originalUrl, 24)} | ${res.statusCode} | ${pad(`${ms}ms`, 6)} | ${pad(org, 4)} ${pad(userId, 12)}`;
    const color = res.statusCode >= 400 ? '\x1b[31m%s\x1b[0m' : '\x1b[90m%s\x1b[0m';
    console.log(color, line);
  });
  next();
});

function getAuth(req) {
  const org = req.header('x-org');
  const userId = req.header('x-user');
  if (!org || !userId) throw new Error('Missing headers: x-org and x-user');
  return { org, userId };
}

function isAuthorizationError(err) {
  return extractErrorMessage(err).toLowerCase().includes('unauthorized userid');
}

// prevent overwritten data i hope this works
function isConflictError(err) {
  const message = extractErrorMessage(err).toLowerCase();
  return message.includes('already exists') || message.includes('already assigned');
}

function isValidationError(err) {
  const message = extractErrorMessage(err).toLowerCase();
  return message.includes('microchip number must be exactly 15 digits');
}

function extractPeerMessage(text) {
  if (!text) return "";

  const patterns = [
    /message=([^\n\r]+?(?:already exists|already assigned)[^\n\r]*)/i,
    /message:\s*["']([^"']+?(?:already exists|already assigned)[^"']*)["']/i,
  ];

  for (const pattern of patterns) {
    const match = String(text).match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  return "";
}

function extractErrorMessage(err) {
  const messages = [];
  const rawMessage = typeof err?.message === 'string' ? err.message.trim() : '';
  const stringified = String(err);
  const inspected = util.inspect(err, { depth: 8, breakLength: 140 });

  const extractedPeerMessage = extractPeerMessage(rawMessage)
    || extractPeerMessage(stringified)
    || extractPeerMessage(inspected);
  if (extractedPeerMessage) {
    messages.push(extractedPeerMessage);
  }

  if (rawMessage) {
    messages.push(rawMessage);
  }

  if (Array.isArray(err?.responses)) {
    for (const response of err.responses) {
      const peerMessage = response?.response?.message ?? response?.message;
      if (typeof peerMessage === 'string' && peerMessage.trim()) {
        messages.push(peerMessage.trim());
      }
    }
  }

  if (Array.isArray(err?.errors)) {
    for (const nestedError of err.errors) {
      if (typeof nestedError === 'string' && nestedError.trim()) {
        messages.push(nestedError.trim());
      } else if (typeof nestedError?.message === 'string' && nestedError.message.trim()) {
        messages.push(nestedError.message.trim());
      }
    }
  }

  const uniqueMessages = [...new Set(messages)];
  if (uniqueMessages.length > 0) {
    return uniqueMessages.join(' | ');
  }

  return stringified !== '[object Object]' ? stringified : inspected;
}

function parseFabricBoolean(bufferValue) {
  const raw = String(bufferValue?.toString?.() ?? '').trim().toLowerCase();
  if (raw === 'true' || raw === '"true"') return true;
  if (raw === 'false' || raw === '"false"' || raw === '') return false;
  try {
    return Boolean(JSON.parse(raw));
  } catch {
    return false;
  }
}

// MC number be 15 digits or empty
function normalizeMicrochipNumber(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return '';

  const lower = normalized.toLowerCase();
  if (lower === 'null' || lower === 'n/a' || lower === 'unknown') return '';

  return normalized;
}

function isValidMicrochipNumber(value) {
  const normalized = normalizeMicrochipNumber(value);
  return normalized === '' || /^\d{15}$/.test(normalized);
}

function normalizeOwnerValue(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;

  const lower = normalized.toLowerCase();
  if (lower === 'null' || lower === 'n/a' || lower === 'unknown') return null;

  return normalized;
}

function normalizeOwnerInfo(owner) {
  if (!owner || typeof owner !== 'object') return null;

  const normalized = {
    name: normalizeOwnerValue(owner.name),
    phone: normalizeOwnerValue(owner.phone),
    city: normalizeOwnerValue(owner.city),
  };

  if (!normalized.name && !normalized.phone && !normalized.city) {
    return null;
  }

  return normalized;
}

function normalizeFormerOwnersInput(formerOwners) {
  if (!Array.isArray(formerOwners)) return [];

  return formerOwners
    .map((owner) => normalizeOwnerInfo(owner))
    .filter((owner) => owner !== null);
}

const SHARED_PRIVATE_ENDORSERS = ['Org1MSP', 'Org2MSP'];

async function evaluateWithEndorsers(contract, txName, endorsers, ...args) {
  const tx = contract.createTransaction(txName);
  tx.setEndorsingOrganizations(...endorsers);
  return tx.evaluate(...args);
}

async function submitWithEndorsers(contract, txName, endorsers, ...args) {
  const tx = contract.createTransaction(txName);
  tx.setEndorsingOrganizations(...endorsers);
  return tx.submit(...args);
}

async function findAnimalIdByMicrochip(contract, microchipNumber, excludeAnimalId = '') {
  const normalizedMicrochip = normalizeMicrochipNumber(microchipNumber);
  if (!normalizedMicrochip) return '';

  const result = await contract.evaluateTransaction('GetAllAnimals');
  const animals = JSON.parse(result.toString() || '[]');

  for (const animal of animals) {
    if (!animal?.animalId || animal.animalId === excludeAnimalId) continue;

    try {
      const privateResult = await evaluateWithEndorsers(
        contract,
        'ReadPrivateAnimal',
        SHARED_PRIVATE_ENDORSERS,
        animal.animalId,
      );
      const privateAnimal = JSON.parse(privateResult.toString() || '{}');
      const existingMicrochip = normalizeMicrochipNumber(privateAnimal?.microchipNumber);

      if (existingMicrochip === normalizedMicrochip) {
        return animal.animalId;
      }
    } catch {
      // Ignore pets without private data while scanning for duplicate microchips.
    }
  }

  return '';
}

async function isUserAllowedOnChain({ wallet, ccp, adminLabel, org, userId }) {
  const gateway = new Gateway();
  try {
    await gateway.connect(ccp, {
      wallet,
      identity: adminLabel,
      discovery: { enabled: true, asLocalhost: true },
    });

    const network = await gateway.getNetwork(CHANNEL);
    const contract = network.getContract(CC);
    const result = await contract.evaluateTransaction(
      'IsUserAllowed',
      String(org).toLowerCase(),
      String(userId)
    );
    return parseFabricBoolean(result);
  } finally {
    gateway.disconnect();
  }
}


const { buildCAClient, registerAndEnrollUser, enrollAdmin } =
  require('../../hyperledger/fabric-samples/test-application/javascript/CAUtil.js');
//const { buildCCPOrg1, buildWallet } =
//  require('../../hyperledger/fabric-samples/test-application/javascript/AppUtil.js');


// this is for the login and rfegistration
function orgConfig(org) {
  const base = path.resolve(__dirname, '../../hyperledger/fabric-samples/test-network/organizations/peerOrganizations');

  const map = {
    org1: {
      mspId: 'Org1MSP',
      caName: 'ca.org1.example.com',
      ccpPath: path.join(base, 'org1.example.com', 'connection-org1.json'),
      affiliation: 'org1.department1',
    },
    org2: {
      mspId: 'Org2MSP',
      caName: 'ca.org2.example.com',
      ccpPath: path.join(base, 'org2.example.com', 'connection-org2.json'),
      affiliation: 'org2.department1',
    },
    org3: {
      mspId: 'Org3MSP',
      caName: 'ca.org3.example.com',
      ccpPath: path.join(base, 'org3.example.com', 'connection-org3.json'),
      affiliation: 'org3.department1',
    },
  };

  const config = map[String(org).toLowerCase()];
  if (!config) throw new Error("Unknown org: " + org);
  return config;
}

function roleForOrg(org) {
  org = String(org).toLowerCase();
  if (org === "org1") return "adoption_center";
  if (org === "org2") return "veterinarian";
  if (org === "org3") return "adopter";
  throw new Error("Unknown org: " + org);
}


function readCCP(ccpPath) {
  const json = fs.readFileSync(ccpPath, 'utf8');
  return JSON.parse(json);
}

function walletDir() {
  return path.join(__dirname, 'wallet');
}


async function checkIdentity({org, userId}) {
  const config = orgConfig(org);
  const ccp = readCCP(config.ccpPath);

  const caClient = buildCAClient(FabricCAServices, ccp, config.caName)
  const wallet = await Wallets.newFileSystemWallet(walletDir());

  // Enroll admin with an org-specific label so admins from different orgs
  // don't collide in the shared wallet (the upstream enrollAdmin always uses "admin")
  const adminLabel = `admin_${org}`;
  const existingAdmin = await wallet.get(adminLabel);
  if (!existingAdmin) {
    const enrollment = await caClient.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: config.mspId,
      type: 'X.509',
    };
    await wallet.put(adminLabel, x509Identity);
    console.log(`Enrolled admin for ${org} as ${adminLabel}`);
  }

  let allowed = false;
  try {
    allowed = await isUserAllowedOnChain({
      wallet,
      ccp,
      adminLabel,
      org,
      userId,
    });
  } catch (authErr) {
    throw new Error(
      `Authorization check failed. Ensure chaincode includes IsUserAllowed and is redeployed. ${String(authErr)}`
    );
  }
  if (!allowed) {
    throw new Error(`Unauthorized userId '${userId}' for ${org}`);
  }

  // if the user already exists in wallet, 
  const existing = await wallet.get(userId);
  if (existing) return {wallet, ccp, mspId: config.mspId, role: roleForOrg(org)};

  // otherwise, register and enroll via the org-specific admin
  try {
    const adminIdentity = await wallet.get(adminLabel);
    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, adminLabel);

    let secret;
    try {
      secret = await caClient.register({
        affiliation: config.affiliation,
        enrollmentID: userId,
        role: 'client',
      }, adminUser);
    } catch (regErr) {
      // If the identity was already registered in a previous session (wallet
      // was cleared but CA still knows the user), reset its enrollment secret
      // and re-enroll with the new secret.
      if (String(regErr).includes('is already registered')) {
        console.log(`User ${userId} already registered in CA — resetting enrollment secret`);
        const idService = caClient.newIdentityService();
        const newSecret = `${userId}_reset_${Date.now()}`;
        await idService.update(userId, {
          enrollmentSecret: newSecret,
          maxEnrollments: -1,
        }, adminUser);
        secret = newSecret;
      } else {
        throw regErr;
      }
    }

    const enrollment = await caClient.enroll({
      enrollmentID: userId,
      enrollmentSecret: secret,
    });

    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: config.mspId,
      type: 'X.509',
    };
    await wallet.put(userId, x509Identity);
    console.log(`Registered and enrolled user ${userId} for ${org}`);
  } catch (e) {
    throw new Error(`Failed to register user: ${userId} in ${org}: ${String(e)}`);
  }
  return {wallet, ccp, mspId: config.mspId, role: roleForOrg(org)};
}

async function connect({ org, userId, channelName, chaincodeName }) {
  const {wallet, ccp, mspId} = await checkIdentity({org, userId});
  
  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: userId,
    discovery: { enabled: true, asLocalhost: true },
  });
  
  const network = await gateway.getNetwork(channelName);
  const contract = network.getContract(chaincodeName);
  return { gateway, contract, mspId };
}

//module.exports = { connect, checkIdentity, roleForOrg };


// login endpoint after registration
app.post('/api/auth/login', async (req, res) => {
  try {
    const { org, userId } = req.body || {};
    if (!org || !userId) return res.status(400).json({ error: 'org and userId required' });

    const info = await checkIdentity({ org, userId });
    eventLog('LOGIN_OK', org, userId, `role=${info.role}`);
    res.json({ ok: true, org, userId, role: info.role, mspId: info.mspId });
  } catch (e) {
    const { org = '-', userId = '-' } = req.body || {};
    eventLog('LOGIN_FAIL', org, userId, String(e));
    const status = isAuthorizationError(e) ? 403 : 500;
    res.status(status).json({ error: String(e) });
  }
});



// LIST: get all animals (for UI)
app.get('/api/animals', async (req, res) => {
  let gateway;
  try {
    const { org, userId } = getAuth(req);

    const { gateway: g, contract } = await connect({
      org,
      userId,
      channelName: CHANNEL,
      chaincodeName: CC,
    });
    gateway = g;

    const result = await contract.evaluateTransaction('GetAllAnimals');
    const animals = JSON.parse(result.toString() || '[]');
    eventLog('LIST', org, userId, `count=${Array.isArray(animals) ? animals.length : 0}`);
    res.json(animals);
  } catch (e) {
    console.error("GET /api/animals failed:", e);
    const status = isAuthorizationError(e) ? 403 : 500;
    res.status(status).json({ error: extractErrorMessage(e) });
  } finally {
    if (gateway) gateway.disconnect();
  }
});


// GET: animal by ID
app.get('/api/animals/:id', async (req, res) => {
  let gateway;
  try {
    const { org, userId } = getAuth(req);

    const { gateway: g, contract } = await connect({
      org,
      userId,
      channelName: CHANNEL,
      chaincodeName: CC,
    });
    gateway = g;

    const result = await contract.evaluateTransaction('ReadAsset', req.params.id);
    const animal = JSON.parse(result.toString() || 'null');
    if (!animal) return res.status(404).json({ error: "Not found" });

    // Merge private data for Org1 & Org2 (PDC members)
    if (org === 'org1' || org === 'org2') {
      try {
        const pvt = await evaluateWithEndorsers(
          contract,
          'ReadPrivateAnimal',
          SHARED_PRIVATE_ENDORSERS,
          req.params.id,
        );
        const pvtData = JSON.parse(pvt.toString() || '{}');
        animal.microchipNumber = pvtData.microchipNumber ?? null;
        animal.vaccination = pvtData.vaccination ?? null;
        animal.notes = pvtData.notes ?? null;
        animal._hasPrivateData = true;
      } catch (pvtErr) {
        console.warn('Private data not available for', req.params.id, String(pvtErr));
        animal._hasPrivateData = false;
      }

      try {
        const currentOwnerResult = await evaluateWithEndorsers(
          contract,
          'ReadCurrentOwner',
          SHARED_PRIVATE_ENDORSERS,
          req.params.id,
        );
        animal.currentOwner = JSON.parse(currentOwnerResult.toString() || 'null');
      } catch {
        animal.currentOwner = null;
      }
    }

    if (org === 'org1') {
      try {
        const formerOwnersResult = await contract.evaluateTransaction('GetFormerOwners', req.params.id);
        animal.formerOwners = JSON.parse(formerOwnersResult.toString() || '[]');
      } catch {
        animal.formerOwners = [];
      }
    }

    eventLog('READ', org, userId, `${req.params.id} private=${animal._hasPrivateData === true}`);
    res.json(animal);
  } catch (e) {
    console.error(e);
    const status = isAuthorizationError(e) ? 403 : isValidationError(e) ? 400 : isConflictError(e) ? 409 : 500;
    res.status(status).json({ error: extractErrorMessage(e) });
  } finally {
    if (gateway) gateway.disconnect();
  }
});


// ── Helper: persist a new pet to pet_data.json so it survives redeployment ──
const PET_DATA_PATH = path.join(__dirname, '../pet_data/pet_data.json');

function appendToPetData(pet) {
  let existing = [];
  try {
    existing = JSON.parse(fs.readFileSync(PET_DATA_PATH, 'utf8'));
  } catch { /* file missing or corrupt – start fresh */ }

  // Don't duplicate if the same animalId already exists
  if (existing.some((p) => p.animalId === pet.animalId)) return;

  existing.push(pet);
  fs.writeFileSync(PET_DATA_PATH, JSON.stringify(existing, null, 2) + '\n', 'utf8');
  console.log(`Persisted ${pet.animalId} to pet_data.json`);
}


// POST: create animal
app.post('/api/animals', async (req, res) => {
  let gateway;
  try {
    const { org, userId } = getAuth(req);
    if (org !== 'org1') {
      return res.status(403).json({ error: 'Only Org1 (Adoption Center) can register new pets' });
    }

    const { gateway: g, contract } = await connect({
      org,
      userId,
      channelName: CHANNEL,
      chaincodeName: CC,
    });
    gateway = g;

    const { animalId, name, species, breed, gender, age, shelterId, microchipNumber, vaccination, notes, currentOwner, formerOwners } = req.body;
    const normalizedCurrentOwner = normalizeOwnerInfo(currentOwner);
    const normalizedFormerOwners = normalizeFormerOwnersInput(formerOwners);

    // if not 15 digits or empty, error messgae
    if (!isValidMicrochipNumber(microchipNumber)) {
      return res.status(400).json({ error: 'Microchip number must be exactly 15 digits.' });
    }

    const duplicateAnimalId = await findAnimalIdByMicrochip(contract, microchipNumber);
    if (duplicateAnimalId) {
      return res.status(409).json({ error: `Microchip number is already assigned to animal '${duplicateAnimalId}'.` });
    }

    await submitWithEndorsers(
      contract,
      'CreateAnimal',
      SHARED_PRIVATE_ENDORSERS,
      String(animalId),
      String(name ?? 'Unknown'),
      String(species ?? 'Unknown'),
      String(breed ?? 'Unknown'),
      String(gender ?? ''),
      String(age ?? ''),
      String(shelterId ?? 'Unknown'),
      String(microchipNumber ?? 'Unknown'),
      String(vaccination ?? 'Unknown'),
      String(notes ?? 'Unknown'),
      JSON.stringify(normalizedCurrentOwner),
      JSON.stringify(normalizedFormerOwners)
    );

    txLog('CREATE', org, userId, animalId, `${species} / ${name}`);

    // Persist to JSON so the pet survives teardown + redeploy
    appendToPetData({
      animalId,
      name: name ?? 'Unknown',
      species: species ?? 'Unknown',
      breed: breed ?? 'Unknown',
      gender: gender ?? '',
      age: String(age ?? ''),
      shelterId: shelterId ?? 'Unknown',
      adoptionStatus: 'AVAILABLE',
      microchipNumber: microchipNumber ?? 'Unknown',
      vaccination: String(vaccination ?? 'Unknown'),
      notes: notes ?? 'Unknown',
      currentOwner: normalizedCurrentOwner,
      formerOwners: normalizedFormerOwners,
    });

    res.status(201).json({ ok: true });
  } catch (e) {
    console.error(e);
    const status = isAuthorizationError(e) ? 403 : isValidationError(e) ? 400 : isConflictError(e) ? 409 : 500;
    res.status(status).json({ error: extractErrorMessage(e) });
  } finally {
    if (gateway) gateway.disconnect();
  }
});



// ── Helper: update a pet in pet_data.json ──
function updatePetData(animalId, updates) {
  let existing = [];
  try {
    existing = JSON.parse(fs.readFileSync(PET_DATA_PATH, 'utf8'));
  } catch { return; }

  const idx = existing.findIndex((p) => p.animalId === animalId);
  if (idx === -1) return;

  existing[idx] = { ...existing[idx], ...updates };
  fs.writeFileSync(PET_DATA_PATH, JSON.stringify(existing, null, 2) + '\n', 'utf8');
  console.log(`Updated ${animalId} in pet_data.json`);
}


// PUT: update animal (public + private data)
app.put('/api/animals/:id', async (req, res) => {
  let gateway;
  try {
    const { org, userId } = getAuth(req);
    const { gateway: g, contract } = await connect({
      org, userId, channelName: CHANNEL, chaincodeName: CC,
    });
    gateway = g;

    const animalId = req.params.id;
    const { name, species, breed, gender, age, shelterId, adoptionStatus,
            microchipNumber, vaccination, notes, currentOwner, formerOwners } = req.body;
    const role = org;

    if (role !== 'org1' && role !== 'org2') {
      return res.status(403).json({ error: 'Only authorized staff can update pet records' });
    }

    if (!isValidMicrochipNumber(microchipNumber)) {
      return res.status(400).json({ error: 'Microchip number must be exactly 15 digits.' });
    }

    const duplicateAnimalId = await findAnimalIdByMicrochip(contract, microchipNumber, animalId);
    if (duplicateAnimalId) {
      return res.status(409).json({ error: `Microchip number is already assigned to animal '${duplicateAnimalId}'.` });
    }

    if (role === 'org1') {
      const normalizedCurrentOwner = normalizeOwnerInfo(currentOwner);
      const normalizedFormerOwners = normalizeFormerOwnersInput(formerOwners);

      await submitWithEndorsers(
        contract,
        'UpdateAnimalRecord',
        SHARED_PRIVATE_ENDORSERS,
        String(animalId),
        String(name ?? ''),
        String(species ?? ''),
        String(breed ?? ''),
        String(gender ?? ''),
        String(age ?? ''),
        String(shelterId ?? ''),
        String(adoptionStatus ?? 'AVAILABLE'),
        String(microchipNumber ?? ''),
        String(vaccination ?? ''),
        String(notes ?? ''),
        JSON.stringify(normalizedCurrentOwner),
        JSON.stringify(normalizedFormerOwners)
      );

      updatePetData(animalId, {
        name: name ?? undefined,
        species: species ?? undefined,
        breed: breed ?? undefined,
        gender: gender ?? undefined,
        age: String(age ?? ''),
        shelterId: shelterId ?? undefined,
        adoptionStatus: adoptionStatus ?? undefined,
        microchipNumber: microchipNumber ?? undefined,
        vaccination: String(vaccination ?? ''),
        notes: notes ?? undefined,
        currentOwner: normalizedCurrentOwner,
        formerOwners: normalizedFormerOwners,
      });
    } else {
      await submitWithEndorsers(
        contract,
        'UpdatePrivateAnimal',
        SHARED_PRIVATE_ENDORSERS,
        String(animalId),
        String(microchipNumber ?? ''),
        String(vaccination ?? ''),
        String(notes ?? '')
      );

      updatePetData(animalId, {
        microchipNumber: microchipNumber ?? undefined,
        vaccination: String(vaccination ?? ''),
        notes: notes ?? undefined,
      });
    }

    txLog('UPDATE', org, userId, animalId, `${name}`);

    res.json({ ok: true });
  } catch (e) {
    console.error('PUT /api/animals/:id failed:', e);
    const status = isAuthorizationError(e) ? 403 : isValidationError(e) ? 400 : isConflictError(e) ? 409 : 500;
    res.status(status).json({ error: extractErrorMessage(e) });
  } finally {
    if (gateway) gateway.disconnect();
  }
});


// POST: upload image for a pet (off-chain, saved to pet_data/images/{id}.jpg)
app.post('/api/animals/:id/image', imageUpload.single('image'), (req, res) => {
  const { org: imgOrg, userId: imgUser } = getAuth(req);
  if (imgOrg !== 'org1') {
    return res.status(403).json({ error: 'Only Org1 (Adoption Center) can update pet images' });
  }
  if (!req.file) return res.status(400).json({ error: 'No image file provided' });
  txLog('IMAGE', imgOrg, imgUser, req.params.id, req.file.originalname);
  res.json({ ok: true, path: `/pet_images/${req.params.id}.jpg` });
});


// PATCH: update only adoption status (quick workflow buttons)
app.patch('/api/animals/:id/status', async (req, res) => {
  let gateway;
  try {
    const { org, userId } = getAuth(req);
    if (org !== 'org1') {
      return res.status(403).json({ error: 'Only Org1 (Adoption Center) can change adoption status' });
    }
    const { gateway: g, contract } = await connect({
      org, userId, channelName: CHANNEL, chaincodeName: CC,
    });
    gateway = g;

    const animalId = req.params.id;
    const { adoptionStatus } = req.body;

    const valid = ['AVAILABLE', 'RESERVED', 'ADOPTED'];
    if (!valid.includes(String(adoptionStatus).toUpperCase())) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${valid.join(', ')}` });
    }

    // Read current public data first
    const result = await contract.evaluateTransaction('ReadAsset', animalId);
    const current = JSON.parse(result.toString());

    // Re-submit with only status changed
    await contract.submitTransaction(
      'UpdateAsset',
      String(animalId),
      String(current.name ?? ''),
      String(current.species ?? ''),
      String(current.breed ?? ''),
      String(current.gender ?? ''),
      String(current.age ?? ''),
      String(current.shelterId ?? ''),
      String(adoptionStatus).toUpperCase()
    );

    txLog('STATUS', org, userId, animalId, `→ ${String(adoptionStatus).toUpperCase()}`);

    // Persist to JSON
    updatePetData(animalId, { adoptionStatus: String(adoptionStatus).toUpperCase() });

    res.json({ ok: true, adoptionStatus: String(adoptionStatus).toUpperCase() });
  } catch (e) {
    console.error('PATCH /api/animals/:id/status failed:', e);
    const status = isAuthorizationError(e) ? 403 : 500;
    res.status(status).json({ error: extractErrorMessage(e) });
  } finally {
    if (gateway) gateway.disconnect();
  }
});


// test: remove a pet from pet_data.json
function removePetData(animalId) {
  let existing = [];
  try {
    existing = JSON.parse(fs.readFileSync(PET_DATA_PATH, 'utf8'));
  } catch { return; }

  const filtered = existing.filter((p) => p.animalId !== animalId);
  fs.writeFileSync(PET_DATA_PATH, JSON.stringify(filtered, null, 2) + '\n', 'utf8');
  console.log(`Removed ${animalId} from pet_data.json`);
}


// DELETE: delete an animal from ledger + JSON + image
app.delete('/api/animals/:id', async (req, res) => {
  let gateway;
  try {
    const { org, userId } = getAuth(req);
    if (org !== 'org1') {
      return res.status(403).json({ error: 'Only Org1 (Adoption Center) can delete pets' });
    }

    const { gateway: g, contract } = await connect({
      org, userId, channelName: CHANNEL, chaincodeName: CC,
    });
    gateway = g;

    const animalId = req.params.id;

    // Delete from ledger (public + private data)
    await submitWithEndorsers(
      contract,
      'DeleteAnimal',
      SHARED_PRIVATE_ENDORSERS,
      animalId,
    );

    txLog('DELETE', org, userId, animalId);

    // Remove from pet_data.json
    removePetData(animalId);

    // Remove image if exists
    const imgPath = path.join(PET_IMAGES_DIR, `${animalId}.jpg`);
    if (fs.existsSync(imgPath)) {
      fs.unlinkSync(imgPath);
      console.log(`Deleted image: ${imgPath}`);
    }

    res.json({ ok: true, deleted: animalId });
  } catch (e) {
    console.error('DELETE /api/animals/:id failed:', e);
    const status = isAuthorizationError(e) ? 403 : 500;
    res.status(status).json({ error: extractErrorMessage(e) });
  } finally {
    if (gateway) gateway.disconnect();
  }
});


const PORT = 4000;
app.listen(PORT, () => console.log(`Backend server running on http://localhost:${PORT}`));
