#!/usr/bin/env node

// Environment validation script for production deployment
// Ensures all required environment variables are set

const requiredEnvVars = [
  'DATABASE_URL',
  'NODE_ENV',
  'SESSION_SECRET'
];

const optionalEnvVars = [
  'PORT',
  'COINGECKO_API_KEY',
  'KARMA_API_KEY',
  'DEFAULT_RATE_LIMIT',
  'CACHE_TTL_MINUTES',
  'FRONTEND_URL'
];

const warnings = [];
const errors = [];

console.log('🔍 Validating environment configuration...\n');

// Check required variables
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    errors.push(`❌ Missing required environment variable: ${varName}`);
  } else {
    console.log(`✅ ${varName}: Set`);
    
    // Additional validation for specific variables
    if (varName === 'DATABASE_URL' && !value.startsWith('postgresql://')) {
      warnings.push(`⚠️  DATABASE_URL should start with 'postgresql://'`);
    }
    
    if (varName === 'SESSION_SECRET' && value.length < 32) {
      warnings.push(`⚠️  SESSION_SECRET should be at least 32 characters long`);
    }
    
    if (varName === 'NODE_ENV' && !['development', 'production', 'test'].includes(value)) {
      warnings.push(`⚠️  NODE_ENV should be 'development', 'production', or 'test'`);
    }
  }
});

console.log('');

// Check optional variables
optionalEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${varName === 'DATABASE_URL' ? 'Set (hidden)' : value}`);
  } else {
    console.log(`ℹ️  ${varName}: Not set (using default)`);
  }
});

console.log('');

// Display warnings
if (warnings.length > 0) {
  console.log('⚠️  Warnings:');
  warnings.forEach(warning => console.log(`   ${warning}`));
  console.log('');
}

// Display errors and exit if any
if (errors.length > 0) {
  console.log('❌ Errors:');
  errors.forEach(error => console.log(`   ${error}`));
  console.log('');
  console.log('Please set the required environment variables before starting the application.');
  process.exit(1);
}

// Success message
console.log('🎉 Environment validation passed!');

// Additional checks for production
if (process.env.NODE_ENV === 'production') {
  console.log('');
  console.log('🔒 Production environment detected. Additional checks:');
  
  if (!process.env.FRONTEND_URL) {
    warnings.push('⚠️  FRONTEND_URL not set - CORS may not work correctly');
  }
  
  if (!process.env.COINGECKO_API_KEY) {
    console.log('ℹ️  COINGECKO_API_KEY not set - using free tier (rate limited)');
  }
  
  if (process.env.SESSION_SECRET === 'your-super-secret-session-key-change-this-in-production') {
    errors.push('❌ SESSION_SECRET is still using the default value - this is insecure!');
  }
  
  // Final check
  if (errors.length > 0) {
    console.log('');
    console.log('❌ Production validation failed:');
    errors.forEach(error => console.log(`   ${error}`));
    process.exit(1);
  }
  
  console.log('✅ Production environment validation passed!');
}

console.log('');
console.log('🚀 Ready to start the application!');
