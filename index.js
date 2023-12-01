const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Replace occurrences in the specified file with the provided arguments
const filePath = "lib/contract-deployer-template/template";
const replacementPathToExample = process.argv[2];
// todo add default output dir
const newFilePath = process.argv[3];
let replacementExample;

if (!replacementPathToExample || !newFilePath) {
  console.error(
    "Usage: node lib/contract-deployer-template/run.js <contractFile> <constructParams> <initParams> <outputDir>",
  );
  process.exit(1);
}

// Extract the file name from the path by splitting the string based on the '/' delimiter
const parts = replacementPathToExample.split("/");
// Get the last part of the path, which is the file name with the extension
const fileNameWithExtension = parts[parts.length - 1];
// Split the file name by the dot('.') to get the name and the extension separately
const fileNameParts = fileNameWithExtension.split(".");
// Check if there is more than one element in the fileNameParts array
if (fileNameParts.length > 1) {
  // Join the parts of the file name excluding the last element (the extension)
  replacementExample = fileNameParts.slice(0, -1).join(".");
} else {
  // The file name as it is if no extension is found
  replacementExample = fileNameParts[0];
}

if (!replacementPathToExample) {
  console.error(
    "Usage: node script/util/generateDeployer.js <contractFile> <constructParams> <initParams> <outputDir>",
  );
  process.exit(1);
}

let filePathPrefix = newFilePath;

// create the directory if it doesn't exist
if (!fs.existsSync(filePathPrefix)) {
  fs.mkdirSync(filePathPrefix, { recursive: true });
}

const formattedPath = path.join(
  filePathPrefix,
  "Deploy" + replacementExample + ".s.sol",
);

const replaceInFile = (
  filePath,
  newFilePath,
  replacementExample,
  replacementPathToExample,
  contractName,
) => {
  // compile contracts if they don't exist
  if (!fs.existsSync("out")) prepareArtifacts();

  // get abi
  contractName =
    contractName != undefined
      ? contractName + ".json"
      : replacementExample + ".json";
  const contractFileName = path.join(
    "out",
    replacementExample + ".sol",
    contractName,
  );
  let fileContents;
  try {
    fileContents = fs.readFileSync(contractFileName, "utf8");
  } catch {
    console.error(
      "Contract not found. Did you provide the correct contract name and run `forge build`?",
    );
    process.exit(1);
  }
  abi = JSON.parse(fileContents).abi;
  // get constructor and initializer args, format them, if none present, set to empty array, if initArgs is undefined, it means no initializer function is present
  const constructorArgs =
    abi
      .find((element) => element.type == "constructor")
      ?.inputs.map((element) =>
        formatInput(element.internalType, element.name),
      ) ?? [];
  const initArgs = abi
    .find(
      (element) => element.type == "function" && element.name == "initialize",
    )
    ?.inputs.map((element) => formatInput(element.internalType, element.name));

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      return console.error(err);
    }

    let regexExample = new RegExp("<Example>", "g");
    let regexExampleVar = new RegExp("<example>", "g");
    let regexArgsConstruct = new RegExp("<, uint256 constructArg>", "g");
    let regexArgsConstructNames = new RegExp("<constructArg>", "g");
    let regexArgs = new RegExp("<, uint256 initArg>", "g");
    let regexArgsNames = new RegExp("<initArg>", "g");
    let regexPathToExample = new RegExp("<src/Example.sol>", "g");
    let regexInitData = new RegExp("<initData>", "g");

    let initData = "abi.encodeCall(<Example>.initialize, (<initArg>))";
    let updatedData = initData.replace(regexExample, replacementExample);
    if (initArgs === undefined) {
      updatedData = `"";\n        revert("${replacementExample} is not initializable")`;
    } else {
      updatedData = updatedData.replace(
        regexArgsNames,
        initArgs.length === 0 ? "" : initArgs.map((e) => e.name).join(", "),
      );
    }

    // replace all non character or number characters with an empty string
    replacementExample = replacementExample.replace(/[^a-zA-Z0-9]/g, "");

    updatedData = data.replace(regexInitData, updatedData);
    updatedData = updatedData.replace(regexExample, replacementExample);
    updatedData = updatedData.replace(
      regexExampleVar,
      replacementExample.charAt(0).toLowerCase() + replacementExample.slice(1),
    );
    updatedData = updatedData.replace(
      regexArgsConstruct,
      constructorArgs.length === 0
        ? ""
        : ", " + constructorArgs.map((e) => e.definition).join(", "),
    );
    updatedData = updatedData.replace(
      regexArgsConstructNames,
      constructorArgs.map((e) => e.name).join(", "),
    );
    updatedData = updatedData.replace(
      regexArgs,
      initArgs === undefined || initArgs.length === 0
        ? ""
        : ", " + initArgs.map((e) => e.definition).join(", "),
    );
    updatedData = updatedData.replace(
      regexPathToExample,
      replacementPathToExample,
    );

    fs.writeFile(newFilePath, updatedData, "utf8", (err) => {
      if (err) {
        console.error(err);
      } else {
        format();
        console.log("Deployer generated.");
      }
    });
  });
};

function formatInput(type, name) {
  // order of operations is important, as some types are caught by multiple cases
  // if the first 6 characters of the type are "string", add memory to the type
  if (type.slice(0, 6) == "string") type += " memory";
  // if the first 5 characters of the type are "bytes", add memory to the type
  else if (type.slice(0, 5) == "bytes") type += " memory";
  // if the first 8 characters of the type are "contract", remove the "contract " from the type
  else if (type.slice(0, 8) == "contract") type = type.slice(9);
  // if the first 6 characters of the type are "struct" and it ends in [] or [(number)], remove the "struct " from the type and add memory
  else if (/^struct.*\[\d*\]$/.test(type)) type = type.slice(7) + " memory";
  // if the first 4 characters of the type are "enum" and it ends in [] or [(number)], remove the "enum " from the type and add memory
  else if (/^enum.*\[\d*\]$/.test(type)) type = type.slice(5) + " memory";
  // if the type is an array, add memory to the type
  else if (/\[\d*\]$/.test(type)) type += " memory";
  // if the first 4 characters of the type are "enum", remove the "enum " from the type
  else if (type.slice(0, 4) == "enum") type = type.slice(5);
  // if the first 6 characters of the type are "struct", remove the "struct " from the type and add memory
  else if (type.slice(0, 6) == "struct") type = type.slice(7) + " memory";

  return { definition: `${type} ${name}`, name };
}

// Note: Ensures contract artifacts are up-to-date.
function prepareArtifacts() {
  console.log(`Preparing artifacts...`);

  execSync("forge clean");
  execSync("forge build");

  console.log(`Artifacts ready. Continuing.`);
}

function format() {
  execSync("forge fmt");
}

replaceInFile(
  filePath,
  formattedPath,
  replacementExample,
  replacementPathToExample,
  // TODO flag --contractName for the contract name
  undefined,
);
