const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin to add `use_modular_headers!` to Podfile
 * This is required for Firebase Swift pods to work correctly
 */
const withModularHeaders = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      
      if (fs.existsSync(podfilePath)) {
        let podfileContents = fs.readFileSync(podfilePath, 'utf8');
        
        // Check if use_modular_headers! is already present
        if (!podfileContents.includes('use_modular_headers!')) {
          // Add use_modular_headers! after use_expo_modules!
          podfileContents = podfileContents.replace(
            /target ['"](.*?)['"] do\n\s*use_expo_modules!/,
            (match, targetName) => {
              return `target '${targetName}' do\n  use_expo_modules!\n  use_modular_headers!`;
            }
          );
          
          fs.writeFileSync(podfilePath, podfileContents);
          console.log('✅ Added use_modular_headers! to Podfile');
        }
      }
      
      return config;
    },
  ]);
};

module.exports = withModularHeaders;

