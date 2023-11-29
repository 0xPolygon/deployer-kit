const fs = require("fs");
const path = require("path");

const replaceInFile = (
  filePath,
  newFilePath,
  replacementExample,
  replacementArgsConstruct,
  replacementArgs,
  replacementPathToExample
) => {
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      return console.error(err);
    }

    const structDef = generateStructDefinition(
      replacementExample,
      replacementArgsConstruct,
      replacementArgs
    );

    let regexPathToExample = new RegExp("<src/Example.sol>", "g");

    let regexExample = new RegExp("<Example>", "g");
    let regexExampleVar = new RegExp("<example>", "g");

    let regexArgsConstructNames = new RegExp("<constructArg>", "g");
    let regexArgsNames = new RegExp("<initArg>", "g");

    let regexInitData = new RegExp("<initData>", "g");
    let regexStruct = new RegExp("<struct>", "g");

    let regexInputArg = new RegExp("<, ExampleInput memory input>", "g");
    let regexInputParam = new RegExp("<, input>", "g");

    let initData = "abi.encodeCall(<Example>.initialize, (<initArg>))";

    let updatedData = initData.replace(regexExample, replacementExample);
    updatedData = updatedData.replace(
      regexArgsNames,
      processString(replacementArgs)
    );
    initData = replacementArgs ? updatedData : `""`;

    updatedData = data.replace(regexPathToExample, replacementPathToExample);
    updatedData = updatedData.replace(regexExample, replacementExample);
    updatedData = updatedData.replace(
      regexExampleVar,
      replacementExample.charAt(0).toLowerCase() + replacementExample.slice(1)
    );

    updatedData = updatedData.replace(
      regexArgsConstructNames,
      replacementArgsConstruct ? processString(replacementArgsConstruct) : ""
    );
    updatedData = updatedData.replace(
      regexArgsNames,
      processString(replacementArgs)
    );

    updatedData = updatedData.replace(regexInitData, initData);
    updatedData = updatedData.replace(regexStruct, structDef);

    updatedData = updatedData.replace(
      regexInputArg,
      structDef ? ", " + replacementExample + "Input memory input" : ""
    );
    updatedData = updatedData.replace(
      regexInputParam,
      structDef ? ", " + "input" : ""
    );

    fs.writeFile(newFilePath, updatedData, "utf8", (err) => {
      if (err) {
        console.error(err);
      } else {
        console.log("Deployer generated.");
      }
    });
  });
};

function processString(inputString) {
  if (inputString.includes(",")) {
    const words = inputString.split(",");
    const lastWords = words.map(
      (word) => "input." + word.trim().split(" ").pop()
    );
    return lastWords.join(", ");
  } else {
    return "input." + inputString.trim().split(" ").pop();
  }
}

// Replace occurrences in the specified file with the provided arguments
const filePath = "lib/contract-deployer-template/template";
const replacementPathToExample = process.argv[2];
const replacementArgsConstruct = process.argv[3];
const replacementArgs = process.argv[4];
const newFilePath = process.argv[5];
let replacementExample;

if (!replacementPathToExample || !newFilePath) {
  console.error(
    "Usage: node lib/contract-deployer-template/run.js <contractFile> <constructParams> <initParams> <outputDir>"
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
    "Usage: node script/util/generateDeployer.js <contractFile> <constructParams> <initParams> <outputDir>"
  );
  process.exit(1);
}

let filePathPrefix = newFilePath;

const formattedPath = path.join(
  filePathPrefix,
  "Deploy" + replacementExample + ".s.sol"
);

replaceInFile(
  filePath,
  formattedPath,
  replacementExample,
  replacementArgsConstruct,
  replacementArgs,
  replacementPathToExample
);

// TODO: Format the new file

function generateStructDefinition(name, constructArg, initArg) {
  // Split the input strings by commas to handle multiple fields
  const constructArgs = constructArg ? constructArg.split(", ") : [];
  const initArgs = initArg ? initArg.split(", ") : [];

  // Function to remove the location from a type
  function removeLocation(type) {
    return type.replace(/(memory|storage) /, "");
  }

  // Create the struct definition if there are arguments
  if (constructArgs.length > 0 || initArgs.length > 0) {
    let structDefinition = `struct ${name}Input {\n`;

    // Add the constructor arguments without locations
    if (constructArgs.length > 0) {
      structDefinition += `    ${constructArgs
        .map(removeLocation)
        .join(";\n    ")};\n`;
    }

    // Add the initialization arguments without locations
    if (initArgs.length > 0) {
      structDefinition += `    ${initArgs
        .map(removeLocation)
        .join(";\n    ")};\n`;
    }

    // Close the struct definition
    structDefinition += "}\n";

    return structDefinition;
  } else {
    // Return an empty string if no arguments are provided
    return "";
  }
}
