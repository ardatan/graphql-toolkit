const packageJson = require('../package.json');
packageJson.resolutions = {
    graphql: process.argv[2]
}
require('fs').writeFileSync(__dirname + '/../package.json', JSON.stringify(packageJson, null , 2));