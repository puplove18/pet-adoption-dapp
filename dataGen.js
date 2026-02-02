const fs = require("fs");
const TOTAL_RECORDS = 180;

const speciesData = {
  dog: ["shiba inu", "german shepherd", "corgi", "husky", "beagle"],
  cat: ["british shorthair", "siamese", "maine coon", "ragdoll"],
  rabbit: ["lop", "rex", "netherland dwarf"],
  bird: ["parakeet", "cockatiel", "canary"],
  hamster: ["syrian", "dwarf"],
  turtle: ["red-eared slider"],
  snake: ["corn snake", "ball python"],
  lizard: ["gecko", "bearded dragon"],
  ferret: ["unknown"],
  guinea_pig: ["american", "abyssinian"],
  hedgehog: ["african pygmy"]
};

const names = ["Mochi", "Yuki", "Hana", "Kuma", "Nori", "Miso", "Sora", "N/A"];
const genders = ["male", "female", "unknown"];
const shelters = ["shelterA", "shelterB", "shelterC", "shelterD"];

function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomChip() {
  return Math.random() < 0.2
    ? "000000000000000"
    : String(Math.floor(1e14 + Math.random() * 9e14));
}

const animals = [];

for (let i = 1; i <= TOTAL_RECORDS; i++) {
  const species = random(Object.keys(speciesData));

  animals.push({
    animalId: `${species}${String(i).padStart(3, "0")}`,
    name: random(names),
    species: species,
    breed: random(speciesData[species]),
    gender: random(genders),
    age: Math.random() < 0.2
      ? "unknown"
      : String(Math.floor(Math.random() * 15) + 1),
    shelterId: random(shelters),
    microchipNumber: randomChip(),
    vaccination: Math.random() < 0.5 ? "true" : "false",
    notes: Math.random() < 0.3 ? "" : "Test sample data"
  });
}

fs.writeFileSync("pets.json", JSON.stringify(animals, null, 2));
console.log(`Generated ${animals.length} records`);
