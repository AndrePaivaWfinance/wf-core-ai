// fix-package-json.js
const fs = require('fs');
const path = require('path');

function fixPackageJson() {
  try {
    const packagePath = path.join(__dirname, 'package.json');
    let content = fs.readFileSync(packagePath, 'utf8');
    
    console.log('📋 Analisando package.json...');
    
    // Corrigir propriedades sem aspas (common error)
    content = content.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*:)/g, '$1"$2"$3');
    
    // Corrigir vírgulas finais
    content = content.replace(/,\s*}/g, '}');
    content = content.replace(/,\s*]/g, ']');
    
    // Verificar se está válido agora
    JSON.parse(content);
    
    // Fazer backup do original
    fs.writeFileSync(packagePath + '.backup', fs.readFileSync(packagePath));
    
    // Salvar corrigido
    fs.writeFileSync(packagePath, content);
    
    console.log('✅ package.json corrigido com sucesso!');
    console.log('📦 Backup salvo como package.json.backup');
    
  } catch (error) {
    console.log('❌ Erro ao corrigir package.json:', error.message);
    
    // Tentativa alternativa - mostrar a área problemática
    const content = fs.readFileSync('./package.json', 'utf8');
    const problemArea = content.substring(1290, 1340);
    console.log('🔍 Área problemática:');
    console.log(problemArea);
    console.log('💡 Provavelmente há uma propriedade sem aspas ou vírgula extra');
  }
}

fixPackageJson();