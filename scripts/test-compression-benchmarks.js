// Local Testing Simulation - Following roadmap specifications
// Creates test data files and benchmarks compression ratios and performance

const fs = require('fs');
const path = require('path');

// Create test data files as specified in roadmap
console.log('Creating test data files...');

// Create 100KB test file
const test100kb = {
  data: 'x'.repeat(100000)
};
fs.writeFileSync('test-100kb.json', JSON.stringify(test100kb));

// Create repetitive test file
const repetitiveItems = [];
for (let i = 0; i < 1000; i++) {
  repetitiveItems.push({ id: 'test', type: 'standard', status: 'active' });
}
const testRepetitive = { items: repetitiveItems };
fs.writeFileSync('test-repetitive.json', JSON.stringify(testRepetitive));

console.log('Test data files created successfully');
console.log('- test-100kb.json: 100KB test file');
console.log('- test-repetitive.json: Repetitive data for compression testing');

// Test compression ratios
async function testCompressionRatios() {
  console.log('\n=== Testing Compression Ratios ===');
  
  // Import CompressionService
  const { CompressionService } = await import('../src/services/compression/CompressionService.js');
  const service = new CompressionService();
  
  const files = ['test-100kb.json', 'test-repetitive.json'];
  
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      const result = await service.compress(data);
      
      console.log(`\nFile: ${file}`);
      console.log(`Original: ${result.originalSize} bytes`);
      console.log(`Compressed: ${result.compressedSize} bytes`);
      console.log(`Ratio: ${(result.ratio * 100).toFixed(1)}%`);
      console.log(`Time: ${result.compressionTime}ms`);
      console.log(`Algorithm: ${result.algorithm}`);
      console.log(`Checksum: ${result.metadata.checksum}`);
      
      // Verify decompression
      const decompressed = await service.decompress(result);
      const isEqual = JSON.stringify(decompressed) === JSON.stringify(data);
      console.log(`Decompression integrity: ${isEqual ? 'PASS' : 'FAIL'}`);
      
      // Check exit conditions
      console.log('\n--- Exit Condition Validation ---');
      console.log(`90%+ compression for repetitive data: ${file.includes('repetitive') ? (result.ratio < 0.1 ? 'PASS' : 'FAIL') : 'N/A'}`);
      console.log(`<50ms compression time for 100KB: ${file.includes('100kb') ? (result.compressionTime < 50 ? 'PASS' : 'FAIL') : 'N/A'}`);
      console.log(`100% data integrity: ${isEqual ? 'PASS' : 'FAIL'}`);
      console.log(`Real compression (not JSON.stringify): ${result.algorithm === 'zstd' ? 'PASS' : 'FAIL'}`);
      
    } catch (error) {
      console.error(`Error testing ${file}:`, error.message);
    }
  }
}

