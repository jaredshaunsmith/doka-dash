const { POSTCSS_MODES } = require("@craco/craco");

module.exports = {
    style: {
        postcss: {
            mode: POSTCSS_MODES.file,
            plugins: [
                require('postcss-import'),
                require('postcss-nested'),
                require('postcss-preset-env'),
                require('postcss-reporter'),
            ],
            env: {
                stage: 1,
                features: {
                    "nesting-rules": false,
                }
            }
        }
    }
};