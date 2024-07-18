#!/bin/bash

# Define remappings of strings to replace
# these mirror the foundry remaps
declare -A remappings=(

  # remap to aragon enshrined plugins
  ["@aragon/admin/"]="@aragon/osx/packages/contracts/contracts/plugins/governance/admin/"
  ["@aragon/multisig/"]="@aragon/osx/packages/contracts/contracts/plugins/governance/multisig/"

  # remap layerzero because we want to use 0.8.17 pragma
  ["@lz-oapp/"]="contracts/layer-zero/LayerZero-v2/oapp/contracts/oapp/"
  ["@lz-oapp-test/"]="contracts/layer-zero/LayerZero-v2/oapp/test/"
  ["@lz-oapp-precrime/"]="contracts/layer-zero/LayerZero-v2/oapp/contracts/precrime/"
  ["@lz-oft/"]="contracts/layer-zero/LayerZero-v2/oapp/contracts/oft/"
  ["@oapp-upgradeable/"]="contracts/layer-zero/oapp-upgradeable/"
  ["@layerzerolabs/lz-evm-protocol-v2/"]="contracts/layer-zero/LayerZero-v2/protocol/"
  ["@layerzerolabs/lz-evm-oapp-v2/"]="contracts/layer-zero/LayerZero-v2/oapp/"
  ["@layerzerolabs/lz-evm-messagelib-v2/"]="contracts/layer-zero/LayerZero-v2/messagelib/"

  # foundry remappings
  ["@toucan-voting/"]="contracts/execution-chain/voting/"
  ["@interfaces/"]="contracts/interfaces/"
  ["@mocks/"]="test/mocks/"
  ["@libs/"]="contracts/libs/"
  ["@voting-chain/"]="contracts/voting-chain/"
  ["@execution-chain/"]="contracts/execution-chain/"
  ["@utils/"]="contracts/utils/"

  # this is local to this project
  ["@mocks/"]="contracts/helpers/"
)

# Directory to perform replacements
directory="contracts"

# Loop over each remapping and perform the replacement
for key in "${!remappings[@]}"; do
  value=${remappings[$key]}
  echo "Replacing '$key' with '$value' in all files under $directory"
  find "$directory" -type f -exec sed -i "s|$key|$value|g" {} +
done

echo "Replacement complete."