// Benchmark throughput
async function benchmarkThroughput(iterations = 100, dataSize = '10kb') {
  console.log(`\n=== Benchmarking Throughput (${iterations} iterations, ${dataSize} data) ===`);
  
  const { CompressionService } = await import('../src/services/compression/CompressionService.js');
  const service = new CompressionService();
  
  // Generate test data
  const sizeMap = {
    '1kb': 1000,
    '10kb': 10000,
    '100kb': 100000
  };
  
  const size = sizeMap[dataSize] || 10000;
  const testData = {
    payload: 'x'.repeat(size),
    metadata: { size, timestamp: Date.now() },
    items: Array(Math.floor(size / 100)).fill({ id: 'test', value: 'benchmark' })
  };
  
  let totalCompressionTime = 0;
  let totalDecompressionTime = 0;
  let totalCompressionRatio = 0;
  let successful = 0;
  
  console.log(`Testing with ${iterations} iterations...`);
  
  for (let i = 0; i < iterations; i++) {
    try {
      // Compression benchmark
      const compressStart = Date.now();
      const compressed = await service.compress(testData);
      const compressTime = Date.now() - compressStart;
      
      // Decompression benchmark
      const decompressStart = Date.now();
      const decompressed = await service.decompress(compressed);
      const decompressTime = Date.now() - decompressStart;
      
      // Verify integrity
      const isEqual = JSON.stringify(decompressed) === JSON.stringify(testData);
      
      if (isEqual) {
        totalCompressionTime += compressTime;
        totalDecompressionTime += decompressTime;
        totalCompressionRatio += compressed.ratio;
        successful++;
      }
      
      if ((i + 1) % 10 === 0) {
        process.stdout.write(`.`);
      }
      
    } catch (error) {
      console.error(`\nError in iteration ${i + 1}:`, error.message);
    }
  }
  
  console.log(`\n\nBenchmark Results:`);
  console.log(`Successful iterations: ${successful}/${iterations}`);
  console.log(`Average compression time: ${(totalCompressionTime / successful).toFixed(2)}ms`);
  console.log(`Average decompression time: ${(totalDecompressionTime / successful).toFixed(2)}ms`);
  console.log(`Average compression ratio: ${((totalCompressionRatio / successful) * 100).toFixed(1)}%`);
  console.log(`Throughput: ${(successful / (totalCompressionTime / 1000)).toFixed(1)} ops/sec`);
  
  // Exit condition validation
  console.log('\n--- Performance Exit Conditions ---');
  const avgCompressionTime = totalCompressionTime / successful;
  const avgRatio = totalCompressionRatio / successful;
  
  if (dataSize === '100kb') {
    console.log(`<50ms compression time for 100KB: ${avgCompressionTime < 50 ? 'PASS' : 'FAIL'} (${avgCompressionTime.toFixed(2)}ms)`);
  }
  console.log(`Data integrity maintained: ${successful === iterations ? 'PASS' : 'FAIL'}`);
  console.log(`Consistent performance: ${(totalCompressionTime / iterations) < 100 ? 'PASS' : 'FAIL'}`);
}

// Memory usage testing
async function testMemoryUsage() {
  console.log('\n=== Memory Usage Testing ===');
  
  const { CompressionService } = await import('../src/services/compression/CompressionService.js');
  const service = new CompressionService();
  
  // Large file test (1MB+)
  const largeData = {
    payload: 'x'.repeat(1000000), // 1MB
    items: Array(10000).fill({ id: 'large-test', data: 'memory-test' })
  };
  
  const initialMemory = process.memoryUsage();
  console.log(`Initial memory usage: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  
  try {
    const compressed = await service.compress(largeData);
    const afterCompressionMemory = process.memoryUsage();
    console.log(`After compression: ${(afterCompressionMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    
    const memoryIncrease = (afterCompressionMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
    console.log(`Memory increase: ${memoryIncrease.toFixed(2)} MB`);
    console.log(`Compression ratio: ${(compressed.ratio * 100).toFixed(1)}%`);
    
    // Exit condition: Memory usage < 100MB for large files
    console.log(`Memory usage < 100MB for large files: ${memoryIncrease < 100 ? 'PASS' : 'FAIL'}`);
    
    // Test decompression
    const decompressed = await service.decompress(compressed);
    const afterDecompressionMemory = process.memoryUsage();
    console.log(`After decompression: ${(afterDecompressionMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    
    // Verify integrity
    const isEqual = JSON.stringify(decompressed) === JSON.stringify(largeData);
    console.log(`Large file integrity: ${isEqual ? 'PASS' : 'FAIL'}`);
    
  } catch (error) {
    console.error('Memory test failed:', error.message);
  }
}

// Main execution
async function main() {
  console.log('Claude-Flow Compression Service - Local Testing Simulation');
  console.log('Following Phase 1 roadmap specifications');
  console.log('='.repeat(60));
  
  try {
    await testCompressionRatios();
    await benchmarkThroughput(100, '10kb');
    await benchmarkThroughput(50, '100kb');
    await testMemoryUsage();
    
    console.log('\n' + '='.repeat(60));
    console.log('Testing complete. Check results above for exit condition validation.');
    console.log('All PASS results indicate Phase 1 exit conditions are met.');
    
  } catch (error) {
    console.error('Testing failed:', error);
    process.exit(1);
  } finally {
    // Cleanup test files
    try {
      fs.unlinkSync('test-100kb.json');
      fs.unlinkSync('test-repetitive.json');
      console.log('\nTest files cleaned up.');
    } catch (e) {
      // Files may not exist, ignore cleanup errors
    }
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { testCompressionRatios, benchmarkThroughput, testMemoryUsage };