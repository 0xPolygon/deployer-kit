# Contract Deployer Template

The deployer template script is a tool to streamline the deployment of contracts between scripts and unit tests. Sharing a single script during testing and production deployment reduces the risk of errors and allows to test the deployment process in advance.

## Requirements

The script utilizes Node.js to run. We recommend the node version defined in the `.nvmrc` file.

## Installation

```bash
forge install 0xPolygon/contract-deployer-template
```

## Usage Example

The following command will create a deployer contract for the `MyExample` contract from the `src/Example.sol` file in the `test/deployers/MyExampleDeployer.s.sol` file.

```bash
node lib/contract-deployer-template -c src/Example.sol -o test/deployers -n MyExample
```

## Flags

| --flag     | -flag | Description                                               |
| ---------- | ----- | --------------------------------------------------------- |
| Required   |       |                                                           |
| --contract | -c    | Path to the contract to generate the deployer for         |
| Optional   |       |                                                           |
| --output   | -o    | Output directory (default: script/deployers)              |
| --name     | -n    | Name of the contract (default: name of the contract file) |
| Options    |       |                                                           |
| --help     | -h    | Print help                                                |
| --version  | -v    | Print the version number                                  |

---

© 2023 PT Services DMCC
