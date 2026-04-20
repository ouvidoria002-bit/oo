const { syncData } = require('./sync_logic.js'); // I should have separated the logic

// Since I didn't separate it, I'll just create a minimal version to test
// Or just run sync.js and terminate it after first cycle.
console.log('Testando ciclo único...');
require('./sync.js');
setTimeout(() => {
    console.log('Teste finalizado via timeout.');
    process.exit(0);
}, 60000); // 1 minute of testing
