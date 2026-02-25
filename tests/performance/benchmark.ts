
import { SQLiteContextManager } from '../../src/infrastructure/context/SQLiteContextManager';
import * as fs from 'fs';
import * as path from 'path';

async function runBenchmark() {
    const dbPath = path.join(__dirname, 'bench_context.db');
    
    // Limpeza inicial
    if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
    }

    console.log('Iniciando Benchmark de Performance do SQLiteContextManager...');
    
    const contextManager = new SQLiteContextManager(dbPath, 100); // 100 mensagens de contexto
    
    // Aguarda inicialização
    await new Promise(resolve => setTimeout(resolve, 500));

    const chatId = 'benchmark-user';
    const iterations = 100;
    const message = { role: 'user' as const, content: 'Teste de performance com uma mensagem de tamanho médio para validação.' };

    // Teste de Escrita (Add Message)
    console.log(`\nExecutando ${iterations} operações de escrita...`);
    const startWrite = process.hrtime();
    
    for (let i = 0; i < iterations; i++) {
        await contextManager.addMessage(chatId, message);
    }
    
    const endWrite = process.hrtime(startWrite);
    const timeWriteMs = (endWrite[0] * 1000 + endWrite[1] / 1e6);
    const avgWrite = timeWriteMs / iterations;
    
    console.log(`Tempo Total Escrita: ${timeWriteMs.toFixed(2)}ms`);
    console.log(`Média por Escrita: ${avgWrite.toFixed(2)}ms`);

    // Teste de Leitura (Get History)
    console.log(`\nExecutando ${iterations} operações de leitura (histórico completo)...`);
    const startRead = process.hrtime();
    
    for (let i = 0; i < iterations; i++) {
        await contextManager.getHistory(chatId);
    }
    
    const endRead = process.hrtime(startRead);
    const timeReadMs = (endRead[0] * 1000 + endRead[1] / 1e6);
    const avgRead = timeReadMs / iterations;
    
    console.log(`Tempo Total Leitura: ${timeReadMs.toFixed(2)}ms`);
    console.log(`Média por Leitura: ${avgRead.toFixed(2)}ms`);

    // Validação dos requisitos (Latência < 100ms para real-time)
    console.log('\n--- Resultado da Avaliação ---');
    if (avgWrite < 100 && avgRead < 100) {
        console.log('✅ Performance APROVADA (Latência < 100ms)');
    } else {
        console.log('❌ Performance REPROVADA (Latência > 100ms)');
    }

    // Limpeza final
    if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
    }
}

runBenchmark().catch(console.error);
