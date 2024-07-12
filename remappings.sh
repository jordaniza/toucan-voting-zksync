#!/bin/bash

# Define remappings of strings to replace
# these mirror the foundry remaps
declare -A remappings=(

  ["@aragon/admin/"]="@aragon/osx/packages/contracts/contracts/plugins/governance/admin/"

  ["@lz-oapp/"]="contracts/layer-zero/LayerZero-v2/oapp/contracts/oapp/"
  ["@lz-oapp-test/"]="contracts/layer-zero/LayerZero-v2/oapp/test/"
  ["@lz-oapp-precrime/"]="contracts/layer-zero/LayerZero-v2/oapp/contracts/precrime/"
  ["@lz-oft/"]="contracts/layer-zero/LayerZero-v2/oapp/contracts/oft/"
  ["@oapp-upgradeable/"]="contracts/layer-zero/oapp-upgradeable/"

  ["@toucan-voting/"]="contracts/execution-chain/voting/"
  ["@interfaces/"]="contracts/interfaces/"
  ["@mocks/"]="test/mocks/"
  ["@libs/"]="contracts/libs/"
  ["@voting-chain/"]="contracts/voting-chain/"
  ["@execution-chain/"]="contracts/execution-chain/"
  ["@utils/"]="contracts/utils/"
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
