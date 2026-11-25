// Test environment setup for backend tests
process.env.ISSUES_TABLE = 'test-swadesh-issues';
process.env.USERS_TABLE = 'test-swadesh-users';
process.env.IMAGE_BUCKET = 'test-swadesh-images';
process.env.JWT_SECRET = 'test-jwt-secret-key-32-chars-long';
process.env.AUTHORITY_PASSCODE = 'swadesh-test-passcode';
process.env.DATA_STORE = 'memory';
process.env.S3_MODE = 'local';
process.env.LOG_LEVEL = 'INFO';
process.env.AWS_REGION = 'us-east-1';

